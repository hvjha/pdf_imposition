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

        errorMessage: {
            type: String,
            default: null
        }
    },
    {
        timestamps: true
    }
);

const ProductionJob = mongoose.model(
    "ProductionJob",
    productionJobSchema
);

export default ProductionJob;