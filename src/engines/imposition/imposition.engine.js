import { PDFDocument } from "pdf-lib";

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
    resolveFoldPattern
} from "./fold/fold.engine.js";

import {
    drawPlacedPage,
    applyWorkStyle
} from "./transform/page.transform.js";

import {
    drawProductionMarks
} from "../marks/marks.engine.js";


// =====================================================
// CONSTANTS
// =====================================================

const EPSILON = 0.01;


// =====================================================
// NUMBER HELPERS
// =====================================================

const isFiniteNumber = (value) =>
    Number.isFinite(Number(value));


const safeNumber = (
    value,
    fallback = 0
) => {

    const number =
        Number(value);

    return Number.isFinite(number)
        ? number
        : fallback;
};


// =====================================================
// SOURCE PAGE DIMENSIONS
// =====================================================

const getSourcePageDimensions = (
    page
) => {

    const width =
        page.getWidth();

    const height =
        page.getHeight();

    const rotation =
        page.getRotation?.()?.angle ??
        0;

    return {

        width,

        height,

        rotation
    };
};


// =====================================================
// MARGIN
// =====================================================

const getMargin = ({
    margin,
    margins
}) => {

    const source =
        margins ??
        margin ??
        {};

    return {

        top:
            safeNumber(
                source.top
            ),

        right:
            safeNumber(
                source.right
            ),

        bottom:
            safeNumber(
                source.bottom
            ),

        left:
            safeNumber(
                source.left
            ),

        unit:
            source.unit ??
            "mm"
    };
};


// =====================================================
// GUTTER
// =====================================================

const getGutter = ({
    gutter
}) => {

    const source =
        gutter ??
        {};

    return {

        horizontal:
            safeNumber(
                source.horizontal
            ),

        vertical:
            safeNumber(
                source.vertical
            ),

        unit:
            source.unit ??
            "mm"
    };
};


// =====================================================
// BLEED
// =====================================================

const getBleed = ({
    bleed
}) => {

    const source =
        bleed ??
        {};

    return {

        top:
            safeNumber(
                source.top
            ),

        right:
            safeNumber(
                source.right
            ),

        bottom:
            safeNumber(
                source.bottom
            ),

        left:
            safeNumber(
                source.left
            ),

        unit:
            source.unit ??
            "mm"
    };
};


// =====================================================
// CROP MARK CLEARANCE
// =====================================================

/*
    IMPORTANT:

    Bleed is NOT added to the PDF page dimensions.

    Bleed and crop marks are treated as production
    clearance around the complete imposed layout.

    Clearance:

        max(
            bleed,
            crop offset + crop mark length
        )
*/

const getCropMarkClearance = ({
    config
}) => {

    const bleed =
        getBleed({
            bleed:
                config.bleed
        });


    const cropMarks =
        config.cropMarks ??
        {};


    const cropEnabled =
        cropMarks.enabled !== false;


    const cropLength =
        cropEnabled
            ? safeNumber(
                cropMarks.length
            )
            : 0;


    const cropOffset =
        cropEnabled
            ? safeNumber(
                cropMarks.offset
            )
            : 0;


    const cropUnit =
        cropMarks.unit ??
        bleed.unit ??
        "mm";


    const bleedUnit =
        bleed.unit ??
        "mm";


    const cropReach =
        cropEnabled
            ? toPoints(
                cropLength +
                cropOffset,

                cropUnit
            )
            : 0;


    return {

        top:
            Math.max(

                toPoints(
                    bleed.top,
                    bleedUnit
                ),

                cropReach
            ),

        right:
            Math.max(

                toPoints(
                    bleed.right,
                    bleedUnit
                ),

                cropReach
            ),

        bottom:
            Math.max(

                toPoints(
                    bleed.bottom,
                    bleedUnit
                ),

                cropReach
            ),

        left:
            Math.max(

                toPoints(
                    bleed.left,
                    bleedUnit
                ),

                cropReach
            )
    };
};


// =====================================================
// USABLE SHEET AREA
// =====================================================

const createUsableArea = ({
    sheet,
    margin,
    cropClearance
}) => {

    const left =
        margin.left +
        cropClearance.left;


    const right =
        margin.right +
        cropClearance.right;


    const top =
        margin.top +
        cropClearance.top;


    const bottom =
        margin.bottom +
        cropClearance.bottom;


    const width =
        sheet.width -
        left -
        right;


    const height =
        sheet.height -
        top -
        bottom;


    if (width <= 0) {

        throw new Error(
            "Sheet usable width is zero or negative after margins and crop clearance."
        );
    }


    if (height <= 0) {

        throw new Error(
            "Sheet usable height is zero or negative after margins and crop clearance."
        );
    }


    return {

        x:
            left,

        y:
            bottom,

        width,

        height
    };
};


// =====================================================
// LAYOUT GEOMETRY
// =====================================================

/*
    The geometry is calculated from:

        actual source PDF size
        +
        selected fold pattern
        +
        sheet size
        +
        margin
        +
        gutter

    No artificial internal gap is introduced.

    If gutter = 0:

        page 1 | page 2

    directly touch each other.

    Remaining sheet area becomes outer margin.
*/

const calculateLayoutGeometry = ({
    sourceWidth,
    sourceHeight,
    columns,
    rows,
    usableArea,
    gutter,
    fitMode
}) => {

    if (
        !isFiniteNumber(
            sourceWidth
        ) ||
        !isFiniteNumber(
            sourceHeight
        )
    ) {

        throw new Error(
            "Invalid source page dimensions."
        );
    }


    if (
        sourceWidth <= 0 ||
        sourceHeight <= 0
    ) {

        throw new Error(
            "Source page dimensions must be greater than zero."
        );
    }


    if (
        !Number.isInteger(
            columns
        ) ||
        !Number.isInteger(
            rows
        ) ||
        columns <= 0 ||
        rows <= 0
    ) {

        throw new Error(
            "Invalid fold pattern grid."
        );
    }


    const gutterHorizontal =
        safeNumber(
            gutter.horizontal
        );


    const gutterVertical =
        safeNumber(
            gutter.vertical
        );


    if (
        gutterHorizontal < 0 ||
        gutterVertical < 0
    ) {

        throw new Error(
            "Gutter cannot be negative."
        );
    }


    // -------------------------------------------------
    // Native layout size
    // -------------------------------------------------

    const nativeWidth =
        (
            columns *
            sourceWidth
        ) +
        (
            (columns - 1) *
            gutterHorizontal
        );


    const nativeHeight =
        (
            rows *
            sourceHeight
        ) +
        (
            (rows - 1) *
            gutterVertical
        );


    // -------------------------------------------------
    // Calculate scale
    // -------------------------------------------------

    let scale = 1;


    if (
        fitMode ===
        "SCALE_TO_FIT"
    ) {

        const widthScale =
            usableArea.width /
            nativeWidth;


        const heightScale =
            usableArea.height /
            nativeHeight;


        /*
            Do not enlarge the source artwork.

            Maximum scale = 1.
        */

        scale =
            Math.min(
                1,
                widthScale,
                heightScale
            );
    }


    // -------------------------------------------------
    // Final page dimensions
    // -------------------------------------------------

    const pageWidth =
        sourceWidth *
        scale;


    const pageHeight =
        sourceHeight *
        scale;


    const scaledGutterHorizontal =
        gutterHorizontal *
        scale;


    const scaledGutterVertical =
        gutterVertical *
        scale;


    // -------------------------------------------------
    // Final complete layout dimensions
    // -------------------------------------------------

    const layoutWidth =
        (
            columns *
            pageWidth
        ) +
        (
            (columns - 1) *
            scaledGutterHorizontal
        );


    const layoutHeight =
        (
            rows *
            pageHeight
        ) +
        (
            (rows - 1) *
            scaledGutterVertical
        );


    // -------------------------------------------------
    // Center complete layout
    // -------------------------------------------------

    const offsetX =
        (
            usableArea.width -
            layoutWidth
        ) / 2;


    const offsetY =
        (
            usableArea.height -
            layoutHeight
        ) / 2;


    const originX =
        usableArea.x +
        offsetX;


    const originY =
        usableArea.y +
        offsetY;


    return {

        scale,

        sourceWidth,

        sourceHeight,

        pageWidth,

        pageHeight,

        gutterHorizontal:
            scaledGutterHorizontal,

        gutterVertical:
            scaledGutterVertical,

        columns,

        rows,

        layoutWidth,

        layoutHeight,

        originX,

        originY,

        usableArea
    };
};


// =====================================================
// BUILD PHYSICAL PLACEMENTS
// =====================================================

const buildPhysicalPlacements = ({
    patternSide,
    geometry
}) => {

    if (
        !patternSide ||
        !Array.isArray(
            patternSide
        )
    ) {

        return [];
    }


    const placements = [];


    for (
        const item
        of patternSide
    ) {

        const column =
            Number(
                item.column
            );


        const row =
            Number(
                item.row
            );


        const pageNumber =
            Number(
                item.pageNumber
            );


        const rotation =
            Number(
                item.rotation ??
                0
            );


        if (
            !Number.isInteger(
                column
            ) ||
            !Number.isInteger(
                row
            )
        ) {

            throw new Error(
                "Invalid fold-pattern position."
            );
        }


        if (
            column < 0 ||
            column >= geometry.columns
        ) {

            throw new Error(
                `Fold-pattern column ${column} is outside the grid.`
            );
        }


        if (
            row < 0 ||
            row >= geometry.rows
        ) {

            throw new Error(
                `Fold-pattern row ${row} is outside the grid.`
            );
        }


        const x =
            geometry.originX +
            (
                column *
                (
                    geometry.pageWidth +
                    geometry.gutterHorizontal
                )
            );


        /*
            Fold pattern row numbering:

                0 = top row
                1 = next row
                etc.

            PDF coordinate system:

                bottom = 0

            Therefore convert top-based row
            to bottom-based PDF position.
        */

        const y =
            geometry.originY +
            (
                (
                    geometry.rows -
                    1 -
                    row
                ) *
                (
                    geometry.pageHeight +
                    geometry.gutterVertical
                )
            );


        placements.push(

            createPlacement({

                pageNumber,

                x,

                y,

                width:
                    geometry.pageWidth,

                height:
                    geometry.pageHeight,

                rotation,

                unit:
                    "pt"
            })
        );
    }


    return placements;
};


// =====================================================
// SOURCE PAGE REFERENCE VALIDATION
// =====================================================

const validateSourcePageReferences = ({
    placements,
    sourcePageCount
}) => {

    const usedPages =
        new Set();


    for (
        const placement
        of placements
    ) {

        const pageNumber =
            Number(
                placement.pageNumber
            );


        if (
            !Number.isInteger(
                pageNumber
            ) ||
            pageNumber < 1 ||
            pageNumber > sourcePageCount
        ) {

            throw new Error(
                `Invalid source page reference: ${pageNumber}.`
            );
        }


        if (
            usedPages.has(
                pageNumber
            )
        ) {

            throw new Error(
                `Source page ${pageNumber} is used more than once in the same side.`
            );
        }


        usedPages.add(
            pageNumber
        );
    }
};


// =====================================================
// SHEET BOUNDARY VALIDATION
// =====================================================

const validatePlacementsAgainstSheet = ({
    placements,
    sheet
}) => {

    for (
        const placement
        of placements
    ) {

        if (
            !isPlacementInsideSheet(
                placement,
                sheet,
                EPSILON
            )
        ) {

            throw new Error(
                `Page ${placement.pageNumber} falls outside the output sheet.`
            );
        }
    }
};


// =====================================================
// PATTERN GRID
// =====================================================

const getPatternGrid = ({
    pattern
}) => {

    if (!pattern) {

        throw new Error(
            "Fold pattern is required."
        );
    }


    const columns =
        Number(
            pattern.columns ??
            pattern.cols
        );


    const rows =
        Number(
            pattern.rows
        );


    if (
        !Number.isInteger(
            columns
        ) ||
        !Number.isInteger(
            rows
        ) ||
        columns <= 0 ||
        rows <= 0
    ) {

        throw new Error(
            "Fold pattern must define valid columns and rows."
        );
    }


    return {

        columns,

        rows
    };
};


// =====================================================
// BUILD SIDE
// =====================================================

const buildSide = ({
    side,
    geometry
}) => {

    return buildPhysicalPlacements({

        patternSide:
            side ?? [],

        geometry
    });
};


// =====================================================
// IMPOSE PDF
// =====================================================

const impositionPdf = async ({
    sourcePdfBytes,
    config = {},
    jobInfo = null,
    font = null
}) => {


    // -------------------------------------------------
    // Validate input
    // -------------------------------------------------

    if (
        !sourcePdfBytes
    ) {

        throw new Error(
            "sourcePdfBytes is required."
        );
    }


    /*
        Accept both Buffer and Uint8Array.

        This makes the engine safer when called from
        different Node.js services.
    */

    if (
        !Buffer.isBuffer(
            sourcePdfBytes
        ) &&
        !(
            sourcePdfBytes instanceof
            Uint8Array
        )
    ) {

        throw new Error(
            "sourcePdfBytes must be a Buffer or Uint8Array."
        );
    }


    // -------------------------------------------------
    // Normalize configuration
    // -------------------------------------------------

    const normalizedConfig =
        normalizeImpositionConfig(
            config
        );


    // -------------------------------------------------
    // Load source PDF
    // -------------------------------------------------

    const sourcePdf =
        await PDFDocument.load(
            sourcePdfBytes
        );


    const sourcePages =
        sourcePdf.getPages();


    const sourcePageCount =
        sourcePages.length;


    if (
        sourcePageCount === 0
    ) {

        throw new Error(
            "Source PDF contains no pages."
        );
    }


    // -------------------------------------------------
    // Read source page dimensions
    // -------------------------------------------------

    const firstSourcePage =
        sourcePages[0];


    const sourceDimensions =
        getSourcePageDimensions(
            firstSourcePage
        );


    const sourceWidth =
        sourceDimensions.width;


    const sourceHeight =
        sourceDimensions.height;


    /*
        Current Phase 5 engine assumes all pages have
        the same physical dimensions.
    */

    for (
        let index = 1;
        index < sourcePages.length;
        index++
    ) {

        const dimensions =
            getSourcePageDimensions(
                sourcePages[index]
            );


        if (
            Math.abs(
                dimensions.width -
                sourceWidth
            ) > EPSILON ||
            Math.abs(
                dimensions.height -
                sourceHeight
            ) > EPSILON
        ) {

            throw new Error(

                `Source PDF page ${index + 1} has a different page size. ` +
                `All pages must currently have the same physical dimensions.`
            );
        }
    }


    // -------------------------------------------------
    // Sheet
    // -------------------------------------------------

    const sheetConfig =
        normalizedConfig.sheet;


    if (
        !sheetConfig
    ) {

        throw new Error(
            "Sheet configuration is required."
        );
    }


    const sheet =
        createSheet({

            width:
                sheetConfig.width,

            height:
                sheetConfig.height,

            unit:
                sheetConfig.unit
        });


    // -------------------------------------------------
    // Margins
    // -------------------------------------------------

    const margin =
        getMargin({

            margin:
                normalizedConfig.margin,

            margins:
                normalizedConfig.margins
        });


    const marginPoints = {

        top:
            toPoints(
                margin.top,
                margin.unit
            ),

        right:
            toPoints(
                margin.right,
                margin.unit
            ),

        bottom:
            toPoints(
                margin.bottom,
                margin.unit
            ),

        left:
            toPoints(
                margin.left,
                margin.unit
            )
    };


    // -------------------------------------------------
    // Gutter
    // -------------------------------------------------

    const gutterConfig =
        getGutter({

            gutter:
                normalizedConfig.gutter
        });


    const gutter = {

        horizontal:
            toPoints(
                gutterConfig.horizontal,
                gutterConfig.unit
            ),

        vertical:
            toPoints(
                gutterConfig.vertical,
                gutterConfig.unit
            )
    };


    // -------------------------------------------------
    // Crop / bleed clearance
    // -------------------------------------------------

    const cropClearance =
        getCropMarkClearance({

            config:
                normalizedConfig
        });


    // -------------------------------------------------
    // Usable sheet area
    // -------------------------------------------------

    const usableArea =
        createUsableArea({

            sheet,

            margin:
                marginPoints,

            cropClearance
        });


    // -------------------------------------------------
    // Layout configuration
    // -------------------------------------------------

    const layoutConfig =
        normalizedConfig.layout ??
        {};


    const pagesPerLayout =
        Number(

            layoutConfig.pagesPerLayout ??
            layoutConfig.pageCount ??
            sourcePageCount
        );


    if (
        !Number.isInteger(
            pagesPerLayout
        )
    ) {

        throw new Error(
            "pagesPerLayout must be an integer."
        );
    }


    if (
        pagesPerLayout >
        sourcePageCount
    ) {

        throw new Error(

            `pagesPerLayout (${pagesPerLayout}) ` +
            `cannot exceed source PDF page count ` +
            `(${sourcePageCount}).`
        );
    }


    // -------------------------------------------------
    // Pattern ID
    // -------------------------------------------------

    const patternId =
        layoutConfig.patternId ??
        layoutConfig.foldPattern ??
        null;


    // -------------------------------------------------
    // Resolve fold pattern
    // -------------------------------------------------

    const pattern =
        resolveFoldPattern({

            pagesPerLayout,

            patternId,

            layout:
                layoutConfig,

            binding:
                normalizedConfig.binding
        });


    if (
        !pattern
    ) {

        throw new Error(

            `No fold pattern is available for ${pagesPerLayout}PP.`
        );
    }


    // -------------------------------------------------
    // Pattern grid
    // -------------------------------------------------

    const {
        columns,
        rows
    } =
        getPatternGrid({

            pattern
        });


    // -------------------------------------------------
    // Geometry
    // -------------------------------------------------

    const geometry =
        calculateLayoutGeometry({

            sourceWidth,

            sourceHeight,

            columns,

            rows,

            usableArea,

            gutter,

            fitMode:
                normalizedConfig.fit?.mode ??
                normalizedConfig.fitMode ??
                "SCALE_TO_FIT"
        });


    // -------------------------------------------------
    // Front placements
    // -------------------------------------------------

    const frontPattern =
        pattern.front ??
        [];


    const frontPlacements =
        buildSide({

            side:
                frontPattern,

            geometry
        });


    // -------------------------------------------------
    // Back placements
    // -------------------------------------------------

    const backPattern =
        pattern.back ??
        [];


    const backPlacements =
        buildSide({

            side:
                backPattern,

            geometry
        });


    // -------------------------------------------------
    // Validate page references
    // -------------------------------------------------

    validateSourcePageReferences({

        placements:
            frontPlacements,

        sourcePageCount
    });


    validateSourcePageReferences({

        placements:
            backPlacements,

        sourcePageCount
    });


    // -------------------------------------------------
    // Work Style
    // -------------------------------------------------

    const workStyleType =
        normalizedConfig.workStyle?.type ??
        normalizedConfig.workStyle ??
        "SHEETWISE";


    let finalFrontPlacements =
        frontPlacements;


    let finalBackPlacements =
        backPlacements;


    /*
        Binding and work style are intentionally separate.

        Binding:
            Perfect Binding
            Center Pin
            Case Binding
            Wire-O
            Flat

        Work style:
            Sheetwise
            Work & Turn
            Work & Tumble
            Perfector
            Single-sided
    */

    if (
        finalBackPlacements.length > 0
    ) {

        finalBackPlacements =
            applyWorkStyle({

                placements:
                    finalBackPlacements,

                workStyle:
                    workStyleType,

                sheet
            });
    }


    // -------------------------------------------------
    // Sides
    // -------------------------------------------------

    const sides = [];


    if (
        finalFrontPlacements.length > 0
    ) {

        sides.push({

            name:
                "FRONT",

            placements:
                finalFrontPlacements
        });
    }


    if (
        finalBackPlacements.length > 0
    ) {

        sides.push({

            name:
                "BACK",

            placements:
                finalBackPlacements
        });
    }


    if (
        sides.length === 0
    ) {

        throw new Error(
            "Imposition produced no placements."
        );
    }


    // -------------------------------------------------
    // Sheet boundary validation
    // -------------------------------------------------

    for (
        const side
        of sides
    ) {

        validatePlacementsAgainstSheet({

            placements:
                side.placements,

            sheet
        });
    }


    // -------------------------------------------------
    // Create output PDF
    // -------------------------------------------------

    const outputPdf =
        await PDFDocument.create();


    // -------------------------------------------------
    // Embed source pages
    // -------------------------------------------------

    const embeddedPages =
        await Promise.all(

            sourcePages.map(
                page =>
                    outputPdf.embedPage(
                        page
                    )
            )
        );


    // -------------------------------------------------
    // Draw sides
    // -------------------------------------------------

    for (
        const side
        of sides
    ) {

        const outputPage =
            outputPdf.addPage([

                sheet.width,

                sheet.height
            ]);


        // -------------------------------------------------
        // Draw imposed pages
        // -------------------------------------------------

        for (
            const placement
            of side.placements
        ) {

            const pageNumber =
                Number(
                    placement.pageNumber
                );


            const embeddedPage =
                embeddedPages[
                    pageNumber - 1
                ];


            if (
                !embeddedPage
            ) {

                throw new Error(

                    `Unable to embed source page ${pageNumber}.`
                );
            }


            drawPlacedPage({

                outputPage,

                embeddedPage,

                placement
            });
        }


        // -------------------------------------------------
        // Production marks
        // -------------------------------------------------

        drawProductionMarks({

            page:
                outputPage,

            placements:
                side.placements,

            marks:
                normalizedConfig.marks ??
                {},

            cropMarks:
                normalizedConfig.cropMarks ??
                {},

            jobInfo,

            font
        });
    }


    // -------------------------------------------------
    // Validate final plan
    // -------------------------------------------------

    for (
        const side
        of sides
    ) {

        validateImpositionPlan({

            sheet,

            sides: [

                {

                    name:
                        side.name,

                    placements:
                        side.placements
                }
            ]
        });
    }


    // -------------------------------------------------
    // Save PDF
    // -------------------------------------------------

    const outputBytes =
        await outputPdf.save();


    /*
        pdf-lib returns Uint8Array.

        Convert it explicitly to Node.js Buffer
        because GridFS upload and the controller
        expect a Buffer.
    */

    const outputBuffer =
        Buffer.from(
            outputBytes
        );


    // -------------------------------------------------
    // Final output validation
    // -------------------------------------------------

    if (
        !Buffer.isBuffer(
            outputBuffer
        )
    ) {

        throw new Error(
            "Failed to convert generated PDF to Buffer."
        );
    }


    if (
        outputBuffer.length === 0
    ) {

        throw new Error(
            "Generated PDF is empty."
        );
    }


    // -------------------------------------------------
    // Return
    // -------------------------------------------------

    return {

        /*
            IMPORTANT:

            Controller expects:

                result.pdfBytes

            and this is now a real Node Buffer.
        */

        pdfBytes:
            outputBuffer,


        // -------------------------------------------------
        // Sheet
        // -------------------------------------------------

        sheet: {

            width:
                sheet.width,

            height:
                sheet.height,

            unit:
                "pt"
        },


        // -------------------------------------------------
        // Source
        // -------------------------------------------------

        source: {

            pageCount:
                sourcePageCount,

            width:
                sourceWidth,

            height:
                sourceHeight,

            rotation:
                sourceDimensions.rotation
        },


        // -------------------------------------------------
        // Geometry
        // -------------------------------------------------

        geometry: {

            scale:
                geometry.scale,

            pageWidth:
                geometry.pageWidth,

            pageHeight:
                geometry.pageHeight,

            gutterHorizontal:
                geometry.gutterHorizontal,

            gutterVertical:
                geometry.gutterVertical,

            layoutWidth:
                geometry.layoutWidth,

            layoutHeight:
                geometry.layoutHeight,

            originX:
                geometry.originX,

            originY:
                geometry.originY,

            usableArea:
                geometry.usableArea,

            cropClearance
        },


        // -------------------------------------------------
        // Pattern
        // -------------------------------------------------

        pattern: {

            id:
                pattern.id ??
                patternId ??
                null,

            pagesPerLayout,

            columns,

            rows
        },


        // -------------------------------------------------
        // Work Style
        // -------------------------------------------------

        workStyle:
            workStyleType,


        // -------------------------------------------------
        // Sides
        // -------------------------------------------------

        sides
    };
};


// =====================================================
// EXPORT
// =====================================================

export {
    impositionPdf
};


export default {
    impositionPdf
};