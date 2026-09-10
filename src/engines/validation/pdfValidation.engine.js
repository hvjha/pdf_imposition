const validatePage = (page) => {

    const errors = [];
    const warnings = [];


    if (!page.source) {
        errors.push(
            "Source geometry is missing."
        );

        return {
            pageNumber: page.pageNumber,
            valid: false,
            errors,
            warnings
        };
    }


    const {
        widthPt,
        heightPt,
        widthInches,
        heightInches,
        orientation,
        rotation
    } = page.source;


    /*
        Basic dimension validation
    */

    if (
        !Number.isFinite(widthPt) ||
        !Number.isFinite(heightPt) ||
        widthPt <= 0 ||
        heightPt <= 0
    ) {
        errors.push(
            "Invalid page dimensions."
        );
    }


    /*
        Rotation validation
    */

    const allowedRotations = [
        0,
        90,
        180,
        270
    ];


    if (
        !allowedRotations.includes(rotation)
    ) {
        errors.push(
            `Unsupported page rotation: ${rotation}°`
        );
    }


    /*
        Box validation
    */

    const boxRelationship =
        page.boxRelationship;


    if (!boxRelationship) {

        errors.push(
            "Box relationship information is missing."
        );

    } else {

        if (
            boxRelationship
                .trimEqualsMedia
        ) {
            warnings.push(
                "TrimBox is identical to MediaBox."
            );
        }


        if (
            boxRelationship
                .bleedEqualsMedia
        ) {
            warnings.push(
                "BleedBox is identical to MediaBox."
            );
        }


        if (
            boxRelationship
                .cropEqualsMedia
        ) {
            warnings.push(
                "CropBox is identical to MediaBox."
            );
        }


        if (
            !boxRelationship
                .separateTrimDetected
            &&
            !boxRelationship
                .separateBleedDetected
        ) {
            warnings.push(
                "No separate trim or bleed information detected."
            );
        }
    }


    return {

        pageNumber:
            page.pageNumber,

        valid:
            errors.length === 0,

        source: {

            widthPt,

            heightPt,

            widthInches,

            heightInches,

            orientation,

            rotation
        },

        errors,

        warnings
    };
};


const validatePdfAnalysis = (analysis) => {

    const errors = [];
    const warnings = [];


    if (!analysis) {

        return {

            valid: false,

            productionReady: false,

            requiresProductionRule: true,

            errors: [
                "PDF analysis is missing."
            ],

            warnings: [],

            pages: []
        };
    }


    if (
        !Number.isInteger(
            analysis.pageCount
        )
        ||
        analysis.pageCount <= 0
    ) {

        errors.push(
            "Invalid PDF page count."
        );
    }


    if (
        !Array.isArray(
            analysis.pages
        )
    ) {

        errors.push(
            "Page analysis data is missing."
        );
    }


    if (errors.length > 0) {

        return {

            valid: false,

            productionReady: false,

            requiresProductionRule: true,

            errors,

            warnings,

            pages: []
        };
    }


    if (
        analysis.pageCount !==
        analysis.pages.length
    ) {

        errors.push(
            `Page count mismatch: PDF reports ${analysis.pageCount} pages but analyzer returned ${analysis.pages.length}.`
        );
    }


    const pageResults =
        analysis.pages.map(
            validatePage
        );


    pageResults.forEach(
        (page) => {

            warnings.push(
                ...page.warnings.map(
                    (warning) =>
                        `Page ${page.pageNumber}: ${warning}`
                )
            );


            errors.push(
                ...page.errors.map(
                    (error) =>
                        `Page ${page.pageNumber}: ${error}`
                )
            );
        }
    );


    /*
        Document-level checks
    */

    const firstPage =
        analysis.pages[0];


    const allPagesSameSize =
        analysis.pages.every(
            (page) =>
                page.source.widthPt ===
                    firstPage.source.widthPt
                &&
                page.source.heightPt ===
                    firstPage.source.heightPt
        );


    if (!allPagesSameSize) {

        warnings.push(
            "PDF contains pages with different dimensions."
        );
    }


    const allPagesSameOrientation =
        analysis.pages.every(
            (page) =>
                page.source.orientation ===
                firstPage.source.orientation
        );


    if (!allPagesSameOrientation) {

        warnings.push(
            "PDF contains pages with different orientations."
        );
    }


    /*
        Trim / bleed detection
    */

    const trimAvailable =
        analysis.pages.every(
            (page) =>
                page.boxRelationship
                    ?.separateTrimDetected
        );


    const bleedAvailable =
        analysis.pages.every(
            (page) =>
                page.boxRelationship
                    ?.separateBleedDetected
        );


    const trimInformationAvailable =
        trimAvailable;


    const bleedInformationAvailable =
        bleedAvailable;


    const requiresProductionRule =
        !trimInformationAvailable &&
        !bleedInformationAvailable;


    /*
        Final production readiness
    */

    const valid =
        errors.length === 0;


    const productionReady =
        valid &&
        !requiresProductionRule;


    return {

        valid,

        productionReady,

        requiresProductionRule,

        trimInformationAvailable,

        bleedInformationAvailable,

        pageCount:
            analysis.pageCount,

        document: {

            allPagesSameSize,

            allPagesSameOrientation,

            widthPt:
                firstPage.source.widthPt,

            heightPt:
                firstPage.source.heightPt,

            widthInches:
                firstPage.source.widthInches,

            heightInches:
                firstPage.source.heightInches,

            orientation:
                firstPage.source.orientation
        },

        pages:
            pageResults,

        errors,

        warnings
    };
};


export {
    validatePdfAnalysis
};