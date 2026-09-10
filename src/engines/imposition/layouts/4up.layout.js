const get4UpLayout = ({
    pageWidth,
    pageHeight,
    sheetWidth,
    sheetHeight
}) => {

    const requiredWidth =
        pageWidth * 2;

    const requiredHeight =
        pageHeight * 2;


    if (
        requiredWidth > sheetWidth ||
        requiredHeight > sheetHeight
    ) {

        throw new Error(
            "4-up layout does not fit on the selected sheet."
        );

    }


    const startX =
        (sheetWidth - requiredWidth) / 2;

    const startY =
        (sheetHeight - requiredHeight) / 2;


    return [

        {
            position: 1,
            x: startX,
            y: startY + pageHeight,
            width: pageWidth,
            height: pageHeight,
            rotation: 0
        },

        {
            position: 2,
            x: startX + pageWidth,
            y: startY + pageHeight,
            width: pageWidth,
            height: pageHeight,
            rotation: 0
        },

        {
            position: 3,
            x: startX,
            y: startY,
            width: pageWidth,
            height: pageHeight,
            rotation: 0
        },

        {
            position: 4,
            x: startX + pageWidth,
            y: startY,
            width: pageWidth,
            height: pageHeight,
            rotation: 0
        }

    ];
};


export {
    get4UpLayout
};