import multer from "multer";
import fs from "fs";
import path from "path";

/*
|--------------------------------------------------------------------------
| PDF Upload Middleware
|--------------------------------------------------------------------------
| Secure temporary disk staging with auto directory creation,
| path traversal protection, and mime/extension verification.
| Files are streamed directly into MongoDB GridFS and unlinked.
|--------------------------------------------------------------------------
*/

const UPLOAD_DIR = "uploads";
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (!fs.existsSync(UPLOAD_DIR)) {
            fs.mkdirSync(UPLOAD_DIR, { recursive: true });
        }
        cb(null, UPLOAD_DIR);
    },

    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const random = Math.round(Math.random() * 1e9);
        // Security: sanitize original filename to eliminate directory traversal or harmful characters
        const cleanBaseName = path.basename(file.originalname).replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${timestamp}-${random}-${cleanBaseName}`);
    }
});

/*
|--------------------------------------------------------------------------
| PDF File Filter (Security verification)
|--------------------------------------------------------------------------
*/
const fileFilter = (req, file, cb) => {
    const isPdfMimeType = file.mimetype === "application/pdf" || file.mimetype === "application/x-pdf";
    const hasPdfExtension = path.extname(file.originalname).toLowerCase() === ".pdf";

    if (isPdfMimeType || hasPdfExtension) {
        cb(null, true);
    } else {
        cb(new Error("Security violation: Only valid PDF documents (.pdf) are permitted."));
    }
};

/*
|--------------------------------------------------------------------------
| Multer Configuration
|--------------------------------------------------------------------------
| 2 GB maximum upload stream protection limit.
|--------------------------------------------------------------------------
*/
const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 2 * 1024 * 1024 * 1024 // 2 GB
    }
});

export default upload;