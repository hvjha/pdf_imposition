import { rgb, cmyk } from "pdf-lib";

const POINTS_PER_INCH = 72;
const POINTS_PER_MM = POINTS_PER_INCH / 25.4;

/**
 * ============================================================
 * UNIT CONVERSION
 * ============================================================
 */
const toPoints = (value, unit = "mm") => {
    const number = Number(value);
    if (!Number.isFinite(number)) {
        throw new Error(`Invalid measurement value: ${value}`);
    }

    switch (String(unit).toLowerCase()) {
        case "pt":
            return number;
        case "mm":
            return number * POINTS_PER_MM;
        case "inch":
        case "in":
            return number * POINTS_PER_INCH;
        default:
            throw new Error(`Unsupported mark unit: ${unit}`);
    }
};

/**
 * ============================================================
 * DRAW ONE CORNER CROP MARK
 * ============================================================
 */
const drawCornerCropMark = ({
    page,
    x,
    y,
    corner,
    length,
    offset,
    thickness
}) => {
    let horizontalStart;
    let horizontalEnd;
    let verticalStart;
    let verticalEnd;

    switch (corner) {
        case "TOP_LEFT":
            horizontalStart = x - offset - length;
            horizontalEnd = x - offset;
            verticalStart = y + offset;
            verticalEnd = y + offset + length;
            break;

        case "TOP_RIGHT":
            horizontalStart = x + offset;
            horizontalEnd = x + offset + length;
            verticalStart = y + offset;
            verticalEnd = y + offset + length;
            break;

        case "BOTTOM_LEFT":
            horizontalStart = x - offset - length;
            horizontalEnd = x - offset;
            verticalStart = y - offset;
            verticalEnd = y - offset - length;
            break;

        case "BOTTOM_RIGHT":
            horizontalStart = x + offset;
            horizontalEnd = x + offset + length;
            verticalStart = y - offset;
            verticalEnd = y - offset - length;
            break;

        default:
            throw new Error(`Unsupported crop mark corner: ${corner}`);
    }

    // Horizontal stroke
    page.drawLine({
        start: { x: horizontalStart, y },
        end: { x: horizontalEnd, y },
        thickness,
        color: rgb(0, 0, 0)
    });

    // Vertical stroke
    page.drawLine({
        start: { x, y: verticalStart },
        end: { x, y: verticalEnd },
        thickness,
        color: rgb(0, 0, 0)
    });
};

/**
 * ============================================================
 * DRAW FOUR-SIDED CROP MARKS FOR A PLACEMENT
 * ============================================================
 */
const drawPlacementCropMarks = ({
    page,
    placement,
    length,
    offset,
    thickness
}) => {
    const left = placement.x;
    const right = placement.x + placement.width;
    const bottom = placement.y;
    const top = placement.y + placement.height;

    // TOP LEFT
    drawCornerCropMark({
        page,
        x: left,
        y: top,
        corner: "TOP_LEFT",
        length,
        offset,
        thickness
    });

    // TOP RIGHT
    drawCornerCropMark({
        page,
        x: right,
        y: top,
        corner: "TOP_RIGHT",
        length,
        offset,
        thickness
    });

    // BOTTOM LEFT
    drawCornerCropMark({
        page,
        x: left,
        y: bottom,
        corner: "BOTTOM_LEFT",
        length,
        offset,
        thickness
    });

    // BOTTOM RIGHT
    drawCornerCropMark({
        page,
        x: right,
        y: bottom,
        corner: "BOTTOM_RIGHT",
        length,
        offset,
        thickness
    });
};

/**
 * ============================================================
 * DRAW CMYK COLOR BARS (Standard Prepress Color Control Strip)
 * ============================================================
 */
const COLOR_BAR_PATCHES = [
    // 100% Solids
    { name: "C100", color: cmyk(1, 0, 0, 0) },
    { name: "M100", color: cmyk(0, 1, 0, 0) },
    { name: "Y100", color: cmyk(0, 0, 1, 0) },
    { name: "K100", color: cmyk(0, 0, 0, 1) },
    // 75% Tints
    { name: "C75",  color: cmyk(0.75, 0, 0, 0) },
    { name: "M75",  color: cmyk(0, 0.75, 0, 0) },
    { name: "Y75",  color: cmyk(0, 0, 0.75, 0) },
    { name: "K75",  color: cmyk(0, 0, 0, 0.75) },
    // 50% Tints
    { name: "C50",  color: cmyk(0.5, 0, 0, 0) },
    { name: "M50",  color: cmyk(0, 0.5, 0, 0) },
    { name: "Y50",  color: cmyk(0, 0, 0.5, 0) },
    { name: "K50",  color: cmyk(0, 0, 0, 0.5) },
    // 25% Tints
    { name: "C25",  color: cmyk(0.25, 0, 0, 0) },
    { name: "M25",  color: cmyk(0, 0.25, 0, 0) },
    { name: "Y25",  color: cmyk(0, 0, 0.25, 0) },
    { name: "K25",  color: cmyk(0, 0, 0, 0.25) },
    // 2-Color & 3-Color Overprints
    { name: "RED",  color: cmyk(0, 1, 1, 0) },       // M + Y
    { name: "GRN",  color: cmyk(1, 0, 1, 0) },       // C + Y
    { name: "BLU",  color: cmyk(1, 1, 0, 0) },       // C + M
    { name: "3CK",  color: cmyk(0.8, 0.8, 0.8, 0) }, // 3C Gray
    // Paper White
    { name: "WHT",  color: cmyk(0, 0, 0, 0) }
];

const drawColorBars = ({
    page,
    pageWidth,
    pageHeight,
    minX,
    maxX,
    minY,
    maxY,
    cropMarginTop,
    cropMarginBottom
}) => {
    const barHeight = Math.max(7, Math.min(12, toPoints(3.5, "mm")));
    // Span the imposition block width or at least 60% of sheet width, max sheet width - 40pt
    const targetWidth = Math.max(maxX - minX, pageWidth * 0.65);
    const barWidth = Math.min(targetWidth, pageWidth - 40);
    const startX = (pageWidth - barWidth) / 2;

    // Determine vertical position: prefer top margin if space permits, else bottom margin
    let barY;
    if (pageHeight - maxY >= barHeight + 14) {
        barY = Math.min(pageHeight - barHeight - 5, maxY + cropMarginTop + 4);
    } else if (minY >= barHeight + 14) {
        barY = Math.max(6, minY - cropMarginBottom - barHeight - 4);
    } else {
        barY = pageHeight - barHeight - 4;
    }

    // Number of patch repetitions across the bar width
    const totalPatches = COLOR_BAR_PATCHES.length;
    const repetitions = Math.max(1, Math.floor(barWidth / (totalPatches * 10)));
    const totalSlots = totalPatches * repetitions;
    const patchWidth = barWidth / totalSlots;

    for (let r = 0; r < repetitions; r++) {
        for (let i = 0; i < totalPatches; i++) {
            const patch = COLOR_BAR_PATCHES[i];
            const px = startX + (r * totalPatches + i) * patchWidth;

            // Draw color patch
            page.drawRectangle({
                x: px,
                y: barY,
                width: patchWidth,
                height: barHeight,
                color: patch.color,
                borderColor: rgb(0.25, 0.25, 0.25),
                borderWidth: 0.25
            });
        }
    }

    // Outer bounding frame
    page.drawRectangle({
        x: startX,
        y: barY,
        width: barWidth,
        height: barHeight,
        borderColor: rgb(0, 0, 0),
        borderWidth: 0.4
    });
};

/**
 * ============================================================
 * DRAW OPTICAL CAMERA MARKS (Digital Cut & Optical Registration)
 * ============================================================
 * Used by automated camera cutters (Zünd, Kongsberg, i-cut, etc.)
 * High-contrast solid black fiducial dots (5mm dia) with quiet zone
 * and concentric alignment guides.
 */
const drawCameraMarks = ({
    page,
    pageWidth,
    pageHeight,
    minX,
    maxX,
    minY,
    maxY,
    size = 5,
    offset = 8,
    style = "RING",
    positions = "CORNERS_AND_EDGES"
}) => {
    const diameterMM = Number(size) || 5;
    const offsetMM = Number(offset) || 8;
    const dotRadius = toPoints(diameterMM / 2, "mm");
    const guideRadius = dotRadius * 1.8;
    const quietZone = dotRadius * 2.3;

    // Position at sheet margins with safe clearance from edges
    const marginX = toPoints(offsetMM, "mm");
    const marginY = toPoints(offsetMM, "mm");

    const fiducials = [
        // 4 sheet corners
        { x: marginX, y: marginY },
        { x: pageWidth - marginX, y: marginY },
        { x: marginX, y: pageHeight - marginY },
        { x: pageWidth - marginX, y: pageHeight - marginY },
    ];

    // Optional mid-edge fiducials
    if (positions !== "CORNERS") {
        if (pageWidth > 320) {
            fiducials.push({ x: pageWidth / 2, y: marginY });
            fiducials.push({ x: pageWidth / 2, y: pageHeight - marginY });
        }
        if (pageHeight > 320) {
            fiducials.push({ x: marginX, y: pageHeight / 2 });
            fiducials.push({ x: pageWidth - marginX, y: pageHeight / 2 });
        }
    }

    const normStyle = String(style).toUpperCase();

    for (const pt of fiducials) {
        // White quiet-zone backing so optical cameras have maximum contrast
        page.drawCircle({
            x: pt.x,
            y: pt.y,
            size: quietZone,
            color: rgb(1, 1, 1),
            borderWidth: 0
        });

        // Outer targeting guide ring (for RING and TARGET styles)
        if (normStyle === "RING" || normStyle === "TARGET") {
            page.drawCircle({
                x: pt.x,
                y: pt.y,
                size: guideRadius,
                borderColor: rgb(0, 0, 0),
                borderWidth: 0.4
            });
        }

        // High-contrast solid black camera fiducial dot
        page.drawCircle({
            x: pt.x,
            y: pt.y,
            size: dotRadius,
            color: rgb(0, 0, 0),
            borderWidth: 0
        });

        // Cross guide ticks
        if (normStyle === "RING" || normStyle === "TARGET") {
            const tickLen = 3.5;
            page.drawLine({
                start: { x: pt.x - guideRadius - tickLen, y: pt.y },
                end: { x: pt.x - dotRadius - 0.5, y: pt.y },
                thickness: 0.35,
                color: rgb(0, 0, 0)
            });
            page.drawLine({
                start: { x: pt.x + dotRadius + 0.5, y: pt.y },
                end: { x: pt.x + guideRadius + tickLen, y: pt.y },
                thickness: 0.35,
                color: rgb(0, 0, 0)
            });
            page.drawLine({
                start: { x: pt.x, y: pt.y - guideRadius - tickLen },
                end: { x: pt.x, y: pt.y - dotRadius - 0.5 },
                thickness: 0.35,
                color: rgb(0, 0, 0)
            });
            page.drawLine({
                start: { x: pt.x, y: pt.y + dotRadius + 0.5 },
                end: { x: pt.x, y: pt.y + guideRadius + tickLen },
                thickness: 0.35,
                color: rgb(0, 0, 0)
            });
        }

        // Extended crosshair lines for TARGET style
        if (normStyle === "TARGET") {
            const extSpan = guideRadius * 1.5;
            page.drawLine({
                start: { x: pt.x - extSpan, y: pt.y },
                end: { x: pt.x - guideRadius - 4, y: pt.y },
                thickness: 0.3,
                color: rgb(0, 0, 0)
            });
            page.drawLine({
                start: { x: pt.x + guideRadius + 4, y: pt.y },
                end: { x: pt.x + extSpan, y: pt.y },
                thickness: 0.3,
                color: rgb(0, 0, 0)
            });
            page.drawLine({
                start: { x: pt.x, y: pt.y - extSpan },
                end: { x: pt.x, y: pt.y - guideRadius - 4 },
                thickness: 0.3,
                color: rgb(0, 0, 0)
            });
            page.drawLine({
                start: { x: pt.x, y: pt.y + guideRadius + 4 },
                end: { x: pt.x, y: pt.y + extSpan },
                thickness: 0.3,
                color: rgb(0, 0, 0)
            });
        }
    }
};

/**
 * ============================================================
 * DRAW CMYK REGISTRATION TARGETS (Standard Plate Alignment)
 * ============================================================
 */
const drawRegistrationMarks = ({
    page,
    pageWidth,
    pageHeight
}) => {
    const size = toPoints(2.8, "mm");
    const targetPoints = [
        { x: pageWidth / 2, y: 15 },
        { x: pageWidth / 2, y: pageHeight - 15 },
        { x: 15, y: pageHeight / 2 },
        { x: pageWidth - 15, y: pageHeight / 2 }
    ];

    for (const pt of targetPoints) {
        // Outer registration circle
        page.drawCircle({
            x: pt.x,
            y: pt.y,
            size,
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.45
        });

        // Inner solid bullseye
        page.drawCircle({
            x: pt.x,
            y: pt.y,
            size: size * 0.32,
            color: rgb(0, 0, 0)
        });

        // Crosshairs extending beyond circle
        const span = size * 1.8;
        page.drawLine({
            start: { x: pt.x - span, y: pt.y },
            end: { x: pt.x + span, y: pt.y },
            thickness: 0.35,
            color: rgb(0, 0, 0)
        });
        page.drawLine({
            start: { x: pt.x, y: pt.y - span },
            end: { x: pt.x, y: pt.y + span },
            thickness: 0.35,
            color: rgb(0, 0, 0)
        });
    }
};

/**
 * ============================================================
 * DRAW JOB SLUG LINE
 * ============================================================
 */
const drawJobSlug = ({
    page,
    pageWidth,
    pageHeight,
    jobInfo,
    sideName,
    font
}) => {
    if (!font) return;

    let fileName = "Prepress Imposition";
    if (typeof jobInfo === "string") {
        fileName = jobInfo;
    } else if (jobInfo?.originalFileName) {
        fileName = jobInfo.originalFileName;
    } else if (jobInfo?.jobId) {
        fileName = `Job ${jobInfo.jobId.slice(-8)}`;
    }

    const swMM = (pageWidth / POINTS_PER_MM).toFixed(1);
    const shMM = (pageHeight / POINTS_PER_MM).toFixed(1);
    const dateStr = new Date().toISOString().replace("T", " ").slice(0, 19);
    const slug = `${fileName} | ${sideName || "SHEET"} | Sheet: ${swMM} × ${shMM} mm | ${dateStr} | CIP4 Prepress Studio`;

    page.drawText(slug, {
        x: Math.max(30, pageWidth * 0.05),
        y: 8,
        size: 6.5,
        font,
        color: rgb(0.2, 0.2, 0.2)
    });
};

/**
 * ============================================================
 * DRAW PRODUCTION MARKS (Master Function)
 * ============================================================
 */
const drawProductionMarks = ({
    page,
    placements = [],
    marks = {},
    cropMarks = {},
    jobInfo = null,
    font = null,
    sideName = ""
}) => {
    /**
     * Master production-mark switch
     */
    if (marks?.enabled === false) {
        return;
    }

    const pageWidth = page.getWidth();
    const pageHeight = page.getHeight();

    // Calculate imposition placement bounding box
    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;

    if (placements.length > 0) {
        for (const p of placements) {
            if (p.x < minX) minX = p.x;
            if (p.x + p.width > maxX) maxX = p.x + p.width;
            if (p.y < minY) minY = p.y;
            if (p.y + p.height > maxY) maxY = p.y + p.height;
        }
    } else {
        minX = 36;
        maxX = pageWidth - 36;
        minY = 36;
        maxY = pageHeight - 36;
    }

    const unit = cropMarks?.unit || "mm";
    const cropLength = toPoints(cropMarks?.length ?? 3, unit);
    const cropOffset = toPoints(cropMarks?.offset ?? 2, unit);
    const cropThickness = Number(cropMarks?.thickness ?? 0.5);

    /**
     * 1. CROP MARKS
     */
    const cropEnabled =
        cropMarks?.enabled ??
        marks?.crop ??
        true;

    if (cropEnabled && placements.length > 0) {
        for (const placement of placements) {
            drawPlacementCropMarks({
                page,
                placement,
                length: cropLength,
                offset: cropOffset,
                thickness: cropThickness
            });
        }
    }

    /**
     * 2. CMYK COLOR BARS
     */
    const colorBarEnabled =
        marks?.colorBar ??
        marks?.colorBars ??
        true;

    if (colorBarEnabled) {
        drawColorBars({
            page,
            pageWidth,
            pageHeight,
            minX,
            maxX,
            minY,
            maxY,
            cropMarginTop: cropOffset + cropLength,
            cropMarginBottom: cropOffset + cropLength
        });
    }

    /**
     * 3. OPTICAL CAMERA MARKS
     */
    const cameraMarksEnabled =
        marks?.cameraMarks === true ||
        Boolean(marks?.cameraMarks?.enabled ?? marks?.cameraMarks ?? marks?.camera ?? marks?.opticalMarks);

    if (cameraMarksEnabled) {
        const cameraOpts = typeof marks?.cameraMarks === "object" ? marks.cameraMarks : {};
        drawCameraMarks({
            page,
            pageWidth,
            pageHeight,
            minX,
            maxX,
            minY,
            maxY,
            size: cameraOpts.size ?? marks?.cameraMarkSize ?? 5,
            offset: cameraOpts.offset ?? marks?.cameraMarkOffset ?? 8,
            style: cameraOpts.style ?? marks?.cameraMarkStyle ?? "RING",
            positions: cameraOpts.positions ?? marks?.cameraMarkPositions ?? "CORNERS_AND_EDGES"
        });
    }

    /**
     * 4. REGISTRATION MARKS
     */
    const registrationEnabled =
        marks?.registration ??
        marks?.registrationMarks ??
        true;

    if (registrationEnabled) {
        drawRegistrationMarks({
            page,
            pageWidth,
            pageHeight
        });
    }

    /**
     * 5. JOB SLUG LINE
     */
    const jobSlugEnabled =
        marks?.jobSlug ??
        marks?.jobInfo ??
        Boolean(jobInfo);

    if (jobSlugEnabled) {
        drawJobSlug({
            page,
            pageWidth,
            pageHeight,
            jobInfo,
            sideName,
            font
        });
    }
};

export {
    drawProductionMarks,
    drawColorBars,
    drawCameraMarks,
    drawRegistrationMarks,
    drawPlacementCropMarks
};