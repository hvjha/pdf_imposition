import fs from "fs/promises";

import ProductionJob from "../models/productionJob.model.js";

import {
    uploadFileStreamToGridFS,
    uploadFileToGridFS
} from "../services/gridfs.service.js";
import { PDFDocument } from "pdf-lib";
import analyzePdf from "../engines/pdf/pdfAnalyzer.engine.js";


const uploadPdf = async (
    req,
    res
) => {

    let temporaryFilePath =
        null;


    try {

        // -------------------------------------------------
        // Validate uploaded file
        // -------------------------------------------------

        if (
            !req.file
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "PDF file is required."
            });
        }


        const {

            path:

            filePath,

            originalname,

            mimetype,

            size

        } = req.file;


        temporaryFilePath =
            filePath;


        console.log(
            "\n[PDF UPLOAD] Starting"
        );


        console.log(
            "[PDF UPLOAD] Filename:",
            originalname
        );


        console.log(
            "[PDF UPLOAD] Size:",
            size,
            "bytes"
        );


        console.log(
            "[PDF UPLOAD] Temporary path:",
            filePath
        );


        // -------------------------------------------------
        // Validate MIME type
        // -------------------------------------------------

        if (
            mimetype !==
            "application/pdf"
        ) {

            throw new Error(
                "Only PDF files are allowed."
            );
        }


        // -------------------------------------------------
        // Validate file size
        // -------------------------------------------------

        if (
            !size ||
            size <= 0
        ) {

            throw new Error(
                "Uploaded PDF is empty."
            );
        }


        // -------------------------------------------------
        // Upload directly from disk stream to GridFS
        // -------------------------------------------------

        const storedFile =
            await uploadFileStreamToGridFS(

                filePath,

                originalname,

                mimetype,

                {

                    fileSize:
                        size,

                    uploadedAt:
                        new Date()
                }
            );


        // -------------------------------------------------
        // Validate GridFS response
        // -------------------------------------------------

        if (
            !storedFile ||
            !storedFile.fileId
        ) {

            throw new Error(
                "GridFS upload completed but no file ID was returned."
            );
        }


        // -------------------------------------------------
        // Create Production Job
        // -------------------------------------------------

        const productionJob =
            await ProductionJob.create({

                originalFileName:
                    originalname,

                fileId:
                    storedFile.fileId,

                fileSize:
                    size,

                mimeType:
                    mimetype,

                filePath:
                    storedFile.localPath || null,

                status:
                    "UPLOADED"
            });


        // -------------------------------------------------
        // Delete temporary file
        // -------------------------------------------------

        try {

            await fs.unlink(
                temporaryFilePath
            );


            temporaryFilePath =
                null;


            console.log(
                "[PDF UPLOAD] Temporary file deleted."
            );

        } catch (
        cleanupError
        ) {

            console.warn(
                "[PDF UPLOAD] Could not delete temporary file:",
                cleanupError.message
            );
        }


        // -------------------------------------------------
        // Response
        // -------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "PDF uploaded successfully.",

            job: {

                jobId:
                    productionJob._id,

                originalFileName:
                    productionJob.originalFileName,

                fileSize:
                    productionJob.fileSize,

                mimeType:
                    productionJob.mimeType,

                status:
                    productionJob.status
            }
        });

    } catch (
    error
    ) {

        console.error(
            "PDF upload error:",
            error
        );


        // -------------------------------------------------
        // Cleanup temporary file on failure
        // -------------------------------------------------

        if (
            temporaryFilePath
        ) {

            try {

                await fs.unlink(
                    temporaryFilePath
                );

            } catch (
            cleanupError
            ) {

                console.warn(
                    "Failed to cleanup temporary upload:",
                    cleanupError.message
                );
            }
        }


        // -------------------------------------------------
        // Error response
        // -------------------------------------------------

        return res.status(500).json({

            success: false,

            message:
                "Failed to upload PDF.",

            error:
                error.message
        });
    }
};



const uploadGangPdfs = async (req, res) => {
    const uploadedFiles = req.files || (req.file ? [req.file] : []);

    if (!uploadedFiles || uploadedFiles.length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one PDF file is required for gang run upload."
        });
    }

    try {
        console.log(`\n[GANG RUN UPLOAD] Processing ${uploadedFiles.length} PDF artworks...`);

        const mergedPdf = await PDFDocument.create();
        const gangFilesMeta = [];
        let totalPageCount = 0;

        for (let i = 0; i < uploadedFiles.length; i++) {
            const f = uploadedFiles[i];
            const fileBytes = await fs.readFile(f.path);
            const sourceDoc = await PDFDocument.load(fileBytes);
            const numPages = sourceDoc.getPageCount();
            const copiedPages = await mergedPdf.copyPages(sourceDoc, sourceDoc.getPageIndices());

            const firstPage = sourceDoc.getPage(0);
            const crop = firstPage.getCropBox();
            const media = firstPage.getMediaBox();
            const hasSignificantCrop = crop && (crop.width < media.width - 5 || crop.height < media.height - 5 || crop.x > 5 || crop.y > 5);

            // If the PDF artwork has an isolated CropBox/ArtBox (e.g. Pluvya on a 1.5m Illustrator canvas):
            const effectiveWPt = (hasSignificantCrop && (media.width > 2000 || media.height > 2000)) ? crop.width : (crop ? crop.width : media.width);
            const effectiveHPt = (hasSignificantCrop && (media.width > 2000 || media.height > 2000)) ? crop.height : (crop ? crop.height : media.height);

            for (let pIdx = 0; pIdx < copiedPages.length; pIdx++) {
                const cp = copiedPages[pIdx];
                const srcPage = sourceDoc.getPage(pIdx);
                const pCrop = srcPage.getCropBox();
                const pMedia = srcPage.getMediaBox();
                const pHasCrop = pCrop && (pCrop.width < pMedia.width - 5 || pCrop.height < pMedia.height - 5 || pCrop.x > 5 || pCrop.y > 5);

                // If it's a huge artboard with an isolated single carton, normalize mediaBox & cropBox on copied page
                if (pHasCrop && (pMedia.width > 2000 || pMedia.height > 2000)) {
                    cp.setMediaBox(pCrop.x, pCrop.y, pCrop.width, pCrop.height);
                    cp.setCropBox(pCrop.x, pCrop.y, pCrop.width, pCrop.height);
                }
                mergedPdf.addPage(cp);
            }

            const wPt = effectiveWPt;
            const hPt = effectiveHPt;
            const wMM = Math.round((wPt * 25.4 / 72) * 10) / 10;
            const hMM = Math.round((hPt * 25.4 / 72) * 10) / 10;

            gangFilesMeta.push({
                fileIndex: i,
                id: `file_${Date.now()}_${i}`,
                fileName: f.originalname,
                name: f.originalname,
                startPage: totalPageCount + 1,
                pageCount: numPages,
                pages: numPages,
                widthPt: wPt,
                heightPt: hPt,
                widthMM: wMM,
                heightMM: hMM,
                targetQuantity: 2500,
                customUps: 1
            });

            totalPageCount += numPages;

            try {
                await fs.unlink(f.path);
            } catch (err) {
                console.warn(`[GANG RUN UPLOAD] Temp unlink note: ${err.message}`);
            }
        }

        const mergedBytes = await mergedPdf.save();
        const mergedBuffer = Buffer.from(mergedBytes);
        const comboName = `Gang_Combo_${uploadedFiles.length}_Artworks_${Date.now()}.pdf`;

        const storedFile = await uploadFileToGridFS(
            mergedBuffer,
            comboName,
            "application/pdf",
            { isGangJob: true, gangFiles: gangFilesMeta }
        );

        let analysisResult = null;
        try {
            analysisResult = await analyzePdf(mergedBuffer);
        } catch (aErr) {
            console.warn(`[GANG RUN UPLOAD] Auto-analysis note: ${aErr.message}`);
        }

        const productionJob = await ProductionJob.create({
            originalFileName: comboName,
            fileId: storedFile.fileId,
            fileSize: mergedBuffer.length,
            mimeType: "application/pdf",
            filePath: storedFile.localPath || null,
            status: analysisResult ? "ANALYZED" : "UPLOADED",
            analysis: analysisResult,
            productionConfig: {
                isGangJob: true,
                gangFiles: gangFilesMeta,
                totalArtworks: uploadedFiles.length
            }
        });

        console.log(`[GANG RUN UPLOAD] Created Job ID: ${productionJob._id} (${uploadedFiles.length} files, ${totalPageCount} pages).`);

        return res.status(201).json({
            success: true,
            job: {
                id: String(productionJob._id),
                jobId: String(productionJob._id),
                _id: String(productionJob._id),
                originalFileName: comboName,
                fileSize: mergedBuffer.length,
                pageCount: totalPageCount,
                analysis: analysisResult,
                gangFiles: gangFilesMeta,
                productionConfig: {
                    isGangJob: true,
                    gangFiles: gangFilesMeta,
                    totalArtworks: uploadedFiles.length
                }
            },
            analysis: analysisResult,
            gangFiles: gangFilesMeta,
            pageCount: totalPageCount,
            message: `Successfully uploaded and merged ${uploadedFiles.length} artworks into Gang Run job.`
        });

    } catch (error) {
        console.error("[GANG RUN UPLOAD] Error:", error);
        for (const f of uploadedFiles) {
            try {
                if (f.path) await fs.unlink(f.path);
            } catch {}
        }
        return res.status(500).json({
            success: false,
            message: "Failed to upload and merge gang run PDFs.",
            error: error.message
        });
    }
};

export {
    uploadPdf,
    uploadGangPdfs
};
