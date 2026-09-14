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


// import multer from "multer";

// const storage = multer.memoryStorage();

// const fileFilter = (req, file, cb) => {
//     const isPdfMimeType = file.mimetype === "application/pdf";

//     if (isPdfMimeType) {
//         cb(null, true);
//     } else {
//         cb(new Error("Only PDF files are allowed."));
//     }
// };

// const upload = multer({
//     storage,

//     fileFilter,

//     limits: {
//         fileSize: 50 * 1024 * 1024
//     }
// });

// export default upload;









import multer from "multer";


/*
|--------------------------------------------------------------------------
| PDF Upload Middleware
|--------------------------------------------------------------------------
|
| IMPORTANT:
|
| Do NOT use memoryStorage() for large PDFs.
|
| Files are temporarily stored on disk and then streamed
| into MongoDB GridFS by the upload controller.
|
*/


const storage =
    multer.diskStorage({

        destination: (
            req,
            file,
            cb
        ) => {

            cb(
                null,
                "uploads/"
            );
        },


        filename: (
            req,
            file,
            cb
        ) => {

            const timestamp =
                Date.now();

            const random =
                Math.round(
                    Math.random() *
                    1e9
                );

            cb(
                null,
                `${timestamp}-${random}-${file.originalname}`
            );
        }
    });


/*
|--------------------------------------------------------------------------
| PDF File Filter
|--------------------------------------------------------------------------
*/

const fileFilter = (
    req,
    file,
    cb
) => {

    const isPdfMimeType =
        file.mimetype ===
        "application/pdf";


    if (
        isPdfMimeType
    ) {

        cb(
            null,
            true
        );

    } else {

        cb(
            new Error(
                "Only PDF files are allowed."
            )
        );
    }
};


/*
|--------------------------------------------------------------------------
| Multer Configuration
|--------------------------------------------------------------------------
|
| 2 GB maximum upload size.
|
| This is only a maximum protection limit.
| It does NOT allocate 2 GB RAM.
|
*/

const upload =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                2 *
                1024 *
                1024 *
                1024
        }
    });


export default upload;