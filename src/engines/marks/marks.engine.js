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
    { name: "C75", color: cmyk(0.75, 0, 0, 0) },
    { name: "M75", color: cmyk(0, 0.75, 0, 0) },
    { name: "Y75", color: cmyk(0, 0, 0.75, 0) },
    { name: "K75", color: cmyk(0, 0, 0, 0.75) },
    // 50% Tints
    { name: "C50", color: cmyk(0.5, 0, 0, 0) },
    { name: "M50", color: cmyk(0, 0.5, 0, 0) },
    { name: "Y50", color: cmyk(0, 0, 0.5, 0) },
    { name: "K50", color: cmyk(0, 0, 0, 0.5) },
    // 25% Tints
    { name: "C25", color: cmyk(0.25, 0, 0, 0) },
    { name: "M25", color: cmyk(0, 0.25, 0, 0) },
    { name: "Y25", color: cmyk(0, 0, 0.25, 0) },
    { name: "K25", color: cmyk(0, 0, 0, 0.25) },
    // 2-Color & 3-Color Overprints
    { name: "RED", color: cmyk(0, 1, 1, 0) },       // M + Y
    { name: "GRN", color: cmyk(1, 0, 1, 0) },       // C + Y
    { name: "BLU", color: cmyk(1, 1, 0, 0) },       // C + M
    { name: "3CK", color: cmyk(0.8, 0.8, 0.8, 0) }, // 3C Gray
    // Paper White
    { name: "WHT", color: cmyk(0, 0, 0, 0) }
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
/**
 * DRAW OPTICAL CAMERA MARKS (Digital Cut & Optical Registration)
 * ============================================================
 * Used by automated camera cutters (Zünd, Kongsberg, i-cut, etc.)
 * Clean 5 mm radius circle filled with solid color with an outer border.
 * No unnecessary craft, ticks, or reticles.
 */
const drawCameraMarks = ({
    page,
    pageWidth,
    pageHeight,
    minX = 36,
    maxX = pageWidth - 36,
    minY = 36,
    maxY = pageHeight - 36,
    radius = 5,
    size,
    offset = 8,
    style = "RING",
    positions = "CORNERS_AND_EDGES"
}) => {
    // Determine raw radius in mm
    let radiusMM = Number(radius) || (Number(size) ? (Number(size) <= 6 ? Number(size) : Number(size) / 2) : 5) || 5;
    const clearance = toPoints(1.5, "mm"); // 1.5mm safety clearance from book page borders

    // Calculate available waste margins around book placements
    const leftMargin = Math.max(0, minX);
    const rightMargin = Math.max(0, pageWidth - maxX);
    const bottomMargin = Math.max(0, minY);
    const topMargin = Math.max(0, pageHeight - maxY);
    const minAvailableMargin = Math.min(
        leftMargin > 0 ? leftMargin : 50,
        rightMargin > 0 ? rightMargin : 50,
        bottomMargin > 0 ? bottomMargin : 50,
        topMargin > 0 ? topMargin : 50
    );

    // If margin is tight, automatically scale camera mark radius so it NEVER encroaches on page trim
    let dotRadius = toPoints(radiusMM, "mm");
    let outerBorderRadius = dotRadius + toPoints(1.5, "mm");
    if (minAvailableMargin < outerBorderRadius * 2 + clearance) {
        const maxSafeRadius = Math.max(toPoints(1.5, "mm"), (minAvailableMargin / 2) - clearance - toPoints(0.5, "mm"));
        dotRadius = maxSafeRadius;
        outerBorderRadius = dotRadius + toPoints(1.0, "mm");
    }

    // Book page exclusion zone: any mark intersecting this box covers book page content
    const pageBox = {
        left: minX - clearance,
        right: maxX + clearance,
        bottom: minY - clearance,
        top: maxY + clearance
    };

    const collidesWithBookPage = (x, y, r) => {
        return (
            x + r > pageBox.left &&
            x - r < pageBox.right &&
            y + r > pageBox.bottom &&
            y - r < pageBox.top
        );
    };

    // Safe corner fiducials centered in waste margins
    const fiducials = [];

    // Bottom-Left
    const blX = leftMargin > outerBorderRadius * 2 ? leftMargin / 2 : toPoints(offset, "mm");
    const blY = bottomMargin > outerBorderRadius * 2 ? bottomMargin / 2 : toPoints(offset, "mm");
    if (!collidesWithBookPage(blX, blY, outerBorderRadius)) {
        fiducials.push({ x: blX, y: blY });
    } else if (leftMargin > outerBorderRadius * 2) {
        fiducials.push({ x: outerBorderRadius + clearance, y: outerBorderRadius + clearance });
    }

    // Bottom-Right
    const brX = rightMargin > outerBorderRadius * 2 ? (maxX + pageWidth) / 2 : pageWidth - toPoints(offset, "mm");
    const brY = bottomMargin > outerBorderRadius * 2 ? bottomMargin / 2 : toPoints(offset, "mm");
    if (!collidesWithBookPage(brX, brY, outerBorderRadius)) {
        fiducials.push({ x: brX, y: brY });
    } else if (rightMargin > outerBorderRadius * 2) {
        fiducials.push({ x: pageWidth - outerBorderRadius - clearance, y: outerBorderRadius + clearance });
    }

    // Top-Left
    const tlX = leftMargin > outerBorderRadius * 2 ? leftMargin / 2 : toPoints(offset, "mm");
    const tlY = topMargin > outerBorderRadius * 2 ? (maxY + pageHeight) / 2 : pageHeight - toPoints(offset, "mm");
    if (!collidesWithBookPage(tlX, tlY, outerBorderRadius)) {
        fiducials.push({ x: tlX, y: tlY });
    } else if (leftMargin > outerBorderRadius * 2) {
        fiducials.push({ x: outerBorderRadius + clearance, y: pageHeight - outerBorderRadius - clearance });
    }

    // Top-Right
    const trX = rightMargin > outerBorderRadius * 2 ? (maxX + pageWidth) / 2 : pageWidth - toPoints(offset, "mm");
    const trY = topMargin > outerBorderRadius * 2 ? (maxY + pageHeight) / 2 : pageHeight - toPoints(offset, "mm");
    if (!collidesWithBookPage(trX, trY, outerBorderRadius)) {
        fiducials.push({ x: trX, y: trY });
    } else if (rightMargin > outerBorderRadius * 2) {
        fiducials.push({ x: pageWidth - outerBorderRadius - clearance, y: pageHeight - outerBorderRadius - clearance });
    }

    // Mid-Edge fiducials (strictly placed only if sheet margins provide ample waste margin without covering page)
    if (positions !== "CORNERS") {
        // Top Mid-Edge
        if (topMargin >= outerBorderRadius * 2 + clearance * 2) {
            const topY = maxY + topMargin / 2;
            const topX = pageWidth / 2;
            if (!collidesWithBookPage(topX, topY, outerBorderRadius)) {
                fiducials.push({ x: topX, y: topY });
            }
        }

        // Bottom Mid-Edge
        if (bottomMargin >= outerBorderRadius * 2 + clearance * 2) {
            const botY = bottomMargin / 2;
            const botX = pageWidth / 2;
            if (!collidesWithBookPage(botX, botY, outerBorderRadius)) {
                fiducials.push({ x: botX, y: botY });
            }
        }

        // Left Mid-Edge
        if (leftMargin >= outerBorderRadius * 2 + clearance * 2) {
            const lX = leftMargin / 2;
            const lY = pageHeight / 2;
            if (!collidesWithBookPage(lX, lY, outerBorderRadius)) {
                fiducials.push({ x: lX, y: lY });
            }
        }

        // Right Mid-Edge
        if (rightMargin >= outerBorderRadius * 2 + clearance * 2) {
            const rX = maxX + rightMargin / 2;
            const rY = pageHeight / 2;
            if (!collidesWithBookPage(rX, rY, outerBorderRadius)) {
                fiducials.push({ x: rX, y: rY });
            }
        }
    }

    // Render non-overlapping camera marks
    for (const pt of fiducials) {
        // Strict runtime guard: never draw if any point overlaps the book page box
        if (collidesWithBookPage(pt.x, pt.y, outerBorderRadius)) {
            continue;
        }

        // Outer contrast white ring with black border
        page.drawCircle({
            x: pt.x,
            y: pt.y,
            size: outerBorderRadius,
            color: rgb(1, 1, 1),
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.5
        });

        // Inner solid fiducial target
        page.drawCircle({
            x: pt.x,
            y: pt.y,
            size: dotRadius,
            color: rgb(0, 0, 0),
            borderColor: rgb(0, 0, 0),
            borderWidth: 0.25
        });
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
            radius: cameraOpts.radius ?? marks?.cameraMarkRadius ?? 5,
            size: cameraOpts.size ?? marks?.cameraMarkSize ?? 10,
            offset: cameraOpts.offset ?? marks?.cameraMarkOffset ?? 8,
            style: cameraOpts.style ?? marks?.cameraMarkStyle ?? "RING",
            positions: cameraOpts.positions ?? marks?.cameraMarkPositions ?? "CORNERS_AND_EDGES"
        });
    }

    /**
     * 4. REGISTRATION MARKS (Removed - deprecated in modern automated workflow)
     */

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

    /**
     * 6. SPINE COLLATION STEP MARKS (Kodak Preps / Prinergy Standard)
     */
    const collatingMarksEnabled =
        marks?.collatingMarks === true ||
        Boolean(marks?.collating);

    const totalSigs = marks?.totalSignatures ?? jobInfo?.totalSignatures ?? 1;
    const sigIdx = marks?.signatureIndex ?? jobInfo?.signatureIndex ?? 0;

    if (collatingMarksEnabled && totalSigs > 1) {
        drawCollationMarks({
            page,
            pageWidth,
            pageHeight,
            signatureIndex: sigIdx,
            totalSignatures: totalSigs,
            minX,
            maxX,
            minY,
            maxY
        });
    }

    /**
     * 7. FOLD & KNIFE MARKS (Kodak Stahlfolder / MBO Folding Machine Setup)
     */
    const foldMarksEnabled =
        marks?.foldMarks === true ||
        Boolean(marks?.foldingMarks);

    if (foldMarksEnabled) {
        drawFoldMarks({
            page,
            pageWidth,
            pageHeight,
            minX,
            maxX,
            minY,
            maxY
        });
    }

    /**
     * 8. DIGITAL FINISHING BARCODE (Duplo / Horizon / Zünd Automated Cutter Barcode)
     */
    const digitalBarcodeEnabled =
        marks?.digitalBarcode === true ||
        marks?.printTechnology === "DIGITAL" ||
        marks?.barcode === true;

    if (digitalBarcodeEnabled) {
        drawDigitalBarcode({
            page,
            pageWidth,
            pageHeight,
            maxY,
            jobInfo,
            signatureIndex: sigIdx,
            font
        });
    }
};

/**
 * ============================================================
 * DRAW SPINE COLLATION STEP MARKS (Kodak Preps / Prinergy Standard)
 * ============================================================
 * Printed on the spine fold of multi-signature book gatherings.
 * On each signature, the mark steps down progressively along the spine.
 * When folded signatures are gathered in order on the binder,
 * the marks form an unbroken diagonal staircase.
 */
const drawCollationMarks = ({
    page,
    pageWidth,
    pageHeight,
    signatureIndex = 0,
    totalSignatures = 1,
    minX = 0,
    maxX = pageWidth,
    minY = 0,
    maxY = pageHeight
}) => {
    if (totalSignatures <= 1) return;

    // Center spine fold line (vertical centerline between book pages)
    const spineX = (minX + maxX) / 2;
    const spineHeight = maxY - minY;
    if (spineHeight <= 40) return;

    // Step mark dimensions: ~3mm width x 8mm height
    const markW = toPoints(3, "mm");
    const markH = toPoints(8, "mm");

    // Stepping progression from 15% to 85% of signature spine height
    const startY = minY + spineHeight * 0.15;
    const endY = minY + spineHeight * 0.85;
    const fraction = totalSignatures > 1 ? signatureIndex / (totalSignatures - 1) : 0.5;
    const markY = startY + (endY - startY) * fraction;

    // Draw solid black collation step block on the fold axis
    page.drawRectangle({
        x: spineX - markW / 2,
        y: markY - markH / 2,
        width: markW,
        height: markH,
        color: rgb(0, 0, 0)
    });
};

/**
 * ============================================================
 * DRAW FOLD MARKS (Kodak Preps Folding Machine Knife Alignment)
 * ============================================================
 * Short dashed / tick marks placed in sheet margins at the folding axes
 * to align Stahlfolder / MBO folding knives.
 */
const drawFoldMarks = ({
    page,
    pageWidth,
    pageHeight,
    minX,
    maxX,
    minY,
    maxY
}) => {
    const tickLen = toPoints(5, "mm");
    const thickness = 0.5;
    const foldColor = rgb(0.1, 0.1, 0.1);

    // Vertical fold line at center X
    const centerX = pageWidth / 2;
    if (minY > tickLen) {
        page.drawLine({
            start: { x: centerX, y: 0 },
            end: { x: centerX, y: Math.min(minY - 2, tickLen) },
            thickness,
            color: foldColor
        });
    }
    if (pageHeight - maxY > tickLen) {
        page.drawLine({
            start: { x: centerX, y: pageHeight },
            end: { x: centerX, y: Math.max(maxY + 2, pageHeight - tickLen) },
            thickness,
            color: foldColor
        });
    }

    // Horizontal fold line at center Y
    const centerY = pageHeight / 2;
    if (minX > tickLen) {
        page.drawLine({
            start: { x: 0, y: centerY },
            end: { x: Math.min(minX - 2, tickLen), y: centerY },
            thickness,
            color: foldColor
        });
    }
    if (pageWidth - maxX > tickLen) {
        page.drawLine({
            start: { x: pageWidth, y: centerY },
            end: { x: Math.max(maxX + 2, pageWidth - tickLen), y: centerY },
            thickness,
            color: foldColor
        });
    }
};

/**
 * ============================================================
 * DRAW DIGITAL CUTTER BARCODE (Duplo / Horizon / Zünd Automation)
 * ============================================================
 * Vector barcode pattern in the top margin for automated digital finishing.
 */
const drawDigitalBarcode = ({
    page,
    pageWidth,
    pageHeight,
    maxY,
    jobInfo,
    signatureIndex = 0,
    font
}) => {
    const topWaste = pageHeight - maxY;
    if (topWaste < 15) return;

    const barcodeX = pageWidth - toPoints(70, "mm");
    const barcodeY = pageHeight - toPoints(8, "mm");
    const barHeight = toPoints(4.5, "mm");

    const bars = [
        2, 1, 3, 1, 1, 2, 3, 1, 2, 1, 1, 3, 2, 1, 3, 1, 1, 2, 1, 3, 2, 1, 1, 2, 3
    ];
    let curX = barcodeX;
    bars.forEach((w, idx) => {
        if (idx % 2 === 0) {
            page.drawRectangle({
                x: curX,
                y: barcodeY,
                width: w * 0.8,
                height: barHeight,
                color: rgb(0, 0, 0)
            });
        }
        curX += w * 0.8;
    });

    if (font) {
        const jobIdStr = jobInfo?.jobId ? String(jobInfo.jobId).slice(-6) : "DIGI";
        const codeText = `AUTO-CUT: J#${jobIdStr}-S${signatureIndex + 1}`;
        page.drawText(codeText, {
            x: barcodeX,
            y: barcodeY - 5,
            size: 5,
            font,
            color: rgb(0.2, 0.2, 0.2)
        });
    }
};

export {
    drawProductionMarks,
    drawColorBars,
    drawCameraMarks,
    drawRegistrationMarks,
    drawPlacementCropMarks,
    drawCollationMarks,
    drawFoldMarks,
    drawDigitalBarcode
};