const DEFAULT_IMPOSITION_CONFIG = {
    // =================================================
    // LAYOUT
    // =================================================

    layout: {
        // Supported:
        // 2, 4, 8, 16

        pagesPerLayout: 4,

        // Supported:
        // PORTRAIT
        // LANDSCAPE
        // AUTO

        orientation: "AUTO"
    },


    // =================================================
    // BINDING
    // =================================================

    binding: {
        // Supported:
        // PERFECT_BINDING
        // SADDLE_STITCH
        // CENTER_PIN
        // CASE_BINDING
        // WIRE_O
        // FLAT

        type: "PERFECT_BINDING"
    },


    // =================================================
    // QUANTITY
    // =================================================

    quantity: {
        // Number of finished copies required

        copies: 1
    },


    // =================================================
    // PRODUCTION SHEET
    // =================================================

    sheet: {
        // Actual sheet size from current
        // production/reference setup

        width: 24,
        height: 17.875,

        unit: "inch"
    },


    // =================================================
    // BLEED
    // =================================================

    bleed: {
        // Bleed on each side of the page

        top: 5,
        right: 5,
        bottom: 5,
        left: 5,

        unit: "mm"
    },


    // =================================================
    // CROP MARKS
    // =================================================

    cropMarks: {
        enabled: true,

        // Crop mark length

        length: 3,

        // Distance between trim edge
        // and beginning of crop mark

        offset: 2,

        unit: "mm"
    },


    // =================================================
    // SHEET MARGINS
    // =================================================

    margins: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,

        unit: "mm"
    },


    // =================================================
    // GUTTER
    // =================================================

    gutter: {
        // Horizontal distance between
        // imposed pages

        horizontal: 0,

        // Vertical distance between
        // imposed pages

        vertical: 0,

        unit: "mm"
    },


    // =================================================
    // CREEP
    // =================================================

    creep: {
        enabled: false,

        // Creep amount per signature/page
        // Will be implemented later

        value: 0,

        unit: "mm"
    },


    // =================================================
    // PRODUCTION MARKS
    // =================================================

    marks: {
        enabled: true,

        crop: true,

        registration: false,

        colorBar: false,

        jobInfo: false
    }
};


// =====================================================
// SUPPORTED OPTIONS
// =====================================================

const SUPPORTED_PAGE_LAYOUTS = [
    2,
    4,
    8,
    16
];


const SUPPORTED_ORIENTATIONS = [
    "PORTRAIT",
    "LANDSCAPE",
    "AUTO"
];


const SUPPORTED_BINDINGS = [
    "PERFECT_BINDING",
    "SADDLE_STITCH",
    "CENTER_PIN",
    "CASE_BINDING",
    "WIRE_O",
    "FLAT"
];


const SUPPORTED_UNITS = [
    "pt",
    "mm",
    "inch"
];


// =====================================================
// NORMALIZE CONFIGURATION
// =====================================================

const normalizeImpositionConfig = (
    input = {}
) => {

    // -------------------------------------------------
    // Read sections
    // -------------------------------------------------

    const layout =
        input.layout || {};

    const binding =
        input.binding || {};

    const quantity =
        input.quantity || {};

    const sheet =
        input.sheet || {};

    const bleed =
        input.bleed || {};

    const cropMarks =
        input.cropMarks || {};

    const margins =
        input.margins || {};

    const gutter =
        input.gutter || {};

    const creep =
        input.creep || {};

    const marks =
        input.marks || {};


    // =================================================
    // LAYOUT
    // =================================================

    const pagesPerLayout =
        Number(
            layout.pagesPerLayout ??
            DEFAULT_IMPOSITION_CONFIG
                .layout
                .pagesPerLayout
        );


    if (
        !SUPPORTED_PAGE_LAYOUTS.includes(
            pagesPerLayout
        )
    ) {

        throw new Error(
            "pagesPerLayout must be 2, 4, 8 or 16."
        );

    }


    const orientation =
        String(
            layout.orientation ??
            DEFAULT_IMPOSITION_CONFIG
                .layout
                .orientation
        ).toUpperCase();


    if (
        !SUPPORTED_ORIENTATIONS.includes(
            orientation
        )
    ) {

        throw new Error(
            "Orientation must be PORTRAIT, LANDSCAPE or AUTO."
        );

    }


    // =================================================
    // BINDING
    // =================================================

    const bindingType =
        String(
            binding.type ??
            DEFAULT_IMPOSITION_CONFIG
                .binding
                .type
        ).toUpperCase();


    if (
        !SUPPORTED_BINDINGS.includes(
            bindingType
        )
    ) {

        throw new Error(
            `Unsupported binding type: ${bindingType}`
        );

    }


    // =================================================
    // QUANTITY
    // =================================================

    const copies =
        Number(
            quantity.copies ??
            DEFAULT_IMPOSITION_CONFIG
                .quantity
                .copies
        );


    if (
        !Number.isInteger(copies) ||
        copies <= 0
    ) {

        throw new Error(
            "Quantity copies must be a positive integer."
        );

    }


    // =================================================
    // SHEET
    // =================================================

    const sheetWidth =
        Number(
            sheet.width ??
            DEFAULT_IMPOSITION_CONFIG
                .sheet
                .width
        );


    const sheetHeight =
        Number(
            sheet.height ??
            DEFAULT_IMPOSITION_CONFIG
                .sheet
                .height
        );


    const sheetUnit =
        String(
            sheet.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .sheet
                .unit
        ).toLowerCase();


    if (
        !Number.isFinite(sheetWidth) ||
        sheetWidth <= 0
    ) {

        throw new Error(
            "Sheet width must be greater than zero."
        );

    }


    if (
        !Number.isFinite(sheetHeight) ||
        sheetHeight <= 0
    ) {

        throw new Error(
            "Sheet height must be greater than zero."
        );

    }


    if (
        !SUPPORTED_UNITS.includes(
            sheetUnit
        )
    ) {

        throw new Error(
            `Unsupported sheet unit: ${sheetUnit}`
        );

    }


    // =================================================
    // BLEED
    // =================================================

    const bleedUnit =
        String(
            bleed.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .bleed
                .unit
        ).toLowerCase();


    if (
        !SUPPORTED_UNITS.includes(
            bleedUnit
        )
    ) {

        throw new Error(
            `Unsupported bleed unit: ${bleedUnit}`
        );

    }


    const normalizedBleed = {

        top:
            Number(
                bleed.top ??
                DEFAULT_IMPOSITION_CONFIG
                    .bleed
                    .top
            ),

        right:
            Number(
                bleed.right ??
                DEFAULT_IMPOSITION_CONFIG
                    .bleed
                    .right
            ),

        bottom:
            Number(
                bleed.bottom ??
                DEFAULT_IMPOSITION_CONFIG
                    .bleed
                    .bottom
            ),

        left:
            Number(
                bleed.left ??
                DEFAULT_IMPOSITION_CONFIG
                    .bleed
                    .left
            ),

        unit:
            bleedUnit

    };


    const bleedValues = [
        normalizedBleed.top,
        normalizedBleed.right,
        normalizedBleed.bottom,
        normalizedBleed.left
    ];


    if (
        bleedValues.some(
            (value) =>
                !Number.isFinite(value) ||
                value < 0
        )
    ) {

        throw new Error(
            "Bleed values must be zero or positive numbers."
        );

    }


    // =================================================
    // CROP MARKS
    // =================================================

    const cropMarkUnit =
        String(
            cropMarks.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .cropMarks
                .unit
        ).toLowerCase();


    if (
        !SUPPORTED_UNITS.includes(
            cropMarkUnit
        )
    ) {

        throw new Error(
            `Unsupported crop mark unit: ${cropMarkUnit}`
        );

    }


    const cropMarkLength =
        Number(
            cropMarks.length ??
            DEFAULT_IMPOSITION_CONFIG
                .cropMarks
                .length
        );


    const cropMarkOffset =
        Number(
            cropMarks.offset ??
            DEFAULT_IMPOSITION_CONFIG
                .cropMarks
                .offset
        );


    if (
        !Number.isFinite(
            cropMarkLength
        ) ||
        cropMarkLength <= 0
    ) {

        throw new Error(
            "Crop mark length must be greater than zero."
        );

    }


    if (
        !Number.isFinite(
            cropMarkOffset
        ) ||
        cropMarkOffset < 0
    ) {

        throw new Error(
            "Crop mark offset cannot be negative."
        );

    }


    const normalizedCropMarks = {

        enabled:
            Boolean(
                cropMarks.enabled ??
                DEFAULT_IMPOSITION_CONFIG
                    .cropMarks
                    .enabled
            ),

        length:
            cropMarkLength,

        offset:
            cropMarkOffset,

        unit:
            cropMarkUnit

    };


    // =================================================
    // MARGINS
    // =================================================

    const marginUnit =
        String(
            margins.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .margins
                .unit
        ).toLowerCase();


    if (
        !SUPPORTED_UNITS.includes(
            marginUnit
        )
    ) {

        throw new Error(
            `Unsupported margin unit: ${marginUnit}`
        );

    }


    const normalizedMargins = {

        top:
            Number(
                margins.top ?? 0
            ),

        right:
            Number(
                margins.right ?? 0
            ),

        bottom:
            Number(
                margins.bottom ?? 0
            ),

        left:
            Number(
                margins.left ?? 0
            ),

        unit:
            marginUnit

    };


    const marginValues = [
        normalizedMargins.top,
        normalizedMargins.right,
        normalizedMargins.bottom,
        normalizedMargins.left
    ];


    if (
        marginValues.some(
            (value) =>
                !Number.isFinite(value) ||
                value < 0
        )
    ) {

        throw new Error(
            "Margin values must be zero or positive numbers."
        );

    }


    // =================================================
    // GUTTER
    // =================================================

    const gutterUnit =
        String(
            gutter.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .gutter
                .unit
        ).toLowerCase();


    if (
        !SUPPORTED_UNITS.includes(
            gutterUnit
        )
    ) {

        throw new Error(
            `Unsupported gutter unit: ${gutterUnit}`
        );

    }


    const normalizedGutter = {

        horizontal:
            Number(
                gutter.horizontal ?? 0
            ),

        vertical:
            Number(
                gutter.vertical ?? 0
            ),

        unit:
            gutterUnit

    };


    if (
        normalizedGutter.horizontal < 0 ||
        normalizedGutter.vertical < 0
    ) {

        throw new Error(
            "Gutter values cannot be negative."
        );

    }


    // =================================================
    // CREEP
    // =================================================

    const creepUnit =
        String(
            creep.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .creep
                .unit
        ).toLowerCase();


    if (
        !SUPPORTED_UNITS.includes(
            creepUnit
        )
    ) {

        throw new Error(
            `Unsupported creep unit: ${creepUnit}`
        );

    }


    const creepValue =
        Number(
            creep.value ?? 0
        );


    if (
        !Number.isFinite(
            creepValue
        ) ||
        creepValue < 0
    ) {

        throw new Error(
            "Creep value cannot be negative."
        );

    }


    const normalizedCreep = {

        enabled:
            Boolean(
                creep.enabled ?? false
            ),

        value:
            creepValue,

        unit:
            creepUnit

    };


    // =================================================
    // PRODUCTION MARKS
    // =================================================

    const normalizedMarks = {

        enabled:
            Boolean(
                marks.enabled ?? true
            ),

        crop:
            Boolean(
                marks.crop ?? true
            ),

        registration:
            Boolean(
                marks.registration ?? false
            ),

        colorBar:
            Boolean(
                marks.colorBar ?? false
            ),

        jobInfo:
            Boolean(
                marks.jobInfo ?? false
            )

    };


    // =================================================
    // FINAL CONFIGURATION
    // =================================================

    return {

        layout: {

            pagesPerLayout,

            orientation

        },


        binding: {

            type:
                bindingType

        },


        quantity: {

            copies

        },


        sheet: {

            width:
                sheetWidth,

            height:
                sheetHeight,

            unit:
                sheetUnit

        },


        bleed:
            normalizedBleed,


        cropMarks:
            normalizedCropMarks,


        margins:
            normalizedMargins,


        gutter:
            normalizedGutter,


        creep:
            normalizedCreep,


        marks:
            normalizedMarks

    };

};


export {
    DEFAULT_IMPOSITION_CONFIG,

    SUPPORTED_PAGE_LAYOUTS,

    SUPPORTED_ORIENTATIONS,

    SUPPORTED_BINDINGS,

    SUPPORTED_UNITS,

    normalizeImpositionConfig
};