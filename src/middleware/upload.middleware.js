// import multer from 'multer';
// import path from 'path';
// import fs from 'fs';

// const uploadDirectory = path.resolve(process.cwd(),'uploads');

// // create upload directory if not exists
// if(!fs.existsSync(uploadDirectory)){
//     fs.mkdirSync(uploadDirectory,{recursive:true});
// }

// const storage = multer.diskStorage({
//     destination: (req,file,cb)=>{
//         cb(null,uploadDirectory);
//     },

//     filename:(req,file,cb)=>{
//         const uniqueName = `${Date.now()}-${file.originalname}`;
//         cb(null,uniqueName);
//     }
// });

// const fileFilter = (req,file,cb)=>{
//     const isPdfMimeType = file.mimetype === 'application/pdf';
//     const isPdfExtension = path.extname(file.originalname).toLowerCase() === '.pdf';
//     if(isPdfMimeType && isPdfExtension){
//         cb(null,true);
//     }else{
//         cb(new Error('only PDF Files are allowed'));
//     }
// }

// const upload = multer({
//     storage,fileFilter,
//     limits:{fileSize: 50 * 1024 * 1024} // 50MB
// })

// export default upload;


import multer from "multer";

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    const isPdfMimeType = file.mimetype === "application/pdf";

    if (isPdfMimeType) {
        cb(null, true);
    } else {
        cb(new Error("Only PDF files are allowed."));
    }
};

const upload = multer({
    storage,

    fileFilter,

    limits: {
        fileSize: 50 * 1024 * 1024
    }
});

export default upload;