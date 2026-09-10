const get16UpLayout = ({
    pageWidth,
    pageHeight,
    sheetWidth,
    sheetHeight
}) => {

    const columns = 4;
    const rows = 4;

    const requiredWidth =
        pageWidth * columns;

    const requiredHeight =
        pageHeight * rows;


    if (
        requiredWidth > sheetWidth ||
        requiredHeight > sheetHeight
    ) {

        throw new Error(
            "16-up layout does not fit on the selected sheet."
        );

    }


    const startX =
        (sheetWidth - requiredWidth) / 2;

    const startY =
        (sheetHeight - requiredHeight) / 2;


    const placements = [];


    for (let row = 0; row < rows; row++) {

        for (
            let column = 0;
            column < columns;
            column++
        ) {

            placements.push({

                position:
                    row * columns +
                    column +
                    1,

                x:
                    startX +
                    column * pageWidth,

                y:
                    startY +
                    (rows - 1 - row) *
                    pageHeight,

                width:
                    pageWidth,

                height:
                    pageHeight,

                rotation:
                    0

            });

        }

    }


    return placements;
};


export {
    get16UpLayout
};