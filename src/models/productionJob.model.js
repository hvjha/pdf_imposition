import mongoose from "mongoose";

const productionJobSchema = new mongoose.Schema(
    {
        originalFileName: {
            type: String,
            required: true,
            trim: true
        },

        fileId: {
            type: mongoose.Schema.Types.ObjectId,
            required: true
        },

        fileSize: {
            type: Number,
            required: true
        },

        mimeType: {
            type: String,
            required: true
        },

        status: {
            type: String,
            enum: [
                "UPLOADED",
                "ANALYZING",
                "ANALYZED",
                "VALIDATING",
                "VALIDATED",
                "PROCESSING",
                "COMPLETED",
                "FAILED"
            ],
            default: "UPLOADED"
        },

        analysis: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        validation: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        productionConfig: {
            type: mongoose.Schema.Types.Mixed,
            default: null
        },

        outputFileId: {
            type: mongoose.Schema.Types.ObjectId,
            default: null
        },

        filePath: {
            type: String,
            default: null
        },

        outputFilePath: {
            type: String,
            default: null
        },

        errorMessage: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

// Optimized MongoDB Indexes for High-Throughput Prepress Ingestion & Queries
productionJobSchema.index({ createdAt: -1 });
productionJobSchema.index({ fileId: 1 });
productionJobSchema.index({ outputFileId: 1 });
productionJobSchema.index({ status: 1 });
productionJobSchema.index({ status: 1, createdAt: -1 });
productionJobSchema.index({ originalFileName: "text" });

const ProductionJob = mongoose.model(
    "ProductionJob",
    productionJobSchema
);

export default ProductionJob;