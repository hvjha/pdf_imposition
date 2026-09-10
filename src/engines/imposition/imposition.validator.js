const EPSILON = 0.01;

const SUPPORTED_ROTATIONS = [0, 90, 180, 270];

const validateSheet = (sheet) => {
    const errors = [];

    if (!sheet) {
        errors.push("Sheet configuration is required.");
        return {
            valid: false,
            errors
        };
    }

    if (
        typeof sheet.width !== "number" ||
        typeof sheet.height !== "number"
    ) {
        errors.push(
            "Sheet width and height must be numbers."
        );
    }

    if (sheet.width <= 0) {
        errors.push(
            "Sheet width must be greater than zero."
        );
    }

    if (sheet.height <= 0) {
        errors.push(
            "Sheet height must be greater than zero."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const validatePlacement = (
    placement,
    sourcePageCount,
    sheet
) => {
    const errors = [];

    if (!placement) {
        errors.push(
            "Page placement is required."
        );

        return {
            valid: false,
            errors
        };
    }

    if (
        !Number.isInteger(
            placement.pageNumber
        )
    ) {
        errors.push(
            "Page number must be an integer."
        );
    } else if (
        placement.pageNumber < 1 ||
        placement.pageNumber > sourcePageCount
    ) {
        errors.push(
            `Page ${placement.pageNumber} does not exist in the source PDF.`
        );
    }

    if (
        !SUPPORTED_ROTATIONS.includes(
            placement.rotation
        )
    ) {
        errors.push(
            "Rotation must be 0, 90, 180 or 270 degrees."
        );
    }

    if (
        typeof placement.x !== "number" ||
        typeof placement.y !== "number" ||
        typeof placement.width !== "number" ||
        typeof placement.height !== "number"
    ) {
        errors.push(
            "Placement x, y, width and height must be numbers."
        );

        return {
            valid: false,
            errors
        };
    }

    if (placement.width <= 0) {
        errors.push(
            "Placement width must be greater than zero."
        );
    }

    if (placement.height <= 0) {
        errors.push(
            "Placement height must be greater than zero."
        );
    }

    if (placement.x < 0) {
        errors.push(
            "Placement X cannot be negative."
        );
    }

    if (placement.y < 0) {
        errors.push(
            "Placement Y cannot be negative."
        );
    }

    if (
        sheet &&
        placement.x + placement.width >
            sheet.width + EPSILON
    ) {
        errors.push(
            `Page ${placement.pageNumber} exceeds sheet width.`
        );
    }

    if (
        sheet &&
        placement.y + placement.height >
            sheet.height + EPSILON
    ) {
        errors.push(
            `Page ${placement.pageNumber} exceeds sheet height.`
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const validateImpositionPlan = ({
    placements,
    sourcePageCount,
    sheet
}) => {
    const errors = [];

    const sheetValidation =
        validateSheet(sheet);

    if (!sheetValidation.valid) {
        errors.push(
            ...sheetValidation.errors
        );
    }

    if (
        !Array.isArray(placements) ||
        placements.length === 0
    ) {
        errors.push(
            "At least one page placement is required."
        );

        return {
            valid: false,
            errors
        };
    }

    const usedPages = new Set();

    placements.forEach((placement) => {
        const validation =
            validatePlacement(
                placement,
                sourcePageCount,
                sheet
            );

        if (!validation.valid) {
            errors.push(
                ...validation.errors
            );
        }

        if (
            Number.isInteger(
                placement.pageNumber
            )
        ) {
            if (
                usedPages.has(
                    placement.pageNumber
                )
            ) {
                errors.push(
                    `Source page ${placement.pageNumber} is used more than once.`
                );
            }

            usedPages.add(
                placement.pageNumber
            );
        }
    });

    return {
        valid: errors.length === 0,
        errors
    };
};

export {
    SUPPORTED_ROTATIONS,
    validateSheet,
    validatePlacement,
    validateImpositionPlan
};