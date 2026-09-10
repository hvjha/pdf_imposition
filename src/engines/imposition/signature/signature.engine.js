import {
    normalizeBindingType,
    normalizeOrientation,
    validatePagesPerLayout
} from "./signature.utils.js";


/*
 * ----------------------------------------------------
 * IMPORTANT
 * ----------------------------------------------------
 *
 * This engine separates:
 *
 * 1. Physical position
 * 2. Source page number
 * 3. Rotation
 * 4. Binding type
 *
 * The exact production sequence for each binding
 * will be configured here rather than hard-coded
 * inside the PDF drawing engine.
 *
 * ----------------------------------------------------
 */


const createSequentialSignature = ({
    pagesPerLayout
}) => {

    validatePagesPerLayout(
        pagesPerLayout
    );


    return Array.from(
        {
            length: pagesPerLayout
        },
        (_, index) => ({

            position:
                index + 1,

            sourcePage:
                index + 1,

            rotation:
                0

        })
    );
};


const createPerfectBindingSignature = ({
    pagesPerLayout
}) => {

    validatePagesPerLayout(
        pagesPerLayout
    );


    /*
     * Temporary base sequence.
     *
     * We will replace this with the exact
     * production sequence from your team's
     * Prinergy/Preps references.
     */

    return createSequentialSignature({
        pagesPerLayout
    });
};


const createSaddleStitchSignature = ({
    pagesPerLayout
}) => {

    validatePagesPerLayout(
        pagesPerLayout
    );


    if (pagesPerLayout < 4) {

        throw new Error(
            "Saddle stitch requires at least 4 pages."
        );

    }


    const signature = [];


    let left =
        pagesPerLayout;

    let right =
        1;


    while (
        left > right
    ) {

        signature.push({

            position:
                signature.length + 1,

            sourcePage:
                left,

            rotation:
                180

        });


        signature.push({

            position:
                signature.length + 1,

            sourcePage:
                right,

            rotation:
                180

        });


        left--;
        right++;


        if (
            left >= right
        ) {

            signature.push({

                position:
                    signature.length + 1,

                sourcePage:
                    right,

                rotation:
                    0

            });


            signature.push({

                position:
                    signature.length + 1,

                sourcePage:
                    left,

                rotation:
                    0

            });


            left--;
            right++;

        }

    }


    return signature;
};


const createSignature = ({
    pagesPerLayout,
    bindingType = "PERFECT_BINDING",
    orientation = "AUTO"
}) => {

    validatePagesPerLayout(
        pagesPerLayout
    );


    const binding =
        normalizeBindingType(
            bindingType
        );


    const normalizedOrientation =
        normalizeOrientation(
            orientation
        );


    let pageAssignments;


    switch (binding) {

        case "PERFECT_BINDING":

            pageAssignments =
                createPerfectBindingSignature({
                    pagesPerLayout
                });

            break;


        case "SADDLE_STITCH":

        case "CENTER_PIN":

            pageAssignments =
                createSaddleStitchSignature({
                    pagesPerLayout
                });

            break;


        case "CASE_BINDING":

        case "WIRE_O":

        case "FLAT":

            pageAssignments =
                createSequentialSignature({
                    pagesPerLayout
                });

            break;


        default:

            throw new Error(
                `Unsupported binding type: ${binding}`
            );

    }


    return {

        pagesPerLayout,

        bindingType:
            binding,

        orientation:
            normalizedOrientation,

        pageAssignments

    };

};


export {
    createSignature,
    createPerfectBindingSignature,
    createSaddleStitchSignature
};