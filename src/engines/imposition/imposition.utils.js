import zlib from "zlib";

const POINTS_PER_INCH = 72;

const MM_PER_INCH = 25.4;

const POINTS_PER_MM =
    POINTS_PER_INCH / MM_PER_INCH;

const SUPPORTED_UNITS = [
    "pt",
    "mm",
    "inch"
];


/**
 * Convert any supported measurement to PDF points
 *
 * Supported:
 * - pt
 * - mm
 * - inch
 */
const toPoints = (
    value,
    unit = "pt"
) => {

    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        throw new Error(
            `Invalid measurement value: ${value}`
        );
    }


    const normalizedUnit =
        String(unit)
            .trim()
            .toLowerCase();


    if (
        !SUPPORTED_UNITS.includes(
            normalizedUnit
        )
    ) {
        throw new Error(
            `Unsupported unit: ${unit}. Use "pt", "mm" or "inch".`
        );
    }


    switch (
    normalizedUnit
    ) {

        case "pt":
            return value;


        case "mm":
            return (
                value *
                POINTS_PER_MM
            );


        case "inch":
            return (
                value *
                POINTS_PER_INCH
            );


        default:
            throw new Error(
                `Unsupported unit: ${unit}`
            );
    }
};


/**
 * Convert PDF points to inches
 */
const toInches = (
    points
) => {

    if (
        typeof points !== "number" ||
        !Number.isFinite(points)
    ) {
        throw new Error(
            "Invalid point value."
        );
    }


    return Number(
        (
            points /
            POINTS_PER_INCH
        ).toFixed(4)
    );
};


/**
 * Convert PDF points to millimeters
 */
const toMillimeters = (
    points
) => {

    if (
        typeof points !== "number" ||
        !Number.isFinite(points)
    ) {
        throw new Error(
            "Invalid point value."
        );
    }


    return Number(
        (
            points /
            POINTS_PER_MM
        ).toFixed(4)
    );
};


/**
 * Create sheet geometry
 */
const createSheet = ({
    width,
    height,
    unit = "pt"
}) => {

    const widthPt =
        toPoints(
            width,
            unit
        );

    const heightPt =
        toPoints(
            height,
            unit
        );


    if (
        widthPt <= 0 ||
        heightPt <= 0
    ) {
        throw new Error(
            "Sheet width and height must be greater than zero."
        );
    }


    return {

        width:
            widthPt,

        height:
            heightPt,

        widthInches:
            toInches(
                widthPt
            ),

        heightInches:
            toInches(
                heightPt
            ),

        widthMm:
            toMillimeters(
                widthPt
            ),

        heightMm:
            toMillimeters(
                heightPt
            )
    };
};


/**
 * Create a page placement
 */
const createPlacement = ({
    pageNumber,
    x,
    y,
    width,
    height,
    rotation = 0,
    unit = "pt"
}) => {

    const validRotations = [
        0,
        90,
        180,
        270
    ];


    if (
        !Number.isInteger(
            pageNumber
        ) ||
        pageNumber <= 0
    ) {
        throw new Error(
            "Page number must be a positive integer."
        );
    }


    if (
        !validRotations.includes(
            rotation
        )
    ) {
        throw new Error(
            "Rotation must be 0, 90, 180 or 270 degrees."
        );
    }


    const placement = {

        pageNumber,

        x:
            toPoints(
                x,
                unit
            ),

        y:
            toPoints(
                y,
                unit
            ),

        width:
            toPoints(
                width,
                unit
            ),

        height:
            toPoints(
                height,
                unit
            ),

        rotation
    };


    if (
        placement.width <= 0
    ) {
        throw new Error(
            "Placement width must be greater than zero."
        );
    }


    if (
        placement.height <= 0
    ) {
        throw new Error(
            "Placement height must be greater than zero."
        );
    }


    if (
        placement.x < 0 ||
        placement.y < 0
    ) {
        throw new Error(
            "Placement x and y cannot be negative."
        );
    }


    return placement;
};


/**
 * Check whether placement is completely
 * inside the sheet.
 */
const isPlacementInsideSheet = (
    placement,
    sheet
) => {

    if (
        !placement ||
        !sheet
    ) {
        return false;
    }


    return (

        placement.x >= 0 &&

        placement.y >= 0 &&

        placement.x +
        placement.width <=
        sheet.width &&

        placement.y +
        placement.height <=
        sheet.height
    );
};


/**
 * Detect the content bounding box (non-empty painted paths, images, and rectangles)
 * of a PDF page by scanning its content streams.
 * Returns margins from mediaBox in millimeters: { leftMM, bottomMM, rightMM, topMM, widthMM, heightMM }
 */
const detectContentBoundingBox = (page) => {
    if (!page || !page.node) return null;
    const mediaBox = page.getMediaBox();

    // 1. First priority: Check ArtBox (Adobe Illustrator / CAD prepress standard for dieline artwork bounds)
    const artBox = page.getArtBox ? page.getArtBox() : null;
    if (artBox && (artBox.width < mediaBox.width - 2 || artBox.height < mediaBox.height - 2)) {
        const leftMM = Math.max(0, Math.round(((artBox.x - mediaBox.x) * 25.4 / 72) * 10) / 10);
        const bottomMM = Math.max(0, Math.round(((artBox.y - mediaBox.y) * 25.4 / 72) * 10) / 10);
        const rightMM = Math.max(0, Math.round(((mediaBox.width - (artBox.x - mediaBox.x + artBox.width)) * 25.4 / 72) * 10) / 10);
        const topMM = Math.max(0, Math.round(((mediaBox.height - (artBox.y - mediaBox.y + artBox.height)) * 25.4 / 72) * 10) / 10);
        const widthMM = Math.max(0, Math.round((artBox.width * 25.4 / 72) * 10) / 10);
        const heightMM = Math.max(0, Math.round((artBox.height * 25.4 / 72) * 10) / 10);
        return {
            leftMM,
            bottomMM,
            rightMM,
            topMM,
            widthMM,
            heightMM
        };
    }

    // 2. Second priority: Check TrimBox
    const trimBox = page.getTrimBox ? page.getTrimBox() : null;
    if (trimBox && (trimBox.width < mediaBox.width - 2 || trimBox.height < mediaBox.height - 2)) {
        const leftMM = Math.max(0, Math.round(((trimBox.x - mediaBox.x) * 25.4 / 72) * 10) / 10);
        const bottomMM = Math.max(0, Math.round(((trimBox.y - mediaBox.y) * 25.4 / 72) * 10) / 10);
        const rightMM = Math.max(0, Math.round(((mediaBox.width - (trimBox.x - mediaBox.x + trimBox.width)) * 25.4 / 72) * 10) / 10);
        const topMM = Math.max(0, Math.round(((mediaBox.height - (trimBox.y - mediaBox.y + trimBox.height)) * 25.4 / 72) * 10) / 10);
        const widthMM = Math.max(0, Math.round((trimBox.width * 25.4 / 72) * 10) / 10);
        const heightMM = Math.max(0, Math.round((trimBox.height * 25.4 / 72) * 10) / 10);
        return {
            leftMM,
            bottomMM,
            rightMM,
            topMM,
            widthMM,
            heightMM
        };
    }

    // 3. Fallback: Parse raw content stream operators
    const contents = page.node.Contents();
    if (!contents) return null;

    const streams = Array.isArray(contents) ? contents : [contents];
    let streamText = "";

    for (const st of streams) {
        try {
            let bytes = st.asUint8Array ? st.asUint8Array() : null;
            if (!bytes && st.contents) bytes = st.contents;
            if (!bytes) continue;
            try {
                const decomp = zlib.inflateSync(Buffer.from(bytes));
                streamText += decomp.toString("binary") + "\n";
            } catch (e) {
                streamText += Buffer.from(bytes).toString("binary") + "\n";
            }
        } catch (err) {}
    }

    if (!streamText) return null;

    // Scan for rectangle operators: 'x y w h re'
    const rectRegex = /([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+([\d\.-]+)\s+re/g;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    let match;

    while ((match = rectRegex.exec(streamText)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        const w = parseFloat(match[3]);
        const h = parseFloat(match[4]);
        if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h)) {
            // Ignore full-page canvas background rects
            if (w >= mediaBox.width - 2 && h >= mediaBox.height - 2) continue;
            if (w > 0 && h > 0) {
                minX = Math.min(minX, x, x + w);
                minY = Math.min(minY, y, y + h);
                maxX = Math.max(maxX, x, x + w);
                maxY = Math.max(maxY, y, y + h);
            }
        }
    }

    // Also scan for path move/line operators: 'x y m' or 'x y l'
    const pathRegex = /([\d\.-]+)\s+([\d\.-]+)\s+[ml]/g;
    while ((match = pathRegex.exec(streamText)) !== null) {
        const x = parseFloat(match[1]);
        const y = parseFloat(match[2]);
        if (Number.isFinite(x) && Number.isFinite(y)) {
            // Ignore canvas origin resets sitting right on the outer media boundary
            if (Math.abs(x - mediaBox.x) < 0.5 && Math.abs(y - mediaBox.y) < 0.5) continue;
            // Only consider coordinates within or near mediaBox
            if (x >= mediaBox.x && x <= mediaBox.x + mediaBox.width &&
                y >= mediaBox.y && y <= mediaBox.y + mediaBox.height) {
                minX = Math.min(minX, x);
                minY = Math.min(minY, y);
                maxX = Math.max(maxX, x);
                maxY = Math.max(maxY, y);
            }
        }
    }

    if (!Number.isFinite(minX) || !Number.isFinite(minY) || !Number.isFinite(maxX) || !Number.isFinite(maxY)) {
        return null;
    }

    const leftMM = Math.max(0, Math.round(((minX - mediaBox.x) * 25.4 / 72) * 10) / 10);
    const bottomMM = Math.max(0, Math.round(((minY - mediaBox.y) * 25.4 / 72) * 10) / 10);
    const rightMM = Math.max(0, Math.round(((mediaBox.width - (maxX - mediaBox.x)) * 25.4 / 72) * 10) / 10);
    const topMM = Math.max(0, Math.round(((mediaBox.height - (maxY - mediaBox.y)) * 25.4 / 72) * 10) / 10);

    const widthMM = Math.max(0, Math.round(((maxX - minX) * 25.4 / 72) * 10) / 10);
    const heightMM = Math.max(0, Math.round(((maxY - minY) * 25.4 / 72) * 10) / 10);

    return {
        leftMM,
        bottomMM,
        rightMM,
        topMM,
        widthMM,
        heightMM
    };
};


export {
    POINTS_PER_INCH,
    MM_PER_INCH,
    POINTS_PER_MM,
    SUPPORTED_UNITS,
    toPoints,
    toInches,
    toMillimeters,
    createSheet,
    createPlacement,
    isPlacementInsideSheet,
    detectContentBoundingBox
};