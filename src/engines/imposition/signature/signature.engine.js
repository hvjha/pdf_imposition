import {
    normalizeBindingType,
    normalizeOrientation,
    validatePagesPerLayout
} from "./signature.utils.js";


// =====================================================
// SEQUENTIAL SIGNATURE
// =====================================================

const createSequentialSignature = ({
    pagesPerLayout
}) => {

    validatePagesPerLayout(
        pagesPerLayout
    );


    const positions = [];


    for (
        let position = 1;
        position <= pagesPerLayout;
        position++
    ) {

        positions.push({

            position,

            sourcePage:
                position,

            rotation: 0
        });
    }


    return {
        pagesPerLayout,
        positions
    };
};


// =====================================================
// PERFECT BINDING
// =====================================================
//
// IMPORTANT:
// This is the initial production implementation.
//
// Exact Preps page sequencing will be refined once
// we compare your actual Preps reference files.
//

const createPerfectBindingSignature = ({
    pagesPerLayout
}) => {

    return createSequentialSignature({
        pagesPerLayout
    });
};


// =====================================================
// SADDLE STITCH / CENTER PIN
// =====================================================
//
// Standard booklet-style signature ordering.
//
// Example 8 pages:
//
// Position 1 -> 8
// Position 2 -> 1
// Position 3 -> 2
// Position 4 -> 7
// Position 5 -> 6
// Position 6 -> 3
// Position 7 -> 4
// Position 8 -> 5
//
// This remains a provisional signature until verified
// against your actual Preps output.
//

const createSaddleStitchSignature = ({
    pagesPerLayout
}) => {

    validatePagesPerLayout(
        pagesPerLayout
    );


    if (
        pagesPerLayout % 4 !== 0
    ) {

        /*
         * 2-page saddle/center-pin is not a
         * conventional booklet signature.
         *
         * Keep sequential behavior for it.
         */

        return createSequentialSignature({
            pagesPerLayout
        });
    }


    const positions = [];


    let low = 1;
    let high = pagesPerLayout;


    while (
        low < high
    ) {

        /*
         * Outside pair
         */

        positions.push({

            position:
                positions.length + 1,

            sourcePage:
                high,

            rotation: 180
        });


        positions.push({

            position:
                positions.length + 1,

            sourcePage:
                low,

            rotation: 180
        });


        high--;
        low++;


        /*
         * Inside pair
         */

        positions.push({

            position:
                positions.length + 1,

            sourcePage:
                low,

            rotation: 0
        });


        positions.push({

            position:
                positions.length + 1,

            sourcePage:
                high,

            rotation: 0
        });


        low++;
        high--;
    }


    return {
        pagesPerLayout,
        positions
    };
};


// =====================================================
// CASE BINDING
// =====================================================

const createCaseBindingSignature = ({
    pagesPerLayout
}) => {

    return createSequentialSignature({
        pagesPerLayout
    });
};


// =====================================================
// WIRE-O
// =====================================================

const createWireOSignature = ({
    pagesPerLayout
}) => {

    return createSequentialSignature({
        pagesPerLayout
    });
};


// =====================================================
// FLAT / LOOSE
// =====================================================

const createFlatSignature = ({
    pagesPerLayout
}) => {

    return createSequentialSignature({
        pagesPerLayout
    });
};


// =====================================================
// MAIN SIGNATURE FACTORY
// =====================================================

const createSignature = ({
    pagesPerLayout,
    bindingType = "PERFECT_BINDING",
    orientation = "AUTO"
}) => {

    validatePagesPerLayout(
        pagesPerLayout
    );


    const normalizedBinding =
        normalizeBindingType(
            bindingType
        );


    const normalizedOrientation =
        normalizeOrientation(
            orientation
        );


    let signature;


    switch (
        normalizedBinding
    ) {

        case "PERFECT_BINDING":

            signature =
                createPerfectBindingSignature({
                    pagesPerLayout
                });

            break;


        case "SADDLE_STITCH":

            signature =
                createSaddleStitchSignature({
                    pagesPerLayout
                });

            break;


        case "CENTER_PIN":

            signature =
                createSaddleStitchSignature({
                    pagesPerLayout
                });

            break;


        case "CASE_BINDING":

            signature =
                createCaseBindingSignature({
                    pagesPerLayout
                });

            break;


        case "WIRE_O":

            signature =
                createWireOSignature({
                    pagesPerLayout
                });

            break;


        case "FLAT":

            signature =
                createFlatSignature({
                    pagesPerLayout
                });

            break;


        default:

            throw new Error(
                `Unsupported binding type: ${normalizedBinding}`
            );
    }


    return {

        ...signature,

        bindingType:
            normalizedBinding,

        orientation:
            normalizedOrientation
    };
};


export {
    createSequentialSignature,
    createPerfectBindingSignature,
    createSaddleStitchSignature,
    createCaseBindingSignature,
    createWireOSignature,
    createFlatSignature,
    createSignature
};