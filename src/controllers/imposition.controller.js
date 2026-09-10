import mongoose from "mongoose";

import ProductionJob from "../models/productionJob.model.js";

import {
    downloadFileFromGridFS,
    uploadFileToGridFS
} from "../services/gridfs.service.js";

import {
    impositionPdf
} from "../engines/imposition/imposition.engine.js";


const imposePdf = async (req, res) => {

    try {

        const { jobId } = req.params;


        // -----------------------------------------
        // 1. Validate Job ID
        // -----------------------------------------

        if (
            !mongoose.Types.ObjectId.isValid(
                jobId
            )
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });

        }


        // -----------------------------------------
        // 2. Find Production Job
        // -----------------------------------------

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


        // -----------------------------------------
        // 3. Check Source File
        // -----------------------------------------

        if (!job.fileId) {

            return res.status(404).json({
                success: false,
                message:
                    "Source PDF file not found."
            });

        }


        // -----------------------------------------
        // 4. Download Source PDF
        // -----------------------------------------

        console.log(
            `[IMPOSITION CONTROLLER] Downloading source PDF for job ${jobId}`
        );


        const inputBuffer =
            await downloadFileFromGridFS(
                job.fileId
            );


        // -----------------------------------------
        // 5. Update Status
        // -----------------------------------------

        job.status = "PROCESSING";

        job.errorMessage = null;

        await job.save();


        // -----------------------------------------
        // 6. Run Imposition Engine
        // -----------------------------------------

        console.log(
            `[IMPOSITION CONTROLLER] Starting imposition for job ${jobId}`
        );


        const result =
            await impositionPdf({
                pdfBuffer: inputBuffer
            });


        // -----------------------------------------
        // 7. Create Output Filename
        // -----------------------------------------

        const baseName =
            job.originalFileName.replace(
                /\.pdf$/i,
                ""
            );


        const outputFileName =
            `${baseName}-imposed.pdf`;


        // -----------------------------------------
        // 8. Upload Output to GridFS
        // -----------------------------------------

        console.log(
            `[IMPOSITION CONTROLLER] Uploading imposed PDF: ${outputFileName}`
        );


        const outputFile =
            await uploadFileToGridFS(
                result.buffer,
                outputFileName,
                "application/pdf"
            );


        // -----------------------------------------
        // 9. Save Production Configuration
        // -----------------------------------------

        job.productionConfig = {
            ...(job.productionConfig || {}),

            imposition: {
                enabled: true,

                pageCount:
                    result.pageCount,

                sheet:
                    result.sheet,

                placements:
                    result.placements,

                outputFileId:
                    outputFile.fileId,

                outputFileName:
                    outputFile.filename
            }
        };


        // -----------------------------------------
        // 10. Save Output File ID
        // -----------------------------------------

        job.outputFileId =
            outputFile.fileId;


        // -----------------------------------------
        // 11. Complete Job
        // -----------------------------------------

        job.status = "COMPLETED";

        await job.save();


        // -----------------------------------------
        // 12. Response
        // -----------------------------------------

        return res.status(200).json({

            success: true,

            message:
                "PDF imposed successfully.",

            job: {

                jobId:
                    job._id,

                originalFileName:
                    job.originalFileName,

                status:
                    job.status,

                sourceFileId:
                    job.fileId,

                outputFileId:
                    outputFile.fileId,

                imposition: {

                    pageCount:
                        result.pageCount,

                    sheet:
                        result.sheet,

                    placements:
                        result.placements,

                    outputFileName:
                        outputFile.filename
                }
            }

        });

    } catch (error) {

        console.error(
            "[IMPOSITION CONTROLLER ERROR]",
            error
        );


        // -----------------------------------------
        // Update Failed Status
        // -----------------------------------------

        try {

            const { jobId } =
                req.params;

            if (
                mongoose.Types.ObjectId.isValid(
                    jobId
                )
            ) {

                await ProductionJob.findByIdAndUpdate(
                    jobId,
                    {
                        status: "FAILED",
                        errorMessage:
                            error.message
                    }
                );

            }

        } catch (statusError) {

            console.error(
                "[IMPOSITION STATUS ERROR]",
                statusError
            );

        }


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