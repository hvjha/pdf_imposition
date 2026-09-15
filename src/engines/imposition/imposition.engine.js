/*
 * ============================================================
 * IMPOSITION ENGINE
 * ============================================================
 *
 * Phase 5 - PDF Prepress Automation
 *
 * Supports:
 *
 *   2PP
 *   4PP
 *
 * Dynamic:
 *
 *   - Source PDF page size
 *   - Output sheet width
 *   - Output sheet height
 *   - Sheet unit
 *   - Margins
 *   - Gutter
 *   - Bleed
 *   - Scaling
 *   - Rotation
 *   - Work style
 *   - Crop marks
 *
 * IMPORTANT:
 *
 * Source page size is NEVER entered by the user.
 *
 * It is read directly from the source PDF.
 *
 * ============================================================
 */

import {
    PDFDocument
} from "pdf-lib";


import {
    toPoints
} from "./imposition.utils.js";


import {
    validateSheet,
    validatePlacement,
    validateImpositionPlan
} from "./imposition.validator.js";


import {
    resolveFoldPattern
} from "./fold/fold.engine.js";


import {
    drawPlacedPage,
    applyWorkStyle
} from "./transform/page.transform.js";


import {
    drawProductionMarks
} from "../marks/marks.engine.js";


/* ============================================================
 * CONSTANTS
 * ============================================================
 */

const EPSILON = 0.01;


const SUPPORTED_FIT_MODES = [
    "NONE",
    "SCALE_TO_FIT"
];


const SUPPORTED_WORK_STYLES = [
    "SHEETWISE",
    "WORK_AND_TURN",
    "WORK_AND_TUMBLE",
    "PERFECTOR",
    "SINGLE_SIDED"
];


const SUPPORTED_BINDING_EDGES = [
    "LEFT",
    "RIGHT",
    "TOP",
    "BOTTOM"
];


/* ============================================================
 * BASIC HELPERS
 * ============================================================
 */

const numberOrDefault = (
    value,
    fallback = 0
) => {

    const number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        return fallback;
    }


    return number;
};


/* ============================================================
 * ROTATION
 * ============================================================
 */

const normalizeRotation = (
    value = 0
) => {

    const rotation =
        Number(value);


    if (
        !Number.isFinite(rotation)
    ) {

        return 0;
    }


    return (
        rotation % 360 +
        360
    ) % 360;
};


/* ============================================================
 * UNIT CONVERSION
 * ============================================================
 */

const convertMeasurement = (
    value,
    unit = "pt"
) => {

    return toPoints(
        Number(value),
        unit
    );
};


/* ============================================================
 * MARGINS
 * ============================================================
 */

const normalizeMargins = (
    config
) => {

    const source =
        config.margins ??
        config.margin ??
        {};


    if (
        typeof source === "number"
    ) {

        return {

            top:
                Number(source),

            right:
                Number(source),

            bottom:
                Number(source),

            left:
                Number(source)

        };
    }


    return {

        top:
            numberOrDefault(
                source.top,
                0
            ),

        right:
            numberOrDefault(
                source.right,
                0
            ),

        bottom:
            numberOrDefault(
                source.bottom,
                0
            ),

        left:
            numberOrDefault(
                source.left,
                0
            )

    };
};


/* ============================================================
 * GUTTER
 * ============================================================
 */

const normalizeGutter = (
    config
) => {

    const source =
        config.gutter ??
        {};


    if (
        typeof source === "number"
    ) {

        return {

            horizontal:
                Number(source),

            vertical:
                Number(source)

        };
    }


    return {

        horizontal:
            numberOrDefault(
                source.horizontal ??
                source.x,
                0
            ),

        vertical:
            numberOrDefault(
                source.vertical ??
                source.y,
                0
            )

    };
};


/* ============================================================
 * BLEED
 * ============================================================
 */

const normalizeBleed = (
    config
) => {

    const source =
        config.bleed ??
        {};


    if (
        typeof source === "number"
    ) {

        return {

            top:
                Number(source),

            right:
                Number(source),

            bottom:
                Number(source),

            left:
                Number(source)

        };
    }


    return {

        top:
            numberOrDefault(
                source.top,
                0
            ),

        right:
            numberOrDefault(
                source.right,
                0
            ),

        bottom:
            numberOrDefault(
                source.bottom,
                0
            ),

        left:
            numberOrDefault(
                source.left,
                0
            )

    };
};


/* ============================================================
 * SHEET
 * ============================================================
 */

const normalizeSheet = (
    config
) => {

    const source =
        config.sheet ??
        {};


    const unit =
        source.unit ??
        "pt";


    const width =
        convertMeasurement(
            source.width,
            unit
        );


    const height =
        convertMeasurement(
            source.height,
            unit
        );


    const sheet = {

        width,

        height,

        unit

    };


    const validation =
        validateSheet(
            sheet
        );


    if (
        !validation.valid
    ) {

        throw new Error(
            validation.errors.join(
                " "
            )
        );
    }


    return sheet;
};


/* ============================================================
 * FIT MODE
 * ============================================================
 */

const normalizeFitMode = (
    config
) => {

    const fitMode =
        String(
            config.fitMode ??
            "SCALE_TO_FIT"
        )
            .trim()
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


    return fitMode;
};


/* ============================================================
 * WORK STYLE
 * ============================================================
 */

const normalizeWorkStyle = (
    config
) => {

    const source =
        config.workStyle ??
        {};


    if (
        typeof source === "string"
    ) {

        const type =
            source
                .trim()
                .toUpperCase();


        if (
            !SUPPORTED_WORK_STYLES.includes(
                type
            )
        ) {

            throw new Error(
                `Unsupported work style: ${type}`
            );
        }


        return {

            type

        };
    }


    const type =
        String(
            source.type ??
            "SHEETWISE"
        )
            .trim()
            .toUpperCase();


    if (
        !SUPPORTED_WORK_STYLES.includes(
            type
        )
    ) {

        throw new Error(
            `Unsupported work style: ${type}`
        );
    }


    return {

        ...source,

        type

    };
};


/* ============================================================
 * BINDING
 * ============================================================
 */

const normalizeBinding = (
    config
) => {

    const source =
        config.binding ??
        {};


    if (
        typeof source === "string"
    ) {

        return {

            type:
                source
                    .trim()
                    .toUpperCase(),

            edge:
                "LEFT"

        };
    }


    const edge =
        String(
            source.edge ??
            "LEFT"
        )
            .trim()
            .toUpperCase();


    if (
        !SUPPORTED_BINDING_EDGES.includes(
            edge
        )
    ) {

        throw new Error(
            `Unsupported binding edge: ${edge}`
        );
    }


    return {

        ...source,

        type:
            source.type ??
            "PERFECT_BINDING",

        edge

    };
};


/* ============================================================
 * CROP MARK CONFIG
 * ============================================================
 */

const normalizeCropMarks = (
    config
) => {

    const source =
        config.cropMarks ??
        {};


    return {

        ...source,

        enabled:
            source.enabled ??
            config.marks?.crop ??
            true,

        length:
            numberOrDefault(
                source.length,
                3
            ),

        offset:
            numberOrDefault(
                source.offset,
                2
            ),

        unit:
            source.unit ??
            "mm"

    };
};


/* ============================================================
 * MARKS
 * ============================================================
 */

const normalizeMarks = (
    config
) => {

    return {

        ...(config.marks ?? {}),

        crop:
            config.marks?.crop ??
            true

    };
};


/* ============================================================
 * LAYOUT CONFIG
 * ============================================================
 */

const normalizeLayout = (
    config
) => {

    const source =
        config.layout ??
        {};


    const pagesPerLayout =
        Number(
            source.pagesPerLayout ??
            source.pageCount
        );


    if (
        !Number.isInteger(
            pagesPerLayout
        ) ||
        pagesPerLayout <= 0
    ) {

        throw new Error(
            "layout.pagesPerLayout must be a positive integer."
        );
    }


    return {

        ...source,

        pagesPerLayout,

        patternId:
            source.patternId ??
            source.foldPattern ??
            null,

        mode:
            source.mode ??
            source.type ??
            config.mode ??
            null

    };
};


/* ============================================================
 * NORMALIZE CONFIGURATION
 * ============================================================
 */

const normalizeConfig = (
    config
) => {

    const sheet =
        normalizeSheet(
            config
        );


    const margins =
        normalizeMargins(
            config
        );


    const gutter =
        normalizeGutter(
            config
        );


    const bleed =
        normalizeBleed(
            config
        );


    const fitMode =
        normalizeFitMode(
            config
        );


    const workStyle =
        normalizeWorkStyle(
            config
        );


    const binding =
        normalizeBinding(
            config
        );


    const cropMarks =
        normalizeCropMarks(
            config
        );


    const marks =
        normalizeMarks(
            config
        );


    const layout =
        normalizeLayout(
            config
        );


    return {

        ...config,

        sheet,

        margins,

        gutter,

        bleed,

        fitMode,

        workStyle,

        binding,

        cropMarks,

        marks,

        layout

    };
};


/* ============================================================
 * SOURCE PDF INFORMATION
 * ============================================================
 */

const getSourcePageInfo = (
    page
) => {

    const mediaBox =
        page.getMediaBox();


    const cropBox =
        page.getCropBox();


    const width =
        cropBox?.width ??
        mediaBox.width;


    const height =
        cropBox?.height ??
        mediaBox.height;


    const rotation =
        normalizeRotation(
            page.getRotation()?.angle ??
            0
        );


    return {

        width,

        height,

        rotation

    };
};


/* ============================================================
 * SOURCE DOCUMENT ANALYSIS
 * ============================================================
 */

const analyzeSourcePdf = (
    sourcePdf
) => {

    const pageCount =
        sourcePdf.getPageCount();


    if (
        pageCount <= 0
    ) {

        throw new Error(
            "Source PDF contains no pages."
        );
    }


    const firstPage =
        sourcePdf.getPage(
            0
        );


    const firstPageInfo =
        getSourcePageInfo(
            firstPage
        );


    return {

        pageCount,

        width:
            firstPageInfo.width,

        height:
            firstPageInfo.height,

        rotation:
            firstPageInfo.rotation

    };
};


/* ============================================================
 * SOURCE PAGE SIZE VALIDATION
 * ============================================================
 */

const inspectSourcePageSizes = (
    sourcePdf,
    source
) => {

    const differences = [];


    for (
        let index = 0;

        index <
        sourcePdf.getPageCount();

        index++
    ) {

        const page =
            sourcePdf.getPage(
                index
            );


        const info =
            getSourcePageInfo(
                page
            );


        if (
            Math.abs(
                info.width -
                source.width
            ) > EPSILON ||

            Math.abs(
                info.height -
                source.height
            ) > EPSILON
        ) {

            differences.push({

                pageNumber:
                    index + 1,

                width:
                    info.width,

                height:
                    info.height

            });
        }
    }


    return differences;
};


/* ============================================================
 * CALCULATE SCALE
 * ============================================================
 */

const calculateScale = ({
    sourceWidth,
    sourceHeight,
    targetWidth,
    targetHeight,
    fitMode
}) => {

    if (
        fitMode === "NONE"
    ) {

        return 1;
    }


    const scaleX =
        targetWidth /
        sourceWidth;


    const scaleY =
        targetHeight /
        sourceHeight;


    return Math.min(
        scaleX,
        scaleY
    );
};


/* ============================================================
 * CALCULATE GEOMETRY
 * ============================================================
 */

const calculateGeometry = ({
    source,
    sheet,
    pattern,
    margins,
    gutter,
    fitMode
}) => {

    const columns =
        Number(
            pattern.columns
        );


    const rows =
        Number(
            pattern.rows
        );


    if (
        !Number.isInteger(columns) ||
        columns <= 0
    ) {

        throw new Error(
            "Fold pattern columns are invalid."
        );
    }


    if (
        !Number.isInteger(rows) ||
        rows <= 0
    ) {

        throw new Error(
            "Fold pattern rows are invalid."
        );
    }


    /* --------------------------------------------------------
     * Usable sheet
     * --------------------------------------------------------
     */

    const usableWidth =
        sheet.width -
        margins.left -
        margins.right;


    const usableHeight =
        sheet.height -
        margins.top -
        margins.bottom;


    if (
        usableWidth <= 0
    ) {

        throw new Error(
            "Sheet margins leave no usable width."
        );
    }


    if (
        usableHeight <= 0
    ) {

        throw new Error(
            "Sheet margins leave no usable height."
        );
    }


    /* --------------------------------------------------------
     * Gutter consumption
     * --------------------------------------------------------
     */

    const horizontalGutter =
        Math.max(
            0,
            columns - 1
        ) *
        gutter.horizontal;


    const verticalGutter =
        Math.max(
            0,
            rows - 1
        ) *
        gutter.vertical;


    const availableWidth =
        usableWidth -
        horizontalGutter;


    const availableHeight =
        usableHeight -
        verticalGutter;


    if (
        availableWidth <= 0
    ) {

        throw new Error(
            "Horizontal gutter is too large for this sheet."
        );
    }


    if (
        availableHeight <= 0
    ) {

        throw new Error(
            "Vertical gutter is too large for this sheet."
        );
    }


    /* --------------------------------------------------------
     * Grid cell
     * --------------------------------------------------------
     */

    const cellWidth =
        availableWidth /
        columns;


    const cellHeight =
        availableHeight /
        rows;


    /* --------------------------------------------------------
     * Scale
     * --------------------------------------------------------
     */

    const scale =
        calculateScale({

            sourceWidth:
                source.width,

            sourceHeight:
                source.height,

            targetWidth:
                cellWidth,

            targetHeight:
                cellHeight,

            fitMode

        });


    if (
        !Number.isFinite(scale) ||
        scale <= 0
    ) {

        throw new Error(
            "Unable to calculate a valid page scale."
        );
    }


    const pageWidth =
        source.width *
        scale;


    const pageHeight =
        source.height *
        scale;


    /* --------------------------------------------------------
     * Layout dimensions
     * --------------------------------------------------------
     */

    const layoutWidth =
        (
            columns *
            pageWidth
        ) +
        horizontalGutter;


    const layoutHeight =
        (
            rows *
            pageHeight
        ) +
        verticalGutter;


    /* --------------------------------------------------------
     * Center complete layout
     * --------------------------------------------------------
     */

    const freeWidth =
        usableWidth -
        layoutWidth;


    const freeHeight =
        usableHeight -
        layoutHeight;


    if (
        freeWidth < -EPSILON
    ) {

        throw new Error(
            "Imposition layout exceeds usable sheet width."
        );
    }


    if (
        freeHeight < -EPSILON
    ) {

        throw new Error(
            "Imposition layout exceeds usable sheet height."
        );
    }


    const originX =
        margins.left +
        Math.max(
            0,
            freeWidth
        ) /
        2;


    const originY =
        margins.bottom +
        Math.max(
            0,
            freeHeight
        ) /
        2;


    /* --------------------------------------------------------
     * Crop clearance
     * --------------------------------------------------------
     */

    const cropClearance = {

        left:
            originX,

        right:
            sheet.width -
            (
                originX +
                layoutWidth
            ),

        bottom:
            originY,

        top:
            sheet.height -
            (
                originY +
                layoutHeight
            )

    };


    return {

        scale,

        pageWidth,

        pageHeight,

        cellWidth,

        cellHeight,

        columns,

        rows,

        gutterHorizontal:
            gutter.horizontal,

        gutterVertical:
            gutter.vertical,

        layoutWidth,

        layoutHeight,

        originX,

        originY,

        usableArea: {

            x:
                margins.left,

            y:
                margins.bottom,

            width:
                usableWidth,

            height:
                usableHeight

        },

        margins,

        cropClearance

    };
};


/* ============================================================
 * CELL POSITION
 * ============================================================
 */

const calculateCellPosition = ({
    row,
    column,
    geometry
}) => {

    const physicalRow =
        geometry.rows -
        1 -
        row;


    const x =
        geometry.originX +
        column *
        (
            geometry.pageWidth +
            geometry.gutterHorizontal
        );


    const y =
        geometry.originY +
        physicalRow *
        (
            geometry.pageHeight +
            geometry.gutterVertical
        );


    return {

        x,

        y

    };
};


/* ============================================================
 * BUILD LOCAL SIDE
 * ============================================================
 */

const buildLocalSide = ({
    side,
    geometry
}) => {

    if (
        !Array.isArray(side)
    ) {

        return [];
    }


    return side.map(
        entry => {

            const row =
                Number(
                    entry.row
                );


            const column =
                Number(
                    entry.column
                );


            const position =
                calculateCellPosition({

                    row,

                    column,

                    geometry

                });


            return {

                pageNumber:
                    Number(
                        entry.pageNumber
                    ),

                row,

                column,

                x:
                    position.x,

                y:
                    position.y,

                width:
                    geometry.pageWidth,

                height:
                    geometry.pageHeight,

                rotation:
                    normalizeRotation(
                        entry.rotation ??
                        0
                    )

            };
        }
    );
};


/* ============================================================
 * BUILD ONE LAYOUT SIDE
 * ============================================================
 *
 * Pattern page numbers are LOCAL.
 *
 * Example 4PP:
 *
 * Pattern page 1
 * Pattern page 2
 * Pattern page 3
 * Pattern page 4
 *
 * Layout 1:
 *
 * 1 → source 1
 * 2 → source 2
 * 3 → source 3
 * 4 → source 4
 *
 * Layout 2:
 *
 * 1 → source 5
 * 2 → source 6
 * 3 → source 7
 * 4 → source 8
 *
 * ============================================================
 */

const buildLayoutSide = ({
    side,
    geometry,
    pageOffset,
    sourcePageCount
}) => {

    if (
        !Array.isArray(side)
    ) {

        return [];
    }


    const placements = [];


    for (
        const entry
        of side
    ) {

        const localPageNumber =
            Number(
                entry.pageNumber
            );


        const sourcePageNumber =
            pageOffset +
            localPageNumber;


        /*
         * Do not generate fake pages for an incomplete final
         * layout.
         */

        if (
            sourcePageNumber < 1 ||
            sourcePageNumber >
            sourcePageCount
        ) {

            continue;
        }


        const position =
            calculateCellPosition({

                row:
                    Number(
                        entry.row
                    ),

                column:
                    Number(
                        entry.column
                    ),

                geometry

            });
console.log("PLACEMENT:", {
    sourcePageNumber,
    localPageNumber,
    row: Number(entry.row),
    column: Number(entry.column),
    x: position.x,
    y: position.y,
    rotation: normalizeRotation(entry.rotation ?? 0)
});

        placements.push({

            pageNumber:
                sourcePageNumber,

            localPageNumber,

            row:
                Number(
                    entry.row
                ),

            column:
                Number(
                    entry.column
                ),

            x:
                position.x,

            y:
                position.y,

            width:
                geometry.pageWidth,

            height:
                geometry.pageHeight,

            rotation:
                normalizeRotation(
                    entry.rotation ??
                    0
                )

        });
    }


    return placements;
};


/* ============================================================
 * VALIDATE PLACEMENTS
 * ============================================================
 */

const validatePlacements = ({
    placements,
    sourcePageCount,
    sheet
}) => {

    if (
        !Array.isArray(
            placements
        )
    ) {

        throw new Error(
            "Placements must be an array."
        );
    }


    for (
        const placement
        of placements
    ) {

        const validation =
            validatePlacement(

                placement,

                sourcePageCount,

                sheet

            );


        if (
            !validation.valid
        ) {

            throw new Error(
                validation.errors.join(
                    " "
                )
            );
        }
    }


    return true;
};


/* ============================================================
 * VALIDATE DUPLICATE SOURCE PAGES
 * ============================================================
 */

const validateNoDuplicatePages = (
    sides
) => {

    const used =
        new Set();


    for (
        const side
        of sides
    ) {

        for (
            const placement
            of side.placements
        ) {

            const pageNumber =
                placement.pageNumber;


            /*
             * A page appearing once on FRONT and once on BACK
             * is considered a duplicate within the same physical
             * layout.
             */

            if (
                used.has(
                    pageNumber
                )
            ) {

                throw new Error(
                    `Source page ${pageNumber} ` +
                    `is used more than once in the same layout.`
                );
            }


            used.add(
                pageNumber
            );
        }
    }


    return true;
};


/* ============================================================
 * BUILD ONE PHYSICAL LAYOUT
 * ============================================================
 */

const buildPhysicalLayout = ({
    pattern,
    geometry,
    pageOffset,
    sourcePageCount,
    sheet,
    workStyle
}) => {

    let frontPlacements =
        buildLayoutSide({

            side:
                pattern.front ??
                [],

            geometry,

            pageOffset,

            sourcePageCount

        });


    let backPlacements =
        buildLayoutSide({

            side:
                pattern.back ??
                [],

            geometry,

            pageOffset,

            sourcePageCount

        });


    /*
     * Apply work style only to BACK.
     */

    if (
        backPlacements.length > 0
    ) {

        backPlacements =
            applyWorkStyle({

                placements:
                    backPlacements,

                workStyle,

                sheetWidth:
                    sheet.width,

                sheetHeight:
                    sheet.height

            });
    }


    const sides = [];


    if (
        frontPlacements.length > 0
    ) {

        sides.push({

            name:
                "FRONT",

            placements:
                frontPlacements

        });
    }


    if (
        backPlacements.length > 0
    ) {

        sides.push({

            name:
                "BACK",

            placements:
                backPlacements

        });
    }


    /*
     * Validate every placement.
     */

    for (
        const side
        of sides
    ) {

        validatePlacements({

            placements:
                side.placements,

            sourcePageCount,

            sheet

        });
    }


    /*
     * Prevent duplicate source pages.
     */

    validateNoDuplicatePages(
        sides
    );


    return {

        sides

    };
};


/* ============================================================
 * BUILD ALL PHYSICAL LAYOUTS
 * ============================================================
 */

const buildAllPhysicalLayouts = ({
    pattern,
    geometry,
    sourcePageCount,
    pagesPerLayout,
    sheet,
    workStyle
}) => {

    const layoutCount =
        Math.ceil(
            sourcePageCount /
            pagesPerLayout
        );


    const layouts = [];


    for (
        let layoutIndex = 0;

        layoutIndex < layoutCount;

        layoutIndex++
    ) {

        const pageOffset =
            layoutIndex *
            pagesPerLayout;


        const physicalLayout =
            buildPhysicalLayout({

                pattern,

                geometry,

                pageOffset,

                sourcePageCount,

                sheet,

                workStyle

            });


        const pageStart =
            pageOffset + 1;


        const pageEnd =
            Math.min(

                pageOffset +
                pagesPerLayout,

                sourcePageCount

            );


        layouts.push({

            layoutNumber:
                layoutIndex + 1,

            pageStart,

            pageEnd,

            pageCount:
                pageEnd -
                pageStart +
                1,

            sides:
                physicalLayout.sides

        });
    }


    return {

        layoutCount,

        layouts

    };
};


/* ============================================================
 * VALIDATE ALL PHYSICAL LAYOUTS
 * ============================================================
 */

const validateAllPhysicalLayouts = ({
    layouts,
    sourcePageCount,
    sheet
}) => {

    for (
        const layout
        of layouts
    ) {

        const allPlacements =
            layout.sides.flatMap(
                side =>
                    side.placements
            );


        if (
            allPlacements.length === 0
        ) {

            throw new Error(
                `Layout ${layout.layoutNumber} contains no placements.`
            );
        }


        /*
         * Validate using your actual validator signature:
         *
         * validateImpositionPlan({
         *     placements,
         *     sourcePageCount,
         *     sheet
         * })
         */

        const validation =
            validateImpositionPlan({

                placements:
                    allPlacements,

                sourcePageCount,

                sheet

            });


        if (
            !validation.valid
        ) {

            throw new Error(
                `Layout ${layout.layoutNumber}: ` +
                validation.errors.join(
                    " "
                )
            );
        }
    }


    return true;
};


/* ============================================================
 * DRAW SOURCE PAGE
 * ============================================================
 */

const drawSourcePage = async ({
    outputPdf,
    outputPage,
    sourcePdf,
    placement
}) => {

    const pageNumber =
        Number(
            placement.pageNumber
        );


    if (
        pageNumber < 1 ||
        pageNumber >
        sourcePdf.getPageCount()
    ) {

        throw new Error(
            `Source page ${pageNumber} does not exist.`
        );
    }


    const sourcePage =
        sourcePdf.getPage(
            pageNumber - 1
        );


    const embeddedPage =
        await outputPdf.embedPage(
            sourcePage
        );


    drawPlacedPage({
    outputPage,

    embeddedPage,

    placement
});
};


/* ============================================================
 * DRAW LAYOUT SIDE
 * ============================================================
 */

const drawLayoutSide = async ({
    outputPdf,
    outputPage,
    sourcePdf,
    side,
    marks,
    cropMarks,
    jobInfo,
    font
}) => {

    /*
     * Draw all PDF pages.
     */

    for (
        const placement
        of side.placements
    ) {

        await drawSourcePage({

            outputPdf,

            outputPage,

            sourcePdf,

            placement

        });
    }


    /*
     * Draw production marks.
     */

    drawProductionMarks({

        page:
            outputPage,

        placements:
            side.placements,

        marks,

        cropMarks,

        jobInfo,

        font

    });
};


/* ============================================================
 * CREATE OUTPUT PDF
 * ============================================================
 *
 * ONE physical layout = ONE output PDF page.
 *
 * Therefore:
 *
 * 36 pages / 2PP = 18 output pages.
 *
 * 36 pages / 4PP = 9 output pages.
 *
 * ============================================================
 */

const createOutputPdf = async ({
    sourcePdf,
    sheet,
    layouts,
    marks,
    cropMarks,
    jobInfo,
    font
}) => {

    const outputPdf =
        await PDFDocument.create();


    for (
        const layout
        of layouts
    ) {

        /*
         * Create ONE physical sheet.
         */

        const outputPage =
            outputPdf.addPage([

                sheet.width,

                sheet.height

            ]);


        /*
         * Draw FRONT and/or BACK.
         *
         * For a single-sided pattern there will normally
         * only be FRONT.
         */

        for (
            const side
            of layout.sides
        ) {

            await drawLayoutSide({

                outputPdf,

                outputPage,

                sourcePdf,

                side,

                marks,

                cropMarks,

                jobInfo,

                font

            });
        }
    }


    const pdfBytes =
        await outputPdf.save();


    return pdfBytes;
};


/* ============================================================
 * FLATTEN SIDES FOR API RESPONSE
 * ============================================================
 */

const flattenSides = (
    layouts
) => {

    return layouts.flatMap(
        layout => {

            return layout.sides.map(
                side => ({

                    layoutNumber:
                        layout.layoutNumber,

                    pageStart:
                        layout.pageStart,

                    pageEnd:
                        layout.pageEnd,

                    name:
                        side.name,

                    placements:
                        side.placements

                })
            );
        }
    );
};


/* ============================================================
 * MAIN ENGINE
 * ============================================================
 */

const imposePdf = async ({
    sourcePdfBytes,
    config = {},
    jobInfo = null,
    font = null
}) => {

    /* --------------------------------------------------------
     * SOURCE PDF
     * --------------------------------------------------------
     */

    if (
        !sourcePdfBytes
    ) {

        throw new Error(
            "sourcePdfBytes is required."
        );
    }


    const sourcePdf =
        await PDFDocument.load(
            sourcePdfBytes
        );


    /* --------------------------------------------------------
     * SOURCE INFORMATION
     * --------------------------------------------------------
     */

    const source =
        analyzeSourcePdf(
            sourcePdf
        );


    /*
     * Read actual page dimensions.
     */

    const sourcePageSizeDifferences =
        inspectSourcePageSizes(
            sourcePdf,
            source
        );


    /* --------------------------------------------------------
     * CONFIGURATION
     * --------------------------------------------------------
     */

    const normalizedConfig =
        normalizeConfig(
            config
        );


    const sheet =
        normalizedConfig.sheet;


    const layoutConfig =
        normalizedConfig.layout;


    const pagesPerLayout =
        layoutConfig.pagesPerLayout;


    /* --------------------------------------------------------
     * RESOLVE FOLD PATTERN
     * --------------------------------------------------------
     */

    const pattern =
        resolveFoldPattern({

            pagesPerLayout,

            patternId:
                layoutConfig.patternId,

            mode:
                layoutConfig.mode

        });
        console.log("========== RESOLVED FOLD PATTERN ==========");
console.log("Pattern ID:", pattern.id);
console.log("Pattern Mode:", pattern.mode);
console.log("Columns:", pattern.columns);
console.log("Rows:", pattern.rows);
console.log("Front:", JSON.stringify(pattern.front, null, 2));
console.log("Back:", JSON.stringify(pattern.back, null, 2));
console.log("===========================================");


    if (
        !pattern
    ) {

        throw new Error(
            `No fold pattern found for ${pagesPerLayout}PP.`
        );
    }


    /*
     * Do not allow unconfirmed patterns.
     */

    if (
        pattern.physicalMappingConfirmed === false
    ) {

        throw new Error(
            `Fold pattern ${pattern.id} ` +
            `is not physically confirmed.`
        );
    }


    /* --------------------------------------------------------
     * GEOMETRY
     * --------------------------------------------------------
     */

    const geometry =
        calculateGeometry({

            source,

            sheet,

            pattern,

            margins:
                normalizedConfig.margins,

            gutter:
                normalizedConfig.gutter,

            fitMode:
                normalizedConfig.fitMode

        });


    /* --------------------------------------------------------
     * WORK STYLE
     * --------------------------------------------------------
 */

    const workStyle =
        normalizedConfig.workStyle;


    /* --------------------------------------------------------
     * BUILD ALL LAYOUTS
     * --------------------------------------------------------
     */

    const layoutResult =
        buildAllPhysicalLayouts({

            pattern,

            geometry,

            sourcePageCount:
                source.pageCount,

            pagesPerLayout,

            sheet,

            workStyle

        });


    const layoutCount =
        layoutResult.layoutCount;


    const layouts =
        layoutResult.layouts;


    /* --------------------------------------------------------
     * VALIDATE ALL LAYOUTS
     * --------------------------------------------------------
     */

    validateAllPhysicalLayouts({

        layouts,

        sourcePageCount:
            source.pageCount,

        sheet

    });


    /* --------------------------------------------------------
     * MARKS
     * --------------------------------------------------------
 */

    const marks =
        normalizedConfig.marks;


    const cropMarks =
        normalizedConfig.cropMarks;


    /* --------------------------------------------------------
     * OUTPUT PDF
     * --------------------------------------------------------
 */

    const pdfBytes =
        await createOutputPdf({

            sourcePdf,

            sheet,

            layouts,

            marks,

            cropMarks,

            jobInfo,

            font

        });

const pdfBuffer =
    Buffer.isBuffer(pdfBytes)
        ? pdfBytes
        : Buffer.from(pdfBytes);
    /* --------------------------------------------------------
     * RESULT
     * --------------------------------------------------------
 */

    return {

        success:
            true,

        message:
            "PDF imposed successfully.",

        pdfBytes: pdfBuffer,

        source: {

            pageCount:
                source.pageCount,

            width:
                source.width,

            height:
                source.height,

            rotation:
                source.rotation,

            pageSizeDifferences:
                sourcePageSizeDifferences

        },

        sheet: {

            width:
                sheet.width,

            height:
                sheet.height,

            unit:
                sheet.unit

        },

        geometry,

        pattern: {

            id:
                pattern.id,

            pagesPerLayout:
                pattern.pages,

            columns:
                pattern.columns,

            rows:
                pattern.rows,

            mode:
                pattern.mode ??
                null

        },

        binding:
            normalizedConfig.binding,

        workStyle:
            workStyle.type,

        layoutCount,

        layouts,

        sides:
            flattenSides(
                layouts
            )

    };
};


/* ============================================================
 * BACKWARD COMPATIBILITY
 * ============================================================
 */

const runImposition =
    imposePdf;


/* ============================================================
 * EXPORTS
 * ============================================================
 */

/* ============================================================
 * BACKWARD COMPATIBILITY ALIASES
 * ============================================================
 */


const impositionPdf =
    imposePdf;


/* ============================================================
 * EXPORTS
 * ============================================================
 */

export {

    imposePdf,

    impositionPdf,

    runImposition,

    normalizeConfig,

    analyzeSourcePdf,

    calculateGeometry,

    calculateCellPosition,

    buildLayoutSide,

    buildPhysicalLayout,

    buildAllPhysicalLayouts,

    validateAllPhysicalLayouts,

    createOutputPdf

};