import { PDFDocument } from "pdf-lib";

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
| Get source page dimensions
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


    console.log(
        "[CROP ENGINE] Source dimensions:",
        {
            width,
            height
        }
    );


    if (
        typeof width !== "number" ||
        typeof height !== "number"
    ) {
        throw new Error(
            "Unable to determine source page dimensions."
        );
    }


    return {
        width,
        height
    };
};


/*
|--------------------------------------------------------------------------
| Get PDF box
|--------------------------------------------------------------------------
*/

const getPageBox = (
    pageAnalysis,
    boxName
) => {

    const normalizedName =
        boxName.toLowerCase();


    const box =
        pageAnalysis?.boxes?.[normalizedName] ??
        pageAnalysis?.[`${normalizedName}Box`] ??
        pageAnalysis?.[normalizedName] ??
        null;


    console.log(
        `[CROP ENGINE] ${boxName} box:`,
        box
    );


    return box;
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


    console.log(
        "[CROP ENGINE] Crop strategy:",
        strategy
    );


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


        const rectangle = {

            x: 0,

            y: 0,

            width,

            height
        };


        console.log(
            "[CROP ENGINE] FULL_PAGE rectangle:",
            rectangle
        );


        return rectangle;
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


        console.log(
            "[CROP ENGINE] Explicit rectangle input:",
            rule.rectangle
        );


        const rectangle =
            normalizeCropRectangle(
                rule.rectangle
            );


        console.log(
            "[CROP ENGINE] Explicit rectangle in points:",
            rectangle
        );


        return rectangle;
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
| Crop individual page
|--------------------------------------------------------------------------
*/

const cropPage = (
    page,
    cropRectangle,
    pageNumber
) => {

    const {
        x,
        y,
        width,
        height
    } = cropRectangle;


    console.log(
        `[CROP ENGINE] Page ${pageNumber} crop:`,
        {
            x,
            y,
            width,
            height
        }
    );


    /*
    |--------------------------------------------------------------------------
    | Translate artwork
    |--------------------------------------------------------------------------
    */

    if (x !== 0 || y !== 0) {

        console.log(
            `[CROP ENGINE] Page ${pageNumber}: translating content`,
            {
                translateX: -x,
                translateY: -y
            }
        );


        page.translateContent(
            -x,
            -y
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Set new page size
    |--------------------------------------------------------------------------
    */

    page.setMediaBox(
        0,
        0,
        width,
        height
    );


    page.setCropBox(
        0,
        0,
        width,
        height
    );


    page.setTrimBox(
        0,
        0,
        width,
        height
    );


    page.setBleedBox(
        0,
        0,
        width,
        height
    );


    page.setArtBox(
        0,
        0,
        width,
        height
    );


    console.log(
        `[CROP ENGINE] Page ${pageNumber}: new dimensions`,
        {
            width,
            height
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
    | Validate input buffer
    |--------------------------------------------------------------------------
    */

    console.log(
        "[CROP ENGINE] pdfBuffer type:",
        typeof pdfBuffer
    );


    console.log(
        "[CROP ENGINE] Is Buffer:",
        Buffer.isBuffer(pdfBuffer)
    );


    console.log(
        "[CROP ENGINE] Buffer length:",
        pdfBuffer?.length
    );


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


    /*
    |--------------------------------------------------------------------------
    | Validate analysis
    |--------------------------------------------------------------------------
    */

    if (!analysis) {

        throw new Error(
            "PDF analysis is required before cropping."
        );
    }


    console.log(
        "[CROP ENGINE] Analysis received."
    );


    console.log(
        "[CROP ENGINE] Analysis page count:",
        analysis.pageCount
    );


    console.log(
        "[CROP ENGINE] Analysis pages:",
        analysis.pages?.length
    );


    /*
    |--------------------------------------------------------------------------
    | Load PDF
    |--------------------------------------------------------------------------
    */

    console.log(
        "[CROP ENGINE] Loading PDF..."
    );


    const pdfDoc =
        await PDFDocument.load(
            pdfBuffer
        );


    console.log(
        "[CROP ENGINE] PDF loaded successfully."
    );


    /*
    |--------------------------------------------------------------------------
    | Get pages
    |--------------------------------------------------------------------------
    */

    const pages =
        pdfDoc.getPages();


    console.log(
        "[CROP ENGINE] PDF pages:",
        pages.length
    );


    if (!pages.length) {

        throw new Error(
            "PDF contains no pages."
        );
    }


    const analyzedPages =
        analysis.pages || [];


    /*
    |--------------------------------------------------------------------------
    | Check analyzer page count
    |--------------------------------------------------------------------------
    */

    if (
        analyzedPages.length !==
        pages.length
    ) {

        console.warn(
            "[CROP ENGINE] WARNING: Analyzer page count and PDF page count differ.",
            {
                analyzedPages:
                    analyzedPages.length,

                pdfPages:
                    pages.length
            }
        );
    }


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


        console.log(
            `\n[CROP ENGINE] Processing page ${pageNumber}/${pages.length}`
        );


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
        | Determine crop
        |--------------------------------------------------------------------------
        */

        const cropRectangle =
            determineCropRectangle({

                pageAnalysis,

                rule
            });


        /*
        |--------------------------------------------------------------------------
        | Validate crop
        |--------------------------------------------------------------------------
        */

        const validation =
            validateCropRectangle(

                cropRectangle,

                sourceWidth,

                sourceHeight
            );


        console.log(
            `[CROP ENGINE] Page ${pageNumber} validation:`,
            validation
        );


        if (!validation.valid) {

            throw new Error(
                `Invalid crop on page ${pageNumber}: ${
                    validation.errors.join("; ")
                }`
            );
        }


        /*
        |--------------------------------------------------------------------------
        | Apply crop
        |--------------------------------------------------------------------------
        */

        cropPage(

            page,

            cropRectangle,

            pageNumber
        );


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

                width:
                    sourceWidth,

                height:
                    sourceHeight
            },

            crop: {

                x:
                    cropRectangle.x,

                y:
                    cropRectangle.y,

                width:
                    cropRectangle.width,

                height:
                    cropRectangle.height,

                widthInches:
                    dimensions.width,

                heightInches:
                    dimensions.height
            },

            isFullPage:
                isFullPageCrop(

                    cropRectangle,

                    sourceWidth,

                    sourceHeight
                )
        });


        console.log(
            `[CROP ENGINE] Page ${pageNumber} completed.`
        );
    }


    /*
    |--------------------------------------------------------------------------
    | Save PDF
    |--------------------------------------------------------------------------
    */

    console.log(
        "\n[CROP ENGINE] Saving cropped PDF..."
    );


    const outputBytes =
        await pdfDoc.save({

            useObjectStreams: true
        });


    const outputBuffer =
        Buffer.from(
            outputBytes
        );


    console.log(
        "[CROP ENGINE] Output PDF created."
    );


    console.log(
        "[CROP ENGINE] Output buffer:",
        outputBuffer.length,
        "bytes"
    );


    console.log(
        "[CROP ENGINE] Crop completed successfully."
    );


    console.log(
        "----------------------------------------\n"
    );


    return {

        buffer:
            outputBuffer,

        pageCount:
            pages.length,

        strategy:
            rule.strategy || "FULL_PAGE",

        pages:
            croppedPages
    };
};


export {
    cropPdf,
    determineCropRectangle
};