import express from 'express';

import upload from '../middleware/upload.middleware.js';
import { uploadPdf } from '../controllers/pdf.controller.js';
import { analyzeProductionPdf } from '../controllers/pdfAnalyzer.controller.js';
import { validateProductionPdf } from '../controllers/pdfValidation.controller.js';
import { cropProductionPdf } from '../controllers/pdfCrop.controller.js';
import { getOutputPdf } from '../controllers/pdfOutput.controller.js';

const router = express.Router();
// router.post('/upload', upload.single('pdf'), uploadPdf);
router.post('/upload', upload.single('file'), uploadPdf);
router.post("/:jobId/analyze", analyzeProductionPdf);
router.post("/:jobId/validate", validateProductionPdf);
router.post("/:jobId/crop",cropProductionPdf);
router.get("/:jobId/output",getOutputPdf);
export default router;