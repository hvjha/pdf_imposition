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
 *   8PP
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
    PDFDocument,
    StandardFonts
} from "pdf-lib";


import {
    toPoints,
    detectContentBoundingBox
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
    "SINGLE_SIDED",
    "SIMPLEX",
    "DUPLEX"
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

    const unit =
        source.unit ??
        config.unit ??
        "mm";

    if (
        typeof source === "number"
    ) {
        const val = convertMeasurement(Number(source), unit);

        return {
            top: val,
            right: val,
            bottom: val,
            left: val,
            vertical: val,
            horizontal: val
        };
    }

    const verticalFallback =
        source.vertical ??
        source.y ??
        config.verticalMargin ??
        config.marginVertical ??
        0;

    const horizontalFallback =
        source.horizontal ??
        source.x ??
        config.horizontalMargin ??
        config.marginHorizontal ??
        0;

    const rawTop =
        numberOrDefault(
            source.top,
            verticalFallback
        );

    const rawBottom =
        numberOrDefault(
            source.bottom,
            verticalFallback
        );

    const rawLeft =
        numberOrDefault(
            source.left,
            horizontalFallback
        );

    const rawRight =
        numberOrDefault(
            source.right,
            horizontalFallback
        );

    const top = convertMeasurement(rawTop, unit);
    const bottom = convertMeasurement(rawBottom, unit);
    const left = convertMeasurement(rawLeft, unit);
    const right = convertMeasurement(rawRight, unit);

    return {
        top,
        right,
        bottom,
        left,
        vertical: (top + bottom) / 2,
        horizontal: (left + right) / 2
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

    const unit =
        source.unit ??
        config.unit ??
        "mm";

    if (
        typeof source === "number"
    ) {
        const val = convertMeasurement(Number(source), unit);

        return {
            horizontal: val,
            vertical: val
        };
    }

    const rawH =
        numberOrDefault(
            source.horizontal ??
            source.x ??
            source.gutterX ??
            config.grid?.gutterX,
            0
        );

    const rawV =
        numberOrDefault(
            source.vertical ??
            source.y ??
            source.gutterY ??
            config.grid?.gutterY,
            0
        );

    return {
        horizontal: convertMeasurement(rawH, unit),
        vertical: convertMeasurement(rawV, unit)
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


    const sheetOrientation = String(
        source.orientation ??
        config.sheetOrientation ??
        ""
    ).toUpperCase();

    let finalWidth = width;
    let finalHeight = height;

    if (sheetOrientation === "LANDSCAPE" && finalWidth < finalHeight) {
        finalWidth = height;
        finalHeight = width;
    } else if (sheetOrientation === "PORTRAIT" && finalWidth > finalHeight) {
        finalWidth = height;
        finalHeight = width;
    }

    const sheet = {

        width: finalWidth,

        height: finalHeight,

        unit,

        orientation: finalWidth >= finalHeight ? "LANDSCAPE" : "PORTRAIT"

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
 * BOOK SIZE (Finished Trim Size)
 * ============================================================
 */

const normalizeBookSize = (
    config
) => {

    const source =
        config.bookSize ??
        config.book ??
        config.targetBookSize ??
        null;

    if (!source || (typeof source !== "object" && typeof source !== "string")) {
        return null;
    }

    const unit =
        source.unit ??
        "mm";

    const width =
        source.width
            ? convertMeasurement(source.width, unit)
            : null;

    const height =
        source.height
            ? convertMeasurement(source.height, unit)
            : null;

    return {

        width,

        height,

        rawWidth:
            source.width || null,

        rawHeight:
            source.height || null,

        unit,

        preset:
            source.preset || source.name || "CUSTOM",

        isCustom:
            Boolean(source.isCustom || source.preset === "CUSTOM")

    };
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
            config.fit?.mode ??
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

        let type =
            source
                .trim()
                .toUpperCase();

        if (type === "SIMPLEX") type = "SINGLE_SIDED";
        if (type === "DUPLEX") type = "SHEETWISE";


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


    let type =
        String(
            source.type ??
            "SHEETWISE"
        )
            .trim()
            .toUpperCase();

    if (type === "SIMPLEX") type = "SINGLE_SIDED";
    if (type === "DUPLEX") type = "SHEETWISE";


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

    const raw =
        config.marks ??
        {};

    return {

        ...raw,

        enabled:
            raw.enabled !== false,

        crop:
            Boolean(
                raw.crop ??
                config.cropMarks?.enabled ??
                true
            ),

        colorBar:
            Boolean(
                raw.colorBar ??
                raw.colorBars ??
                true
            ),

        colorBars:
            Boolean(
                raw.colorBars ??
                raw.colorBar ??
                true
            ),

        cameraMarks:
            typeof raw.cameraMarks === "object"
                ? raw.cameraMarks
                : Boolean(
                    raw.cameraMarks ??
                    raw.camera ??
                    raw.opticalMarks ??
                    false
                ),

        cameraMarkRadius:
            Number(raw.cameraMarkRadius ?? (typeof raw.cameraMarks === "object" ? raw.cameraMarks.radius : null) ?? 5),

        cameraMarkSize:
            Number(raw.cameraMarkSize ?? (typeof raw.cameraMarks === "object" ? raw.cameraMarks.size : null) ?? 10),

        cameraMarkOffset:
            Number(raw.cameraMarkOffset ?? (typeof raw.cameraMarks === "object" ? raw.cameraMarks.offset : null) ?? 8),

        cameraMarkPositions:
            String(raw.cameraMarkPositions ?? (typeof raw.cameraMarks === "object" ? raw.cameraMarks.positions : null) ?? "CORNERS_AND_EDGES"),

        registration:
            Boolean(
                raw.registration ??
                raw.registrationMarks ??
                true
            ),

        registrationMarks:
            Boolean(
                raw.registrationMarks ??
                raw.registration ??
                true
            ),

        jobSlug:
            Boolean(
                raw.jobSlug ??
                raw.jobInfo ??
                true
            ),

        jobInfo:
            Boolean(
                raw.jobInfo ??
                raw.jobSlug ??
                true
            ),

        collatingMarks:
            Boolean(
                raw.collatingMarks ??
                false
            ),

        boxConfig:
            config.boxConfig || raw.boxConfig || {},

        coverStudio:
            config.coverStudio || raw.coverStudio || null,

        dielineOverlay:
            Boolean(config.boxConfig?.dielineOverlay ?? raw.dielineOverlay ?? false)

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
            source.pageCount ??
            ((config.grid?.columns && config.grid?.rows)
                ? (Number(config.grid.columns) * Number(config.grid.rows))
                : 1)
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


    const pageOrientation = String(
        source.orientation ??
        source.pageOrientation ??
        config.pageOrientation ??
        config.orientation ??
        "AUTO"
    ).toUpperCase();

    let pageRotation = Number(
        source.pageRotation ??
        config.pageRotation ??
        0
    );

    if (!pageRotation && pageOrientation === "LANDSCAPE") {
        pageRotation = 90;
    }

    return {

        ...source,

        pagesPerLayout,

        orientation: pageOrientation,

        pageOrientation,

        pageRotation,

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


    const bookSize =
        normalizeBookSize(
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

        bookSize,

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
 * STANDARD SHEET PRESETS & MINIMUM SHEET SELECTOR
 * ============================================================
 */

const STANDARD_SHEET_PRESETS_PT = [
    { name: 'A4', width: toPoints(210, 'mm'), height: toPoints(297, 'mm') },
    { name: 'A3', width: toPoints(297, 'mm'), height: toPoints(420, 'mm') },
    { name: 'SRA3', width: toPoints(320, 'mm'), height: toPoints(450, 'mm') },
    { name: 'A3+', width: toPoints(329, 'mm'), height: toPoints(483, 'mm') },
    { name: '18×25"', width: toPoints(635, 'mm'), height: toPoints(457.2, 'mm') },
    { name: '20×26"', width: toPoints(508, 'mm'), height: toPoints(660, 'mm') },
    { name: 'B2', width: toPoints(500, 'mm'), height: toPoints(707, 'mm') },
    { name: '23×36"', width: toPoints(584, 'mm'), height: toPoints(914, 'mm') },
    { name: '25×38"', width: toPoints(635, 'mm'), height: toPoints(965, 'mm') },
    { name: '28×40"', width: toPoints(711, 'mm'), height: toPoints(1016, 'mm') },
    { name: '30×40"', width: toPoints(762, 'mm'), height: toPoints(1016, 'mm') }
];

const findMinimumSheetPresetPt = (reqWidth, reqHeight) => {
    const candidates = [];
    for (const preset of STANDARD_SHEET_PRESETS_PT) {
        if (preset.width >= reqWidth - EPSILON && preset.height >= reqHeight - EPSILON) {
            candidates.push({
                name: preset.name,
                width: preset.width,
                height: preset.height,
                area: preset.width * preset.height,
                orientation: preset.width >= preset.height ? 'LANDSCAPE' : 'PORTRAIT'
            });
        }
        if (preset.height >= reqWidth - EPSILON && preset.width >= reqHeight - EPSILON && preset.width !== preset.height) {
            candidates.push({
                name: preset.name,
                width: preset.height,
                height: preset.width,
                area: preset.width * preset.height,
                orientation: preset.height >= preset.width ? 'LANDSCAPE' : 'PORTRAIT'
            });
        }
    }
    if (candidates.length > 0) {
        candidates.sort((a, b) => {
            if (Math.abs(a.area - b.area) > 1) {
                return a.area - b.area;
            }
            return (a.width + a.height) - (b.width + b.height);
        });
        return candidates[0];
    }
    const customW = Math.ceil(reqWidth);
    const customH = Math.ceil(reqHeight);
    return {
        name: 'CUSTOM',
        width: customW,
        height: customH,
        area: customW * customH,
        orientation: customW >= customH ? 'LANDSCAPE' : 'PORTRAIT'
    };
};

/* ============================================================
 * PREPRESS SIGNATURE MAXIMUM PAGE SIZE CALCULATOR
 * ============================================================
 * Calculates the maximum finished page size for a signature on a given press sheet.
 * Based on industry-standard prepress allowances:
 * - Long sheet dimension: 2.0 inches (50.8 mm) total margin/gripper/gutter allowance.
 * - Short sheet dimension: 1.0 inch (25.4 mm) total margin/gripper/gutter allowance.
 *
 * Examples on 23×36" sheet:
 * - 16PP (4 cols × 2 rows): 8.5" × 11" (215.9 × 279.4 mm) [US Letter]
 * - 32PP (4 cols × 4 rows): 5.5" × 8.5" (139.7 × 215.9 mm) [US Statement / Half-Letter]
 * - 8PP (2 cols × 2 rows): 11" × 17" (279.4 × 431.8 mm) [US Tabloid]
 * - 4PP (2 cols × 1 row): 17" × 22" (431.8 × 558.8 mm)
 * - 2PP (2 cols × 1 row): 17" × 22" (431.8 × 558.8 mm)
 */
const calculateMaxPageSizeForSignature = ({
    sheetWidthPt,
    sheetHeightPt,
    pagesPerLayout = 16
}) => {
    const wIn = (Number(sheetWidthPt) || 0) / 72;
    const hIn = (Number(sheetHeightPt) || 0) / 72;
    const shortIn = Math.min(wIn, hIn);
    const longIn = Math.max(wIn, hIn);

    const longAllowanceIn = 2.0;   // Standard gripper/margins/trim on long side
    const shortAllowanceIn = 1.0;  // Standard gripper/margins/trim on short side

    const usableLongIn = Math.max(1, longIn - longAllowanceIn);
    const usableShortIn = Math.max(1, shortIn - shortAllowanceIn);

    let pageW_in = 0;
    let pageH_in = 0;
    let cols = 2;
    let rows = 2;
    let standardName = "";

    const pp = Number(pagesPerLayout) || 16;
    if (pp === 16) {
        cols = 4;
        rows = 2;
        pageW_in = Math.round((usableLongIn / 4) * 100) / 100;
        pageH_in = Math.round((usableShortIn / 2) * 100) / 100;
        if (Math.abs(pageW_in - 8.5) < 0.15 && Math.abs(pageH_in - 11.0) < 0.15) {
            pageW_in = 8.5;
            pageH_in = 11.0;
            standardName = 'US Letter (8.5 × 11")';
        }
    } else if (pp === 32) {
        cols = 4;
        rows = 4;
        pageW_in = Math.round((usableShortIn / 4) * 100) / 100;
        pageH_in = Math.round((usableLongIn / 4) * 100) / 100;
        if (Math.abs(pageW_in - 5.5) < 0.15 && Math.abs(pageH_in - 8.5) < 0.15) {
            pageW_in = 5.5;
            pageH_in = 8.5;
            standardName = 'US Statement / Half-Letter (5.5 × 8.5")';
        }
    } else if (pp === 8) {
        cols = 2;
        rows = 2;
        pageW_in = Math.round((usableShortIn / 2) * 100) / 100;
        pageH_in = Math.round((usableLongIn / 2) * 100) / 100;
        if (Math.abs(pageW_in - 11.0) < 0.15 && Math.abs(pageH_in - 17.0) < 0.15) {
            pageW_in = 11.0;
            pageH_in = 17.0;
            standardName = 'US Tabloid / Ledger (11 × 17")';
        }
    } else if (pp === 4 || pp === 2) {
        cols = 2;
        rows = 1;
        pageW_in = Math.round((usableLongIn / 2) * 100) / 100;
        pageH_in = Math.round((usableShortIn / 1) * 100) / 100;
        if (Math.abs(pageW_in - 17.0) < 0.15 && Math.abs(pageH_in - 22.0) < 0.15) {
            pageW_in = 17.0;
            pageH_in = 22.0;
            standardName = '17 × 22" (Folio)';
        }
    } else {
        cols = Math.ceil(Math.sqrt(pp / 2));
        rows = Math.max(1, Math.ceil((pp / 2) / cols));
        pageW_in = Math.round((usableLongIn / cols) * 100) / 100;
        pageH_in = Math.round((usableShortIn / rows) * 100) / 100;
    }

    const pageW_mm = Math.round((pageW_in * 25.4) * 10) / 10;
    const pageH_mm = Math.round((pageH_in * 25.4) * 10) / 10;

    return {
        pageW_in,
        pageH_in,
        pageW_mm,
        pageH_mm,
        pageW_pt: pageW_in * 72,
        pageH_pt: pageH_in * 72,
        cols,
        rows,
        standardName: standardName || `${pageW_in}" × ${pageH_in}" (${pageW_mm} × ${pageH_mm} mm)`,
        pages: pp
    };
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


    /* --------------------------------------------------------
     * Minimum Required Sheet Size Check
     * --------------------------------------------------------
     * Calculate unscaled minimum required footprint for layout.
     * If the sheet is too small (out of size), auto-select the
     * minimum sheet size where imposition is possible.
     */

    const unscaledLayoutW = (columns * source.width) + horizontalGutter;
    const unscaledLayoutH = (rows * source.height) + verticalGutter;
    const minNeededSheetW = unscaledLayoutW + margins.left + margins.right;
    const minNeededSheetH = unscaledLayoutH + margins.top + margins.bottom;

    let usableWidth =
        sheet.width -
        margins.left -
        margins.right;

    let usableHeight =
        sheet.height -
        margins.top -
        margins.bottom;

    if (
        (fitMode === "NONE" && (usableWidth < unscaledLayoutW - EPSILON || usableHeight < unscaledLayoutH - EPSILON)) ||
        usableWidth <= 0 ||
        usableHeight <= 0 ||
        (usableWidth - horizontalGutter) <= 0 ||
        (usableHeight - verticalGutter) <= 0
    ) {
        const bestPreset = findMinimumSheetPresetPt(minNeededSheetW, minNeededSheetH);
        sheet.width = bestPreset.width;
        sheet.height = bestPreset.height;
        sheet.preset = bestPreset.name;
        sheet.orientation = bestPreset.orientation;
        sheet.isCustom = bestPreset.name === "CUSTOM";

        usableWidth = sheet.width - margins.left - margins.right;
        usableHeight = sheet.height - margins.top - margins.bottom;
    }

    const availableWidth =
        usableWidth -
        horizontalGutter;


    const availableHeight =
        usableHeight -
        verticalGutter;


    /* --------------------------------------------------------
     * Grid cell
     * --------------------------------------------------------
     */

    const cellWidth =
        Math.max(1, availableWidth / columns);


    const cellHeight =
        Math.max(1, availableHeight / rows);


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
     * Center complete layout & Auto-Expand if needed
     * --------------------------------------------------------
     */

    let freeWidth =
        usableWidth -
        layoutWidth;


    let freeHeight =
        usableHeight -
        layoutHeight;


    if (freeWidth < -EPSILON) {
        sheet.width = Math.ceil(layoutWidth + margins.left + margins.right);
        usableWidth = sheet.width - margins.left - margins.right;
        freeWidth = Math.max(0, usableWidth - layoutWidth);
    }


    if (freeHeight < -EPSILON) {
        sheet.height = Math.ceil(layoutHeight + margins.top + margins.bottom);
        usableHeight = sheet.height - margins.top - margins.bottom;
        freeHeight = Math.max(0, usableHeight - layoutHeight);
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
    sourcePageCount,
    pageRotation = 0,
    boxConfig = null
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

        const effectiveRotation =
            ((Number(entry.rotation) || 0) + (Number(pageRotation) || 0)) % 360;

        let posX = position.x;
        let posY = position.y;

        if (effectiveRotation === 180 && boxConfig) {
            const shiftUnit = boxConfig.unit === "inch" ? "inch" : "mm";
            const shiftX = toPoints(Number(boxConfig.interlockShiftX || 0), shiftUnit);
            const shiftY = toPoints(Number(boxConfig.interlockShiftY || 0), shiftUnit);
            posX += shiftX;
            posY += shiftY;
        }

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
                posX,

            y:
                posY,

            width:
                geometry.pageWidth,

            height:
                geometry.pageHeight,

            rotation:
                normalizeRotation(
                    effectiveRotation
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
    sides,
    mode = null
) => {
    const normalizedMode = String(mode || "").trim().toUpperCase();
    if (normalizedMode === "BOX" || normalizedMode === "PACKAGING" || normalizedMode === "N_UP" || normalizedMode === "STEP_AND_REPEAT") {
        return true;
    }

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
    workStyle,
    pageRotation = 0,
    boxConfig = null
}) => {

    let frontPlacements =
        buildLayoutSide({

            side:
                pattern.front ??
                [],

            geometry,

            pageOffset,

            sourcePageCount,

            pageRotation,

            boxConfig

        });


    let backPlacements =
        buildLayoutSide({

            side:
                pattern.back ??
                [],

            geometry,

            pageOffset,

            sourcePageCount,

            pageRotation,

            boxConfig

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
        sides,
        pattern?.mode
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
    workStyle,
    pageRotation = 0,
    boxConfig = null
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

                workStyle,

                pageRotation,

                boxConfig

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
    sheet,
    mode = null
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

        const validation =
            validateImpositionPlan({

                placements:
                    allPlacements,

                sourcePageCount,

                sheet,

                mode

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
    placement,
    marks = {}
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

    // Box Auto-Crop White Space Handling
    const boxCfg = marks?.boxConfig || {};
    if (marks?.mode === "BOX" || marks?.isBoxJob || boxCfg.removeWhiteSpace) {
        if (boxCfg.removeWhiteSpace !== false) {
            const mediaBox = sourcePage.getMediaBox();
            const trimBox = sourcePage.getTrimBox();
            const cropBox = sourcePage.getCropBox();

            let cropX = mediaBox.x;
            let cropY = mediaBox.y;
            let cropW = mediaBox.width;
            let cropH = mediaBox.height;

            if (trimBox && trimBox.width < mediaBox.width && trimBox.height < mediaBox.height) {
                cropX = trimBox.x;
                cropY = trimBox.y;
                cropW = trimBox.width;
                cropH = trimBox.height;
            } else if (cropBox && (cropBox.width < mediaBox.width || cropBox.height < mediaBox.height || cropBox.x !== mediaBox.x || cropBox.y !== mediaBox.y)) {
                cropX = cropBox.x;
                cropY = cropBox.y;
                cropW = cropBox.width;
                cropH = cropBox.height;
            } else if (boxCfg.flatWidth > 0 && boxCfg.flatHeight > 0) {
                const bUnit = (boxCfg.unit === 'inch' || boxCfg.unit === 'in') ? 'inch' : 'mm';
                const flatW = toPoints(boxCfg.flatWidth, bUnit);
                const flatH = toPoints(boxCfg.flatHeight, bUnit);
                if (flatW > 0 && flatH > 0 && (mediaBox.width > flatW + 1 || mediaBox.height > flatH + 1)) {
                    cropX = mediaBox.x + Math.max(0, (mediaBox.width - flatW) / 2);
                    cropY = mediaBox.y + Math.max(0, (mediaBox.height - flatH) / 2);
                    cropW = Math.min(mediaBox.width, flatW);
                    cropH = Math.min(mediaBox.height, flatH);
                }
            }

            if (cropW > 0 && cropH > 0 && (cropW < mediaBox.width || cropH < mediaBox.height)) {
                sourcePage.setCropBox(cropX, cropY, cropW, cropH);
            }
        }
    }


    const crop = (sourcePage.getCropBox && sourcePage.getCropBox()) || sourcePage.getMediaBox();
    const media = sourcePage.getMediaBox();
    let boundingBox = undefined;
    if (crop && (crop.width < media.width - 0.5 || crop.height < media.height - 0.5 || Math.abs(crop.x - media.x) > 0.5 || Math.abs(crop.y - media.y) > 0.5)) {
        boundingBox = {
            left: crop.x,
            bottom: crop.y,
            right: crop.x + crop.width,
            top: crop.y + crop.height
        };
    }

    const embeddedPage =
        await outputPdf.embedPage(
            sourcePage,
            boundingBox
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

            placement,

            marks

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

        font,

        sideName:
            side.name || side.side || ""

    });
};


/* ============================================================
 * CREATE OUTPUT PDF
 * ============================================================
 *
 * Each physical layout side = ONE output PDF page.
 *
 * Therefore:
 *
 * 36 pages / 2PP = 18 output pages.
 *
 * 36 pages / 4PP = 9 output pages.
 *
 * An 8PP duplex layout produces a FRONT and BACK page.
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
    font,
    layoutConfig = {}
}) => {

    const outputPdf =
        await PDFDocument.create();

    let embeddedFont = font;
    if (!embeddedFont) {
        try {
            embeddedFont = await outputPdf.embedFont(StandardFonts.Helvetica);
        } catch {
            embeddedFont = null;
        }
    }


    for (let layoutIdx = 0; layoutIdx < layouts.length; layoutIdx++) {
        const layout = layouts[layoutIdx];

        /*
         * A duplex sheet has one output PDF page for each side.
         * Keeping the sides separate prevents the back from being
         * drawn over the front while retaining single-sided layouts.
         */

        for (
            const side
            of layout.sides
        ) {

            const outputPage =
                outputPdf.addPage([

                    sheet.width,

                    sheet.height

                ]);

            await drawLayoutSide({

                outputPdf,

                outputPage,

                sourcePdf,

                side,

                marks: {
                    ...marks,
                    mode: layoutConfig?.mode || marks?.mode,
                    isBoxJob: Boolean(layoutConfig?.mode === "BOX" || marks?.isBoxJob || marks?.mode === "BOX"),
                    boxConfig: layoutConfig?.boxConfig || marks?.boxConfig,
                    coverStudio: layoutConfig?.coverStudio || marks?.coverStudio || null,
                    dielineOverlay: layoutConfig?.boxConfig?.dielineOverlay ?? marks?.dielineOverlay ?? false,
                    signatureIndex: layoutIdx,
                    totalSignatures: layouts.length
                },

                cropMarks,

                jobInfo: {
                    ...jobInfo,
                    signatureIndex: layoutIdx,
                    totalSignatures: layouts.length
                },

                font:
                    embeddedFont

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
                layoutConfig.mode || (normalizedConfig.productCategory === "BOX" ? "BOX" : null),

            columns:
                layoutConfig.columns ?? layoutConfig.cols,

            rows:
                layoutConfig.rows,

            interlockMode:
                layoutConfig.interlockMode || normalizedConfig.boxConfig?.interlockMode || "INTERLOCKING"

        });
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
     * SOURCE ARTWORK MARGIN TRIMMING & CROP (BOX / PACKAGING)
     * --------------------------------------------------------
     */
    const boxCfg = normalizedConfig.boxConfig || layoutConfig.boxConfig || {};
    const isBoxJob = normalizedConfig.productCategory === "BOX" ||
                     layoutConfig.mode === "BOX" ||
                     layoutConfig.mode === "PACKAGING" ||
                     pattern?.mode === "BOX" ||
                     pattern?.mode === "PACKAGING";

    const isInchUnit = boxCfg.unit === "inch" || boxCfg.unit === "in";
    const unitFactor = isInchUnit ? 25.4 : 1;
    let trimLeftMM = Number(boxCfg.trimLeftMM ?? (boxCfg.trimLeft != null ? boxCfg.trimLeft * unitFactor : normalizedConfig.trimMargins?.left ?? 0));
    let trimRightMM = Number(boxCfg.trimRightMM ?? (boxCfg.trimRight != null ? boxCfg.trimRight * unitFactor : normalizedConfig.trimMargins?.right ?? 0));
    let trimTopMM = Number(boxCfg.trimTopMM ?? (boxCfg.trimTop != null ? boxCfg.trimTop * unitFactor : normalizedConfig.trimMargins?.top ?? 0));
    let trimBottomMM = Number(boxCfg.trimBottomMM ?? (boxCfg.trimBottom != null ? boxCfg.trimBottom * unitFactor : normalizedConfig.trimMargins?.bottom ?? 0));

    // If removeWhiteSpace is true and no manual trim margins are specified, auto-detect content bbox
    if (isBoxJob && (boxCfg.removeWhiteSpace || boxCfg.autoDetectMargins) && trimTopMM === 0 && trimBottomMM === 0 && trimLeftMM === 0 && trimRightMM === 0) {
        const detected = detectContentBoundingBox(sourcePdf.getPage(0));
        if (detected) {
            trimLeftMM = detected.leftMM;
            trimRightMM = detected.rightMM;
            trimTopMM = detected.topMM;
            trimBottomMM = detected.bottomMM;
        } else if (boxCfg.flatWidth > 0 && boxCfg.flatHeight > 0) {
            const firstPage = sourcePdf.getPage(0);
            const mediaBox = firstPage.getMediaBox();
            const mediaW_mm = mediaBox.width * 25.4 / 72;
            const mediaH_mm = mediaBox.height * 25.4 / 72;
            const flatW_mm = (boxCfg.unit === 'inch' || boxCfg.unit === 'in') ? boxCfg.flatWidth * 25.4 : boxCfg.flatWidth;
            const flatH_mm = (boxCfg.unit === 'inch' || boxCfg.unit === 'in') ? boxCfg.flatHeight * 25.4 : boxCfg.flatHeight;
            if (mediaW_mm > flatW_mm + 1) {
                trimLeftMM = Math.max(0, (mediaW_mm - flatW_mm) / 2);
                trimRightMM = trimLeftMM;
            }
            if (mediaH_mm > flatH_mm + 1) {
                trimTopMM = Math.max(0, (mediaH_mm - flatH_mm) / 2);
                trimBottomMM = trimTopMM;
            }
        }
    }

    if (trimTopMM > 0 || trimBottomMM > 0 || trimLeftMM > 0 || trimRightMM > 0) {
        const trimLeftPt = toPoints(trimLeftMM, 'mm');
        const trimRightPt = toPoints(trimRightMM, 'mm');
        const trimTopPt = toPoints(trimTopMM, 'mm');
        const trimBottomPt = toPoints(trimBottomMM, 'mm');

        for (let i = 0; i < sourcePdf.getPageCount(); i++) {
            const page = sourcePdf.getPage(i);
            const mediaBox = page.getMediaBox();
            const cropX = mediaBox.x + trimLeftPt;
            const cropY = mediaBox.y + trimBottomPt;
            const cropW = Math.max(10, mediaBox.width - trimLeftPt - trimRightPt);
            const cropH = Math.max(10, mediaBox.height - trimTopPt - trimBottomPt);
            page.setCropBox(cropX, cropY, cropW, cropH);
        }

        // Update effective source dimensions so calculateGeometry and cell sizing use trimmed box!
        const firstPage = sourcePdf.getPage(0);
        const effectiveCrop = firstPage.getCropBox();
        source.width = effectiveCrop.width;
        source.height = effectiveCrop.height;

        // Apply 0.25 mm margin in between boxes after trim if not explicitly specified
        if (isBoxJob) {
            const dieGapPt = toPoints(0.25, 'mm');
            if (normalizedConfig.gutter.horizontal === 0 && boxCfg.gutterX === undefined) {
                normalizedConfig.gutter.horizontal = dieGapPt;
            }
            if (normalizedConfig.gutter.vertical === 0 && boxCfg.gutterY === undefined) {
                normalizedConfig.gutter.vertical = dieGapPt;
            }
        }
    }

    // For book text/cover jobs, if a target book trim size is specified (and not AUTO),
    // update source dimensions so calculateGeometry and minimum sheet selection use the target page size!
    if (!isBoxJob && normalizedConfig.bookSize && normalizedConfig.bookSize.width > 0 && normalizedConfig.bookSize.height > 0 && normalizedConfig.bookSize.preset !== "AUTO") {
        source.width = normalizedConfig.bookSize.width;
        source.height = normalizedConfig.bookSize.height;
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

            workStyle,

            pageRotation:
                layoutConfig.pageRotation || 0,

            boxConfig:
                boxCfg

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

        sheet,

        mode:
            layoutConfig.mode || pattern?.mode

    });


    /* --------------------------------------------------------
     * MARKS
     * --------------------------------------------------------
 */

    const marks = {
        ...normalizedConfig.marks,
        isBoxJob,
        boxConfig: boxCfg
    };


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

            font,

            layoutConfig: {
                ...layoutConfig,
                mode: isBoxJob ? "BOX" : (layoutConfig?.mode || pattern?.mode),
                boxConfig: normalizedConfig.boxConfig || marks?.boxConfig
            }

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
                sheet.unit,

            preset:
                sheet.preset || null

        },

        bookSize:
            normalizedConfig.bookSize ??
            null,

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

    createOutputPdf,

    calculateMaxPageSizeForSignature,

    findMinimumSheetPresetPt

};
