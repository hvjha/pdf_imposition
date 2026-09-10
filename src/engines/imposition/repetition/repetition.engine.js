const calculateLayoutUnits = ({
    pagesPerLayout,
    quantity
}) => {

    if (
        !Number.isInteger(pagesPerLayout) ||
        ![2, 4, 8, 16].includes(pagesPerLayout)
    ) {
        throw new Error(
            "pagesPerLayout must be 2, 4, 8 or 16."
        );
    }


    if (
        !Number.isInteger(quantity) ||
        quantity <= 0
    ) {
        throw new Error(
            "Quantity must be a positive integer."
        );
    }


    const completeUnits =
        Math.floor(
            quantity / pagesPerLayout
        );


    const remainder =
        quantity % pagesPerLayout;


    const layoutUnits =
        Math.ceil(
            quantity / pagesPerLayout
        );


    return {

        quantity,

        pagesPerLayout,

        layoutUnits,

        completeUnits,

        remainder,

        hasPartialUnit:
            remainder !== 0,

        finalUnitQuantity:
            remainder === 0
                ? pagesPerLayout
                : remainder

    };

};


const createRepetitionPlan = ({
    pagesPerLayout,
    quantity
}) => {

    const calculation =
        calculateLayoutUnits({
            pagesPerLayout,
            quantity
        });


    const units = [];


    for (
        let unitNumber = 1;
        unitNumber <=
            calculation.layoutUnits;
        unitNumber++
    ) {

        const isFinalUnit =
            unitNumber ===
            calculation.layoutUnits;


        const unitQuantity =
            isFinalUnit
                ? calculation.finalUnitQuantity
                : pagesPerLayout;


        units.push({

            unitNumber,

            quantity:
                unitQuantity,

            isComplete:
                unitQuantity ===
                pagesPerLayout,

            isPartial:
                unitQuantity !==
                pagesPerLayout

        });

    }


    return {

        ...calculation,

        units

    };

};


export {
    calculateLayoutUnits,
    createRepetitionPlan
};