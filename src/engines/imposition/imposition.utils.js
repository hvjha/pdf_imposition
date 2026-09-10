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
    isPlacementInsideSheet
};