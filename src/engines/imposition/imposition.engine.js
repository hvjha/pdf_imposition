import {
    PDFDocument,
    degrees
} from "pdf-lib";

import {
    createPlacement,
    isPlacementInsideSheet
} from "./imposition.utils.js";

import {
    validateImpositionPlan
} from "./imposition.validator.js";

import {
    createSignature
} from "./signature/signature.engine.js";

import {
    createRepetitionPlan
} from "./repetition/repetition.engine.js";

import {
    normalizeImpositionConfig
} from "./imposition.config.js";

import {
    calculateImpositionGeometry
} from "./sheet/sheet.geometry.js";

import {
    drawProductionMarks
} from "../marks/marks.engine.js";


// =====================================================
// RESOLVE ORIENTATION
// =====================================================

const resolveOrientation = ({
    orientation,
    sourceWidth,
    sourceHeight
}) => {

    if (
        orientation === "PORTRAIT"
    ) {
        return "PORTRAIT";
    }

    if (
        orientation === "LANDSCAPE"
    ) {
        return "LANDSCAPE";
    }

    return (
        sourceWidth >= sourceHeight
            ? "LANDSCAPE"
            : "PORTRAIT"
    );
};


// =====================================================
// ROTATION-AWARE DRAW PARAMETERS
// =====================================================

const getDrawParameters = ({
    placement
}) => {

    const {
        x,
        y,
        width,
        height,
        rotation
    } = placement;


    switch (rotation) {

        case 0:

            return {
                x,
                y,
                rotation: 0
            };


        case 90:

            return {
                x,
                y:
                    y + height,
                rotation: 90
            };


        case 180:

            return {
                x:
                    x + width,
                y:
                    y + height,
                rotation: 180
            };


        case 270:

            return {
                x:
                    x + width,
                y,
                rotation: 270
            };


        default:

            throw new Error(
                `Unsupported rotation: ${rotation}`
            );
    }
};


// =====================================================
// GET SOURCE PAGE DIMENSIONS
// =====================================================

const getSourcePageDimensions = (
    sourcePdf
) => {

    if (
        sourcePdf.getPageCount() === 0
    ) {
        throw new Error(
            "Source PDF contains no pages."
        );
    }


    const sourcePage =
        sourcePdf.getPage(0);


    const size =
        sourcePage.getSize();


    return {
        width: size.width,
        height: size.height
    };
};


// =====================================================
// NORMALIZE SIGNATURE
// =====================================================
//
// Different signature implementations may return:
//
// 1. Array
//
// OR
//
// 2. { positions: [...] }
//
// This function makes the main engine tolerant
// of both formats.
//

const normalizeSignature = (
    signature
) => {

    if (
        Array.isArray(signature)
    ) {
        return signature;
    }


    if (
        signature &&
        Array.isArray(
            signature.positions
        )
    ) {
        return signature.positions;
    }


    if (
        signature &&
        Array.isArray(
            signature.pages
        )
    ) {
        return signature.pages;
    }


    throw new Error(
        "Invalid signature returned by signature engine. Expected an array or an object containing positions/pages."
    );
};


// =====================================================
// BUILD PLACEMENTS
// =====================================================

const buildPlacements = ({
    geometry,
    signature,
    pagesPerLayout,
    sourcePageCount
}) => {

    const placements = [];


    const positions =
        geometry.positions;


    const signatureAssignments =
        normalizeSignature(
            signature
        );


    signatureAssignments.forEach(
        (assignment, index) => {

            /*
             * Determine physical position.
             */

            const positionNumber =
                assignment.position ??
                assignment.positionNumber ??
                index + 1;


            const position =
                positions[
                    positionNumber - 1
                ];


            if (!position) {

                throw new Error(
                    `No geometry position found for signature position ${positionNumber}.`
                );
            }


            /*
             * Different signature implementations
             * may use different names.
             */

            const sourcePage =
                assignment.sourcePage ??
                assignment.pageNumber ??
                assignment.page ??
                null;


            /*
             * Blank page
             */

            if (
                sourcePage === null ||
                sourcePage === undefined
            ) {
                return;
            }


            /*
             * Validate source page
             */

            if (
                sourcePage < 1 ||
                sourcePage >
                    sourcePageCount
            ) {

                throw new Error(
                    `Signature references invalid source page ${sourcePage}.`
                );
            }


            /*
             * Rotation
             */

            const rotation =
                assignment.rotation ??
                0;


            /*
             * Create placement
             */

            placements.push(
                createPlacement({

                    pageNumber:
                        sourcePage,

                    x:
                        position.x,

                    y:
                        position.y,

                    width:
                        position.width,

                    height:
                        position.height,

                    rotation,

                    unit: "pt"
                })
            );
        }
    );


    if (
        placements.length >
        pagesPerLayout
    ) {

        throw new Error(
            "Generated placements exceed pages per layout."
        );
    }


    return placements;
};


// =====================================================
// IMPOSE PDF
// =====================================================

const impositionPdf = async ({
    pdfBuffer,
    config = {},
    jobInfo = null
}) => {

    if (!pdfBuffer) {

        throw new Error(
            "PDF buffer is required."
        );
    }


    // -------------------------------------------------
    // NORMALIZE CONFIG
    // -------------------------------------------------

    const normalizedConfig =
        normalizeImpositionConfig(
            config
        );


    // -------------------------------------------------
    // LOAD SOURCE PDF
    // -------------------------------------------------

    const sourcePdf =
        await PDFDocument.load(
            pdfBuffer
        );


    const sourcePageCount =
        sourcePdf.getPageCount();


    if (
        sourcePageCount === 0
    ) {

        throw new Error(
            "Source PDF contains no pages."
        );
    }


    // -------------------------------------------------
    // SOURCE DIMENSIONS
    // -------------------------------------------------

    const sourceDimensions =
        getSourcePageDimensions(
            sourcePdf
        );


    const sourceWidth =
        sourceDimensions.width;

    const sourceHeight =
        sourceDimensions.height;


    // -------------------------------------------------
    // ORIENTATION
    // -------------------------------------------------

    const orientation =
        resolveOrientation({

            orientation:
                normalizedConfig
                    .layout
                    .orientation,

            sourceWidth,
            sourceHeight
        });


    // -------------------------------------------------
    // GEOMETRY
    // -------------------------------------------------

    const geometry =
        calculateImpositionGeometry({

            config:
                normalizedConfig,

            sourceWidth,
            sourceHeight
        });


    // -------------------------------------------------
    // SIGNATURE
    // -------------------------------------------------

    const signature =
        createSignature({

            pagesPerLayout:
                normalizedConfig
                    .layout
                    .pagesPerLayout,

            bindingType:
                normalizedConfig
                    .binding
                    .type,

            orientation
        });


    // -------------------------------------------------
    // REPETITION
    // -------------------------------------------------

    const repetition =
        createRepetitionPlan({

            pagesPerLayout:
                normalizedConfig
                    .layout
                    .pagesPerLayout,

            quantity:
                normalizedConfig
                    .quantity
                    .copies
        });


    // -------------------------------------------------
    // CREATE OUTPUT PDF
    // -------------------------------------------------

    const outputPdf =
        await PDFDocument.create();


    // -------------------------------------------------
    // EMBED SOURCE PAGES
    // -------------------------------------------------

    const embeddedPages =
        await outputPdf.embedPages(
            sourcePdf.getPages()
        );


    // -------------------------------------------------
    // FONT
    // -------------------------------------------------

    let font = null;


    if (
        normalizedConfig
            .marks
            .jobInfo
    ) {

        font =
            await outputPdf.embedFont(
                "Helvetica"
            );
    }


    // -------------------------------------------------
    // GENERATED SHEETS
    // -------------------------------------------------

    const generatedSheets = [];


    for (
        const repetitionUnit
        of repetition.units
    ) {

        const outputPage =
            outputPdf.addPage([
                geometry.sheet.width,
                geometry.sheet.height
            ]);


        // -------------------------------------------------
        // BUILD PLACEMENTS
        // -------------------------------------------------

        const placements =
            buildPlacements({

                geometry,

                signature,

                pagesPerLayout:
                    normalizedConfig
                        .layout
                        .pagesPerLayout,

                sourcePageCount
            });


        // -------------------------------------------------
        // VALIDATE SHEET BOUNDS
        // -------------------------------------------------

        const invalidPlacements =
            placements.filter(
                (placement) =>
                    !isPlacementInsideSheet(
                        placement,
                        geometry.sheet
                    )
            );


        if (
            invalidPlacements.length > 0
        ) {

            throw new Error(
                `One or more placements are outside the sheet on repetition unit ${repetitionUnit.unitNumber}.`
            );
        }


        // -------------------------------------------------
        // DRAW PAGES
        // -------------------------------------------------

        for (
            const placement
            of placements
        ) {

            const embeddedPage =
                embeddedPages[
                    placement.pageNumber - 1
                ];


            if (!embeddedPage) {

                throw new Error(
                    `Unable to embed source page ${placement.pageNumber}.`
                );
            }


            const drawParameters =
                getDrawParameters({
                    placement
                });


            outputPage.drawPage(
                embeddedPage,
                {

                    x:
                        drawParameters.x,

                    y:
                        drawParameters.y,

                    width:
                        placement.width,

                    height:
                        placement.height,

                    rotate:
                        degrees(
                            drawParameters.rotation
                        )
                }
            );
        }


        // -------------------------------------------------
        // PRODUCTION MARKS
        // -------------------------------------------------

        drawProductionMarks({

            page:
                outputPage,

            placements,

            marks:
                normalizedConfig.marks,

            jobInfo:
                jobInfo ??
                normalizedConfig.jobInfo ??
                null,

            font
        });


        // -------------------------------------------------
        // STORE SHEET DATA
        // -------------------------------------------------

        generatedSheets.push({

            sheetNumber:
                repetitionUnit.unitNumber,

            quantity:
                repetitionUnit.quantity,

            isComplete:
                repetitionUnit.isComplete,

            isPartial:
                repetitionUnit.isPartial,

            placements
        });
    }


    // -------------------------------------------------
    // VALIDATE FIRST SHEET
    // -------------------------------------------------

    const plan = {

        sheet:
            geometry.sheet,

        placements:
            generatedSheets.length > 0
                ? generatedSheets[0]
                    .placements
                : []
    };


    validateImpositionPlan(
        plan
    );


    // -------------------------------------------------
    // SAVE
    // -------------------------------------------------

    // const outputBuffer =
    //     await outputPdf.save();

    const outputBytes =
    await outputPdf.save();

const outputBuffer =
    Buffer.from(outputBytes);
    // -------------------------------------------------
    // RETURN
    // -------------------------------------------------

    return {

        outputBuffer,

        config:
            normalizedConfig,

        source: {

            pageCount:
                sourcePageCount,

            width:
                sourceWidth,

            height:
                sourceHeight
        },

        orientation,

        geometry,

        signature,

        repetition,

        sheets:
            generatedSheets
    };
};


export {
    impositionPdf
};