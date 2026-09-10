import { rgb } from "pdf-lib";


/**
 * Convert measurement to PDF points
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

    switch (unit) {
        case "mm":
            return value * (72 / 25.4);

        case "inch":
            return value * 72;

        case "pt":
            return value;

        default:
            throw new Error(
                `Unsupported unit: ${unit}`
            );
    }
};


/**
 * Draw crop marks around one imposed page
 *
 * x/y = artwork position
 * width/height = artwork dimensions
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


    /*
     * BOTTOM LEFT
     */

    // Horizontal
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

    // Vertical
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


    /*
     * BOTTOM RIGHT
     */

    // Horizontal
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

    // Vertical
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


    /*
     * TOP LEFT
     */

    // Horizontal
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

    // Vertical
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


    /*
     * TOP RIGHT
     */

    // Horizontal
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

    // Vertical
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
 * Draw registration mark
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
 * Draw color bar
 *
 * This is a basic CMYK-style production bar.
 * Later we can make it configurable and Preps-like.
 */
const drawColorBar = ({
    page,
    x,
    y,
    width = 120,
    height = 10
}) => {

    const colors = [
        rgb(0, 1, 1), // Cyan
        rgb(1, 0, 1), // Magenta
        rgb(1, 1, 0), // Yellow
        rgb(0, 0, 0)  // Black
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
 * Draw job information
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
 * Draw all production marks
 */
const drawProductionMarks = ({
    page,
    placements = [],
    marks = {},
    jobInfo = null,
    font = null
}) => {

    /*
     * Marks disabled
     */
    if (
        marks.enabled === false
    ) {
        return;
    }


    /*
     * CROP MARKS
     */
    if (
        marks.crop
    ) {

        placements.forEach(
            (placement) => {

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
                        marks.cropMarkLength ??
                        3,

                    offset:
                        marks.cropMarkOffset ??
                        2,

                    unit:
                        marks.unit ??
                        "mm"
                });

            }
        );
    }


    /*
     * No placements
     */
    if (
        placements.length === 0
    ) {
        return;
    }


    /*
     * First placement
     */
    const first =
        placements[0];


    /*
     * REGISTRATION MARK
     */
    if (
        marks.registration
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


    /*
     * COLOR BAR
     */
    if (
        marks.colorBar
    ) {

        drawColorBar({
            page,

            x:
                first.x,

            y:
                first.y - 30
        });

    }


    /*
     * JOB INFORMATION
     */
    if (
        marks.jobInfo &&
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


export {
    toPoints,
    drawCropMarks,
    drawRegistrationMark,
    drawColorBar,
    drawJobInfo,
    drawProductionMarks
};