import mongoose from "mongoose";

import ProductionJob from "../models/productionJob.model.js";

import {
    downloadFileFromGridFS,
    uploadFileToGridFS
} from "../services/gridfs.service.js";

import {
    impositionPdf
} from "../engines/imposition/imposition.engine.js";


// =====================================================
// IMPOSE PDF
// =====================================================

const imposePdf = async (
    req,
    res
) => {

    try {

        const {
            jobId
        } = req.params;


        // -------------------------------------------------
        // Validate Job ID
        // -------------------------------------------------

        if (
            !mongoose.Types.ObjectId.isValid(
                jobId
            )
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid job ID."
            });
        }


        // -------------------------------------------------
        // Find Job
        // -------------------------------------------------

        const job =
            await ProductionJob.findById(
                jobId
            );


        if (!job) {

            return res.status(404).json({

                success: false,

                message:
                    "Production job not found."
            });
        }


        // -------------------------------------------------
        // Validate Source File
        // -------------------------------------------------

        if (!job.fileId) {

            return res.status(400).json({

                success: false,

                message:
                    "Source PDF file not found for this job."
            });
        }


        // -------------------------------------------------
        // Update Status
        // -------------------------------------------------

        job.status =
            "PROCESSING";

        job.errorMessage =
            undefined;

        await job.save();


        // -------------------------------------------------
        // Download Source PDF
        // -------------------------------------------------

        const inputBuffer =
            await downloadFileFromGridFS(
                job.fileId
            );


        if (
            !Buffer.isBuffer(
                inputBuffer
            )
        ) {

            throw new Error(
                "Downloaded source PDF is not a Buffer."
            );
        }


        // -------------------------------------------------
        // Configuration
        // -------------------------------------------------

        const config =
            req.body &&
            typeof req.body === "object"
                ? req.body
                : {};


        // -------------------------------------------------
        // Run Imposition Engine
        // -------------------------------------------------

        const result =
            await impositionPdf({

                pdfBuffer:
                    inputBuffer,

                config,

                jobInfo:
                    job.originalFileName ??
                    jobId
            });


        // -------------------------------------------------
        // Validate Output
        // -------------------------------------------------

        if (
            !result ||
            !Buffer.isBuffer(
                result.outputBuffer
            )
        ) {

            throw new Error(
                "Imposition engine did not return a valid PDF Buffer."
            );
        }


        // -------------------------------------------------
        // Upload Output to GridFS
        // -------------------------------------------------

        const outputFile =
            await uploadFileToGridFS(

                result.outputBuffer,

                `imposed_${job.originalFileName}`,

                "application/pdf"
            );


        // -------------------------------------------------
        // Validate GridFS Response
        // -------------------------------------------------

        if (
            !outputFile ||
            !outputFile.fileId
        ) {

            throw new Error(
                "GridFS upload completed but no output fileId was returned."
            );
        }


        // -------------------------------------------------
        // Save Production Config
        // -------------------------------------------------

        job.productionConfig = {

            ...(job.productionConfig || {}),

            imposition:
                result.config
        };


        // -------------------------------------------------
        // Save Output File ID
        // -------------------------------------------------

        job.outputFileId =
            outputFile.fileId;


        // -------------------------------------------------
        // Complete Job
        // -------------------------------------------------

        job.status =
            "COMPLETED";

        job.errorMessage =
            undefined;

        await job.save();


        // -------------------------------------------------
        // Response
        // -------------------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "PDF imposed successfully.",

            jobId,

            outputFileId:
                job.outputFileId,

            status:
                job.status,

            source:
                result.source,

            orientation:
                result.orientation,

            geometry:
                result.geometry,

            signature:
                result.signature,

            repetition:
                result.repetition,

            sheets:
                result.sheets
        });

    } catch (error) {

        console.error(
            "Imposition Error:",
            error
        );


        // -------------------------------------------------
        // Update FAILED status
        // -------------------------------------------------

        try {

            const {
                jobId
            } = req.params;


            if (
                mongoose.Types.ObjectId.isValid(
                    jobId
                )
            ) {

                await ProductionJob.findByIdAndUpdate(

                    jobId,

                    {
                        status:
                            "FAILED",

                        errorMessage:
                            error.message
                    }
                );
            }

        } catch (
            updateError
        ) {

            console.error(
                "Failed to update job status:",
                updateError
            );
        }


        // -------------------------------------------------
        // Error Response
        // -------------------------------------------------

        return res.status(500).json({

            success: false,

            message:
                "Failed to impose PDF.",

            error:
                error.message
        });
    }
};


export {
    imposePdf
};