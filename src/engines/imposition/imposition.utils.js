import zlib from "zlib";
import { PDFName } from "pdf-lib";

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

    // 1. Check for XObjects (Form XObjects with /BBox and Image XObjects)
    const res = page.node.Resources ? page.node.Resources() : null;
    const xObjDict = res?.lookup ? res.lookup(PDFName.of('XObject')) : null;
    const xObjBBoxes = {};
    if (xObjDict && xObjDict.keys) {
        for (const k of xObjDict.keys()) {
            try {
                const xObj = xObjDict.lookup(k);
                const dict = xObj?.dict || xObj;
                if (!dict?.lookup) continue;
                const bbox = dict.lookup(PDFName.of('BBox'))?.asArray?.()?.map(x => (x.asNumber ? x.asNumber() : Number(x)));
                if (bbox && bbox.length === 4) {
                    xObjBBoxes[k.asString()] = {
                        minX: Math.min(bbox[0], bbox[2]),
                        minY: Math.min(bbox[1], bbox[3]),
                        maxX: Math.max(bbox[0], bbox[2]),
                        maxY: Math.max(bbox[1], bbox[3]),
                        isImage: true
                    };
                }
            } catch (err) {}
        }
    }

    // 2. Parse raw content stream operators
    const contents = page.node.Contents();
    let streamText = "";
    if (contents) {
        const streams = Array.isArray(contents) ? contents : [contents];
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
    }

    const paintedElements = [];
    const PAINT_OPS = new Set(['S', 's', 'f', 'F', 'f*', 'B', 'B*', 'b', 'b*']);

    if (streamText) {
        const rawTokens = streamText.trim().split(/\s+/);
        let currentCoords = [];
        let lastClipRect = null;
        let lastCm = null;

        for (let i = 0; i < rawTokens.length; i++) {
            const t = rawTokens[i];
            if (t === 'm' || t === 'l') {
                const x = parseFloat(rawTokens[i - 2]);
                const y = parseFloat(rawTokens[i - 1]);
                if (Number.isFinite(x) && Number.isFinite(y)) {
                    currentCoords.push({ x, y });
                }
            } else if (t === 'c') {
                const x3 = parseFloat(rawTokens[i - 2]);
                const y3 = parseFloat(rawTokens[i - 1]);
                if (Number.isFinite(x3) && Number.isFinite(y3)) {
                    currentCoords.push({ x: x3, y: y3 });
                }
            } else if (t === 're') {
                const x = parseFloat(rawTokens[i - 4]);
                const y = parseFloat(rawTokens[i - 3]);
                const w = parseFloat(rawTokens[i - 2]);
                const h = parseFloat(rawTokens[i - 1]);
                if (Number.isFinite(x) && Number.isFinite(y) && Number.isFinite(w) && Number.isFinite(h)) {
                    // Ignore full-page canvas background rects
                    if (!(w >= mediaBox.width - 2 && h >= mediaBox.height - 2)) {
                        currentCoords.push({ x, y }, { x: x + w, y: y + h });
                        lastClipRect = {
                            minX: Math.min(x, x + w),
                            minY: Math.min(y, y + h),
                            maxX: Math.max(x, x + w),
                            maxY: Math.max(y, y + h),
                            isImage: true
                        };
                    }
                }
            } else if (t === 'cm') {
                const a = parseFloat(rawTokens[i - 6]);
                const d = parseFloat(rawTokens[i - 3]);
                const e = parseFloat(rawTokens[i - 2]);
                const f = parseFloat(rawTokens[i - 1]);
                if (Number.isFinite(a) && Number.isFinite(d) && Number.isFinite(e) && Number.isFinite(f)) {
                    lastCm = {
                        minX: Math.min(e, e + a),
                        minY: Math.min(f, f + d),
                        maxX: Math.max(e, e + a),
                        maxY: Math.max(f, f + d),
                        isImage: true
                    };
                }
            } else if (t === 'Do') {
                const name = rawTokens[i - 1];
                if (xObjBBoxes[name]) {
                    paintedElements.push(xObjBBoxes[name]);
                } else if (lastClipRect) {
                    paintedElements.push(lastClipRect);
                } else if (lastCm) {
                    paintedElements.push(lastCm);
                }
                currentCoords = [];
                lastClipRect = null;
                lastCm = null;
            } else if (PAINT_OPS.has(t)) {
                if (currentCoords.length > 0) {
                    let pMinX = Infinity, pMinY = Infinity, pMaxX = -Infinity, pMaxY = -Infinity;
                    let validCount = 0;
                    for (const c of currentCoords) {
                        if (c.x >= mediaBox.x - 2 && c.x <= mediaBox.x + mediaBox.width + 2 &&
                            c.y >= mediaBox.y - 2 && c.y <= mediaBox.y + mediaBox.height + 2) {
                            pMinX = Math.min(pMinX, c.x);
                            pMinY = Math.min(pMinY, c.y);
                            pMaxX = Math.max(pMaxX, c.x);
                            pMaxY = Math.max(pMaxY, c.y);
                            validCount++;
                        }
                    }
                    if (validCount > 0) {
                        const isCanvasBorder = (pMaxX - pMinX >= mediaBox.width - 2) && (pMaxY - pMinY >= mediaBox.height - 2);
                        if (!isCanvasBorder) {
                            paintedElements.push({ minX: pMinX, minY: pMinY, maxX: pMaxX, maxY: pMaxY });
                        }
                    }
                    currentCoords = [];
                }
            } else if (t === 'n') {
                currentCoords = [];
            }
        }

        // Text operators inside BT ... ET (capturing title headers and text)
        const btRegex = /BT([\s\S]*?)ET/g;
        let btMatch;
        while ((btMatch = btRegex.exec(streamText)) !== null) {
            const btContent = btMatch[1];
            const tdRegex = /([0-9\.-]+)\s+([0-9\.-]+)\s+(?:Td|TD)/g;
            let tdMatch;
            while ((tdMatch = tdRegex.exec(btContent)) !== null) {
                const tx = parseFloat(tdMatch[1]);
                const ty = parseFloat(tdMatch[2]);
                if (Number.isFinite(tx) && Number.isFinite(ty)) {
                    if (tx >= mediaBox.x && tx <= mediaBox.x + mediaBox.width &&
                        ty >= mediaBox.y && ty <= mediaBox.y + mediaBox.height) {
                        paintedElements.push({ minX: tx, minY: ty, maxX: tx + 15, maxY: ty + 10, isText: true });
                    }
                }
            }
        }
    }

    // 3. Fallback to ArtBox or TrimBox if no stream elements found
    const artBox = page.getArtBox ? page.getArtBox() : null;
    const trimBox = page.getTrimBox ? page.getTrimBox() : null;

    if (paintedElements.length === 0) {
        const box = (artBox && (artBox.width < mediaBox.width - 2 || artBox.height < mediaBox.height - 2)) ? artBox
                  : (trimBox && (trimBox.width < mediaBox.width - 2 || trimBox.height < mediaBox.height - 2)) ? trimBox
                  : null;
        if (box) {
            const leftMM = Math.max(0, Math.round(((box.x - mediaBox.x) * 25.4 / 72) * 10) / 10);
            const bottomMM = Math.max(0, Math.round(((box.y - mediaBox.y) * 25.4 / 72) * 10) / 10);
            const rightMM = Math.max(0, Math.round(((mediaBox.width - (box.x - mediaBox.x + box.width)) * 25.4 / 72) * 10) / 10);
            const topMM = Math.max(0, Math.round(((mediaBox.height - (box.y - mediaBox.y + box.height)) * 25.4 / 72) * 10) / 10);
            const widthMM = Math.max(0, Math.round((box.width * 25.4 / 72) * 10) / 10);
            const heightMM = Math.max(0, Math.round((box.height * 25.4 / 72) * 10) / 10);
            return {
                leftMM,
                bottomMM,
                rightMM,
                topMM,
                widthMM,
                heightMM,
                dielineOnly: null,
                headerHeightMM: 20.0
            };
        }
        return null;
    }

    // Compute overall bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of paintedElements) {
        minX = Math.min(minX, p.minX);
        minY = Math.min(minY, p.minY);
        maxX = Math.max(maxX, p.maxX);
        maxY = Math.max(maxY, p.maxY);
    }

    // If ArtBox is more conservative and valid, merge bounds
    if (artBox && (artBox.width < mediaBox.width - 2 || artBox.height < mediaBox.height - 2)) {
        minX = Math.max(minX, artBox.x);
        minY = Math.max(minY, artBox.y);
        maxX = Math.min(maxX, artBox.x + artBox.width);
        maxY = Math.min(maxY, artBox.y + artBox.height);
    }

    const leftMM = Math.max(0, Math.round(((minX - mediaBox.x) * 25.4 / 72) * 10) / 10);
    const bottomMM = Math.max(0, Math.round(((minY - mediaBox.y) * 25.4 / 72) * 10) / 10);
    const rightMM = Math.max(0, Math.round(((mediaBox.width - (maxX - mediaBox.x)) * 25.4 / 72) * 10) / 10);
    const topMM = Math.max(0, Math.round(((mediaBox.height - (maxY - mediaBox.y)) * 25.4 / 72) * 10) / 10);

    const widthMM = Math.max(0, Math.round(((maxX - minX) * 25.4 / 72) * 10) / 10);
    const heightMM = Math.max(0, Math.round(((maxY - minY) * 25.4 / 72) * 10) / 10);

    // Detect if there is a detached title/header block at the top separated by a clear vertical gap (>10pt)
    let dielineOnly = null;
    paintedElements.sort((a, b) => a.minY - b.minY);
    let runningMaxY = paintedElements[0].maxY;
    let topGapFound = null;

    for (let i = 1; i < paintedElements.length; i++) {
        const p = paintedElements[i];
        if (p.minY > runningMaxY + 10) {
            topGapFound = { bodyMaxY: runningMaxY, headerMinY: p.minY };
        }
        runningMaxY = Math.max(runningMaxY, p.maxY);
    }

    let headerHeightMM = 20.0; // standard default header height (approx 0.75 in)

    if (topGapFound && (maxY - topGapFound.headerMinY < 150)) {
        const bodyMaxY = topGapFound.bodyMaxY;
        const dTopMM = Math.max(0, Math.round(((mediaBox.height - (bodyMaxY - mediaBox.y)) * 25.4 / 72) * 10) / 10);
        const dHeightMM = Math.max(0, Math.round(((bodyMaxY - minY) * 25.4 / 72) * 10) / 10);
        headerHeightMM = Math.max(5, Math.round((dTopMM - topMM) * 10) / 10);
        dielineOnly = {
            leftMM,
            bottomMM,
            rightMM,
            topMM: dTopMM,
            widthMM,
            heightMM: dHeightMM,
            headerHeightMM
        };
    }

    return {
        leftMM,
        bottomMM,
        rightMM,
        topMM,
        widthMM,
        heightMM,
        dielineOnly,
        headerHeightMM
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