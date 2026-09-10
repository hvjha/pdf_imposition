import mongoose from "mongoose";

import ProductionJob from "../models/productionJob.model.js";

import {
    downloadFileFromGridFS
} from "../services/gridfs.service.js";

import analyzePdf from "../engines/pdf/pdfAnalyzer.engine.js";


const analyzeProductionPdf = async (req, res) => {

    try {

        const { jobId } = req.params;


        /*
            Validate MongoDB ObjectId
        */
        if (!mongoose.Types.ObjectId.isValid(jobId)) {

            return res.status(400).json({
                success: false,
                message: "Invalid job ID."
            });

        }


        /*
            Find production job
        */
        const productionJob =
            await ProductionJob.findById(jobId);


        if (!productionJob) {

            return res.status(404).json({
                success: false,
                message: "Production job not found."
            });

        }


        /*
            Update status
        */
        productionJob.status = "ANALYZING";

        await productionJob.save();


        /*
            Download PDF from GridFS
        */
        const pdfBuffer =
            await downloadFileFromGridFS(
                productionJob.fileId
            );


        /*
            Analyze PDF
        */
        const analysis =
            await analyzePdf(pdfBuffer);


        /*
            Save analysis
        */
        productionJob.analysis = analysis;

        productionJob.status = "ANALYZED";

        productionJob.errorMessage = null;

        await productionJob.save();


        /*
            Response
        */
        return res.status(200).json({

            success: true,

            message: "PDF analyzed successfully.",

            job: {

                jobId: productionJob._id,

                originalFileName:
                    productionJob.originalFileName,

                status:
                    productionJob.status,

                analysis

            }

        });

    } catch (error) {

        console.error(
            "PDF analysis error:",
            error
        );


        /*
            If job exists, mark as FAILED
        */
        if (req.params.jobId) {

            await ProductionJob.findByIdAndUpdate(
                req.params.jobId,
                {
                    status: "FAILED",
                    errorMessage: error.message
                }
            );

        }


        return res.status(500).json({

            success: false,

            message: "Failed to analyze PDF.",

            error: error.message

        });

    }

};


export {
    analyzeProductionPdf
};