import mongoose from "mongoose";
import ProductionJob from "../models/productionJob.model.js";
import { downloadFileFromGridFS, uploadFileToGridFS } from "../services/gridfs.service.js";
import { cropPdf } from "../engines/crop/crop.engine.js";

const cropProductionPdf = async (req, res) => {
    const requestStart = Date.now();
    console.log("\n========================================");
    console.log("        PHASE 4 - PDF CROP START");
    console.log("========================================");
    try {
        //  1. Get Job ID
        const { jobId } = req.params;
        console.log("[1] Job ID:", jobId);
        // 2. Validate Job ID
        if (
            !mongoose.Types.ObjectId.isValid(jobId)
        ) {
            console.log("[ERROR] Invalid Job ID");
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }
        // 3. Find Production Job
        console.log("[2] Finding ProductionJob...");
        const job =
            await ProductionJob.findById(jobId);
        if (!job) {
            console.log(
                "[ERROR] ProductionJob not found"
            );
            return res.status(404).json({
                success: false,
                message:
                    "Production job not found."
            });
        }
        console.log(
            "[2] ProductionJob found"
        );
        console.log(
            "[2] Original file:",
            job.originalFileName
        );
        console.log(
            "[2] Source fileId:",
            job.fileId?.toString()
        );
        console.log(
            "[2] Current status:",
            job.status
        );
        // 4. Check Phase 3 Analysis
        console.log(
            "[3] Checking PDF analysis..."
        );
        if (!job.analysis) {
            console.log(
                "[ERROR] Analysis not found"
            );
            return res.status(400).json({
                success: false,
                message:
                    "PDF must be analyzed before cropping."
            });
        }
        console.log(
            "[3] Analysis found"
        );
        console.log(
            "[3] Page count:",
            job.analysis.pageCount
        );
        console.log(
            "[3] Analysis pages:",
            job.analysis.pages?.length
        );
        // 5. Check Validation
        console.log(
            "[4] Checking validation..."
        );
        if (
            job.validation &&
            job.validation.valid === false
        ) {
            console.log(
                "[ERROR] PDF validation failed"
            );
            return res.status(400).json({
                success: false,
                message:
                    "PDF validation failed. Fix validation errors before cropping.",

                errors:
                    job.validation.errors
            });
        }
        console.log(
            "[4] Validation check passed"
        );
        // 6. Check Source GridFS File ID
        const sourceFileId =
            job.fileId;
        if (!sourceFileId) {
            console.log(
                "[ERROR] Source GridFS fileId missing"
            );
            return res.status(400).json({
                success: false,
                message:
                    "Source GridFS file ID is missing."
            });
        }
        //  7. Read Crop Rule
        console.log(
            "[5] Reading crop rule..."
        );
        const rule =
            req.body?.cropRule;
        if (!rule) {
            console.log(
                "[ERROR] cropRule missing"
            );
            return res.status(400).json({
                success: false,
                message:
                    "cropRule is required."
            });
        }
        console.log(
            "[5] Crop rule:"
        );
        console.log(
            JSON.stringify(
                rule,
                null,
                2
            )
        );
        // 8. Set Processing Status
        console.log(
            "[6] Setting job status to PROCESSING..."
        );
        job.status =
            "PROCESSING";
        job.errorMessage =
            null;
        await job.save();
        console.log(
            "[6] Job status updated"
        );
        // 9. Download Source PDF from GridFS
        console.log(
            "[7] Downloading PDF from GridFS..."
        );
        console.log(
            "[7] GridFS fileId:",
            sourceFileId.toString()
        );
        const inputBuffer =
            await downloadFileFromGridFS(
                sourceFileId
            );
        console.log(
            "[7] PDF downloaded"
        );
        console.log(
            "[7] Type:",
            typeof inputBuffer
        );
        console.log(
            "[7] Is Buffer:",
            Buffer.isBuffer(inputBuffer)
        );
        console.log(
            "[7] Buffer size:",
            inputBuffer?.length,
            "bytes"
        );
        // 10. Safety Check
        if (!Buffer.isBuffer(inputBuffer)) {
            throw new Error(
                "GridFS download did not return a Buffer."
            );
        }
        if (inputBuffer.length === 0) {
            throw new Error(
                "Downloaded PDF buffer is empty."
            );
        }
        // 11. Run Crop Engine
        console.log(
            "[8] Starting Crop Engine..."
        );
        const result =
            await cropPdf({
                /*
                 * IMPORTANT:
                 * crop.engine.js expects pdfBuffer
                 */
                pdfBuffer:
                    inputBuffer,

                analysis:
                    job.analysis,

                rule:
                    rule
            });
        console.log(
            "[8] Crop Engine completed"
        );
        console.log(
            "[8] Output buffer:",
            result.buffer.length,
            "bytes"
        );
        console.log(
            "[8] Page count:",
            result.pageCount
        );

        console.log(
            "[8] Strategy:",
            result.strategy
        );
        // 12. Upload Cropped PDF to GridFS
        console.log(
            "[9] Uploading cropped PDF to GridFS..."
        );
        const outputFileName =
            `${job.originalFileName.replace(
                /\.pdf$/i,
                ""
            )}-cropped.pdf`;
        console.log(
            "[9] Output filename:",
            outputFileName
        );
        /*
         * IMPORTANT:
         *
         * Your GridFS service expects:
         *
         * uploadFileToGridFS(
         *     buffer,
         *     filename,
         *     mimetype
         * )
         */
        const outputFile =
            await uploadFileToGridFS(
                result.buffer,
                outputFileName,
                "application/pdf"
            );
        console.log(
            "[9] Cropped PDF uploaded"
        );
        console.log(
            "[9] Output GridFS fileId:",
            outputFile.fileId?.toString()
        );
        // 13. Save Output File ID
        job.outputFileId =
            outputFile.fileId;
        //  14. Save Crop Information
        job.productionConfig = {
            ...(job.productionConfig || {}),
            crop: {
                enabled:
                    rule.enabled !== false,
                strategy:
                    result.strategy,
                pages:
                    result.pages,
                outputFileId:
                    outputFile.fileId,
                outputFileName:
                    outputFile.filename
            }
        };
        console.log(
            "[10] Crop configuration saved"
        );
        // 15. Complete Job
        job.status =
            "COMPLETED";
        job.errorMessage =
            null;
        await job.save();
        const processingTime =
            Date.now() - requestStart;
        console.log(
            "[11] Job completed"
        );
        console.log(
            "[11] Processing time:",
            processingTime,
            "ms"
        );
        console.log(
            "========================================"
        );
        console.log(
            "        PHASE 4 - CROP SUCCESS"
        );
        console.log(
            "========================================\n"
        );
        // 16. Response
        return res.status(200).json({
            success: true,
            message:
                "PDF cropped successfully.",
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
                    job.outputFileId,
                crop:
                    job.productionConfig.crop
            }
        });
    } catch (error) {
        console.error(
            "\n========================================"
        );
        console.error(
            "        PHASE 4 - CROP FAILED"
        );
        console.error(
            "========================================"
        );
        console.error(
            "Error:",
            error.message
        );
        console.error(
            "Stack:",
            error.stack
        );
        // 16. Update Job as FAILED
        try {
            if (
                req.params?.jobId &&
                mongoose.Types.ObjectId.isValid(
                    req.params.jobId
                )
            ) {
                await ProductionJob.findByIdAndUpdate(
                    req.params.jobId,
                    {
                        status:
                            "FAILED",
                        errorMessage:
                            error.message
                    }
                );
                console.log(
                    "[ERROR] Job status changed to FAILED"
                );
            }
        } catch (saveError) {
            console.error(
                "[ERROR] Could not update job:",
                saveError
            );
        }
        return res.status(500).json({
            success: false,
            message:
                "Failed to crop PDF.",
            error:
                error.message
        });
    }
};
export {
    cropProductionPdf
};