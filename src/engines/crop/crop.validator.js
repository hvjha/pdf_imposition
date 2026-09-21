const EPSILON = 0.01;

const approximatelyEqual = (a, b) => {
    return Math.abs(a - b) <= EPSILON;
};

const validateCropRectangle = (
    crop,
    sourceWidth,
    sourceHeight
) => {
    const errors = [];

    if (!crop) {
        errors.push("Crop rectangle is required.");

        return {
            valid: false,
            errors
        };
    }

    if (
        !Number.isFinite(crop.x) ||
        !Number.isFinite(crop.y) ||
        !Number.isFinite(crop.width) ||
        !Number.isFinite(crop.height)
    ) {
        errors.push(
            "Crop x, y, width and height must be finite numbers."
        );

        return {
            valid: false,
            errors
        };
    }

    if (
        !Number.isFinite(sourceWidth) ||
        !Number.isFinite(sourceHeight) ||
        sourceWidth <= 0 ||
        sourceHeight <= 0
    ) {
        errors.push(
            "Source page dimensions must be valid positive numbers."
        );

        return {
            valid: false,
            errors
        };
    }

    if (crop.width <= 0) {
        errors.push(
            "Crop width must be greater than zero."
        );
    }

    if (crop.height <= 0) {
        errors.push(
            "Crop height must be greater than zero."
        );
    }

    if (crop.x < -EPSILON) {
        errors.push(
            "Crop X cannot be negative."
        );
    }

    if (crop.y < -EPSILON) {
        errors.push(
            "Crop Y cannot be negative."
        );
    }

    if (
        crop.x + crop.width >
        sourceWidth + EPSILON
    ) {
        errors.push(
            "Crop area exceeds source page width."
        );
    }

    if (
        crop.y + crop.height >
        sourceHeight + EPSILON
    ) {
        errors.push(
            "Crop area exceeds source page height."
        );
    }

    return {
        valid: errors.length === 0,
        errors
    };
};

const isFullPageCrop = (
    crop,
    sourceWidth,
    sourceHeight
) => {
    return (
        approximatelyEqual(crop.x, 0) &&
        approximatelyEqual(crop.y, 0) &&
        approximatelyEqual(crop.width, sourceWidth) &&
        approximatelyEqual(crop.height, sourceHeight)
    );
};

export {
    validateCropRectangle,
    isFullPageCrop
};