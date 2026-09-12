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

    let job = null;

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

        job =
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
        // Download Source PDF From GridFS
        // -------------------------------------------------

        const inputBuffer =
            await downloadFileFromGridFS(
                job.fileId
            );


        if (
            !inputBuffer ||
            !Buffer.isBuffer(inputBuffer)
        ) {

            throw new Error(
                "Downloaded source PDF is not a valid Buffer."
            );
        }


        if (
            inputBuffer.length === 0
        ) {

            throw new Error(
                "Downloaded source PDF is empty."
            );
        }


        // -------------------------------------------------
        // Configuration
        // -------------------------------------------------

        /*
            Configuration can come from:

            1. req.body
            2. Existing job.productionConfig

            Request body takes priority.
        */

        const requestConfig =
            req.body &&
            typeof req.body === "object"
                ? req.body
                : {};


        const savedConfig =
            job.productionConfig &&
            typeof job.productionConfig === "object"
                ? job.productionConfig
                : {};


        const config = {

            ...savedConfig,

            ...requestConfig
        };


        /*
            If productionConfig contains an old nested
            imposition object, preserve it as well.
        */

        if (
            savedConfig.imposition &&
            typeof savedConfig.imposition === "object" &&
            requestConfig.imposition === undefined
        ) {

            config.imposition = {

                ...savedConfig.imposition
            };
        }


        // -------------------------------------------------
        // Run Imposition Engine
        // -------------------------------------------------

        const result =
            await impositionPdf({

                /*
                    IMPORTANT:

                    Updated engine expects
                    sourcePdfBytes, NOT pdfBuffer.
                */

                sourcePdfBytes:
                    inputBuffer,

                config,

                jobInfo: {

                    jobId:
                        jobId,

                    originalFileName:
                        job.originalFileName ??
                        "source.pdf"
                }
            });


        // -------------------------------------------------
        // Validate Engine Output
        // -------------------------------------------------

        if (
            !result
        ) {

            throw new Error(
                "Imposition engine returned no result."
            );
        }


        if (
            !result.pdfBytes ||
            !Buffer.isBuffer(
                result.pdfBytes
            )
        ) {

            throw new Error(
                "Imposition engine did not return a valid PDF Buffer."
            );
        }


        if (
            result.pdfBytes.length === 0
        ) {

            throw new Error(
                "Imposition engine returned an empty PDF."
            );
        }


        // -------------------------------------------------
        // Upload Output PDF To GridFS
        // -------------------------------------------------

        const originalFileName =
            job.originalFileName ??
            "source.pdf";


        const outputFileName =
            `imposed_${originalFileName}`;


        const outputFile =
            await uploadFileToGridFS(

                result.pdfBytes,

                outputFileName,

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
        // Save Production Configuration
        // -------------------------------------------------

        job.productionConfig = {

            ...(job.productionConfig || {}),

            imposition:
                config
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

            sheet:
                result.sheet,

            geometry:
                result.geometry,

            pattern:
                result.pattern,

            workStyle:
                result.workStyle,

            sides:
                result.sides
        });

    } catch (error) {

        console.error(
            "Imposition Error:",
            error
        );


        // -------------------------------------------------
        // Update FAILED Status
        // -------------------------------------------------

        try {

            if (
                job &&
                job._id
            ) {

                job.status =
                    "FAILED";

                job.errorMessage =
                    error?.message ??
                    "Unknown imposition error.";

                await job.save();

            } else {

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
                                error?.message ??
                                "Unknown imposition error."
                        }
                    );
                }
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
                error?.message ??
                "Unknown imposition error."
        });
    }
};


// =====================================================
// EXPORT
// =====================================================

export {
    imposePdf
};