const POINTS_PER_INCH = 72;

const SUPPORTED_UNITS = ["pt", "inch"];

const toPoints = (value, unit = "pt") => {
    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        throw new Error(
            `Invalid measurement value: ${value}`
        );
    }

    if (!SUPPORTED_UNITS.includes(unit)) {
        throw new Error(
            `Unsupported unit: ${unit}. Use "pt" or "inch".`
        );
    }

    return unit === "inch"
        ? value * POINTS_PER_INCH
        : value;
};

const toInches = (points) => {
    if (
        typeof points !== "number" ||
        !Number.isFinite(points)
    ) {
        throw new Error("Invalid point value.");
    }

    return Number(
        (points / POINTS_PER_INCH).toFixed(4)
    );
};

const normalizeCropRectangle = ({
    x = 0,
    y = 0,
    width,
    height,
    unit = "pt"
}) => {
    return {
        x: toPoints(x, unit),
        y: toPoints(y, unit),
        width: toPoints(width, unit),
        height: toPoints(height, unit)
    };
};

const rectangleToInches = (rectangle) => {
    return {
        x: toInches(rectangle.x),
        y: toInches(rectangle.y),
        width: toInches(rectangle.width),
        height: toInches(rectangle.height)
    };
};

export {
    POINTS_PER_INCH,
    toPoints,
    toInches,
    normalizeCropRectangle,
    rectangleToInches
};