import { rgb } from "pdf-lib";


const POINTS_PER_INCH = 72;
const POINTS_PER_MM =
    POINTS_PER_INCH / 25.4;


/**
 * ============================================================
 * UNIT CONVERSION
 * ============================================================
 */

const toPoints = (
    value,
    unit = "mm"
) => {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        throw new Error(
            `Invalid measurement value: ${value}`
        );
    }

    switch (
        String(unit).toLowerCase()
    ) {

        case "pt":
            return number;

        case "mm":
            return number * POINTS_PER_MM;

        case "inch":
        case "in":
            return number * POINTS_PER_INCH;

        default:
            throw new Error(
                `Unsupported mark unit: ${unit}`
            );
    }
};


/**
 * ============================================================
 * DRAW ONE CORNER
 * ============================================================
 *
 * Coordinates x/y are the actual placement boundary.
 *
 * The mark starts after OFFSET and continues for LENGTH.
 *
 * TOP LEFT
 *
 *       ─────
 *       |
 *       |
 *
 * TOP RIGHT
 *
 *       ─────
 *           |
 *           |
 *
 * BOTTOM LEFT
 *
 *       |
 *       |
 *       ─────
 *
 * BOTTOM RIGHT
 *
 *           |
 *           |
 *       ─────
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

            horizontalStart =
                x - offset - length;

            horizontalEnd =
                x - offset;

            verticalStart =
                y + offset;

            verticalEnd =
                y + offset + length;

            break;


        case "TOP_RIGHT":

            horizontalStart =
                x + offset;

            horizontalEnd =
                x + offset + length;

            verticalStart =
                y + offset;

            verticalEnd =
                y + offset + length;

            break;


        case "BOTTOM_LEFT":

            horizontalStart =
                x - offset - length;

            horizontalEnd =
                x - offset;

            verticalStart =
                y - offset;

            verticalEnd =
                y - offset - length;

            break;


        case "BOTTOM_RIGHT":

            horizontalStart =
                x + offset;

            horizontalEnd =
                x + offset + length;

            verticalStart =
                y - offset;

            verticalEnd =
                y - offset - length;

            break;


        default:

            throw new Error(
                `Unsupported crop mark corner: ${corner}`
            );
    }


    /**
     * Horizontal stroke
     */

    page.drawLine({

        start: {
            x: horizontalStart,
            y
        },

        end: {
            x: horizontalEnd,
            y
        },

        thickness,

        color: rgb(
            0,
            0,
            0
        )
    });


    /**
     * Vertical stroke
     */

    page.drawLine({

        start: {
            x,
            y: verticalStart
        },

        end: {
            x,
            y: verticalEnd
        },

        thickness,

        color: rgb(
            0,
            0,
            0
        )
    });
};


/**
 * ============================================================
 * DRAW FOUR-SIDED CROP MARKS
 * ============================================================
 */

const drawPlacementCropMarks = ({
    page,
    placement,
    length,
    offset,
    thickness
}) => {

    const left =
        placement.x;

    const right =
        placement.x +
        placement.width;

    const bottom =
        placement.y;

    const top =
        placement.y +
        placement.height;


    /**
     * TOP LEFT
     */

    drawCornerCropMark({

        page,

        x: left,
        y: top,

        corner: "TOP_LEFT",

        length,
        offset,
        thickness
    });


    /**
     * TOP RIGHT
     */

    drawCornerCropMark({

        page,

        x: right,
        y: top,

        corner: "TOP_RIGHT",

        length,
        offset,
        thickness
    });


    /**
     * BOTTOM LEFT
     */

    drawCornerCropMark({

        page,

        x: left,
        y: bottom,

        corner: "BOTTOM_LEFT",

        length,
        offset,
        thickness
    });


    /**
     * BOTTOM RIGHT
     */

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
 * DRAW PRODUCTION MARKS
 * ============================================================
 */

const drawProductionMarks = ({
    page,
    placements = [],
    marks = {},
    cropMarks = {},
    jobInfo = null,
    font = null
}) => {

    /**
     * Master production-mark switch
     */

    if (
        marks?.enabled === false
    ) {
        return;
    }


    /**
     * Crop mark switch
     */

    const cropEnabled =
        cropMarks?.enabled ??
        marks?.crop ??
        true;


    if (
        cropEnabled &&
        placements.length > 0
    ) {

        const unit =
            cropMarks?.unit ||
            "mm";


        const length =
            toPoints(
                cropMarks?.length ?? 3,
                unit
            );


        const offset =
            toPoints(
                cropMarks?.offset ?? 2,
                unit
            );


        const thickness =
            Number(
                cropMarks?.thickness ?? 0.5
            );


        if (
            !Number.isFinite(length) ||
            length <= 0
        ) {
            throw new Error(
                "Crop mark length must be greater than zero."
            );
        }


        if (
            !Number.isFinite(offset) ||
            offset < 0
        ) {
            throw new Error(
                "Crop mark offset cannot be negative."
            );
        }


        /**
         * --------------------------------------------------------
         * EVERY PLACEMENT
         * --------------------------------------------------------
         */

        for (
            const placement
            of placements
        ) {

            drawPlacementCropMarks({

                page,

                placement,

                length,

                offset,

                thickness
            });
        }
    }


    /**
     * --------------------------------------------------------
     * JOB INFORMATION
     * --------------------------------------------------------
     */

    if (
        marks?.jobInfo &&
        jobInfo &&
        font
    ) {

        const text =
            typeof jobInfo === "string"
                ? jobInfo
                : JSON.stringify(
                    jobInfo
                );


        page.drawText(
            text,
            {
                x: 10,
                y: 10,
                size: 7,
                font
            }
        );
    }
};


export {
    drawProductionMarks
};