import express from "express";

import {
    imposePdf
} from "../controllers/imposition.controller.js";


const router = express.Router();


router.post(
    "/:jobId/impose",
    imposePdf
);


export default router;