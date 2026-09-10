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


    /*
     * AUTO
     */
    return (
        sourceWidth >= sourceHeight
            ? "LANDSCAPE"
            : "PORTRAIT"
    );
};


// =====================================================
// CREATE ROTATION-AWARE DRAW PARAMETERS
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


    /*
     * pdf-lib rotates around the supplied
     * drawing origin.
     *
     * We compensate the origin so that
     * the complete artwork remains inside
     * the intended placement box.
     */

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
// GET SOURCE PAGE
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


    /*
     * Signature positions:
     *
     * position
     * sourcePage
     * rotation
     */

    signature.forEach(
        (assignment) => {

            const position =
                positions[
                    assignment.position - 1
                ];


            if (!position) {
                throw new Error(
                    `No geometry position found for signature position ${assignment.position}.`
                );
            }


            const sourcePage =
                assignment.sourcePage;


            /*
             * Blank position
             */
            if (
                sourcePage === null ||
                sourcePage === undefined
            ) {
                return;
            }


            /*
             * Source page must exist
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

                    rotation:
                        assignment.rotation ??
                        0,

                    unit: "pt"
                })
            );
        }
    );


    /*
     * Safety check
     */
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
    // Normalize configuration
    // -------------------------------------------------

    const normalizedConfig =
        normalizeImpositionConfig(
            config
        );


    // -------------------------------------------------
    // Load source PDF
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
    // Source page dimensions
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
    // Orientation
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
    // Calculate production geometry
    // -------------------------------------------------

    const geometry =
        calculateImpositionGeometry({

            config:
                normalizedConfig,

            sourceWidth,
            sourceHeight
        });


    // -------------------------------------------------
    // Create signature
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
    // Repetition
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
    // Create output PDF
    // -------------------------------------------------

    const outputPdf =
        await PDFDocument.create();


    // -------------------------------------------------
    // Embed source pages
    // -------------------------------------------------

    const embeddedPages =
        await outputPdf.embedPages(
            sourcePdf
                .getPages()
        );


    // -------------------------------------------------
    // Fonts
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
    // Create one imposed sheet per repetition unit
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


        /*
         * Build placements for this sheet.
         *
         * At this stage the signature represents
         * one layout unit.
         */

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
        // Validate placements
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
        // Draw source pages
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
        // Production marks
        // -------------------------------------------------

        drawProductionMarks({

            page:
                outputPage,

            placements,

            marks:
                normalizedConfig.marks,

            jobInfo:
                jobInfo ??
                normalizedConfig
                    .jobInfo ??
                null,

            font
        });


        // -------------------------------------------------
        // Store sheet information
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
    // Validate complete plan
    // -------------------------------------------------

    const plan = {

        sheet: geometry.sheet,

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
    // Save output
    // -------------------------------------------------

    const outputBuffer =
        await outputPdf.save();


    // -------------------------------------------------
    // Return production information
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