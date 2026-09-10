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

import ProductionJob from "../models/productionJob.model.js";
import { uploadFileToGridFS } from "../services/gridfs.service.js";

const uploadPdf = async (req, res) => {

    try {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "PDF file is required."
            });
        }

        const {
            buffer,
            originalname,
            mimetype,
            size
        } = req.file;

        // Upload PDF to GridFS
        const storedFile = await uploadFileToGridFS(
            buffer,
            originalname,
            mimetype
        );

        // Create production job
        const productionJob = await ProductionJob.create({
            originalFileName: originalname,
            fileId: storedFile.fileId,
            fileSize: size,
            mimeType: mimetype,
            status: "UPLOADED"
        });

        return res.status(201).json({
            success: true,
            message: "PDF uploaded successfully.",

            job: {
                jobId: productionJob._id,
                originalFileName: productionJob.originalFileName,
                fileSize: productionJob.fileSize,
                mimeType: productionJob.mimeType,
                status: productionJob.status
            }
        });

    } catch (error) {

        console.error("PDF upload error:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to upload PDF.",
            error: error.message
        });
    }
};

export {
    uploadPdf
};