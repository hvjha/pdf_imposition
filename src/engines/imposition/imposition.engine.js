import {
    PDFDocument
} from "pdf-lib";


import {
    createPlacement,
    isPlacementInsideSheet,
    createSheet,
    toPoints
} from "./imposition.utils.js";


import {
    validateImpositionPlan
} from "./imposition.validator.js";


import {
    normalizeImpositionConfig
} from "./imposition.config.js";


import {
    resolveFoldPattern,
    buildSidePlacements
} from "./fold/fold.engine.js";


import {
    drawPlacedPage,
    applyWorkStyle
} from "./transform/page.transform.js";


import {
    drawProductionMarks
} from "../marks/marks.engine.js";


// ============================================================
// SOURCE PDF DIMENSIONS
// ============================================================

const getSourcePageDimensions = (
    sourcePdf
) => {

    if (
        sourcePdf.getPageCount() === 0
    ) {

        throw new Error(
            "Source PDF contains no pages."
        );
    }


    const firstPage =
        sourcePdf.getPage(0);


    const size =
        firstPage.getSize();


    return {

        width:
            size.width,

        height:
            size.height,

        rotation:
            firstPage
                .getRotation()
                ?.angle || 0
    };
};


// ============================================================
// MARGINS
// ============================================================

const getMargin = (
    config
) => {

    const margin =
        config.margin ??
        config.margins ??
        {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            unit: "mm"
        };


    const unit =
        margin.unit || "mm";


    return {

        top:
            toPoints(
                Number(
                    margin.top || 0
                ),
                unit
            ),

        right:
            toPoints(
                Number(
                    margin.right || 0
                ),
                unit
            ),

        bottom:
            toPoints(
                Number(
                    margin.bottom || 0
                ),
                unit
            ),

        left:
            toPoints(
                Number(
                    margin.left || 0
                ),
                unit
            )
    };
};


// ============================================================
// GUTTER
// ============================================================

const getGutter = (
    config
) => {

    const gutter =
        config.gutter ||
        {
            horizontal: 0,
            vertical: 0,
            unit: "mm"
        };


    const unit =
        gutter.unit || "mm";


    return {

        horizontal:
            toPoints(
                Number(
                    gutter.horizontal || 0
                ),
                unit
            ),

        vertical:
            toPoints(
                Number(
                    gutter.vertical || 0
                ),
                unit
            )
    };
};


// ============================================================
// USABLE SHEET AREA
// ============================================================

const createUsableArea = ({
    sheet,
    margin
}) => {

    const width =
        sheet.width -
        margin.left -
        margin.right;


    const height =
        sheet.height -
        margin.top -
        margin.bottom;


    if (
        width <= 0 ||
        height <= 0
    ) {

        throw new Error(
            "Margins leave no usable area on the sheet."
        );
    }


    return {

        x:
            margin.left,

        y:
            margin.bottom,

        width,

        height
    };
};


// ============================================================
// CALCULATE COMPLETE LAYOUT
// ============================================================
/*
 * THIS IS THE CORE GEOMETRY.
 *
 * We DO NOT divide the sheet into cells.
 *
 * We first calculate the actual footprint of the pages.
 *
 * Example:
 *
 *   page = 846 × 612
 *
 *   2 columns:
 *
 *   846 + gutter + 846
 *
 *   2 rows:
 *
 *   612 + gutter + 612
 *
 *
 * Remaining sheet area becomes OUTER SHEET SPACE.
 *
 * No artificial space is inserted between pages.
 */
// ============================================================

const calculateLayoutGeometry = ({
    pattern,
    sourceWidth,
    sourceHeight,
    usableArea,
    gutter,
    fitMode
}) => {

    const columns =
        pattern.columns;


    const rows =
        pattern.rows;


    if (
        columns <= 0 ||
        rows <= 0
    ) {

        throw new Error(
            `Invalid geometry for ${pattern.id}.`
        );
    }


    // --------------------------------------------------------
    // NATIVE FOOTPRINT
    // --------------------------------------------------------

    const nativeWidth =
        (
            columns *
            sourceWidth
        ) +
        (
            Math.max(
                columns - 1,
                0
            ) *
            gutter.horizontal
        );


    const nativeHeight =
        (
            rows *
            sourceHeight
        ) +
        (
            Math.max(
                rows - 1,
                0
            ) *
            gutter.vertical
        );


    // --------------------------------------------------------
    // SCALE
    // --------------------------------------------------------
    //
    // SCALE_TO_FIT:
    //
    //   scale DOWN if required.
    //
    //   never enlarge.
    //
    // NONE:
    //
    //   native size.
    // --------------------------------------------------------

    let scale = 1;


    if (
        String(
            fitMode
        ).toUpperCase() !== "NONE"
    ) {

        const scaleX =
            usableArea.width /
            nativeWidth;


        const scaleY =
            usableArea.height /
            nativeHeight;


        scale =
            Math.min(
                1,
                scaleX,
                scaleY
            );
    }


    if (
        !Number.isFinite(scale) ||
        scale <= 0
    ) {

        throw new Error(
            `Unable to fit ${pattern.id} on sheet.`
        );
    }


    // --------------------------------------------------------
    // ACTUAL PAGE SIZE
    // --------------------------------------------------------

    const pageWidth =
        sourceWidth *
        scale;


    const pageHeight =
        sourceHeight *
        scale;


    const horizontalGutter =
        gutter.horizontal *
        scale;


    const verticalGutter =
        gutter.vertical *
        scale;


    // --------------------------------------------------------
    // COMPLETE LAYOUT SIZE
    // --------------------------------------------------------

    const layoutWidth =
        (
            columns *
            pageWidth
        ) +
        (
            Math.max(
                columns - 1,
                0
            ) *
            horizontalGutter
        );


    const layoutHeight =
        (
            rows *
            pageHeight
        ) +
        (
            Math.max(
                rows - 1,
                0
            ) *
            verticalGutter
        );


    // --------------------------------------------------------
    // CENTER COMPLETE LAYOUT
    //
    // IMPORTANT:
    //
    // This is OUTER sheet space.
    //
    // It is NOT inserted between pages.
    // --------------------------------------------------------

    const startX =
        usableArea.x +
        (
            usableArea.width -
            layoutWidth
        ) / 2;


    const startY =
        usableArea.y +
        (
            usableArea.height -
            layoutHeight
        ) / 2;


    return {

        scale,

        pageWidth,

        pageHeight,

        horizontalGutter,

        verticalGutter,

        layoutWidth,

        layoutHeight,

        startX,

        startY
    };
};


// ============================================================
// BUILD PHYSICAL PLACEMENTS
// ============================================================

const buildPhysicalPlacements = ({
    pattern,
    side,
    geometry
}) => {

    const logicalPlacements =
        buildSidePlacements({
            pattern,
            side
        });


    return logicalPlacements.map(
        placement => {

            const x =
                geometry.startX +
                (
                    placement.column *
                    (
                        geometry.pageWidth +
                        geometry.horizontalGutter
                    )
                );


            /*
             * row 0 = TOP
             *
             * PDF coordinate system:
             * y = bottom
             *
             * Therefore reverse row order.
             */

            const y =
                geometry.startY +
                (
                    pattern.rows -
                    1 -
                    placement.row
                ) *
                (
                    geometry.pageHeight +
                    geometry.verticalGutter
                );


            return createPlacement({

                pageNumber:
                    placement.pageNumber,

                x,

                y,

                width:
                    geometry.pageWidth,

                height:
                    geometry.pageHeight,

                rotation:
                    placement.rotation,

                unit:
                    "pt"
            });
        }
    );
};


// ============================================================
// VALIDATE SOURCE PAGE REFERENCES
// ============================================================

const validateSourcePageReferences = ({
    placements,
    sourcePageCount,
    side
}) => {

    placements.forEach(
        placement => {

            if (
                placement.pageNumber < 1 ||
                placement.pageNumber >
                    sourcePageCount
            ) {

                throw new Error(
                    `${side}: pattern references source page ` +
                    `${placement.pageNumber}, but source PDF has ` +
                    `${sourcePageCount} pages.`
                );
            }
        }
    );
};


// ============================================================
// VALIDATE SHEET BOUNDARIES
// ============================================================

const validatePlacements = ({
    placements,
    sheet
}) => {

    const invalid =
        placements.filter(
            placement =>
                !isPlacementInsideSheet(
                    placement,
                    sheet
                )
        );


    if (
        invalid.length > 0
    ) {

        throw new Error(
            "Placement outside sheet boundary. " +
            `Pages: ${
                invalid
                    .map(
                        item =>
                            item.pageNumber
                    )
                    .join(", ")
            }`
        );
    }
};


// ============================================================
// IMPOSE PDF
// ============================================================

const impositionPdf = async ({
    pdfBuffer,
    config = {},
    jobInfo = null
}) => {

    if (
        !Buffer.isBuffer(
            pdfBuffer
        )
    ) {

        throw new Error(
            "PDF buffer is required."
        );
    }


    // ========================================================
    // NORMALIZE CONFIG
    // ========================================================

    const normalizedConfig =
        normalizeImpositionConfig(
            config
        );


    console.log(
        "========== IMPOSITION DEBUG =========="
    );


    console.log(
        "RAW CONFIG:",
        JSON.stringify(
            config,
            null,
            2
        )
    );


    console.log(
        "NORMALIZED CONFIG:",
        JSON.stringify(
            normalizedConfig,
            null,
            2
        )
    );


    // ========================================================
    // LOAD SOURCE
    // ========================================================

    const sourcePdf =
        await PDFDocument.load(
            pdfBuffer
        );


    const sourcePageCount =
        sourcePdf.getPageCount();


    if (
        sourcePageCount === 0
    ) {

        throw new Error(
            "Source PDF contains no pages."
        );
    }


    // ========================================================
    // ACTUAL SOURCE PAGE SIZE
    // ========================================================

    const sourceDimensions =
        getSourcePageDimensions(
            sourcePdf
        );


    const sourceWidth =
        sourceDimensions.width;


    const sourceHeight =
        sourceDimensions.height;


    console.log(
        "[IMPOSITION] SOURCE:",
        `${sourceWidth} × ${sourceHeight} pt`
    );


    // ========================================================
    // SHEET
    // ========================================================

    const sheet =
        createSheet({

            width:
                normalizedConfig
                    .sheet
                    .width,

            height:
                normalizedConfig
                    .sheet
                    .height,

            unit:
                normalizedConfig
                    .sheet
                    .unit
        });


    console.log(
        "[IMPOSITION] SHEET:",
        `${sheet.width} × ${sheet.height} pt`
    );


    // ========================================================
    // MARGIN
    // ========================================================

    const margin =
        getMargin(
            normalizedConfig
        );


    // ========================================================
    // GUTTER
    // ========================================================

    const gutter =
        getGutter(
            normalizedConfig
        );


    // ========================================================
    // USABLE AREA
    // ========================================================

    const usableArea =
        createUsableArea({

            sheet,

            margin
        });


    // ========================================================
    // FOLD PATTERN
    // ========================================================

    const pagesPerLayout =
        Number(
            normalizedConfig
                .layout
                .pagesPerLayout
        );


    const patternId =
        normalizedConfig
            .layout
            ?.patternId ||
        normalizedConfig
            .layout
            ?.foldPattern ||
        null;


    const pattern =
        resolveFoldPattern({

            pagesPerLayout,

            patternId
        });


    console.log(
        "[IMPOSITION] PATTERN:",
        pattern.id
    );


    // ========================================================
    // FIT MODE
    // ========================================================

    const fitMode =
        normalizedConfig
            .fit
            ?.mode ||
        "SCALE_TO_FIT";


    // ========================================================
    // GEOMETRY
    // ========================================================
    //
    // This is where actual PDF dimensions are used.
    //
    // NO sheet-cell division.
    // ========================================================

    const geometry =
        calculateLayoutGeometry({

            pattern,

            sourceWidth,

            sourceHeight,

            usableArea,

            gutter,

            fitMode
        });


    console.log(
        "[IMPOSITION] GEOMETRY:",
        JSON.stringify(
            geometry,
            null,
            2
        )
    );


    // ========================================================
    // FRONT
    // ========================================================

    let frontPlacements =
        buildPhysicalPlacements({

            pattern,

            side:
                "front",

            geometry
        });


    // ========================================================
    // BACK
    // ========================================================

    let backPlacements =
        buildPhysicalPlacements({

            pattern,

            side:
                "back",

            geometry
        });


    // ========================================================
    // WORK STYLE
    // ========================================================

    const workStyle =
        normalizedConfig
            .workStyle
            ?.type ||
        "SHEETWISE";


    /*
     * Only transform BACK when a BACK actually exists.
     */

    if (
        backPlacements.length > 0
    ) {

        backPlacements =
            applyWorkStyle({

                placements:
                    backPlacements,

                sheet,

                workStyle
            });
    }


    // ========================================================
    // SINGLE SIDED
    // ========================================================

    const isSingleSided =
        String(
            workStyle
        ).toUpperCase() ===
        "SINGLE_SIDED";


    // ========================================================
    // SIDES
    // ========================================================
    //
    // VERY IMPORTANT:
    //
    // If fold pattern has no BACK, do NOT generate a blank
    // second PDF page.
    // ========================================================

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
        !isSingleSided &&
        backPlacements.length > 0
    ) {

        sides.push({

            name:
                "BACK",

            placements:
                backPlacements
        });
    }


    // ========================================================
    // VALIDATE PAGE REFERENCES
    // ========================================================

    sides.forEach(
        side => {

            validateSourcePageReferences({

                placements:
                    side.placements,

                sourcePageCount,

                side:
                    side.name
            });
        }
    );


    // ========================================================
    // OUTPUT PDF
    // ========================================================

    const outputPdf =
        await PDFDocument.create();


    // ========================================================
    // EMBED SOURCE PAGES
    // ========================================================

    const embeddedPages =
        await outputPdf.embedPages(
            sourcePdf.getPages()
        );


    // ========================================================
    // FONT
    // ========================================================

    let font = null;


    if (
        normalizedConfig
            .marks
            ?.jobInfo
    ) {

        font =
            await outputPdf.embedFont(
                "Helvetica"
            );
    }


    // ========================================================
    // GENERATE PHYSICAL SIDES
    // ========================================================

    const generatedSheets = [];


    for (
        const side
        of sides
    ) {

        // ----------------------------------------------------
        // VALIDATE
        // ----------------------------------------------------

        validatePlacements({

            placements:
                side.placements,

            sheet
        });


        // ----------------------------------------------------
        // CREATE PHYSICAL SHEET
        // ----------------------------------------------------

        const outputPage =
            outputPdf.addPage([

                sheet.width,

                sheet.height

            ]);


        // ----------------------------------------------------
        // DRAW SOURCE PAGES
        // ----------------------------------------------------

        for (
            const placement
            of side.placements
        ) {

            const embeddedPage =
                embeddedPages[
                    placement.pageNumber - 1
                ];


            if (!embeddedPage) {

                throw new Error(
                    `Unable to embed source page ` +
                    `${placement.pageNumber}.`
                );
            }


            drawPlacedPage({

                outputPage,

                embeddedPage,

                placement
            });
        }


        // ----------------------------------------------------
        // PRODUCTION MARKS
        // ----------------------------------------------------

        drawProductionMarks({

            page:
                outputPage,

            placements:
                side.placements,

            marks:
                normalizedConfig.marks,

            cropMarks:
                normalizedConfig.cropMarks,

            jobInfo:
                jobInfo ??
                normalizedConfig.jobInfo ??
                null,

            font
        });


        generatedSheets.push({

            side:
                side.name,

            placements:
                side.placements
        });
    }


    // ========================================================
    // FINAL VALIDATION
    // ========================================================

    generatedSheets.forEach(
        sheetSide => {

            validateImpositionPlan({

                sheet,

                placements:
                    sheetSide.placements,

                sourcePageCount
            });
        }
    );


    // ========================================================
    // SAVE
    // ========================================================

    const outputBytes =
        await outputPdf.save();


    const outputBuffer =
        Buffer.from(
            outputBytes
        );


    // ========================================================
    // RETURN
    // ========================================================

    return {

        outputBuffer,

        config:
            normalizedConfig,

        source: {

            pageCount:
                sourcePageCount,

            width:
                sourceWidth,

            height:
                sourceHeight,

            rotation:
                sourceDimensions
                    .rotation
        },

        sheet: {

            width:
                sheet.width,

            height:
                sheet.height,

            widthInches:
                sheet.widthInches,

            heightInches:
                sheet.heightInches
        },

        foldPattern:
            pattern.id,

        workStyle,

        geometry: {

            scale:
                geometry.scale,

            pageWidth:
                geometry.pageWidth,

            pageHeight:
                geometry.pageHeight,

            gutterHorizontal:
                geometry.horizontalGutter,

            gutterVertical:
                geometry.verticalGutter,

            layoutWidth:
                geometry.layoutWidth,

            layoutHeight:
                geometry.layoutHeight,

            startX:
                geometry.startX,

            startY:
                geometry.startY
        },

        sides:
            generatedSheets
    };
};


export {
    impositionPdf
};