import express from "express";

import {
    imposePdf,
    detectArtworkMargins
} from "../controllers/imposition.controller.js";


const router = express.Router();


router.get(
    "/:jobId/detect-margins",
    detectArtworkMargins
);

router.post(
    "/:jobId/impose",
    imposePdf
);


export default router;