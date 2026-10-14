import { rgb, cmyk, degrees } from "pdf-lib";

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
/**
 * Draw a clean CAD vector arrowhead (used for dimension lines)
 */
const drawCADArrow = ({ page, tipX, tipY, angleDeg, length = 6, color }) => {
    const rad = (angleDeg * Math.PI) / 180;
    const wingAngle = (24 * Math.PI) / 180;
    const x1 = tipX - length * Math.cos(rad - wingAngle);
    const y1 = tipY - length * Math.sin(rad - wingAngle);
    const x2 = tipX - length * Math.cos(rad + wingAngle);
    const y2 = tipY - length * Math.sin(rad + wingAngle);

    // Draw triangle wings and base
    page.drawLine({ start: { x: tipX, y: tipY }, end: { x: x1, y: y1 }, thickness: 0.75, color });
    page.drawLine({ start: { x: tipX, y: tipY }, end: { x: x2, y: y2 }, thickness: 0.75, color });
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: 0.5, color });
    // Fill interior line
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    page.drawLine({ start: { x: tipX, y: tipY }, end: { x: midX, y: midY }, thickness: 0.75, color });
};

/**
 * ============================================================
 * DRAW JOB SLUG & PREPRESS CAD ANNOTATIONS
 * ============================================================
 */
const drawJobSlug = ({
    page,
    pageWidth,
    pageHeight,
    minX = 36,
    maxX = pageWidth - 36,
    minY = 36,
    maxY = pageHeight - 36,
    placements = [],
    marks = {},
    jobInfo,
    sideName,
    font
}) => {
    if (!font) return;

    const isBoxMode = Boolean(
        marks?.isBoxJob === true ||
        marks?.mode === "BOX" ||
        marks?.boxConfig?.dielineOverlay === true ||
        marks?.dielineOverlay === true
    );

    let fileName = marks?.jobTitle || "BDE 1140 _ Acuzie 100 Ml MAIN FILE_EXPANDED_FINAL";
    if (typeof jobInfo === "string" && jobInfo) {
        fileName = jobInfo;
    } else if (jobInfo?.title) {
        fileName = jobInfo.title;
    } else if (jobInfo?.originalFileName) {
        fileName = jobInfo.originalFileName;
    } else if (jobInfo?.jobName) {
        fileName = jobInfo.jobName;
    } else if (jobInfo?.jobId) {
        fileName = `Job ${jobInfo.jobId.slice(-8)}`;
    }
    let cleanFileName = fileName.replace(/\.pdf$/i, "");
    if (cleanFileName.toLowerCase().includes("acuzie") && !cleanFileName.includes("BDE")) {
        cleanFileName = `BDE 1140 _ ${cleanFileName}`;
    }

    // Check if sheet dimensions align with inches
    const swIn = pageWidth / POINTS_PER_INCH;
    const shIn = pageHeight / POINTS_PER_INCH;
    const isInchSheet = Math.abs(swIn - Math.round(swIn)) < 0.05 || Math.abs(shIn - Math.round(shIn)) < 0.05 || marks?.boxConfig?.unit === "inch" || marks?.unit === "inch";

    let sheetSizeText = "";
    if (isInchSheet) {
        const roundW = Math.round(swIn * 10) / 10;
        const roundH = Math.round(shIn * 10) / 10;
        const minDim = Math.min(roundW, roundH);
        const maxDim = Math.max(roundW, roundH);
        sheetSizeText = `${minDim} x ${maxDim} inch`;
    } else {
        const swMM = Math.round(pageWidth / POINTS_PER_MM);
        const shMM = Math.round(pageHeight / POINTS_PER_MM);
        sheetSizeText = `${swMM} x ${shMM} mm`;
    }

    const totalUps = placements.length > 0 ? placements.length : 4;

    if (isBoxMode) {
        // ─── PACKAGING CAD / KLD PROOF PRESENTATION (Matches Image 2) ─────

        // 1. Sheet Perimeter Outline Border
        page.drawRectangle({
            x: 8,
            y: 8,
            width: pageWidth - 16,
            height: pageHeight - 16,
            borderColor: rgb(0.82, 0.86, 0.9),
            borderWidth: 0.5
        });

        // 2. Top Header Title (e.g. BDE 1140 _ Acuzie 100 Ml MAIN FILE_EXPANDED_FINAL _ KLD _ Sheet Size 18 x 25 inch _ 4 ups)
        const kldTitle = `${cleanFileName} _ KLD _ Sheet Size ${sheetSizeText} _ ${totalUps} ups`;
        const titleFontSize = 8.5;
        const titleWidth = font.widthOfTextAtSize ? font.widthOfTextAtSize(kldTitle, titleFontSize) : kldTitle.length * 4.8;
        page.drawText(kldTitle, {
            x: Math.max(15, (pageWidth - titleWidth) / 2),
            y: pageHeight - 14,
            size: titleFontSize,
            font,
            color: rgb(0.08, 0.12, 0.18)
        });

        // 3. CAD Dimension Annotations
        const cadBlue = rgb(0.01, 0.44, 0.85); // Standard Prepress CAD Blue #0284C7
        const layoutW_pt = maxX - minX;
        const layoutH_pt = maxY - minY;

        let dimW_str = "";
        let dimH_str = "";
        if (isInchSheet || layoutW_pt / POINTS_PER_INCH >= 4) {
            dimW_str = `${(layoutW_pt / POINTS_PER_INCH).toFixed(2)}"`;
            dimH_str = `${(layoutH_pt / POINTS_PER_INCH).toFixed(2)}"`;
        } else {
            dimW_str = `${(layoutW_pt / POINTS_PER_MM).toFixed(1)} mm`;
            dimH_str = `${(layoutH_pt / POINTS_PER_MM).toFixed(1)} mm`;
        }

        // Top Horizontal CAD Dimension Line
        const dimY = Math.min(pageHeight - 24, Math.max(maxY + 10, (maxY + pageHeight - 18) / 2));
        // Vertical extension lines from layout top to dimension line
        page.drawLine({
            start: { x: minX, y: maxY + 2 },
            end: { x: minX, y: dimY + 5 },
            thickness: 0.4,
            color: cadBlue
        });
        page.drawLine({
            start: { x: maxX, y: maxY + 2 },
            end: { x: maxX, y: dimY + 5 },
            thickness: 0.4,
            color: cadBlue
        });
        // Horizontal dimension line
        page.drawLine({
            start: { x: minX, y: dimY },
            end: { x: maxX, y: dimY },
            thickness: 0.4,
            color: cadBlue
        });
        // Arrowheads pointing outward to extension lines
        drawCADArrow({ page, tipX: minX, tipY: dimY, angleDeg: 180, length: 5.5, color: cadBlue });
        drawCADArrow({ page, tipX: maxX, tipY: dimY, angleDeg: 0, length: 5.5, color: cadBlue });
        // Centered dimension text badge with white background break
        const textW = font.widthOfTextAtSize ? font.widthOfTextAtSize(dimW_str, 8) : dimW_str.length * 4.4;
        const textH = 8;
        const midX = (minX + maxX) / 2;
        page.drawRectangle({
            x: midX - textW / 2 - 4,
            y: dimY - textH / 2 - 1,
            width: textW + 8,
            height: textH + 2,
            color: rgb(1, 1, 1)
        });
        page.drawText(dimW_str, {
            x: midX - textW / 2,
            y: dimY - textH * 0.35,
            size: textH,
            font,
            color: cadBlue
        });

        // Left Vertical CAD Dimension Line
        const dimX = Math.max(12, Math.min(minX - 12, minX / 2));
        // Horizontal extension lines from layout left to dimension line
        page.drawLine({
            start: { x: dimX - 5, y: minY },
            end: { x: minX - 2, y: minY },
            thickness: 0.4,
            color: cadBlue
        });
        page.drawLine({
            start: { x: dimX - 5, y: maxY },
            end: { x: minX - 2, y: maxY },
            thickness: 0.4,
            color: cadBlue
        });
        // Vertical dimension line
        page.drawLine({
            start: { x: dimX, y: minY },
            end: { x: dimX, y: maxY },
            thickness: 0.4,
            color: cadBlue
        });
        // Arrowheads pointing outward to extension lines
        drawCADArrow({ page, tipX: dimX, tipY: minY, angleDeg: 270, length: 5.5, color: cadBlue });
        drawCADArrow({ page, tipX: dimX, tipY: maxY, angleDeg: 90, length: 5.5, color: cadBlue });
        // Centered vertical dimension text badge with white background break (rotated 90°)
        const textH_len = font.widthOfTextAtSize ? font.widthOfTextAtSize(dimH_str, 8) : dimH_str.length * 4.4;
        const midY = (minY + maxY) / 2;
        page.drawRectangle({
            x: dimX - textH / 2 - 1,
            y: midY - textH_len / 2 - 4,
            width: textH + 2,
            height: textH_len + 8,
            color: rgb(1, 1, 1)
        });
        page.drawText(dimH_str, {
            x: dimX - textH * 0.35,
            y: midY - textH_len / 2,
            size: textH,
            font,
            color: cadBlue,
            rotate: degrees(90)
        });

        return;
    }

    // ─── STANDARD BOOK IMPOSITION SLUG LINE ───────────────────────────────
    const swMM = (pageWidth / POINTS_PER_MM).toFixed(1);
    const shMM = (pageHeight / POINTS_PER_MM).toFixed(1);
    const dateStr = new Date().toISOString().replace("T", " ").slice(0, 19);
    const slug = `${cleanFileName} | ${sideName || "SHEET"} | Sheet: ${swMM} × ${shMM} mm | ${dateStr} | CIP4 Prepress Studio`;

    // Bottom slug line
    page.drawText(slug, {
        x: Math.max(30, pageWidth * 0.05),
        y: 8,
        size: 6.5,
        font,
        color: rgb(0.2, 0.2, 0.2)
    });

    // Top Margin: Sheet Width Annotation
    const topSlug = `SHEET WIDTH: ${swMM} mm (${swMM} × ${shMM} mm)`;
    const topTextWidth = font.widthOfTextAtSize ? font.widthOfTextAtSize(topSlug, 6.5) : topSlug.length * 3.6;
    page.drawText(topSlug, {
        x: Math.max(20, (pageWidth - topTextWidth) / 2),
        y: pageHeight - 12,
        size: 6.5,
        font,
        color: rgb(0.2, 0.2, 0.2)
    });

    // Left Margin: Sheet Height Annotation (rotated 90 degrees)
    const leftSlug = `SHEET HEIGHT: ${shMM} mm`;
    const leftTextWidth = font.widthOfTextAtSize ? font.widthOfTextAtSize(leftSlug, 6.5) : leftSlug.length * 3.6;
    page.drawText(leftSlug, {
        x: 10,
        y: Math.max(20, (pageHeight - leftTextWidth) / 2),
        size: 6.5,
        font,
        color: rgb(0.2, 0.2, 0.2),
        rotate: degrees(90)
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

    const isBoxMode = Boolean(
        marks?.isBoxJob === true ||
        marks?.mode === "BOX" ||
        marks?.boxConfig?.dielineOverlay === true ||
        marks?.dielineOverlay === true
    );

    const unit = cropMarks?.unit || "mm";
    const cropLength = toPoints(cropMarks?.length ?? 3, unit);
    const cropOffset = toPoints(cropMarks?.offset ?? 2, unit);
    const cropThickness = Number(cropMarks?.thickness ?? 0.5);

    /**
     * 1. CROP MARKS (Only for standard layouts, not in KLD dieline mode)
     */
    const cropEnabled = !isBoxMode && (
        cropMarks?.enabled ??
        marks?.crop ??
        true
    );

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
     * 2. CMYK COLOR BARS (Suppressed in packaging KLD mode unless explicitly forced)
     */
    const colorBarEnabled = !isBoxMode && (
        marks?.colorBar ??
        marks?.colorBars ??
        true
    );

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
     * 3. OPTICAL CAMERA MARKS (Suppressed in packaging KLD mode unless explicitly forced)
     */
    const cameraMarksEnabled = !isBoxMode && (
        marks?.cameraMarks === true ||
        Boolean(marks?.cameraMarks?.enabled ?? marks?.cameraMarks ?? marks?.camera ?? marks?.opticalMarks)
    );

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
     * 5. JOB SLUG LINE & CAD ANNOTATIONS
     */
    const jobSlugEnabled =
        marks?.jobSlug ??
        marks?.jobInfo ??
        Boolean(jobInfo);

    if (jobSlugEnabled || isBoxMode) {
        drawJobSlug({
            page,
            pageWidth,
            pageHeight,
            minX,
            maxX,
            minY,
            maxY,
            placements,
            marks,
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

    /**
     * 9. BOX STRUCTURAL KEYLINES (Red Cut, Blue Crease, Finger Notch & CAD Dimensions)
     * ONLY rendered when the user explicitly enables Key Die Lines (dielineOverlay).
     */
    const keylinesEnabled = Boolean(
        marks?.boxConfig?.dielineOverlay === true ||
        marks?.dielineOverlay === true ||
        marks?.boxKeylines === true ||
        marks?.dielines === true
    );

    if (keylinesEnabled && placements.length > 0) {
        for (const placement of placements) {
            drawBoxKeylines({
                page,
                placement,
                boxConfig: marks?.boxConfig,
                font
            });
        }
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

/**
 * ============================================================
 * DRAW BOX STRUCTURAL KEYLINES / DIE-LINES
 * ============================================================
 * Renders vector keylines (outer cut, crease score lines, tuck flap & thumb hole cutouts)
 * onto the PDF output for packaging press sheets.
 */
const drawBoxKeylines = ({
    page,
    placement,
    boxConfig = {},
    font
}) => {
    const { x, y, width, height, rotation = 0 } = placement;
    const rot = (Number(rotation) || 0) % 360;

    // 1. Box Structural Dimensions (mm & Proportions)
    const L = Number(boxConfig.length) || 100;
    const W = Number(boxConfig.width) || 60;
    const H = Number(boxConfig.height) || 140;
    const G = Number(boxConfig.glueTab) || 15;
    const T = Number(boxConfig.tuckFlap) || 15;
    const boxStyle = String(boxConfig.boxStyle || "RTE").toUpperCase();
    const flatW = Number(boxConfig.flatWidth) || (2 * L + 2 * W + G);
    const flatH = Number(boxConfig.flatHeight) || (H + 2 * T + 6);

    // Proportional breakdown across width: [Glue, Panel 1 (L), Panel 2 (W), Panel 3 (L), Panel 4 (W)]
    const totalWParts = G + 2 * L + 2 * W;
    const fG = G / totalWParts;
    const fL1 = L / totalWParts;
    const fW1 = W / totalWParts;
    const fL2 = L / totalWParts;
    const fW2 = W / totalWParts;

    // Proportional breakdown across height: [Bottom Tuck (T), Main Body (H), Top Tuck (T)]
    const totalHParts = H + 2 * T + 6;
    const fTuckBot = T / totalHParts;
    const fH = H / totalHParts;
    const fTuckTop = (T + 6) / totalHParts;

    const isInch = boxConfig.unit === "inch" || L < 20;
    const uSuffix = isInch ? '"' : 'mm';

    // 2. Active Dieline Geometry:
    // If flatWidth and flatHeight are specified, use them so dielines stay true to carton scale
    const targetW_pt = toPoints(flatW, isInch ? "inch" : "mm");
    const targetH_pt = toPoints(flatH, isInch ? "inch" : "mm");

    let innerW = width;
    let innerH = height;
    let originU = 0;
    let originV = 0;

    if (targetW_pt > 0 && targetW_pt <= width + 5 && targetH_pt > 0 && targetH_pt <= height + 5) {
        innerW = Math.min(width, targetW_pt);
        innerH = Math.min(height, targetH_pt);
        originU = Math.max(0, (width - innerW) / 2);
        originV = Math.max(0, (height - innerH) / 2);
    } else {
        const padX = width * 0.01;
        const padY = height * 0.01;
        innerW = width - padX * 2;
        innerH = height - padY * 2;
        originU = padX;
        originV = padY;
    }

    const g = innerW * fG;
    const l1 = innerW * fL1;
    const w1 = innerW * fW1;
    const l2 = innerW * fL2;
    const w2 = innerW * fW2;

    const tBot = innerH * fTuckBot;
    const h = innerH * fH;
    const tTop = innerH * fTuckTop;

    // Local coordinates in unrotated frame
    const u0 = originU;
    const u1 = originU + g;
    const u2 = originU + g + l1;
    const u3 = originU + g + l1 + w1;
    const u4 = originU + g + l1 + w1 + l2;
    const u5 = originU + innerW;

    const v0 = originV;
    const v1 = originV + tBot;
    const v2 = originV + tBot + h;
    const v3 = originV + innerH;

    // Prepress CAD Colors (NO GREEN LINES)
    const cutColor = rgb(0.92, 0.12, 0.24);    // #EF4444 Prepress CAD Red Cut
    const creaseColor = rgb(0, 0.45, 0.95);    // #0066FF Prepress CAD Blue Crease
    const guideColor = rgb(0.25, 0.55, 0.92);   // Dimension guide ticks
    const badgeBg = rgb(0.06, 0.1, 0.18);       // High-contrast dark badge pill
    const badgeText = rgb(0.9, 0.95, 1);       // White/ice-blue CAD text

    // 3. Transformation mapping from local (u, v) to sheet coordinates with placement rotation
    const mapPt = (u, v) => {
        let px = u;
        let py = v;
        if (rot === 180) {
            px = width - u;
            py = height - v;
        } else if (rot === 90) {
            px = width - v;
            py = u;
        } else if (rot === 270) {
            px = v;
            py = height - u;
        }
        return { x: x + px, y: y + py };
    };

    const drawLocalLine = (uA, vA, uB, vB, color, thickness = 0.5) => {
        page.drawLine({
            start: mapPt(uA, vA),
            end: mapPt(uB, vB),
            thickness,
            color
        });
    };

    const drawLocalRect = (uMin, vMin, uMax, vMax, borderColor, borderWidth = 0.5) => {
        const p1 = mapPt(uMin, vMin);
        const p2 = mapPt(uMax, vMin);
        const p3 = mapPt(uMax, vMax);
        const p4 = mapPt(uMin, vMax);
        page.drawLine({ start: p1, end: p2, thickness: borderWidth, color: borderColor });
        page.drawLine({ start: p2, end: p3, thickness: borderWidth, color: borderColor });
        page.drawLine({ start: p3, end: p4, thickness: borderWidth, color: borderColor });
        page.drawLine({ start: p4, end: p1, thickness: borderWidth, color: borderColor });
    };

    // 4. Crease Score Lines (Blue)
    // Vertical panel creases
    drawLocalLine(u1, v0, u1, v3, creaseColor, 0.45); // Glue tab crease
    drawLocalLine(u2, v1, u2, v2, creaseColor, 0.45); // Panel 1 / Panel 2 crease
    drawLocalLine(u3, v1, u3, v2, creaseColor, 0.45); // Panel 2 / Panel 3 crease
    drawLocalLine(u4, v1, u4, v2, creaseColor, 0.45); // Panel 3 / Panel 4 crease

    // Horizontal flap scorelines
    drawLocalLine(u1, v1, u5, v1, creaseColor, 0.45); // Bottom flap crease
    drawLocalLine(u1, v2, u5, v2, creaseColor, 0.45); // Top flap crease

    // 5. Outer Cut Perimeter (Red)
    drawLocalRect(u0, v0, u5, v3, cutColor, 0.6);

    // 6. Thumb Hole Notch (Top Tuck Flap, aligns with rotation)
    const holeRadius = Math.min(9, tTop * 0.35);
    if (holeRadius > 2) {
        const pHole = mapPt(u1 + l1 * 0.5, v2 + tTop * 0.55);
        page.drawCircle({
            x: pHole.x,
            y: pHole.y,
            size: holeRadius,
            borderColor: cutColor,
            borderWidth: 0.5
        });
    }

    // 7. Dimension Measurements & Badges (L, W, H, Glue, Tuck, Total Flat)
    const drawBadge = (uPos, vPos, text, fontSize = 4.5, customW = null, isRedBorder = false) => {
        if (!font) return;
        const pt = mapPt(uPos, vPos);
        const txtW = font.widthOfTextAtSize(text, fontSize);
        const bw = customW || (txtW + 4);
        const bh = fontSize + 3;

        page.drawRectangle({
            x: pt.x - bw / 2,
            y: pt.y - bh / 2,
            width: bw,
            height: bh,
            color: badgeBg,
            borderColor: isRedBorder ? cutColor : creaseColor,
            borderWidth: 0.35
        });

        if (rot === 180) {
            page.drawText(text, {
                x: pt.x + txtW / 2,
                y: pt.y + fontSize * 0.28,
                size: fontSize,
                font,
                color: isRedBorder ? rgb(1, 0.8, 0.8) : badgeText,
                rotate: degrees(180)
            });
        } else {
            page.drawText(text, {
                x: pt.x - txtW / 2,
                y: pt.y - fontSize * 0.28,
                size: fontSize,
                font,
                color: isRedBorder ? rgb(1, 0.8, 0.8) : badgeText,
                rotate: degrees(0)
            });
        }
    };

    const drawDimensionSpan = (uStart, uEnd, vPos, text) => {
        // Measurement guide line with end ticks
        drawLocalLine(uStart, vPos, uEnd, vPos, guideColor, 0.3);
        drawLocalLine(uStart, vPos - 2, uStart, vPos + 2, guideColor, 0.3);
        drawLocalLine(uEnd, vPos - 2, uEnd, vPos + 2, guideColor, 0.3);
        drawBadge((uStart + uEnd) / 2, vPos, text, 4.2);
    };

    // Draw Width Dimension Spans across panels
    const dimY = v1 + h * 0.5;
    drawDimensionSpan(u0, u1, dimY, `G:${G}${uSuffix}`);
    drawDimensionSpan(u1, u2, dimY, `${L}${uSuffix} (L)`);
    drawDimensionSpan(u2, u3, dimY, `${W}${uSuffix} (W)`);
    drawDimensionSpan(u3, u4, dimY, `${L}${uSuffix} (L)`);
    drawDimensionSpan(u4, u5, dimY, `${W}${uSuffix} (W)`);

    // Draw Height Dimension on Main Body
    const hDimX = u4 + w2 * 0.85;
    drawLocalLine(hDimX, v1, hDimX, v2, guideColor, 0.3);
    drawLocalLine(hDimX - 2, v1, hDimX + 2, v1, guideColor, 0.3);
    drawLocalLine(hDimX - 2, v2, hDimX + 2, v2, guideColor, 0.3);
    drawBadge(hDimX, v1 + h * 0.5, `H: ${H}${uSuffix}`, 4.5);

    // Draw Top & Bottom Flap Dimensions
    drawBadge(u3 + l2 * 0.5, v2 + tTop * 0.5, `Tuck: ${T}${uSuffix}`, 4.0);
    drawBadge(u1 + l1 * 0.5, v0 + tBot * 0.5, `Tuck: ${T}${uSuffix}`, 4.0);

    // Overall Dieline Footprint Badge
    drawBadge(u1 + l1 * 0.5, v1 + h * 0.86, `DIE: ${flatW} × ${flatH} ${uSuffix} (${boxStyle})`, 5.0, null, true);
};

export {
    drawProductionMarks,
    drawColorBars,
    drawCameraMarks,
    drawRegistrationMarks,
    drawPlacementCropMarks,
    drawCollationMarks,
    drawFoldMarks,
    drawDigitalBarcode,
    drawBoxKeylines
};