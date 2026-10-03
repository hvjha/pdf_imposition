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


    // Ensure essential GridFS indexes to prevent 32MB in-memory sort limit errors on large files
    db.collection("pdfFiles.chunks")
        .createIndex({ files_id: 1, n: 1 }, { unique: true, background: true })
        .catch(err => console.warn("[GRIDFS] Error ensuring chunks index:", err.message));

    db.collection("pdfFiles.files")
        .createIndex({ filename: 1, uploadDate: 1 }, { background: true })
        .catch(err => console.warn("[GRIDFS] Error ensuring files index:", err.message));


    console.log(
        "[GRIDFS] Initialized. Bucket: pdfFiles (Indexes verified)"
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