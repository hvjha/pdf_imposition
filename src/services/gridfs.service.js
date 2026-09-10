import mongoose from "mongoose";
import { GridFSBucket } from "mongodb";


let bucket;


/*
|--------------------------------------------------------------------------
| Initialize GridFS
|--------------------------------------------------------------------------
*/

const initializeGridFS = () => {

    if (bucket) {

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


    if (!db) {

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
| Upload file to GridFS
|--------------------------------------------------------------------------
*/

const uploadFileToGridFS = (
    buffer,
    filename,
    mimetype
) => {

    return new Promise(
        (resolve, reject) => {

            try {

                console.log(
                    "\n[GRIDFS UPLOAD] Starting..."
                );


                console.log(
                    "[GRIDFS UPLOAD] Filename:",
                    filename
                );


                console.log(
                    "[GRIDFS UPLOAD] MIME type:",
                    mimetype
                );


                console.log(
                    "[GRIDFS UPLOAD] Is Buffer:",
                    Buffer.isBuffer(buffer)
                );


                console.log(
                    "[GRIDFS UPLOAD] Buffer size:",
                    buffer?.length
                );


                /*
                |--------------------------------------------------------------------------
                | Validate buffer
                |--------------------------------------------------------------------------
                */

                if (
                    !Buffer.isBuffer(buffer)
                ) {

                    throw new Error(
                        "GridFS upload requires a Buffer."
                    );
                }


                if (
                    buffer.length === 0
                ) {

                    throw new Error(
                        "Cannot upload an empty buffer to GridFS."
                    );
                }


                /*
                |--------------------------------------------------------------------------
                | Validate filename
                |--------------------------------------------------------------------------
                */

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
                            "[GRIDFS UPLOAD] Completed."
                        );


                        console.log(
                            "[GRIDFS UPLOAD] File ID:",
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


                uploadStream.on(
                    "error",
                    (error) => {

                        console.error(
                            "[GRIDFS UPLOAD] Error:",
                            error
                        );


                        reject(error);
                    }
                );


                uploadStream.end(
                    buffer
                );

            } catch (error) {

                console.error(
                    "[GRIDFS UPLOAD] Failed:",
                    error
                );


                reject(error);
            }
        }
    );
};


/*
|--------------------------------------------------------------------------
| Download file from GridFS
|--------------------------------------------------------------------------
*/

const downloadFileFromGridFS = (
    fileId
) => {

    return new Promise(
        (resolve, reject) => {

            try {

                console.log(
                    "\n[GRIDFS DOWNLOAD] Starting..."
                );


                console.log(
                    "[GRIDFS DOWNLOAD] File ID:",
                    fileId?.toString()
                );


                /*
                |--------------------------------------------------------------------------
                | Validate file ID
                |--------------------------------------------------------------------------
                */

                if (!fileId) {

                    throw new Error(
                        "GridFS file ID is required."
                    );
                }


                const gridfsBucket =
                    initializeGridFS();


                const chunks = [];


                const downloadStream =
                    gridfsBucket.openDownloadStream(
                        fileId
                    );


                let totalBytes = 0;


                downloadStream.on(
                    "data",
                    (chunk) => {

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
                            "[GRIDFS DOWNLOAD] Chunks:",
                            chunks.length
                        );


                        console.log(
                            "[GRIDFS DOWNLOAD] Stream bytes:",
                            totalBytes
                        );


                        console.log(
                            "[GRIDFS DOWNLOAD] Final buffer:",
                            buffer.length,
                            "bytes"
                        );


                        console.log(
                            "[GRIDFS DOWNLOAD] Is Buffer:",
                            Buffer.isBuffer(buffer)
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
                    (error) => {

                        console.error(
                            "[GRIDFS DOWNLOAD] Stream error:",
                            error
                        );


                        reject(error);
                    }
                );

            } catch (error) {

                console.error(
                    "[GRIDFS DOWNLOAD] Failed:",
                    error
                );


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
    downloadFileFromGridFS
};