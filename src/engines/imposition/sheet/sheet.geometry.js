const PT_PER_INCH = 72;
const PT_PER_MM = 72 / 25.4;

/* =========================================================
   UNIT CONVERSION
========================================================= */

export function inchesToPoints(value) {
    return Number(value) * PT_PER_INCH;
}

export function mmToPoints(value) {
    return Number(value) * PT_PER_MM;
}

export function pointsToInches(value) {
    return Number(value) / PT_PER_INCH;
}

export function pointsToMm(value) {
    return Number(value) / PT_PER_MM;
}

export function toPoints(value, unit) {
    const numericValue = Number(value);

    if (!Number.isFinite(numericValue)) {
        throw new Error(`Invalid measurement: ${value}`);
    }

    switch (String(unit || "pt").toLowerCase()) {
        case "pt":
        case "point":
        case "points":
            return numericValue;

        case "mm":
        case "millimeter":
        case "millimeters":
            return mmToPoints(numericValue);

        case "in":
        case "inch":
        case "inches":
            return inchesToPoints(numericValue);

        default:
            throw new Error(`Unsupported unit: ${unit}`);
    }
}


/* =========================================================
   BOX NORMALIZATION
========================================================= */

export function normalizeBox(box = {}) {
    const unit = box.unit || "mm";

    return {
        top: toPoints(box.top || 0, unit),
        right: toPoints(box.right || 0, unit),
        bottom: toPoints(box.bottom || 0, unit),
        left: toPoints(box.left || 0, unit)
    };
}


/* =========================================================
   SHEET NORMALIZATION
========================================================= */

export function normalizeSheet(sheet) {
    if (!sheet) {
        throw new Error("Sheet configuration is required.");
    }

    const width = toPoints(sheet.width, sheet.unit);
    const height = toPoints(sheet.height, sheet.unit);

    if (width <= 0 || height <= 0) {
        throw new Error(
            "Sheet width and height must be greater than zero."
        );
    }

    return {
        width,
        height,
        widthInches: pointsToInches(width),
        heightInches: pointsToInches(height)
    };
}


/* =========================================================
   SHEET GEOMETRY
========================================================= */

export function createSheetGeometry(config) {
    const sheet = normalizeSheet(config.sheet);

    // Support both:
    // config.margin
    // config.margins
    const marginConfig =
        config.margin ||
        config.margins ||
        {};

    const margin = normalizeBox(marginConfig);
    const bleed = normalizeBox(config.bleed);

    const usableWidth =
        sheet.width -
        margin.left -
        margin.right;

    const usableHeight =
        sheet.height -
        margin.top -
        margin.bottom;

    if (usableWidth <= 0 || usableHeight <= 0) {
        throw new Error(
            "Margins are larger than the available sheet area."
        );
    }

    return {
        sheet,

        margin,

        bleed,

        usableArea: {
            x: margin.left,
            y: margin.bottom,
            width: usableWidth,
            height: usableHeight
        }
    };
}


/* =========================================================
   GRID GEOMETRY
========================================================= */

export function createGridGeometry(
    usableArea,
    columns,
    rows,
    gutter = {}
) {
    if (
        !usableArea ||
        !Number.isFinite(usableArea.x) ||
        !Number.isFinite(usableArea.y) ||
        !Number.isFinite(usableArea.width) ||
        !Number.isFinite(usableArea.height)
    ) {
        throw new Error(
            "Valid usable sheet area is required."
        );
    }

    if (
        !Number.isInteger(columns) ||
        columns <= 0
    ) {
        throw new Error(
            "Grid columns must be a positive integer."
        );
    }

    if (
        !Number.isInteger(rows) ||
        rows <= 0
    ) {
        throw new Error(
            "Grid rows must be a positive integer."
        );
    }

    const horizontalGutter =
        Number(gutter.horizontal || 0);

    const verticalGutter =
        Number(gutter.vertical || 0);

    if (
        !Number.isFinite(horizontalGutter) ||
        !Number.isFinite(verticalGutter)
    ) {
        throw new Error(
            "Grid gutter values must be valid numbers."
        );
    }

    if (
        horizontalGutter < 0 ||
        verticalGutter < 0
    ) {
        throw new Error(
            "Grid gutter values cannot be negative."
        );
    }

    const totalHorizontalGutter =
        horizontalGutter * (columns - 1);

    const totalVerticalGutter =
        verticalGutter * (rows - 1);

    const availableWidth =
        usableArea.width -
        totalHorizontalGutter;

    const availableHeight =
        usableArea.height -
        totalVerticalGutter;

    const cellWidth =
        availableWidth / columns;

    const cellHeight =
        availableHeight / rows;

    if (
        cellWidth <= 0 ||
        cellHeight <= 0
    ) {
        throw new Error(
            "Sheet is too small for the requested grid."
        );
    }

    const cells = [];

    for (
        let row = 0;
        row < rows;
        row++
    ) {
        for (
            let column = 0;
            column < columns;
            column++
        ) {
            cells.push({
                row,
                column,

                x:
                    usableArea.x +
                    column *
                    (
                        cellWidth +
                        horizontalGutter
                    ),

                y:
                    usableArea.y +
                    (
                        rows -
                        row -
                        1
                    ) *
                    (
                        cellHeight +
                        verticalGutter
                    ),

                width: cellWidth,
                height: cellHeight
            });
        }
    }

    return {
        columns,
        rows,

        cellWidth,
        cellHeight,

        cells
    };
}