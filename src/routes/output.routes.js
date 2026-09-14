import express from "express";

import {
    downloadOutputPdf
} from "../controllers/output.controller.js";


const router =
    express.Router();


router.get(
    "/:fileId",
    downloadOutputPdf
);


export default router;