// export const uploadPdf = async(req,res)=>{
//     try{
//         if(!req.file){
//             return res.status(400).json({
//                 success:false,
//                 message:"pdf file is required."
//             })
//         }
//         return res.status(201).json({
//             success:true,
//             message:"pdf file is uploaded successfully",

//             file:{
//                 originalName:req.file.originalname,
//                 filename:req.file.filename,
//                 path:req.file.path,
//                 size:req.file.size,
//                 mimeType:req.file.mimetype
//             }
//         })
//     }catch(error){
//         console.error('PDF upload error:',error);
//         return res.status(500).json({
//             success:false,
//             message:"Failed to upload pdf file",
//             error:error.message
//         })
//     }
// }

// import ProductionJob from "../models/productionJob.model.js";
// import { uploadFileToGridFS } from "../services/gridfs.service.js";

// const uploadPdf = async (req, res) => {

//     try {

//         if (!req.file) {
//             return res.status(400).json({
//                 success: false,
//                 message: "PDF file is required."
//             });
//         }

//         const {
//             buffer,
//             originalname,
//             mimetype,
//             size
//         } = req.file;

//         // Upload PDF to GridFS
//         const storedFile = await uploadFileToGridFS(
//             buffer,
//             originalname,
//             mimetype
//         );

//         // Create production job
//         const productionJob = await ProductionJob.create({
//             originalFileName: originalname,
//             fileId: storedFile.fileId,
//             fileSize: size,
//             mimeType: mimetype,
//             status: "UPLOADED"
//         });

//         return res.status(201).json({
//             success: true,
//             message: "PDF uploaded successfully.",

//             job: {
//                 jobId: productionJob._id,
//                 originalFileName: productionJob.originalFileName,
//                 fileSize: productionJob.fileSize,
//                 mimeType: productionJob.mimeType,
//                 status: productionJob.status
//             }
//         });

//     } catch (error) {

//         console.error("PDF upload error:", error);

//         return res.status(500).json({
//             success: false,
//             message: "Failed to upload PDF.",
//             error: error.message
//         });
//     }
// };

// export {
//     uploadPdf
// };




import fs from "fs/promises";

import ProductionJob from "../models/productionJob.model.js";

import {
    uploadFileStreamToGridFS
} from "../services/gridfs.service.js";


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


export {
    uploadPdf
};