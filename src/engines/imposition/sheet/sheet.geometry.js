import {
    toPoints
} from "../imposition.utils.js";


// =====================================================
// CONVERT CONFIG VALUE TO POINTS
// =====================================================

const measurementToPoints = (
    value,
    unit = "pt"
) => {

    return toPoints(
        Number(value),
        unit
    );

};


// =====================================================
// GET SHEET GEOMETRY
// =====================================================

const calculateSheetGeometry = ({
    sheet,
    margins,
    bleed,
    gutter
}) => {

    const sheetWidth =
        measurementToPoints(
            sheet.width,
            sheet.unit
        );

    const sheetHeight =
        measurementToPoints(
            sheet.height,
            sheet.unit
        );


    const marginTop =
        measurementToPoints(
            margins.top,
            margins.unit
        );

    const marginRight =
        measurementToPoints(
            margins.right,
            margins.unit
        );

    const marginBottom =
        measurementToPoints(
            margins.bottom,
            margins.unit
        );

    const marginLeft =
        measurementToPoints(
            margins.left,
            margins.unit
        );


    const bleedTop =
        measurementToPoints(
            bleed.top,
            bleed.unit
        );

    const bleedRight =
        measurementToPoints(
            bleed.right,
            bleed.unit
        );

    const bleedBottom =
        measurementToPoints(
            bleed.bottom,
            bleed.unit
        );

    const bleedLeft =
        measurementToPoints(
            bleed.left,
            bleed.unit
        );


    const gutterHorizontal =
        measurementToPoints(
            gutter.horizontal,
            gutter.unit
        );

    const gutterVertical =
        measurementToPoints(
            gutter.vertical,
            gutter.unit
        );


    if (
        sheetWidth <= 0 ||
        sheetHeight <= 0
    ) {
        throw new Error(
            "Sheet width and height must be greater than zero."
        );
    }


    const usableX =
        marginLeft;

    const usableY =
        marginBottom;

    const usableWidth =
        sheetWidth -
        marginLeft -
        marginRight;

    const usableHeight =
        sheetHeight -
        marginTop -
        marginBottom;


    if (
        usableWidth <= 0 ||
        usableHeight <= 0
    ) {
        throw new Error(
            "Sheet margins leave no usable production area."
        );
    }


    return {

        sheet: {
            width: sheetWidth,
            height: sheetHeight
        },

        margins: {
            top: marginTop,
            right: marginRight,
            bottom: marginBottom,
            left: marginLeft
        },

        bleed: {
            top: bleedTop,
            right: bleedRight,
            bottom: bleedBottom,
            left: bleedLeft
        },

        gutter: {
            horizontal:
                gutterHorizontal,

            vertical:
                gutterVertical
        },

        usableArea: {
            x: usableX,
            y: usableY,
            width: usableWidth,
            height: usableHeight
        }
    };

};


// =====================================================
// GET GRID
// =====================================================

const calculateGrid = (
    pagesPerLayout
) => {

    switch (
        pagesPerLayout
    ) {

        case 2:

            return {
                columns: 2,
                rows: 1
            };


        case 4:

            return {
                columns: 2,
                rows: 2
            };


        case 8:

            return {
                columns: 4,
                rows: 2
            };


        case 16:

            return {
                columns: 4,
                rows: 4
            };


        default:

            throw new Error(
                "Supported layouts are 2, 4, 8 and 16."
            );
    }

};


// =====================================================
// CALCULATE PAGE SIZE FROM SOURCE PAGE
// =====================================================
//
// IMPORTANT:
//
// sourceWidth/sourceHeight = trim/artwork source size
//
// We preserve the source aspect ratio.
//
// The calculated page footprint is BLEED-INCLUSIVE.
//
// Example:
//
// source = 846 x 612 pt
// bleed  = 5 mm
//
// We calculate the largest proportional page that
// can fit into the selected grid.
//
// =====================================================

const calculatePageFootprint = ({
    geometry,
    pagesPerLayout,
    sourceWidth,
    sourceHeight,
    scale = 1
}) => {

    if (
        !Number.isFinite(
            sourceWidth
        ) ||
        !Number.isFinite(
            sourceHeight
        ) ||
        sourceWidth <= 0 ||
        sourceHeight <= 0
    ) {
        throw new Error(
            "Invalid source page dimensions."
        );
    }


    const {
        columns,
        rows
    } = calculateGrid(
        pagesPerLayout
    );


    const {
        width:
            usableWidth,

        height:
            usableHeight
    } = geometry.usableArea;


    const {
        horizontal:
            gutterHorizontal,

        vertical:
            gutterVertical
    } = geometry.gutter;


    const totalHorizontalGutter =
        gutterHorizontal *
        Math.max(
            columns - 1,
            0
        );


    const totalVerticalGutter =
        gutterVertical *
        Math.max(
            rows - 1,
            0
        );


    const availableWidth =
        usableWidth -
        totalHorizontalGutter;


    const availableHeight =
        usableHeight -
        totalVerticalGutter;


    if (
        availableWidth <= 0 ||
        availableHeight <= 0
    ) {
        throw new Error(
            "Gutter configuration leaves no usable page area."
        );
    }


    /*
     * Maximum cell size
     */
    const cellWidth =
        availableWidth /
        columns;

    const cellHeight =
        availableHeight /
        rows;


    /*
     * Preserve source aspect ratio
     */
    const sourceRatio =
        sourceWidth /
        sourceHeight;


    const cellRatio =
        cellWidth /
        cellHeight;


    let trimWidth;
    let trimHeight;


    if (
        sourceRatio >= cellRatio
    ) {

        trimWidth =
            cellWidth *
            scale;

        trimHeight =
            trimWidth /
            sourceRatio;

    } else {

        trimHeight =
            cellHeight *
            scale;

        trimWidth =
            trimHeight *
            sourceRatio;
    }


    /*
     * Bleed-inclusive footprint
     */
    const bleed =
        geometry.bleed;


    const bleedWidth =
        trimWidth +
        bleed.left +
        bleed.right;


    const bleedHeight =
        trimHeight +
        bleed.top +
        bleed.bottom;


    /*
     * Make sure bleed also fits inside
     * the calculated cell.
     */
    if (
        bleedWidth >
            cellWidth + 0.001 ||
        bleedHeight >
            cellHeight + 0.001
    ) {

        const bleedScaleX =
            cellWidth /
            bleedWidth;

        const bleedScaleY =
            cellHeight /
            bleedHeight;

        const correctionScale =
            Math.min(
                bleedScaleX,
                bleedScaleY
            );


        trimWidth *=
            correctionScale;

        trimHeight *=
            correctionScale;
    }


    const finalBleedWidth =
        trimWidth +
        bleed.left +
        bleed.right;

    const finalBleedHeight =
        trimHeight +
        bleed.top +
        bleed.bottom;


    return {

        columns,
        rows,

        cellWidth,
        cellHeight,

        availableWidth,
        availableHeight,

        totalHorizontalGutter,
        totalVerticalGutter,

        sourceWidth,
        sourceHeight,

        trimWidth,
        trimHeight,

        bleedWidth:
            finalBleedWidth,

        bleedHeight:
            finalBleedHeight,

        scale:
            trimWidth /
            sourceWidth
    };

};


// =====================================================
// CALCULATE ARTWORK FOOTPRINT
// =====================================================

const calculateArtworkFootprint = ({
    trimWidth,
    trimHeight,
    bleed
}) => {

    const bleedLeft =
        measurementToPoints(
            bleed.left,
            bleed.unit
        );

    const bleedRight =
        measurementToPoints(
            bleed.right,
            bleed.unit
        );

    const bleedTop =
        measurementToPoints(
            bleed.top,
            bleed.unit
        );

    const bleedBottom =
        measurementToPoints(
            bleed.bottom,
            bleed.unit
        );


    const bleedWidth =
        trimWidth +
        bleedLeft +
        bleedRight;

    const bleedHeight =
        trimHeight +
        bleedTop +
        bleedBottom;


    return {

        trimWidth,
        trimHeight,

        bleedWidth,
        bleedHeight,

        bleed: {

            left:
                bleedLeft,

            right:
                bleedRight,

            top:
                bleedTop,

            bottom:
                bleedBottom
        }
    };

};


// =====================================================
// CALCULATE FINAL POSITIONS
// =====================================================

const calculateGridPositions = ({
    geometry,
    trimWidth,
    trimHeight,
    pagesPerLayout
}) => {

    const {
        columns,
        rows
    } = calculateGrid(
        pagesPerLayout
    );


    const {
        usableArea
    } = geometry;


    const {
        horizontal:
            gutterHorizontal,

        vertical:
            gutterVertical
    } = geometry.gutter;


    const bleed =
        geometry.bleed;


    const bleedWidth =
        trimWidth +
        bleed.left +
        bleed.right;


    const bleedHeight =
        trimHeight +
        bleed.top +
        bleed.bottom;


    /*
     * Total grid size
     */
    const gridWidth =
        columns *
            bleedWidth +
        (columns - 1) *
            gutterHorizontal;


    const gridHeight =
        rows *
            bleedHeight +
        (rows - 1) *
            gutterVertical;


    /*
     * Center entire imposition
     * inside usable sheet area.
     */
    const startX =
        usableArea.x +
        (
            usableArea.width -
            gridWidth
        ) / 2;


    const startY =
        usableArea.y +
        (
            usableArea.height -
            gridHeight
        ) / 2;


    const positions = [];


    for (
        let row = 0;
        row < rows;
        row++
    ) {

        for (
            let column = 0;
            column < columns;
            column++
        ) {

            const bleedX =
                startX +
                column *
                (
                    bleedWidth +
                    gutterHorizontal
                );


            const bleedY =
                startY +
                (
                    rows -
                    1 -
                    row
                ) *
                (
                    bleedHeight +
                    gutterVertical
                );


            /*
             * x/y refer to TRIM position.
             */
            const x =
                bleedX +
                bleed.left;


            const y =
                bleedY +
                bleedBottomOffset(
                    geometry
                );


            positions.push({

                position:
                    positions.length + 1,

                x,
                y,

                width:
                    trimWidth,

                height:
                    trimHeight,

                bleedX,
                bleedY,

                bleedWidth,
                bleedHeight
            });
        }
    }


    return positions;

};


// =====================================================
// BLEED BOTTOM OFFSET
// =====================================================

const bleedBottomOffset = (
    geometry
) => {

    return geometry.bleed.bottom;

};


// =====================================================
// COMPLETE GEOMETRY CALCULATION
// =====================================================

const calculateImpositionGeometry = ({
    config,
    sourceWidth,
    sourceHeight
}) => {

    if (
        !Number.isFinite(
            sourceWidth
        ) ||
        !Number.isFinite(
            sourceHeight
        )
    ) {
        throw new Error(
            "Source page dimensions are required."
        );
    }


    const geometry =
        calculateSheetGeometry({

            sheet:
                config.sheet,

            margins:
                config.margins,

            bleed:
                config.bleed,

            gutter:
                config.gutter
        });


    const footprint =
        calculatePageFootprint({

            geometry,

            pagesPerLayout:
                config.layout
                    .pagesPerLayout,

            sourceWidth,
            sourceHeight
        });


    const artwork =
        calculateArtworkFootprint({

            trimWidth:
                footprint.trimWidth,

            trimHeight:
                footprint.trimHeight,

            bleed:
                config.bleed
        });


    const positions =
        calculateGridPositions({

            geometry,

            trimWidth:
                artwork.trimWidth,

            trimHeight:
                artwork.trimHeight,

            pagesPerLayout:
                config.layout
                    .pagesPerLayout
        });


    return {

        sheet:
            geometry.sheet,

        margins:
            geometry.margins,

        bleed:
            geometry.bleed,

        gutter:
            geometry.gutter,

        usableArea:
            geometry.usableArea,

        grid: {

            columns:
                footprint.columns,

            rows:
                footprint.rows
        },

        source: {

            width:
                sourceWidth,

            height:
                sourceHeight
        },

        scale:
            footprint.scale,

        cell: {

            width:
                footprint.cellWidth,

            height:
                footprint.cellHeight
        },

        footprint: {

            width:
                artwork.bleedWidth,

            height:
                artwork.bleedHeight
        },

        trim: {

            width:
                artwork.trimWidth,

            height:
                artwork.trimHeight
        },

        artwork,

        positions
    };

};


export {
    calculateSheetGeometry,
    calculateGrid,
    calculatePageFootprint,
    calculateArtworkFootprint,
    calculateGridPositions,
    calculateImpositionGeometry
};