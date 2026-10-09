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


const drawPlacedPage = ({
    outputPage,
    embeddedPage,
    placement
}) => {

    if (!outputPage) {
        throw new Error(
            "drawPlacedPage: outputPage is required."
        );
    }

    if (!embeddedPage) {
        throw new Error(
            "drawPlacedPage: embeddedPage is required."
        );
    }

    if (!placement) {
        throw new Error(
            "drawPlacedPage: placement is required."
        );
    }


    const rotation =
        normalizeRotation(
            placement.rotation
        );


    const sourceWidth =
        Number(embeddedPage.width);

    const sourceHeight =
        Number(embeddedPage.height);


    const targetWidth =
        Number(placement.width);

    const targetHeight =
        Number(placement.height);


    if (
        !Number.isFinite(sourceWidth) ||
        sourceWidth <= 0
    ) {
        throw new Error(
            `Invalid embedded page width: ${sourceWidth}`
        );
    }


    if (
        !Number.isFinite(sourceHeight) ||
        sourceHeight <= 0
    ) {
        throw new Error(
            `Invalid embedded page height: ${sourceHeight}`
        );
    }


    if (
        !Number.isFinite(targetWidth) ||
        targetWidth <= 0
    ) {
        throw new Error(
            `Invalid placement width: ${targetWidth}`
        );
    }


    if (
        !Number.isFinite(targetHeight) ||
        targetHeight <= 0
    ) {
        throw new Error(
            `Invalid placement height: ${targetHeight}`
        );
    }


    /*
     * Scale source PDF page to target placement.
     */

    const xScale =
        targetWidth / sourceWidth;

    const yScale =
        targetHeight / sourceHeight;


    /*
     * pdf-lib drawPage() rotates around
     * the supplied x/y origin.
     *
     * Therefore we compensate the origin
     * according to the requested rotation.
     */

    let x = Number(placement.x);
    let y = Number(placement.y);


    switch (rotation) {

        case 0:

            break;


        case 90:

            x += targetWidth;

            break;


        case 180:

            x += targetWidth;
            y += targetHeight;

            break;


        case 270:

            y += targetHeight;

            break;

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
            : workStyle?.type ||
            "SHEETWISE";


    switch (type) {

        case "SHEETWISE":

            return placements.map(
                placement => ({
                    ...placement
                })
            );


        case "WORK_AND_TURN":

            return placements.map(
                placement => ({
                    ...placement,

                    x:
                        sheetWidth -
                        placement.x -
                        placement.width,

                    rotation:
                        (
                            placement.rotation +
                            180
                        ) % 360
                })
            );


        case "WORK_AND_TUMBLE":

            return placements.map(
                placement => ({
                    ...placement,

                    y:
                        sheetHeight -
                        placement.y -
                        placement.height,

                    rotation:
                        (
                            placement.rotation +
                            180
                        ) % 360
                })
            );


        case "PERFECTOR":

            return placements.map(
                placement => ({
                    ...placement,

                    rotation:
                        (
                            placement.rotation +
                            180
                        ) % 360
                })
            );


        case "SINGLE_SIDED":

            return placements.map(
                placement => ({
                    ...placement
                })
            );


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