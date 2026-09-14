import mongoose from "mongoose";

import {
    downloadFileFromGridFS
} from "../services/gridfs.service.js";


const downloadOutputPdf = async (req, res) => {

    try {

        const { fileId } = req.params;

        // -----------------------------------------
        // Validate ObjectId
        // -----------------------------------------

        if (
            !mongoose.Types.ObjectId.isValid(fileId)
        ) {

            return res.status(400).json({
                success: false,
                message: "Invalid file ID."
            });
        }


        // -----------------------------------------
        // Download from GridFS
        // -----------------------------------------

        const pdfBuffer =
            await downloadFileFromGridFS(
                fileId
            );


        if (
            !pdfBuffer ||
            !Buffer.isBuffer(pdfBuffer)
        ) {

            return res.status(404).json({
                success: false,
                message: "Output PDF not found."
            });
        }


        if (
            pdfBuffer.length === 0
        ) {

            return res.status(404).json({
                success: false,
                message: "Output PDF is empty."
            });
        }


        // -----------------------------------------
        // Send PDF
        // -----------------------------------------

        res.setHeader(
            "Content-Type",
            "application/pdf"
        );

        res.setHeader(
            "Content-Disposition",
            'attachment; filename="imposed-output.pdf"'
        );

        res.setHeader(
            "Content-Length",
            pdfBuffer.length
        );


        return res.status(200).send(
            pdfBuffer
        );

    } catch (error) {

        console.error(
            "Output PDF Download Error:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Failed to download output PDF.",

            error:
                error?.message ??
                "Unknown error."
        });
    }
};


export {
    downloadOutputPdf
};