import mongoose from "mongoose";

import ProductionJob from "../models/productionJob.model.js";

import {
    validatePdfAnalysis
} from "../engines/validation/pdfValidation.engine.js";


const validateProductionPdf = async (req, res) => {

    try {

        const { jobId } = req.params;


        if (
            !jobId ||
            !mongoose.Types.ObjectId.isValid(jobId)
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Invalid job ID."
            });
        }


        const job =
            await ProductionJob.findById(
                jobId
            );


        if (!job) {

            return res.status(404).json({

                success: false,

                message:
                    "Production job not found."
            });
        }


        /*
            Validation requires analysis first
        */

        if (!job.analysis) {

            return res.status(400).json({

                success: false,

                message:
                    "PDF must be analyzed before validation."
            });
        }


        job.status = "VALIDATING";

        await job.save();


        /*
            Run validation
        */

        const validation =
            validatePdfAnalysis(
                job.analysis
            );


        /*
            Save validation result
        */

        job.validation = validation;


        if (validation.valid) {

            /*
                Valid PDF but possibly missing
                production information.
            */

            job.status =
                validation.productionReady
                    ? "VALIDATED"
                    : "ANALYZED";

        } else {

            job.status = "FAILED";

            job.errorMessage =
                validation.errors.join("; ");
        }


        await job.save();


        return res.status(200).json({

            success: true,

            message:
                "PDF validation completed.",

            job: {

                jobId:
                    job._id,

                originalFileName:
                    job.originalFileName,

                status:
                    job.status,

                validation
            }
        });


    } catch (error) {

        console.error(
            "PDF validation error:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Failed to validate PDF.",

            error:
                error.message
        });
    }
};


export {
    validateProductionPdf
};