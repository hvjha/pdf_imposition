import mongoose from "mongoose";

import ProductionJob from "../models/productionJob.model.js";

import {
    downloadFileFromGridFS
} from "../services/gridfs.service.js";


const getOutputPdf = async (req, res) => {

    try {

        const { jobId } = req.params;

        console.log(
            "\n[OUTPUT] Request received for job:",
            jobId
        );


        /*
        |--------------------------------------------------------------------------
        | Validate Job ID
        |--------------------------------------------------------------------------
        */

        if (
            !mongoose.Types.ObjectId.isValid(jobId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid job ID."
            });
        }


        /*
        |--------------------------------------------------------------------------
        | Find Job
        |--------------------------------------------------------------------------
        */

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


        /*
        |--------------------------------------------------------------------------
        | Check output
        |--------------------------------------------------------------------------
        */

        if (!job.outputFileId) {

            return res.status(404).json({

                success: false,

                message:
                    "Output PDF has not been generated yet."
            });
        }


        console.log(
            "[OUTPUT] Output fileId:",
            job.outputFileId.toString()
        );


        /*
        |--------------------------------------------------------------------------
        | Download from GridFS
        |--------------------------------------------------------------------------
        */

        const pdfBuffer =
            await downloadFileFromGridFS(
                job.outputFileId
            );


        console.log(
            "[OUTPUT] Downloaded:",
            pdfBuffer.length,
            "bytes"
        );


        /*
        |--------------------------------------------------------------------------
        | Send PDF
        |--------------------------------------------------------------------------
        */

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Length",
            pdfBuffer.length
        );

        res.setHeader(
            "Content-Disposition",
            `inline; filename="${job.originalFileName.replace(
                /\.pdf$/i,
                ""
            )}-cropped.pdf"`
        );


        return res.send(
            pdfBuffer
        );


    } catch (error) {

        console.error(
            "[OUTPUT] Error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to retrieve output PDF.",

            error:
                error.message
        });
    }
};


export {
    getOutputPdf
};