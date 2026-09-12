/**
 * ============================================================
 * PHASE 5 - IMPOSITION CONFIGURATION
 * ============================================================
 *
 * Important:
 *
 * Source PDF page size is NOT entered here.
 *
 * The source page size is automatically read from
 * the uploaded PDF by imposition.engine.js.
 *
 * User controls:
 *
 * - Fold / page layout
 * - Binding
 * - Binding edge
 * - Work style
 * - Output sheet size
 * - Margins
 * - Bleed
 * - Gutter
 * - Crop marks
 * - Quantity
 * - Fit mode
 */


/**
 * ============================================================
 * DEFAULT CONFIGURATION
 * ============================================================
 */

const DEFAULT_IMPOSITION_CONFIG = {

    /**
     * --------------------------------------------------------
     * FOLD / PAGE LAYOUT
     * --------------------------------------------------------
     */

    layout: {

        // Supported:
        // 2PP
        // 4PP
        // 8PP
        // 16PP
        // 32PP

        pagesPerLayout: 4,

        // PORTRAIT
        // LANDSCAPE
        // AUTO

        orientation: "AUTO"
    },


    /**
     * --------------------------------------------------------
     * BINDING
     * --------------------------------------------------------
     */

    binding: {

        // Supported:
        //
        // PERFECT_BINDING
        // SADDLE_STITCH
        // CENTER_PIN
        // CASE_BINDING
        // WIRE_O
        // FLAT

        type:
            "PERFECT_BINDING",


        // Binding edge:
        //
        // LEFT
        // RIGHT
        // TOP
        // BOTTOM

        edge:
            "LEFT"
    },


    /**
     * --------------------------------------------------------
     * WORK STYLE
     * --------------------------------------------------------
     */

    workStyle: {

        // Supported:
        //
        // SHEETWISE
        // WORK_AND_TURN
        // WORK_AND_TUMBLE
        // PERFECTOR
        // SINGLE_SIDED

        type:
            "SHEETWISE"
    },


    /**
     * --------------------------------------------------------
     * QUANTITY
     * --------------------------------------------------------
     */

    quantity: {

        // Number of finished copies required

        copies:
            1
    },


    /**
     * --------------------------------------------------------
     * OUTPUT PRODUCTION SHEET
     * --------------------------------------------------------
     *
     * This is completely dynamic.
     *
     * Example:
     *
     * 23 x 36 inch
     *
     * is only a default/example.
     */

    sheet: {

        width:
            23,

        height:
            36,

        unit:
            "inch"
    },


    /**
     * --------------------------------------------------------
     * MARGINS
     * --------------------------------------------------------
     */

    margins: {

        top:
            0,

        right:
            0,

        bottom:
            0,

        left:
            0,

        unit:
            "mm"
    },


    /**
     * --------------------------------------------------------
     * BLEED
     * --------------------------------------------------------
     */

    bleed: {

        top:
            5,

        right:
            5,

        bottom:
            5,

        left:
            5,

        unit:
            "mm"
    },


    /**
     * --------------------------------------------------------
     * GUTTER
     * --------------------------------------------------------
     */

    gutter: {

        horizontal:
            0,

        vertical:
            0,

        unit:
            "mm"
    },


    /**
     * --------------------------------------------------------
     * CROP MARKS
     * --------------------------------------------------------
     */

    cropMarks: {

        enabled:
            true,

        // Crop mark length

        length:
            3,

        // Distance from trim edge
        // to beginning of crop mark

        offset:
            2,

        unit:
            "mm"
    },


    /**
     * --------------------------------------------------------
     * CREEP
     * --------------------------------------------------------
     *
     * Kept in configuration for the later book/signature
     * production phase.
     */

    creep: {

        enabled:
            false,

        value:
            0,

        unit:
            "mm"
    },


    /**
     * --------------------------------------------------------
     * FIT / SCALING
     * --------------------------------------------------------
     *
     * NONE:
     * Keep original source dimensions.
     *
     * SCALE_TO_FIT:
     * Proportionally scale the source page to fit
     * the available cell.
     */

    fit: {

        mode:
            "SCALE_TO_FIT"
    },


    /**
     * --------------------------------------------------------
     * PRODUCTION MARKS
     * --------------------------------------------------------
     */

    marks: {

        enabled:
            true,

        crop:
            true,

        registration:
            false,

        colorBar:
            false,

        jobInfo:
            false
    }
};


/**
 * ============================================================
 * SUPPORTED OPTIONS
 * ============================================================
 */


/**
 * Fold layouts
 */
const SUPPORTED_PAGE_LAYOUTS = [
    2,
    4,
    8,
    16,
    32
];


/**
 * Orientation
 */
const SUPPORTED_ORIENTATIONS = [
    "PORTRAIT",
    "LANDSCAPE",
    "AUTO"
];


/**
 * Binding
 */
const SUPPORTED_BINDINGS = [

    "PERFECT_BINDING",

    "SADDLE_STITCH",

    "CENTER_PIN",

    "CASE_BINDING",

    "WIRE_O",

    "FLAT"
];


/**
 * Binding edge
 */
const SUPPORTED_BINDING_EDGES = [

    "LEFT",

    "RIGHT",

    "TOP",

    "BOTTOM"
];


/**
 * Work styles
 */
const SUPPORTED_WORK_STYLES = [

    "SHEETWISE",

    "WORK_AND_TURN",

    "WORK_AND_TUMBLE",

    "PERFECTOR",

    "SINGLE_SIDED"
];


/**
 * Measurement units
 */
const SUPPORTED_UNITS = [

    "pt",

    "mm",

    "inch"
];


/**
 * Fit modes
 */
const SUPPORTED_FIT_MODES = [

    "NONE",

    "SCALE_TO_FIT"
];


/**
 * ============================================================
 * VALIDATE NON-NEGATIVE BOX
 * ============================================================
 */

const validateBoxValues = ({
    name,
    values
}) => {

    const invalid =
        values.some(
            value =>
                !Number.isFinite(value) ||
                value < 0
        );


    if (invalid) {

        throw new Error(
            `${name} values must be zero or positive numbers.`
        );
    }
};


/**
 * ============================================================
 * NORMALIZE CONFIGURATION
 * ============================================================
 */

const normalizeImpositionConfig = (
    input = {}
) => {

    /**
     * --------------------------------------------------------
     * Read sections
     * --------------------------------------------------------
     */

    const layout =
        input.layout || {};

    const binding =
        input.binding || {};

    const workStyle =
        input.workStyle || {};

    const quantity =
        input.quantity || {};

    const sheet =
        input.sheet || {};

    const bleed =
        input.bleed || {};

    const cropMarks =
        input.cropMarks || {};

    /**
     * Support both:
     *
     * margins
     *
     * and
     *
     * margin
     *
     * so frontend can eventually use singular "margin".
     */

    const margins =
        input.margins ||
        input.margin ||
        {};

    const gutter =
        input.gutter || {};

    const creep =
        input.creep || {};

    const marks =
        input.marks || {};

    const fit =
        input.fit || {};


    /**
     * ========================================================
     * LAYOUT
     * ========================================================
     */

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
            "pagesPerLayout must be 2, 4, 8, 16 or 32."
        );
    }


    const orientation =
        String(
            layout.orientation ??
            DEFAULT_IMPOSITION_CONFIG
                .layout
                .orientation
        )
            .toUpperCase();


    if (
        !SUPPORTED_ORIENTATIONS.includes(
            orientation
        )
    ) {

        throw new Error(
            "Orientation must be PORTRAIT, LANDSCAPE or AUTO."
        );
    }


    /**
     * ========================================================
     * BINDING
     * ========================================================
     */

    const bindingType =
        String(
            binding.type ??
            DEFAULT_IMPOSITION_CONFIG
                .binding
                .type
        )
            .toUpperCase();


    if (
        !SUPPORTED_BINDINGS.includes(
            bindingType
        )
    ) {

        throw new Error(
            `Unsupported binding type: ${bindingType}`
        );
    }


    const bindingEdge =
        String(
            binding.edge ??
            DEFAULT_IMPOSITION_CONFIG
                .binding
                .edge
        )
            .toUpperCase();


    if (
        !SUPPORTED_BINDING_EDGES.includes(
            bindingEdge
        )
    ) {

        throw new Error(
            `Unsupported binding edge: ${bindingEdge}`
        );
    }


    /**
     * ========================================================
     * WORK STYLE
     * ========================================================
     */

    const workStyleType =
        String(
            workStyle.type ??
            DEFAULT_IMPOSITION_CONFIG
                .workStyle
                .type
        )
            .toUpperCase();


    if (
        !SUPPORTED_WORK_STYLES.includes(
            workStyleType
        )
    ) {

        throw new Error(
            `Unsupported work style: ${workStyleType}`
        );
    }


    /**
     * ========================================================
     * QUANTITY
     * ========================================================
     */

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


    /**
     * ========================================================
     * SHEET
     * ========================================================
     */

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
        )
            .toLowerCase();


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


    /**
     * ========================================================
     * BLEED
     * ========================================================
     */

    const bleedUnit =
        String(
            bleed.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .bleed
                .unit
        )
            .toLowerCase();


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


    validateBoxValues({

        name:
            "Bleed",

        values: [

            normalizedBleed.top,

            normalizedBleed.right,

            normalizedBleed.bottom,

            normalizedBleed.left
        ]
    });


    /**
     * ========================================================
     * CROP MARKS
     * ========================================================
     */

    const cropMarkUnit =
        String(
            cropMarks.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .cropMarks
                .unit
        )
            .toLowerCase();


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


    /**
     * ========================================================
     * MARGINS
     * ========================================================
     */

    const marginUnit =
        String(
            margins.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .margins
                .unit
        )
            .toLowerCase();


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
                margins.top ??
                DEFAULT_IMPOSITION_CONFIG
                    .margins
                    .top
            ),

        right:
            Number(
                margins.right ??
                DEFAULT_IMPOSITION_CONFIG
                    .margins
                    .right
            ),

        bottom:
            Number(
                margins.bottom ??
                DEFAULT_IMPOSITION_CONFIG
                    .margins
                    .bottom
            ),

        left:
            Number(
                margins.left ??
                DEFAULT_IMPOSITION_CONFIG
                    .margins
                    .left
            ),

        unit:
            marginUnit
    };


    validateBoxValues({

        name:
            "Margin",

        values: [

            normalizedMargins.top,

            normalizedMargins.right,

            normalizedMargins.bottom,

            normalizedMargins.left
        ]
    });


    /**
     * ========================================================
     * GUTTER
     * ========================================================
     */

    const gutterUnit =
        String(
            gutter.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .gutter
                .unit
        )
            .toLowerCase();


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
                gutter.horizontal ??
                DEFAULT_IMPOSITION_CONFIG
                    .gutter
                    .horizontal
            ),

        vertical:
            Number(
                gutter.vertical ??
                DEFAULT_IMPOSITION_CONFIG
                    .gutter
                    .vertical
            ),

        unit:
            gutterUnit
    };


    validateBoxValues({

        name:
            "Gutter",

        values: [

            normalizedGutter.horizontal,

            normalizedGutter.vertical
        ]
    });


    /**
     * ========================================================
     * CREEP
     * ========================================================
     */

    const creepUnit =
        String(
            creep.unit ??
            DEFAULT_IMPOSITION_CONFIG
                .creep
                .unit
        )
            .toLowerCase();


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
            creep.value ??
            DEFAULT_IMPOSITION_CONFIG
                .creep
                .value
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
                creep.enabled ??
                DEFAULT_IMPOSITION_CONFIG
                    .creep
                    .enabled
            ),

        value:
            creepValue,

        unit:
            creepUnit
    };


    /**
     * ========================================================
     * FIT
     * ========================================================
     */

    const fitMode =
        String(
            fit.mode ??
            DEFAULT_IMPOSITION_CONFIG
                .fit
                .mode
        )
            .toUpperCase();


    if (
        !SUPPORTED_FIT_MODES.includes(
            fitMode
        )
    ) {

        throw new Error(
            `Unsupported fit mode: ${fitMode}`
        );
    }


    /**
     * ========================================================
     * PRODUCTION MARKS
     * ========================================================
     */

    const normalizedMarks = {

        enabled:
            Boolean(
                marks.enabled ??
                DEFAULT_IMPOSITION_CONFIG
                    .marks
                    .enabled
            ),

        crop:
            Boolean(
                marks.crop ??
                DEFAULT_IMPOSITION_CONFIG
                    .marks
                    .crop
            ),

        registration:
            Boolean(
                marks.registration ??
                DEFAULT_IMPOSITION_CONFIG
                    .marks
                    .registration
            ),

        colorBar:
            Boolean(
                marks.colorBar ??
                DEFAULT_IMPOSITION_CONFIG
                    .marks
                    .colorBar
            ),

        jobInfo:
            Boolean(
                marks.jobInfo ??
                DEFAULT_IMPOSITION_CONFIG
                    .marks
                    .jobInfo
            )
    };


    /**
     * ========================================================
     * FINAL NORMALIZED CONFIG
     * ========================================================
     */

    return {

        layout: {

            pagesPerLayout,

            orientation
        },


        binding: {

            type:
                bindingType,

            edge:
                bindingEdge
        },


        workStyle: {

            type:
                workStyleType
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


        /**
         * Keep "margins" as the canonical
         * backend property for compatibility
         * with your existing code.
         */
        margins:
            normalizedMargins,


        /**
         * Also expose singular "margin"
         * for the new Phase 5 engine/frontend.
         */
        margin:
            normalizedMargins,


        gutter:
            normalizedGutter,


        creep:
            normalizedCreep,


        fit: {

            mode:
                fitMode
        },


        marks:
            normalizedMarks
    };
};


/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

export {

    DEFAULT_IMPOSITION_CONFIG,

    SUPPORTED_PAGE_LAYOUTS,

    SUPPORTED_ORIENTATIONS,

    SUPPORTED_BINDINGS,

    SUPPORTED_BINDING_EDGES,

    SUPPORTED_WORK_STYLES,

    SUPPORTED_UNITS,

    SUPPORTED_FIT_MODES,

    normalizeImpositionConfig
};