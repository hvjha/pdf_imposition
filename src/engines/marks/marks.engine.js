import { rgb } from "pdf-lib";


/**
 * ============================================================
 * MEASUREMENT CONVERSION
 * ============================================================
 */

const toPoints = (value, unit = "mm") => {

    if (
        typeof value !== "number" ||
        !Number.isFinite(value)
    ) {
        throw new Error(
            `Invalid measurement value: ${value}`
        );
    }

    switch (
        String(unit).toLowerCase()
    ) {

        case "mm":
            return value * (72 / 25.4);

        case "inch":
        case "in":
            return value * 72;

        case "pt":
        case "point":
        case "points":
            return value;

        default:
            throw new Error(
                `Unsupported unit: ${unit}`
            );
    }
};


/**
 * ============================================================
 * CROP MARKS
 * ============================================================
 *
 * Draws four corner crop marks around an imposed page.
 *
 * x/y       = artwork position
 * width     = artwork width
 * height    = artwork height
 * length    = crop mark length
 * offset    = distance from artwork edge
 */

const drawCropMarks = ({
    page,
    x,
    y,
    width,
    height,
    length = 3,
    offset = 2,
    unit = "mm",
    thickness = 0.5
}) => {

    const lengthPt =
        toPoints(length, unit);

    const offsetPt =
        toPoints(offset, unit);


    const left =
        x - offsetPt;

    const right =
        x + width + offsetPt;

    const bottom =
        y - offsetPt;

    const top =
        y + height + offsetPt;


    /**
     * --------------------------------------------------------
     * BOTTOM LEFT
     * --------------------------------------------------------
     */

    page.drawLine({
        start: {
            x: left - lengthPt,
            y: bottom
        },
        end: {
            x: left,
            y: bottom
        },
        thickness
    });

    page.drawLine({
        start: {
            x: left,
            y: bottom - lengthPt
        },
        end: {
            x: left,
            y: bottom
        },
        thickness
    });


    /**
     * --------------------------------------------------------
     * BOTTOM RIGHT
     * --------------------------------------------------------
     */

    page.drawLine({
        start: {
            x: right,
            y: bottom
        },
        end: {
            x: right + lengthPt,
            y: bottom
        },
        thickness
    });

    page.drawLine({
        start: {
            x: right,
            y: bottom - lengthPt
        },
        end: {
            x: right,
            y: bottom
        },
        thickness
    });


    /**
     * --------------------------------------------------------
     * TOP LEFT
     * --------------------------------------------------------
     */

    page.drawLine({
        start: {
            x: left - lengthPt,
            y: top
        },
        end: {
            x: left,
            y: top
        },
        thickness
    });

    page.drawLine({
        start: {
            x: left,
            y: top
        },
        end: {
            x: left,
            y: top + lengthPt
        },
        thickness
    });


    /**
     * --------------------------------------------------------
     * TOP RIGHT
     * --------------------------------------------------------
     */

    page.drawLine({
        start: {
            x: right,
            y: top
        },
        end: {
            x: right + lengthPt,
            y: top
        },
        thickness
    });

    page.drawLine({
        start: {
            x: right,
            y: top
        },
        end: {
            x: right,
            y: top + lengthPt
        },
        thickness
    });
};


/**
 * ============================================================
 * REGISTRATION MARK
 * ============================================================
 */

const drawRegistrationMark = ({
    page,
    x,
    y,
    radius = 4,
    thickness = 0.5
}) => {

    page.drawCircle({
        x,
        y,
        size: radius,
        borderWidth: thickness
    });


    page.drawLine({
        start: {
            x: x - radius * 1.5,
            y
        },
        end: {
            x: x + radius * 1.5,
            y
        },
        thickness
    });


    page.drawLine({
        start: {
            x,
            y: y - radius * 1.5
        },
        end: {
            x,
            y: y + radius * 1.5
        },
        thickness
    });
};


/**
 * ============================================================
 * COLOR BAR
 * ============================================================
 */

const drawColorBar = ({
    page,
    x,
    y,
    width = 120,
    height = 10
}) => {

    const colors = [

        rgb(0, 1, 1),       // Cyan

        rgb(1, 0, 1),       // Magenta

        rgb(1, 1, 0),       // Yellow

        rgb(0, 0, 0)        // Black

    ];


    const cellWidth =
        width / colors.length;


    colors.forEach(
        (color, index) => {

            page.drawRectangle({

                x:
                    x +
                    index *
                    cellWidth,

                y,

                width:
                    cellWidth,

                height,

                color
            });

        }
    );
};


/**
 * ============================================================
 * JOB INFORMATION
 * ============================================================
 */

const drawJobInfo = ({
    page,
    text,
    x,
    y,
    font,
    size = 7
}) => {

    if (
        !text ||
        !font
    ) {
        return;
    }


    page.drawText(
        String(text),
        {
            x,
            y,
            size,
            font
        }
    );
};


/**
 * ============================================================
 * PRODUCTION MARKS
 * ============================================================
 *
 * Compatible with Phase 5 config:
 *
 * marks:
 * {
 *     enabled: true,
 *     crop: true,
 *     registration: true,
 *     colorBar: true,
 *     jobInfo: false
 * }
 *
 * cropMarks:
 * {
 *     enabled: true,
 *     length: 3,
 *     offset: 2,
 *     unit: "mm"
 * }
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
     * --------------------------------------------------------
     * NORMALIZE OBJECTS
     * --------------------------------------------------------
     *
     * Prevent:
     *
     * Cannot read properties of undefined
     *
     * when optional configuration is missing.
     */

    const normalizedMarks =
        marks || {};

    const normalizedCropMarks =
        cropMarks || {};


    /**
     * --------------------------------------------------------
     * MARKS DISABLED
     * --------------------------------------------------------
     */

    if (
        normalizedMarks.enabled === false
    ) {
        return;
    }


    /**
     * --------------------------------------------------------
     * CROP MARKS
     * --------------------------------------------------------
     */

    const cropMarksEnabled =
        normalizedCropMarks.enabled !== false &&
        normalizedMarks.crop !== false;


    if (
        cropMarksEnabled
    ) {

        placements.forEach(
            (placement) => {

                if (!placement) {
                    return;
                }


                drawCropMarks({

                    page,

                    x:
                        placement.x,

                    y:
                        placement.y,

                    width:
                        placement.width,

                    height:
                        placement.height,

                    length:
                        normalizedCropMarks.length ??
                        3,

                    offset:
                        normalizedCropMarks.offset ??
                        2,

                    unit:
                        normalizedCropMarks.unit ??
                        "mm"
                });

            }
        );
    }


    /**
     * --------------------------------------------------------
     * NO PLACEMENTS
     * --------------------------------------------------------
     */

    if (
        placements.length === 0
    ) {
        return;
    }


    /**
     * --------------------------------------------------------
     * FIRST PLACEMENT
     * --------------------------------------------------------
     */

    const first =
        placements[0];


    if (!first) {
        return;
    }


    /**
     * --------------------------------------------------------
     * REGISTRATION MARK
     * --------------------------------------------------------
     */

    if (
        normalizedMarks.registration === true
    ) {

        drawRegistrationMark({

            page,

            x:
                first.x - 15,

            y:
                first.y +
                first.height / 2
        });
    }


    /**
     * --------------------------------------------------------
     * COLOR BAR
     * --------------------------------------------------------
     */

    if (
        normalizedMarks.colorBar === true
    ) {

        drawColorBar({

            page,

            x:
                first.x,

            y:
                first.y - 30
        });
    }


    /**
     * --------------------------------------------------------
     * JOB INFORMATION
     * --------------------------------------------------------
     */

    if (
        normalizedMarks.jobInfo === true &&
        jobInfo &&
        font
    ) {

        drawJobInfo({

            page,

            text:
                jobInfo,

            x: 20,

            y: 10,

            font
        });
    }
};


/**
 * ============================================================
 * EXPORTS
 * ============================================================
 */

export {
    toPoints,
    drawCropMarks,
    drawRegistrationMark,
    drawColorBar,
    drawJobInfo,
    drawProductionMarks
};