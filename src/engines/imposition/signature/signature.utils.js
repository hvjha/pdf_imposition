const SUPPORTED_BINDINGS = [
    "PERFECT_BINDING",
    "SADDLE_STITCH",
    "CENTER_PIN",
    "CASE_BINDING",
    "WIRE_O",
    "FLAT"
];


const SUPPORTED_ORIENTATIONS = [
    "PORTRAIT",
    "LANDSCAPE",
    "AUTO"
];


const normalizeBindingType = (
    bindingType = "PERFECT_BINDING"
) => {

    const normalized =
        String(bindingType)
            .trim()
            .toUpperCase();


    if (
        !SUPPORTED_BINDINGS.includes(
            normalized
        )
    ) {

        throw new Error(
            `Unsupported binding type: ${bindingType}`
        );

    }


    return normalized;
};


const normalizeOrientation = (
    orientation = "AUTO"
) => {

    const normalized =
        String(orientation)
            .trim()
            .toUpperCase();


    if (
        !SUPPORTED_ORIENTATIONS.includes(
            normalized
        )
    ) {

        throw new Error(
            `Unsupported orientation: ${orientation}`
        );

    }


    return normalized;
};


const validatePagesPerLayout = (
    pagesPerLayout
) => {

    const supported =
        [2, 4, 8, 16];


    if (
        !supported.includes(
            pagesPerLayout
        )
    ) {

        throw new Error(
            "Pages per layout must be 2, 4, 8 or 16."
        );

    }


    return true;
};


export {
    SUPPORTED_BINDINGS,
    SUPPORTED_ORIENTATIONS,
    normalizeBindingType,
    normalizeOrientation,
    validatePagesPerLayout
};