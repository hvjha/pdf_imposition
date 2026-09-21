import { PDFDocument, degrees } from "pdf-lib";

import {
    normalizeCropRectangle,
    rectangleToInches
} from "./crop.utils.js";

import {
    validateCropRectangle,
    isFullPageCrop
} from "./crop.validator.js";


/*
|--------------------------------------------------------------------------
| Rotation
|--------------------------------------------------------------------------
*/

const normalizeRotation = (rotation = 0) => {
    const value = Number(rotation);

    if (![0, 90, 180, 270].includes(value)) {
        throw new Error(
            `Unsupported crop rotation: ${rotation}. Use 0, 90, 180 or 270.`
        );
    }

    return value;
};


/*
|--------------------------------------------------------------------------
| Source dimensions
|--------------------------------------------------------------------------
*/

const getSourceDimensions = (pageAnalysis) => {
    const width =
        pageAnalysis?.source?.widthPt ??
        pageAnalysis?.mediaBox?.width ??
        pageAnalysis?.width;

    const height =
        pageAnalysis?.source?.heightPt ??
        pageAnalysis?.mediaBox?.height ??
        pageAnalysis?.height;

    if (
        !Number.isFinite(width) ||
        !Number.isFinite(height) ||
        width <= 0 ||
        height <= 0
    ) {
        throw new Error(
            "Unable to determine valid source page dimensions."
        );
    }

    return {
        width,
        height
    };
};


/*
|--------------------------------------------------------------------------
| PDF box
|--------------------------------------------------------------------------
*/

const getPageBox = (
    pageAnalysis,
    boxName
) => {
    const normalizedName =
        boxName.toLowerCase();

    return (
        pageAnalysis?.boxes?.[normalizedName] ??
        pageAnalysis?.[`${normalizedName}Box`] ??
        pageAnalysis?.[normalizedName] ??
        null
    );
};


/*
|--------------------------------------------------------------------------
| Determine crop rectangle
|--------------------------------------------------------------------------
*/

const determineCropRectangle = ({
    pageAnalysis,
    rule
}) => {
    if (!rule) {
        throw new Error(
            "Crop rule is required."
        );
    }

    const strategy =
        rule.strategy || "FULL_PAGE";

    /*
    |--------------------------------------------------------------------------
    | FULL PAGE
    |--------------------------------------------------------------------------
    */

    if (strategy === "FULL_PAGE") {
        const {
            width,
            height
        } = getSourceDimensions(
            pageAnalysis
        );

        return {
            x: 0,
            y: 0,
            width,
            height
        };
    }


    /*
    |--------------------------------------------------------------------------
    | EXPLICIT
    |--------------------------------------------------------------------------
    */

    if (strategy === "EXPLICIT") {
        if (!rule.rectangle) {
            throw new Error(
                "Explicit crop strategy requires rectangle."
            );
        }

        return normalizeCropRectangle(
            rule.rectangle
        );
    }


    /*
    |--------------------------------------------------------------------------
    | PDF BOX STRATEGIES
    |--------------------------------------------------------------------------
    */

    const boxMap = {
        TRIM_BOX: "trim",
        BLEED_BOX: "bleed",
        CROP_BOX: "crop",
        MEDIA_BOX: "media"
    };

    const boxName =
        boxMap[strategy];

    if (!boxName) {
        throw new Error(
            `Unsupported crop strategy: ${strategy}`
        );
    }

    const box =
        getPageBox(
            pageAnalysis,
            boxName
        );

    if (!box) {
        throw new Error(
            `${boxName} box is not available in PDF analysis.`
        );
    }

    return {
        x: box.x ?? 0,
        y: box.y ?? 0,
        width: box.width,
        height: box.height
    };
};


/*
|--------------------------------------------------------------------------
| Rotate coordinate system
|
| Converts a crop rectangle expressed in the rotated
| page coordinate system back to the original PDF
| coordinate system.
|--------------------------------------------------------------------------
*/

const mapRotatedRectangleToSource = ({
    rectangle,
    sourceWidth,
    sourceHeight,
    rotation
}) => {
    const {
        x,
        y,
        width,
        height
    } = rectangle;

    switch (rotation) {

        case 0:
            return {
                x,
                y,
                width,
                height
            };


        case 90:
            return {
                x: y,
                y: sourceHeight - x - width,
                width: height,
                height: width
            };


        case 180:
            return {
                x: sourceWidth - x - width,
                y: sourceHeight - y - height,
                width,
                height
            };


        case 270:
            return {
                x: sourceWidth - y - height,
                y: x,
                width: height,
                height: width
            };


        default:
            throw new Error(
                `Unsupported crop rotation: ${rotation}`
            );
    }
};


/*
|--------------------------------------------------------------------------
| Validate rotated crop
|--------------------------------------------------------------------------
*/

const validateRotatedCrop = ({
    rectangle,
    sourceWidth,
    sourceHeight,
    rotation
}) => {

    const effectiveWidth =
        rotation === 90 || rotation === 270
            ? sourceHeight
            : sourceWidth;

    const effectiveHeight =
        rotation === 90 || rotation === 270
            ? sourceWidth
            : sourceHeight;

    return validateCropRectangle(
        rectangle,
        effectiveWidth,
        effectiveHeight
    );
};


/*
|--------------------------------------------------------------------------
| Apply digital crop
|
| IMPORTANT:
|
| MediaBox is NEVER changed.
| Artwork is NEVER scaled.
| Artwork is NEVER compressed.
|
| CropBox defines the visible production area.
| TrimBox defines the finished trim area.
|--------------------------------------------------------------------------
*/

const applyDigitalCrop = ({
    page,
    cropRectangle,
    sourceRectangle,
    sourceWidth,
    sourceHeight,
    rotation,
    pageNumber
}) => {

    console.log(
        `[CROP ENGINE] Applying digital crop to page ${pageNumber}`,
        {
            requestedCrop: cropRectangle,
            sourceRectangle,
            sourceWidth,
            sourceHeight,
            rotation
        }
    );


    /*
    |--------------------------------------------------------------------------
    | Preserve original MediaBox
    |--------------------------------------------------------------------------
    */

    page.setMediaBox(
        0,
        0,
        sourceWidth,
        sourceHeight
    );


    /*
    |--------------------------------------------------------------------------
    | Set page rotation only when requested
    |--------------------------------------------------------------------------
    */

    page.setRotation(
        degrees(rotation)
    );


    /*
    |--------------------------------------------------------------------------
    | CropBox
    |--------------------------------------------------------------------------
    */

    page.setCropBox(
        sourceRectangle.x,
        sourceRectangle.y,
        sourceRectangle.width,
        sourceRectangle.height
    );


    /*
    |--------------------------------------------------------------------------
    | TrimBox
    |--------------------------------------------------------------------------
    */

    page.setTrimBox(
        sourceRectangle.x,
        sourceRectangle.y,
        sourceRectangle.width,
        sourceRectangle.height
    );


    /*
    |--------------------------------------------------------------------------
    | BleedBox
    |
    | Do not invent bleed.
    | Keep it equal to trim for an explicit
    | crop unless a future production bleed
    | rule is supplied.
    |--------------------------------------------------------------------------
    */

    page.setBleedBox(
        sourceRectangle.x,
        sourceRectangle.y,
        sourceRectangle.width,
        sourceRectangle.height
    );


    /*
    |--------------------------------------------------------------------------
    | ArtBox
    |
    | Preserve source artwork area.
    |--------------------------------------------------------------------------
    */

    page.setArtBox(
        0,
        0,
        sourceWidth,
        sourceHeight
    );


    console.log(
        `[CROP ENGINE] Page ${pageNumber}: digital crop applied`,
        {
            mediaBox: {
                width: sourceWidth,
                height: sourceHeight
            },
            cropBox: sourceRectangle,
            trimBox: sourceRectangle,
            rotation
        }
    );
};


/*
|--------------------------------------------------------------------------
| MAIN CROP ENGINE
|--------------------------------------------------------------------------
*/

const cropPdf = async ({
    pdfBuffer,
    analysis,
    rule
}) => {

    console.log(
        "\n----------------------------------------"
    );

    console.log(
        "[CROP ENGINE] Starting..."
    );


    /*
    |--------------------------------------------------------------------------
    | Validate input
    |--------------------------------------------------------------------------
    */

    if (!Buffer.isBuffer(pdfBuffer)) {
        throw new Error(
            "pdfBuffer must be a Buffer."
        );
    }

    if (pdfBuffer.length === 0) {
        throw new Error(
            "pdfBuffer is empty."
        );
    }

    if (!analysis) {
        throw new Error(
            "PDF analysis is required before cropping."
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Load PDF
    |--------------------------------------------------------------------------
    */

    const pdfDoc =
        await PDFDocument.load(
            pdfBuffer
        );

    const pages =
        pdfDoc.getPages();

    if (!pages.length) {
        throw new Error(
            "PDF contains no pages."
        );
    }


    const analyzedPages =
        analysis.pages || [];

    const croppedPages = [];


    /*
    |--------------------------------------------------------------------------
    | Process every page
    |--------------------------------------------------------------------------
    */

    for (
        let index = 0;
        index < pages.length;
        index++
    ) {

        const pageNumber =
            index + 1;

        const page =
            pages[index];

        const pageAnalysis =
            analyzedPages[index] || {};


        /*
        |--------------------------------------------------------------------------
        | Source dimensions
        |--------------------------------------------------------------------------
        */

        const {
            width: sourceWidth,
            height: sourceHeight
        } =
            getSourceDimensions(
                pageAnalysis
            );


        /*
        |--------------------------------------------------------------------------
        | Rotation
        |--------------------------------------------------------------------------
        */

        const rotation =
            normalizeRotation(
                rule?.rotation ?? 0
            );


        /*
        |--------------------------------------------------------------------------
        | Requested crop
        |--------------------------------------------------------------------------
        */

        const cropRectangle =
            determineCropRectangle({
                pageAnalysis,
                rule
            });


        console.log(
            `[CROP ENGINE] Page ${pageNumber}`,
            {
                sourceWidth,
                sourceHeight,
                rotation,
                cropRectangle
            }
        );


        /*
        |--------------------------------------------------------------------------
        | Validate against rotated dimensions
        |--------------------------------------------------------------------------
        */

        const validation =
            validateRotatedCrop({
                rectangle: cropRectangle,
                sourceWidth,
                sourceHeight,
                rotation
            });


        console.log(
            `[CROP ENGINE] Page ${pageNumber} validation:`,
            validation
        );


        if (!validation.valid) {

            const effectiveWidth =
                rotation === 90 || rotation === 270
                    ? sourceHeight
                    : sourceWidth;

            const effectiveHeight =
                rotation === 90 || rotation === 270
                    ? sourceWidth
                    : sourceHeight;

            throw new Error(
                `Invalid crop on page ${pageNumber}: ${
                    validation.errors.join("; ")
                } ` +
                `(effective page size: ${effectiveWidth.toFixed(2)} × ${effectiveHeight.toFixed(2)} pt, ` +
                `rotation: ${rotation}°). ` +
                `No scaling is applied.`
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Convert crop rectangle back to source coordinates
        |--------------------------------------------------------------------------
        */

        const sourceRectangle =
            mapRotatedRectangleToSource({
                rectangle: cropRectangle,
                sourceWidth,
                sourceHeight,
                rotation
            });


        /*
        |--------------------------------------------------------------------------
        | Final safety validation
        |--------------------------------------------------------------------------
        */

        const sourceValidation =
            validateCropRectangle(
                sourceRectangle,
                sourceWidth,
                sourceHeight
            );


        if (!sourceValidation.valid) {

            throw new Error(
                `Invalid mapped crop on page ${pageNumber}: ${
                    sourceValidation.errors.join("; ")
                }`
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Apply
        |--------------------------------------------------------------------------
        */

        applyDigitalCrop({
            page,
            cropRectangle,
            sourceRectangle,
            sourceWidth,
            sourceHeight,
            rotation,
            pageNumber
        });


        /*
        |--------------------------------------------------------------------------
        | Store result
        |--------------------------------------------------------------------------
        */

        const dimensions =
            rectangleToInches(
                cropRectangle
            );

        croppedPages.push({

            pageNumber,

            source: {
                width: sourceWidth,
                height: sourceHeight
            },

            crop: {
                x: cropRectangle.x,
                y: cropRectangle.y,
                width: cropRectangle.width,
                height: cropRectangle.height,

                widthInches:
                    dimensions.width,

                heightInches:
                    dimensions.height,

                rotation
            },

            sourceRectangle,

            outputMediaBox: {
                width: sourceWidth,
                height: sourceHeight
            },

            isFullPage:
                isFullPageCrop(
                    sourceRectangle,
                    sourceWidth,
                    sourceHeight
                )
        });
    }


    /*
    |--------------------------------------------------------------------------
    | Save
    |--------------------------------------------------------------------------
    */

    const outputBytes =
        await pdfDoc.save({
            useObjectStreams: true
        });

    const outputBuffer =
        Buffer.from(
            outputBytes
        );


    console.log(
        "[CROP ENGINE] Crop completed successfully."
    );


    return {

        buffer:
            outputBuffer,

        pageCount:
            pages.length,

        strategy:
            rule.strategy || "FULL_PAGE",

        rotation:
            normalizeRotation(
                rule?.rotation ?? 0
            ),

        pages:
            croppedPages
    };
};


export {
    cropPdf,
    determineCropRectangle
};