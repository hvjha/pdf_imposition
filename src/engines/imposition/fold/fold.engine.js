import {
    getFoldPattern
} from "./fold.patterns.js";


/* ============================================================
 * RESOLVE PATTERN
 * ============================================================
 */

const resolveFoldPattern = ({
    pagesPerLayout,
    patternId = null
}) => {

    const pattern =
        getFoldPattern({
            pagesPerLayout,
            patternId
        });


    if (
        pattern.physicalMappingConfirmed === false
    ) {

        throw new Error(
            `Physical pagination for ${pattern.id} ` +
            `has not been confirmed yet.`
        );
    }


    return pattern;
};


/* ============================================================
 * VALIDATE PATTERN
 * ============================================================
 */

const validateFoldPattern = (
    pattern
) => {

    if (!pattern) {

        throw new Error(
            "Fold pattern is required."
        );
    }


    if (
        !Number.isInteger(
            pattern.columns
        ) ||
        pattern.columns <= 0
    ) {

        throw new Error(
            `${pattern.id}: invalid columns.`
        );
    }


    if (
        !Number.isInteger(
            pattern.rows
        ) ||
        pattern.rows <= 0
    ) {

        throw new Error(
            `${pattern.id}: invalid rows.`
        );
    }


    const expected =
        pattern.columns *
        pattern.rows;


    const front =
        Array.isArray(pattern.front)
            ? pattern.front.length
            : 0;


    const back =
        Array.isArray(pattern.back)
            ? pattern.back.length
            : 0;


    if (
        front + back !== expected
    ) {

        throw new Error(
            `${pattern.id}: expected ${expected} ` +
            `positions but found ${front + back}.`
        );
    }


    return true;
};


/* ============================================================
 * GET SIDE
 * ============================================================
 */

const getPatternSide = ({
    pattern,
    side = "front"
}) => {

    validateFoldPattern(
        pattern
    );


    const result =
        pattern[side];


    if (
        !Array.isArray(result)
    ) {

        throw new Error(
            `${pattern.id}: ${side} is invalid.`
        );
    }


    return result;
};


/* ============================================================
 * BUILD PHYSICAL PAGE POSITIONS
 * ============================================================
 *
 * IMPORTANT:
 *
 * This function DOES NOT calculate x/y.
 *
 * It only returns:
 *
 *   page
 *   row
 *   column
 *   rotation
 *
 * Physical x/y are calculated later from the actual PDF
 * dimensions.
 *
 * ============================================================
 */

const buildSidePlacements = ({
    pattern,
    side = "front"
}) => {

    const sidePattern =
        getPatternSide({
            pattern,
            side
        });


    return sidePattern.map(
        (entry, index) => {

            const row =
                Number.isInteger(
                    entry.row
                )
                    ? entry.row
                    : Math.floor(
                        index /
                        pattern.columns
                    );


            const column =
                Number.isInteger(
                    entry.column
                )
                    ? entry.column
                    : index %
                        pattern.columns;


            return {

                pageNumber:
                    Number(
                        entry.pageNumber
                    ),

                row,

                column,

                rotation:
                    Number(
                        entry.rotation || 0
                    )
            };
        }
    );
};


/* ============================================================
 * ROTATION TRANSFORM
 * ============================================================
 */

const transformRotation = ({
    rotation,
    angle
}) => {

    const result =
        (
            Number(rotation || 0) +
            Number(angle || 0)
        ) % 360;


    return (
        result < 0
            ? result + 360
            : result
    );
};


/* ============================================================
 * ROTATE PATTERN
 * ============================================================
 */

const rotatePattern = ({
    pattern,
    angle = 0
}) => {

    const normalized =
        (
            Number(angle) % 360 +
            360
        ) % 360;


    if (
        ![0, 90, 180, 270]
            .includes(normalized)
    ) {

        throw new Error(
            "Pattern rotation must be 0, 90, 180 or 270."
        );
    }


    if (
        normalized === 0
    ) {

        return pattern;
    }


    const oldColumns =
        pattern.columns;


    const oldRows =
        pattern.rows;


    const transformSide =
        side => {

            return side.map(
                entry => {

                    const row =
                        entry.row;


                    const column =
                        entry.column;


                    let newRow;
                    let newColumn;


                    switch (
                        normalized
                    ) {

                        case 90:

                            newRow =
                                column;

                            newColumn =
                                oldRows -
                                1 -
                                row;

                            break;


                        case 180:

                            newRow =
                                oldRows -
                                1 -
                                row;

                            newColumn =
                                oldColumns -
                                1 -
                                column;

                            break;


                        case 270:

                            newRow =
                                oldColumns -
                                1 -
                                column;

                            newColumn =
                                row;

                            break;
                    }


                    return {

                        pageNumber:
                            entry.pageNumber,

                        row:
                            newRow,

                        column:
                            newColumn,

                        rotation:
                            transformRotation({
                                rotation:
                                    entry.rotation,

                                angle:
                                    normalized
                            })
                    };
                }
            );
        };


    const newColumns =
        normalized === 90 ||
        normalized === 270
            ? oldRows
            : oldColumns;


    const newRows =
        normalized === 90 ||
        normalized === 270
            ? oldColumns
            : oldRows;


    const sortSide =
        side =>
            side
                .sort(
                    (a, b) => {

                        if (
                            a.row !== b.row
                        ) {

                            return (
                                a.row -
                                b.row
                            );
                        }


                        return (
                            a.column -
                            b.column
                        );
                    }
                );


    return {

        ...pattern,

        columns:
            newColumns,

        rows:
            newRows,

        front:
            sortSide(
                transformSide(
                    pattern.front
                )
            ),

        back:
            sortSide(
                transformSide(
                    pattern.back
                )
            )
    };
};


export {
    resolveFoldPattern,
    validateFoldPattern,
    getPatternSide,
    buildSidePlacements,
    rotatePattern
};