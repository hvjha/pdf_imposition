import mongoose from "mongoose";
import ProductionJob from "../models/productionJob.model.js";
import { deleteFileFromGridFS } from "../services/gridfs.service.js";

// ============================================================
// JOB HISTORY CONTROLLER
// Dual history: Upload History & Output History
// ============================================================

const getJobHistory = async (req, res) => {
    try {
        const jobs = await ProductionJob.find()
            .sort({ createdAt: -1 })
            .limit(100)
            .lean();

        // 1. Upload History (all ingested PDFs)
        const uploadHistory = jobs.map((j) => {
            const pageCount = j.analysis?.pageCount || null;
            const firstPage = j.analysis?.firstPage?.source || null;
            const dimensions = firstPage
                ? `${Math.round(firstPage.width)} × ${Math.round(firstPage.height)} pt`
                : null;

            return {
                jobId: j._id.toString(),
                originalFileName: j.originalFileName,
                fileSize: j.fileSize,
                fileId: j.fileId?.toString(),
                status: j.status,
                createdAt: j.createdAt,
                updatedAt: j.updatedAt,
                pageCount,
                dimensions,
                colorSpace: j.analysis?.colorProfile?.colorSpace || "CMYK/RGB",
                hasCrop: !!j.productionConfig?.crop,
                hasImposition: !!j.outputFileId,
                outputFileId: j.outputFileId?.toString() || null,
                sourceUrl: `/api/pdfs/${j._id}/source`
            };
        });

        // 2. Output History (completed imposition outputs)
        const outputHistory = jobs
            .filter((j) => j.outputFileId && j.status === "COMPLETED")
            .map((j) => {
                const impConfig = j.productionConfig?.imposition || {};
                const layout = impConfig.layout || {};
                const sheet = impConfig.sheet || {};
                const binding = impConfig.binding || {};

                return {
                    jobId: j._id.toString(),
                    outputFileId: j.outputFileId?.toString(),
                    originalFileName: j.originalFileName,
                    outputFileName: `imposed_${j.originalFileName}`,
                    createdAt: j.updatedAt || j.createdAt,
                    fileSize: j.fileSize,
                    status: j.status,
                    layoutPages: layout.pagesPerLayout || 16,
                    bindingStyle: binding.type || "PERFECT_BINDING",
                    workStyle: impConfig.workStyle || "SHEETWISE",
                    sheetWidth: sheet.width || 584,
                    sheetHeight: sheet.height || 914,
                    sheetUnit: sheet.unit || "mm",
                    pageOrientation: layout.orientation || layout.pageOrientation || "AUTO",
                    sheetOrientation: sheet.orientation || (sheet.width >= sheet.height ? "LANDSCAPE" : "PORTRAIT"),
                    outputUrl: `/api/pdfs/output/${j.outputFileId}`,
                    directStreamUrl: `/api/pdfs/${j._id}/output`
                };
            });

        return res.status(200).json({
            success: true,
            totalJobs: jobs.length,
            uploadHistory,
            outputHistory
        });

    } catch (error) {
        console.error("[HISTORY] Failed to fetch job history:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to retrieve job history.",
            error: error.message
        });
    }
};

const getJobDetails = async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }

        const job = await ProductionJob.findById(jobId).lean();
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Production job not found."
            });
        }

        return res.status(200).json({
            success: true,
            job: {
                jobId: job._id.toString(),
                originalFileName: job.originalFileName,
                fileId: job.fileId?.toString(),
                fileSize: job.fileSize,
                mimeType: job.mimeType,
                status: job.status,
                analysis: job.analysis,
                validation: job.validation,
                productionConfig: job.productionConfig,
                outputFileId: job.outputFileId?.toString() || null,
                errorMessage: job.errorMessage,
                createdAt: job.createdAt,
                updatedAt: job.updatedAt
            }
        });

    } catch (error) {
        console.error("[JOB DETAILS] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch job details.",
            error: error.message
        });
    }
};

const deleteJob = async (req, res) => {
    try {
        const { jobId } = req.params;

        if (!mongoose.Types.ObjectId.isValid(jobId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });
        }

        const job = await ProductionJob.findById(jobId);
        if (!job) {
            return res.status(404).json({
                success: false,
                message: "Job not found."
            });
        }

        // Try to clean up files in GridFS
        if (job.fileId) {
            try {
                await deleteFileFromGridFS(job.fileId);
            } catch (err) {
                console.warn("[CLEANUP] Could not delete source file from GridFS:", err.message);
            }
        }

        if (job.outputFileId) {
            try {
                await deleteFileFromGridFS(job.outputFileId);
            } catch (err) {
                console.warn("[CLEANUP] Could not delete output file from GridFS:", err.message);
            }
        }

        await ProductionJob.findByIdAndDelete(jobId);

        return res.status(200).json({
            success: true,
            message: `Job #${jobId.slice(-6)} deleted successfully.`
        });

    } catch (error) {
        console.error("[DELETE JOB] Error:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to delete job.",
            error: error.message
        });
    }
};

export {
    getJobHistory,
    getJobDetails,
    deleteJob
};
