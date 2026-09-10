const get2UpLayout = ({
    pageWidth,
    pageHeight,
    sheetWidth,
    sheetHeight
}) => {

    const horizontal =
        pageWidth * 2 <= sheetWidth;

    const vertical =
        pageHeight * 2 <= sheetHeight;


    if (!horizontal && !vertical) {
        throw new Error(
            "2-up layout does not fit on the selected sheet."
        );
    }


    if (horizontal) {

        const y =
            (sheetHeight - pageHeight) / 2;

        return [
            {
                position: 1,
                x: 0,
                y,
                width: pageWidth,
                height: pageHeight,
                rotation: 0
            },
            {
                position: 2,
                x: pageWidth,
                y,
                width: pageWidth,
                height: pageHeight,
                rotation: 0
            }
        ];
    }


    const x =
        (sheetWidth - pageWidth) / 2;

    return [
        {
            position: 1,
            x,
            y: 0,
            width: pageWidth,
            height: pageHeight,
            rotation: 0
        },
        {
            position: 2,
            x,
            y: pageHeight,
            width: pageWidth,
            height: pageHeight,
            rotation: 0
        }
    ];
};


export {
    get2UpLayout
};