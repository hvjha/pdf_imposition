import { degrees } from "pdf-lib";


const normalizeRotation = (rotation = 0) => {
    const value = Number(rotation);

    if (![0, 90, 180, 270].includes(value)) {
        throw new Error(
            `Unsupported page rotation: ${rotation}`
        );
    }

    return value;
};


/**
 * Draw an embedded PDF page into its assigned placement.
 *
 * Uses the public PDFPage.drawPage() API.
 * Do NOT use the low-level pdf-lib drawPage operator here.
 */
const drawPlacedPage = ({
    outputPage,
    embeddedPage,
    placement
}) => {

    if (!outputPage) {
        throw new Error("drawPlacedPage: outputPage is required.");
    }

    if (!embeddedPage) {
        throw new Error("drawPlacedPage: embeddedPage is required.");
    }

    if (!placement) {
        throw new Error("drawPlacedPage: placement is required.");
    }

    const rotation = normalizeRotation(placement.rotation);

    const sourceWidth = Number(embeddedPage.width);
    const sourceHeight = Number(embeddedPage.height);

    if (!Number.isFinite(sourceWidth) || sourceWidth <= 0) {
        throw new Error(
            `Invalid embedded page width: ${embeddedPage.width}`
        );
    }

    if (!Number.isFinite(sourceHeight) || sourceHeight <= 0) {
        throw new Error(
            `Invalid embedded page height: ${embeddedPage.height}`
        );
    }

    const targetWidth = Number(placement.width);
    const targetHeight = Number(placement.height);

    if (!Number.isFinite(targetWidth) || targetWidth <= 0) {
        throw new Error(
            `Invalid placement width: ${placement.width}`
        );
    }

    if (!Number.isFinite(targetHeight) || targetHeight <= 0) {
        throw new Error(
            `Invalid placement height: ${placement.height}`
        );
    }

    const xScale = targetWidth / sourceWidth;
    const yScale = targetHeight / sourceHeight;


    /*
     * Rotation positioning
     *
     * For 0°:
     *   placement.x / placement.y are the lower-left coordinates.
     *
     * For 180°:
     *   compensate for rotation around the lower-left origin.
     *
     * For 90° / 270°:
     *   compensate for the rotated bounding box.
     */

    let x = placement.x;
    let y = placement.y;

    if (rotation === 180) {

        x = placement.x + targetWidth;
        y = placement.y + targetHeight;

    } else if (rotation === 90) {

        x = placement.x + targetWidth;
        y = placement.y;

    } else if (rotation === 270) {

        x = placement.x;
        y = placement.y + targetHeight;
    }


    outputPage.drawPage(
        embeddedPage,
        {
            x,
            y,
            xScale,
            yScale,
            rotate: degrees(rotation)
        }
    );
};


/**
 * Apply work style to the back side.
 */
const applyWorkStyle = ({
    placements,
    sheetWidth,
    sheetHeight,
    workStyle
}) => {

    if (!Array.isArray(placements)) {
        throw new Error(
            "applyWorkStyle: placements must be an array."
        );
    }

    const type =
        typeof workStyle === "string"
            ? workStyle
            : workStyle?.type || "SHEETWISE";


    switch (type) {

        case "SHEETWISE":

            return placements.map((placement) => ({
                ...placement
            }));


        case "WORK_AND_TURN":

            return placements.map((placement) => ({
                ...placement,

                x:
                    sheetWidth -
                    placement.x -
                    placement.width,

                rotation:
                    (placement.rotation + 180) % 360
            }));


        case "WORK_AND_TUMBLE":

            return placements.map((placement) => ({
                ...placement,

                y:
                    sheetHeight -
                    placement.y -
                    placement.height,

                rotation:
                    (placement.rotation + 180) % 360
            }));


        case "PERFECTOR":

            return placements.map((placement) => ({
                ...placement,

                rotation:
                    (placement.rotation + 180) % 360
            }));


        case "SINGLE_SIDED":

            return placements.map((placement) => ({
                ...placement
            }));


        default:

            throw new Error(
                `Unsupported work style: ${type}`
            );
    }
};


export {
    drawPlacedPage,
    applyWorkStyle
};