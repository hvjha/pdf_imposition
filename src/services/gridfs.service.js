// import mongoose from "mongoose";
// import { GridFSBucket } from "mongodb";


// let bucket;


// /*
// |--------------------------------------------------------------------------
// | Initialize GridFS
// |--------------------------------------------------------------------------
// */

// const initializeGridFS = () => {

//     if (bucket) {

//         return bucket;
//     }


//     if (
//         mongoose.connection.readyState !== 1
//     ) {

//         throw new Error(
//             "MongoDB is not connected. Cannot initialize GridFS."
//         );
//     }


//     const db =
//         mongoose.connection.db;


//     if (!db) {

//         throw new Error(
//             "MongoDB database connection is unavailable."
//         );
//     }


//     bucket =
//         new GridFSBucket(

//             db,

//             {
//                 bucketName:
//                     "pdfFiles"
//             }
//         );


//     console.log(
//         "[GRIDFS] Initialized. Bucket: pdfFiles"
//     );


//     return bucket;
// };


// /*
// |--------------------------------------------------------------------------
// | Upload file to GridFS
// |--------------------------------------------------------------------------
// */

// const uploadFileToGridFS = (
//     buffer,
//     filename,
//     mimetype
// ) => {

//     return new Promise(
//         (resolve, reject) => {

//             try {

//                 console.log(
//                     "\n[GRIDFS UPLOAD] Starting..."
//                 );


//                 console.log(
//                     "[GRIDFS UPLOAD] Filename:",
//                     filename
//                 );


//                 console.log(
//                     "[GRIDFS UPLOAD] MIME type:",
//                     mimetype
//                 );


//                 console.log(
//                     "[GRIDFS UPLOAD] Is Buffer:",
//                     Buffer.isBuffer(buffer)
//                 );


//                 console.log(
//                     "[GRIDFS UPLOAD] Buffer size:",
//                     buffer?.length
//                 );


//                 /*
//                 |--------------------------------------------------------------------------
//                 | Validate buffer
//                 |--------------------------------------------------------------------------
//                 */

//                 if (
//                     !Buffer.isBuffer(buffer)
//                 ) {

//                     throw new Error(
//                         "GridFS upload requires a Buffer."
//                     );
//                 }


//                 if (
//                     buffer.length === 0
//                 ) {

//                     throw new Error(
//                         "Cannot upload an empty buffer to GridFS."
//                     );
//                 }


//                 /*
//                 |--------------------------------------------------------------------------
//                 | Validate filename
//                 |--------------------------------------------------------------------------
//                 */

//                 if (
//                     !filename
//                 ) {

//                     throw new Error(
//                         "GridFS filename is required."
//                     );
//                 }


//                 const gridfsBucket =
//                     initializeGridFS();


//                 const uploadStream =
//                     gridfsBucket.openUploadStream(

//                         filename,

//                         {
//                             contentType:
//                                 mimetype,

//                             metadata: {

//                                 originalName:
//                                     filename
//                             }
//                         }
//                     );


//                 uploadStream.on(
//                     "finish",
//                     () => {

//                         console.log(
//                             "[GRIDFS UPLOAD] Completed."
//                         );


//                         console.log(
//                             "[GRIDFS UPLOAD] File ID:",
//                             uploadStream.id.toString()
//                         );


//                         resolve({

//                             fileId:
//                                 uploadStream.id,

//                             filename:
//                                 uploadStream.filename
//                         });
//                     }
//                 );


//                 uploadStream.on(
//                     "error",
//                     (error) => {

//                         console.error(
//                             "[GRIDFS UPLOAD] Error:",
//                             error
//                         );


//                         reject(error);
//                     }
//                 );


//                 uploadStream.end(
//                     buffer
//                 );

//             } catch (error) {

//                 console.error(
//                     "[GRIDFS UPLOAD] Failed:",
//                     error
//                 );


//                 reject(error);
//             }
//         }
//     );
// };


// /*
// |--------------------------------------------------------------------------
// | Download file from GridFS
// |--------------------------------------------------------------------------
// */

// const downloadFileFromGridFS = (
//     fileId
// ) => {

//     return new Promise(
//         (resolve, reject) => {

//             try {

//                 console.log(
//                     "\n[GRIDFS DOWNLOAD] Starting..."
//                 );


//                 console.log(
//                     "[GRIDFS DOWNLOAD] File ID:",
//                     fileId?.toString()
//                 );


//                 /*
//                 |--------------------------------------------------------------------------
//                 | Validate file ID
//                 |--------------------------------------------------------------------------
//                 */

//                 if (!fileId) {

//                     throw new Error(
//                         "GridFS file ID is required."
//                     );
//                 }


//                 const gridfsBucket =
//                     initializeGridFS();


//                 const chunks = [];


//                 const downloadStream =
//                     gridfsBucket.openDownloadStream(
//                         fileId
//                     );


//                 let totalBytes = 0;


//                 downloadStream.on(
//                     "data",
//                     (chunk) => {

//                         const bufferChunk =
//                             Buffer.isBuffer(chunk)
//                                 ? chunk
//                                 : Buffer.from(chunk);


//                         chunks.push(
//                             bufferChunk
//                         );


//                         totalBytes +=
//                             bufferChunk.length;
//                     }
//                 );


//                 downloadStream.on(
//                     "end",
//                     () => {

//                         const buffer =
//                             Buffer.concat(
//                                 chunks
//                             );


//                         console.log(
//                             "[GRIDFS DOWNLOAD] Completed."
//                         );


//                         console.log(
//                             "[GRIDFS DOWNLOAD] Chunks:",
//                             chunks.length
//                         );


//                         console.log(
//                             "[GRIDFS DOWNLOAD] Stream bytes:",
//                             totalBytes
//                         );


//                         console.log(
//                             "[GRIDFS DOWNLOAD] Final buffer:",
//                             buffer.length,
//                             "bytes"
//                         );


//                         console.log(
//                             "[GRIDFS DOWNLOAD] Is Buffer:",
//                             Buffer.isBuffer(buffer)
//                         );


//                         if (
//                             buffer.length === 0
//                         ) {

//                             reject(
//                                 new Error(
//                                     "GridFS file downloaded but buffer is empty."
//                                 )
//                             );

//                             return;
//                         }


//                         resolve(
//                             buffer
//                         );
//                     }
//                 );


//                 downloadStream.on(
//                     "error",
//                     (error) => {

//                         console.error(
//                             "[GRIDFS DOWNLOAD] Stream error:",
//                             error
//                         );


//                         reject(error);
//                     }
//                 );

//             } catch (error) {

//                 console.error(
//                     "[GRIDFS DOWNLOAD] Failed:",
//                     error
//                 );


//                 reject(error);
//             }
//         }
//     );
// };


// /*
// |--------------------------------------------------------------------------
// | Exports
// |--------------------------------------------------------------------------
// */

// export {
//     initializeGridFS,
//     uploadFileToGridFS,
//     downloadFileFromGridFS
// };






import mongoose from "mongoose";

import {
    GridFSBucket
} from "mongodb";

import fs from "fs";


let bucket;


/*
|--------------------------------------------------------------------------
| Initialize GridFS
|--------------------------------------------------------------------------
*/

const initializeGridFS = () => {

    if (
        bucket
    ) {

        return bucket;
    }


    if (
        mongoose.connection.readyState !== 1
    ) {

        throw new Error(
            "MongoDB is not connected. Cannot initialize GridFS."
        );
    }


    const db =
        mongoose.connection.db;


    if (
        !db
    ) {

        throw new Error(
            "MongoDB database connection is unavailable."
        );
    }


    bucket =
        new GridFSBucket(

            db,

            {
                bucketName:
                    "pdfFiles"
            }
        );


    console.log(
        "[GRIDFS] Initialized. Bucket: pdfFiles"
    );


    return bucket;
};


/*
|--------------------------------------------------------------------------
| Upload Buffer To GridFS
|--------------------------------------------------------------------------
|
| Kept for existing Phase 3 / Phase 5 code.
|
*/

const uploadFileToGridFS = (
    buffer,
    filename,
    mimetype
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            try {

                console.log(
                    "\n[GRIDFS BUFFER UPLOAD] Starting..."
                );


                if (
                    !Buffer.isBuffer(
                        buffer
                    )
                ) {

                    throw new Error(
                        "GridFS buffer upload requires a Buffer."
                    );
                }


                if (
                    buffer.length === 0
                ) {

                    throw new Error(
                        "Cannot upload an empty buffer to GridFS."
                    );
                }


                if (
                    !filename
                ) {

                    throw new Error(
                        "GridFS filename is required."
                    );
                }


                const gridfsBucket =
                    initializeGridFS();


                const uploadStream =
                    gridfsBucket.openUploadStream(

                        filename,

                        {

                            contentType:
                                mimetype,

                            metadata: {

                                originalName:
                                    filename
                            }
                        }
                    );


                uploadStream.on(
                    "finish",
                    () => {

                        console.log(
                            "[GRIDFS BUFFER UPLOAD] Completed."
                        );


                        resolve({

                            fileId:
                                uploadStream.id,

                            filename:
                                uploadStream.filename
                        });
                    }
                );


                uploadStream.on(
                    "error",
                    (error) => {

                        console.error(
                            "[GRIDFS BUFFER UPLOAD] Error:",
                            error
                        );


                        reject(
                            error
                        );
                    }
                );


                uploadStream.end(
                    buffer
                );

            } catch (
                error
            ) {

                console.error(
                    "[GRIDFS BUFFER UPLOAD] Failed:",
                    error
                );


                reject(
                    error
                );
            }
        }
    );
};


/*
|--------------------------------------------------------------------------
| Upload File Stream To GridFS
|--------------------------------------------------------------------------
|
| This is the new large-file upload method.
|
| Flow:
|
| Temporary file
|       ↓
| Read Stream
|       ↓
| GridFS Upload Stream
|       ↓
| MongoDB
|
| The complete PDF is NEVER loaded into RAM.
|
*/

const uploadFileStreamToGridFS = (
    filePath,
    filename,
    mimetype,
    metadata = {}
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            let uploadStream;
            let readStream;

            try {

                console.log(
                    "\n[GRIDFS STREAM UPLOAD] Starting..."
                );


                console.log(
                    "[GRIDFS STREAM UPLOAD] File:",
                    filename
                );


                console.log(
                    "[GRIDFS STREAM UPLOAD] Path:",
                    filePath
                );


                /*
                |--------------------------------------------------------------------------
                | Validate file
                |--------------------------------------------------------------------------
                */

                if (
                    !filePath
                ) {

                    throw new Error(
                        "File path is required."
                    );
                }


                if (
                    !filename
                ) {

                    throw new Error(
                        "GridFS filename is required."
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | Check file exists
                |--------------------------------------------------------------------------
                */

                if (
                    !fs.existsSync(
                        filePath
                    )
                ) {

                    throw new Error(
                        "Temporary upload file does not exist."
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | Initialize GridFS
                |--------------------------------------------------------------------------
                */

                const gridfsBucket =
                    initializeGridFS();


                /*
                |--------------------------------------------------------------------------
                | Create GridFS upload stream
                |--------------------------------------------------------------------------
                */

                uploadStream =
                    gridfsBucket.openUploadStream(

                        filename,

                        {

                            contentType:
                                mimetype,

                            metadata: {

                                originalName:
                                    filename,

                                ...metadata
                            }
                        }
                    );


                /*
                |--------------------------------------------------------------------------
                | Create local read stream
                |--------------------------------------------------------------------------
                */

                readStream =
                    fs.createReadStream(
                        filePath
                    );


                /*
                |--------------------------------------------------------------------------
                | Read stream error
                |--------------------------------------------------------------------------
                */

                readStream.on(
                    "error",
                    (
                        error
                    ) => {

                        console.error(
                            "[GRIDFS STREAM UPLOAD] Read error:",
                            error
                        );


                        uploadStream.destroy(
                            error
                        );


                        reject(
                            error
                        );
                    }
                );


                /*
                |--------------------------------------------------------------------------
                | GridFS upload error
                |--------------------------------------------------------------------------
                */

                uploadStream.on(
                    "error",
                    (
                        error
                    ) => {

                        console.error(
                            "[GRIDFS STREAM UPLOAD] GridFS error:",
                            error
                        );


                        reject(
                            error
                        );
                    }
                );


                /*
                |--------------------------------------------------------------------------
                | Upload complete
                |--------------------------------------------------------------------------
                */

                uploadStream.on(
                    "finish",
                    () => {

                        console.log(
                            "[GRIDFS STREAM UPLOAD] Completed."
                        );


                        console.log(
                            "[GRIDFS STREAM UPLOAD] File ID:",
                            uploadStream.id.toString()
                        );


                        resolve({

                            fileId:
                                uploadStream.id,

                            filename:
                                uploadStream.filename
                        });
                    }
                );


                /*
                |--------------------------------------------------------------------------
                | Start streaming
                |--------------------------------------------------------------------------
                */

                readStream.pipe(
                    uploadStream
                );

            } catch (
                error
            ) {

                console.error(
                    "[GRIDFS STREAM UPLOAD] Failed:",
                    error
                );


                if (
                    readStream
                ) {

                    readStream.destroy();
                }


                if (
                    uploadStream
                ) {

                    uploadStream.destroy();
                }


                reject(
                    error
                );
            }
        }
    );
};


/*
|--------------------------------------------------------------------------
| Download File From GridFS
|--------------------------------------------------------------------------
|
| Kept compatible with your existing Analyzer and
| Imposition engine.
|
| IMPORTANT:
|
| This still returns a Buffer because your current
| Phase 3 / Phase 5 engines expect PDF bytes.
|
*/

// const downloadFileFromGridFS = (
//     fileId
// ) => {

//     return new Promise(
//         (
//             resolve,
//             reject
//         ) => {

//             try {

//                 console.log(
//                     "\n[GRIDFS DOWNLOAD] Starting..."
//                 );


//                 if (
//                     !fileId
//                 ) {

//                     throw new Error(
//                         "GridFS file ID is required."
//                     );
//                 }


//                 const gridfsBucket =
//                     initializeGridFS();


//                 const chunks = [];


//                 let totalBytes =
//                     0;


//                 const downloadStream =
//                     gridfsBucket.openDownloadStream(
//                         fileId
//                     );


//                 downloadStream.on(
//                     "data",
//                     (
//                         chunk
//                     ) => {

//                         const bufferChunk =
//                             Buffer.isBuffer(
//                                 chunk
//                             )
//                                 ? chunk
//                                 : Buffer.from(
//                                     chunk
//                                 );


//                         chunks.push(
//                             bufferChunk
//                         );


//                         totalBytes +=
//                             bufferChunk.length;
//                     }
//                 );


//                 downloadStream.on(
//                     "end",
//                     () => {

//                         const buffer =
//                             Buffer.concat(
//                                 chunks
//                             );


//                         console.log(
//                             "[GRIDFS DOWNLOAD] Completed."
//                         );


//                         console.log(
//                             "[GRIDFS DOWNLOAD] Bytes:",
//                             totalBytes
//                         );


//                         if (
//                             buffer.length === 0
//                         ) {

//                             reject(
//                                 new Error(
//                                     "GridFS file downloaded but buffer is empty."
//                                 )
//                             );


//                             return;
//                         }


//                         resolve(
//                             buffer
//                         );
//                     }
//                 );


//                 downloadStream.on(
//                     "error",
//                     (
//                         error
//                     ) => {

//                         console.error(
//                             "[GRIDFS DOWNLOAD] Error:",
//                             error
//                         );


//                         reject(
//                             error
//                         );
//                     }
//                 );

//             } catch (
//                 error
//             ) {

//                 console.error(
//                     "[GRIDFS DOWNLOAD] Failed:",
//                     error
//                 );


//                 reject(
//                     error
//                 );
//             }
//         }
//     );
// };

const downloadFileFromGridFS = (
    fileId
) => {

    return new Promise(
        (
            resolve,
            reject
        ) => {

            try {

                console.log(
                    "\n[GRIDFS DOWNLOAD] Starting..."
                );

                console.log(
                    "[GRIDFS DOWNLOAD] File ID:",
                    fileId
                );


                if (!fileId) {

                    throw new Error(
                        "GridFS file ID is required."
                    );
                }


                // -----------------------------------------
                // Validate MongoDB ObjectId
                // -----------------------------------------

                if (
                    !mongoose.Types.ObjectId.isValid(fileId)
                ) {

                    throw new Error(
                        `Invalid GridFS file ID: ${fileId}`
                    );
                }


                // -----------------------------------------
                // Convert string -> ObjectId
                // -----------------------------------------

                const objectId =
                    new mongoose.Types.ObjectId(
                        fileId
                    );


                console.log(
                    "[GRIDFS DOWNLOAD] ObjectId:",
                    objectId.toString()
                );


                // -----------------------------------------
                // Initialize GridFS
                // -----------------------------------------

                const gridfsBucket =
                    initializeGridFS();


                const chunks = [];

                let totalBytes = 0;


                // -----------------------------------------
                // Download from GridFS
                // -----------------------------------------

                const downloadStream =
                    gridfsBucket.openDownloadStream(
                        objectId
                    );


                downloadStream.on(
                    "data",
                    (
                        chunk
                    ) => {

                        const bufferChunk =
                            Buffer.isBuffer(chunk)
                                ? chunk
                                : Buffer.from(chunk);


                        chunks.push(
                            bufferChunk
                        );


                        totalBytes +=
                            bufferChunk.length;
                    }
                );


                downloadStream.on(
                    "end",
                    () => {

                        const buffer =
                            Buffer.concat(
                                chunks
                            );


                        console.log(
                            "[GRIDFS DOWNLOAD] Completed."
                        );


                        console.log(
                            "[GRIDFS DOWNLOAD] Bytes:",
                            totalBytes
                        );


                        if (
                            buffer.length === 0
                        ) {

                            reject(
                                new Error(
                                    "GridFS file downloaded but buffer is empty."
                                )
                            );

                            return;
                        }


                        resolve(
                            buffer
                        );
                    }
                );


                downloadStream.on(
                    "error",
                    (
                        error
                    ) => {

                        console.error(
                            "[GRIDFS DOWNLOAD] Error:",
                            error
                        );


                        reject(
                            error
                        );
                    }
                );

            } catch (
                error
            ) {

                console.error(
                    "[GRIDFS DOWNLOAD] Failed:",
                    error
                );


                reject(
                    error
                );
            }
        }
    );
};
/*
|--------------------------------------------------------------------------
| Delete GridFS File
|--------------------------------------------------------------------------
*/

// const deleteFileFromGridFS = (
//     fileId
// ) => {

//     return new Promise(
//         async (
//             resolve,
//             reject
//         ) => {

//             try {

//                 if (
//                     !fileId
//                 ) {

//                     throw new Error(
//                         "GridFS file ID is required."
//                     );
//                 }


//                 const gridfsBucket =
//                     initializeGridFS();


//                 await gridfsBucket.delete(
//                     fileId
//                 );


//                 resolve(
//                     true
//                 );

//             } catch (
//                 error
//             ) {

//                 reject(
//                     error
//                 );
//             }
//         }
//     );
// };

const deleteFileFromGridFS = (
    fileId
) => {

    return new Promise(
        async (
            resolve,
            reject
        ) => {

            try {

                if (!fileId) {
                    throw new Error(
                        "GridFS file ID is required."
                    );
                }


                if (
                    !mongoose.Types.ObjectId.isValid(fileId)
                ) {
                    throw new Error(
                        `Invalid GridFS file ID: ${fileId}`
                    );
                }


                const gridfsBucket =
                    initializeGridFS();


                const objectId =
                    new mongoose.Types.ObjectId(
                        fileId
                    );


                await gridfsBucket.delete(
                    objectId
                );


                resolve(true);

            } catch (
                error
            ) {

                reject(error);
            }
        }
    );
};
/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

export {

    initializeGridFS,

    uploadFileToGridFS,

    uploadFileStreamToGridFS,

    downloadFileFromGridFS,

    deleteFileFromGridFS
};