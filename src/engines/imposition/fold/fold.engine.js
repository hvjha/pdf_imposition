// import {
//     getFoldPattern
// } from "./fold.patterns.js";


// /* ============================================================
//  * RESOLVE PATTERN
//  * ============================================================
//  */

// const resolveFoldPattern = ({
//     pagesPerLayout,
//     patternId = null
// }) => {

//     const pattern =
//         getFoldPattern({
//             pagesPerLayout,
//             patternId
//         });


//     if (
//         pattern.physicalMappingConfirmed === false
//     ) {

//         throw new Error(
//             `Physical pagination for ${pattern.id} ` +
//             `has not been confirmed yet.`
//         );
//     }


//     return pattern;
// };


// /* ============================================================
//  * VALIDATE PATTERN
//  * ============================================================
//  */

// const validateFoldPattern = (
//     pattern
// ) => {

//     if (!pattern) {

//         throw new Error(
//             "Fold pattern is required."
//         );
//     }


//     if (
//         !Number.isInteger(
//             pattern.columns
//         ) ||
//         pattern.columns <= 0
//     ) {

//         throw new Error(
//             `${pattern.id}: invalid columns.`
//         );
//     }


//     if (
//         !Number.isInteger(
//             pattern.rows
//         ) ||
//         pattern.rows <= 0
//     ) {

//         throw new Error(
//             `${pattern.id}: invalid rows.`
//         );
//     }


//     const expected =
//         pattern.columns *
//         pattern.rows;


//     const front =
//         Array.isArray(pattern.front)
//             ? pattern.front.length
//             : 0;


//     const back =
//         Array.isArray(pattern.back)
//             ? pattern.back.length
//             : 0;


//     if (
//         front + back !== expected
//     ) {

//         throw new Error(
//             `${pattern.id}: expected ${expected} ` +
//             `positions but found ${front + back}.`
//         );
//     }


//     return true;
// };


// /* ============================================================
//  * GET SIDE
//  * ============================================================
//  */

// const getPatternSide = ({
//     pattern,
//     side = "front"
// }) => {

//     validateFoldPattern(
//         pattern
//     );


//     const result =
//         pattern[side];


//     if (
//         !Array.isArray(result)
//     ) {

//         throw new Error(
//             `${pattern.id}: ${side} is invalid.`
//         );
//     }


//     return result;
// };


// /* ============================================================
//  * BUILD PHYSICAL PAGE POSITIONS
//  * ============================================================
//  *
//  * IMPORTANT:
//  *
//  * This function DOES NOT calculate x/y.
//  *
//  * It only returns:
//  *
//  *   page
//  *   row
//  *   column
//  *   rotation
//  *
//  * Physical x/y are calculated later from the actual PDF
//  * dimensions.
//  *
//  * ============================================================
//  */

// const buildSidePlacements = ({
//     pattern,
//     side = "front"
// }) => {

//     const sidePattern =
//         getPatternSide({
//             pattern,
//             side
//         });


//     return sidePattern.map(
//         (entry, index) => {

//             const row =
//                 Number.isInteger(
//                     entry.row
//                 )
//                     ? entry.row
//                     : Math.floor(
//                         index /
//                         pattern.columns
//                     );


//             const column =
//                 Number.isInteger(
//                     entry.column
//                 )
//                     ? entry.column
//                     : index %
//                         pattern.columns;


//             return {

//                 pageNumber:
//                     Number(
//                         entry.pageNumber
//                     ),

//                 row,

//                 column,

//                 rotation:
//                     Number(
//                         entry.rotation || 0
//                     )
//             };
//         }
//     );
// };


// /* ============================================================
//  * ROTATION TRANSFORM
//  * ============================================================
//  */

// const transformRotation = ({
//     rotation,
//     angle
// }) => {

//     const result =
//         (
//             Number(rotation || 0) +
//             Number(angle || 0)
//         ) % 360;


//     return (
//         result < 0
//             ? result + 360
//             : result
//     );
// };


// /* ============================================================
//  * ROTATE PATTERN
//  * ============================================================
//  */

// const rotatePattern = ({
//     pattern,
//     angle = 0
// }) => {

//     const normalized =
//         (
//             Number(angle) % 360 +
//             360
//         ) % 360;


//     if (
//         ![0, 90, 180, 270]
//             .includes(normalized)
//     ) {

//         throw new Error(
//             "Pattern rotation must be 0, 90, 180 or 270."
//         );
//     }


//     if (
//         normalized === 0
//     ) {

//         return pattern;
//     }


//     const oldColumns =
//         pattern.columns;


//     const oldRows =
//         pattern.rows;


//     const transformSide =
//         side => {

//             return side.map(
//                 entry => {

//                     const row =
//                         entry.row;


//                     const column =
//                         entry.column;


//                     let newRow;
//                     let newColumn;


//                     switch (
//                         normalized
//                     ) {

//                         case 90:

//                             newRow =
//                                 column;

//                             newColumn =
//                                 oldRows -
//                                 1 -
//                                 row;

//                             break;


//                         case 180:

//                             newRow =
//                                 oldRows -
//                                 1 -
//                                 row;

//                             newColumn =
//                                 oldColumns -
//                                 1 -
//                                 column;

//                             break;


//                         case 270:

//                             newRow =
//                                 oldColumns -
//                                 1 -
//                                 column;

//                             newColumn =
//                                 row;

//                             break;
//                     }


//                     return {

//                         pageNumber:
//                             entry.pageNumber,

//                         row:
//                             newRow,

//                         column:
//                             newColumn,

//                         rotation:
//                             transformRotation({
//                                 rotation:
//                                     entry.rotation,

//                                 angle:
//                                     normalized
//                             })
//                     };
//                 }
//             );
//         };


//     const newColumns =
//         normalized === 90 ||
//         normalized === 270
//             ? oldRows
//             : oldColumns;


//     const newRows =
//         normalized === 90 ||
//         normalized === 270
//             ? oldColumns
//             : oldRows;


//     const sortSide =
//         side =>
//             side
//                 .sort(
//                     (a, b) => {

//                         if (
//                             a.row !== b.row
//                         ) {

//                             return (
//                                 a.row -
//                                 b.row
//                             );
//                         }


//                         return (
//                             a.column -
//                             b.column
//                         );
//                     }
//                 );


//     return {

//         ...pattern,

//         columns:
//             newColumns,

//         rows:
//             newRows,

//         front:
//             sortSide(
//                 transformSide(
//                     pattern.front
//                 )
//             ),

//         back:
//             sortSide(
//                 transformSide(
//                     pattern.back
//                 )
//             )
//     };
// };


// export {
//     resolveFoldPattern,
//     validateFoldPattern,
//     getPatternSide,
//     buildSidePlacements,
//     rotatePattern
// };






/*
 * ============================================================
 * FOLD ENGINE
 * ============================================================
 *
 * Responsibilities:
 *
 *   1. Resolve a fold/pagination pattern
 *   2. Validate the pattern
 *   3. Validate front/back positions
 *   4. Build normalized side placements
 *   5. Apply optional pattern rotation
 *
 * IMPORTANT:
 *
 * This file does NOT calculate:
 *
 *   - sheet dimensions
 *   - source PDF dimensions
 *   - x / y
 *   - margins
 *   - gutter
 *   - bleed
 *   - scaling
 *
 * Those calculations belong to the imposition geometry engine.
 *
 * ============================================================
 */

import {
    getFoldPattern
} from "./fold.patterns.js";


/* ============================================================
 * CONSTANTS
 * ============================================================
 */

const SUPPORTED_ROTATIONS = [
    0,
    90,
    180,
    270
];


/* ============================================================
 * NORMALIZE ROTATION
 * ============================================================
 */

const normalizeRotation = (
    value = 0
) => {

    const rotation =
        Number(value);


    if (!Number.isFinite(rotation)) {

        throw new Error(
            `Invalid rotation: ${value}.`
        );
    }


    const normalized =
        (
            rotation % 360 +
            360
        ) % 360;


    if (
        !SUPPORTED_ROTATIONS.includes(
            normalized
        )
    ) {

        throw new Error(
            `Rotation must be 0, 90, 180 or 270. ` +
            `Received ${value}.`
        );
    }


    return normalized;
};


/* ============================================================
 * RESOLVE PATTERN
 * ============================================================
 *
 * mode:
 *
 *   TEXT
 *   COVER
 *
 * patternId:
 *
 *   Optional explicit pattern.
 *
 * Explicit patternId always takes priority.
 *
 * ============================================================
 */

const resolveFoldPattern = ({
    pagesPerLayout,
    patternId = null,
    mode = null
}) => {

    const pattern =
        getFoldPattern({

            pagesPerLayout,

            patternId,

            mode

        });


    if (!pattern) {

        throw new Error(
            `No fold pattern is available for ` +
            `${pagesPerLayout}PP.`
        );
    }


    if (
        pattern.physicalMappingConfirmed === false
    ) {

        throw new Error(
            `Physical pagination for ${pattern.id} ` +
            `has not been confirmed yet.`
        );
    }


    validateFoldPattern(
        pattern
    );


    return pattern;
};


/* ============================================================
 * VALIDATE PATTERN
 * ============================================================
 *
 * IMPORTANT:
 *
 * columns × rows is the physical capacity of ONE SIDE.
 *
 * Example:
 *
 * 4 columns × 2 rows = 8 positions per side.
 *
 * Therefore a duplex pattern may legitimately have:
 *
 *   front = 4
 *   back  = 4
 *
 * Total = 8 pages.
 *
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


    /* --------------------------------------------------------
     * ID
     * -------------------------------------------------------- */

    if (
        typeof pattern.id !== "string" ||
        pattern.id.trim() === ""
    ) {

        throw new Error(
            "Fold pattern ID is required."
        );
    }


    /* --------------------------------------------------------
     * Pages
     * -------------------------------------------------------- */

    if (
        !Number.isInteger(
            pattern.pages
        ) ||
        pattern.pages <= 0
    ) {

        throw new Error(
            `${pattern.id}: invalid pages value.`
        );
    }


    /* --------------------------------------------------------
     * Columns
     * -------------------------------------------------------- */

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


    /* --------------------------------------------------------
     * Rows
     * -------------------------------------------------------- */

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


    const sideCapacity =
        pattern.columns *
        pattern.rows;


    /* --------------------------------------------------------
     * Front
     * -------------------------------------------------------- */

    const front =
        Array.isArray(
            pattern.front
        )
            ? pattern.front
            : [];


    /* --------------------------------------------------------
     * Back
     * -------------------------------------------------------- */

    const back =
        Array.isArray(
            pattern.back
        )
            ? pattern.back
            : [];


    /* --------------------------------------------------------
     * Side capacity
     * -------------------------------------------------------- */

    if (
        front.length >
        sideCapacity
    ) {

        throw new Error(
            `${pattern.id}: front side contains ` +
            `${front.length} positions, but the maximum ` +
            `capacity is ${sideCapacity}.`
        );
    }


    if (
        back.length >
        sideCapacity
    ) {

        throw new Error(
            `${pattern.id}: back side contains ` +
            `${back.length} positions, but the maximum ` +
            `capacity is ${sideCapacity}.`
        );
    }


    /* --------------------------------------------------------
     * Total pagination count
     * -------------------------------------------------------- */

    if (
        front.length +
        back.length !==
        pattern.pages
    ) {

        throw new Error(
            `${pattern.id}: expected ` +
            `${pattern.pages} page positions, but found ` +
            `${front.length + back.length}.`
        );
    }


    /* --------------------------------------------------------
     * Validate front
     * -------------------------------------------------------- */

    validateSide({

        pattern,

        sideName:
            "front",

        side:
            front

    });


    /* --------------------------------------------------------
     * Validate back
     * -------------------------------------------------------- */

    validateSide({

        pattern,

        sideName:
            "back",

        side:
            back

    });


    /* --------------------------------------------------------
     * Validate page numbers
     * -------------------------------------------------------- */

    const allEntries = [
        ...front,
        ...back
    ];


    const pageNumbers =
        allEntries.map(
            entry =>
                Number(
                    entry.pageNumber
                )
        );


    const uniquePageNumbers =
        new Set(
            pageNumbers
        );


    /* --------------------------------------------------------
     * Duplicate page numbers
     * -------------------------------------------------------- */

    if (
        uniquePageNumbers.size !==
        pageNumbers.length
    ) {

        throw new Error(
            `${pattern.id}: duplicate page numbers found.`
        );
    }


    /* --------------------------------------------------------
     * Page number range
     * -------------------------------------------------------- */

    for (
        const pageNumber
        of pageNumbers
    ) {

        if (
            !Number.isInteger(
                pageNumber
            )
        ) {

            throw new Error(
                `${pattern.id}: page number ` +
                `${pageNumber} must be an integer.`
            );
        }


        if (
            pageNumber < 1 ||
            pageNumber > pattern.pages
        ) {

            throw new Error(
                `${pattern.id}: page number ` +
                `${pageNumber} is outside valid range ` +
                `1-${pattern.pages}.`
            );
        }
    }


    /* --------------------------------------------------------
     * Verify every logical page exists
     * --------------------------------------------------------
     *
     * Example:
     *
     * pages = 4
     *
     * Required:
     *
     * 1,2,3,4
     *
     * --------------------------------------------------------
     */

    for (
        let pageNumber = 1;
        pageNumber <= pattern.pages;
        pageNumber++
    ) {

        if (
            !uniquePageNumbers.has(
                pageNumber
            )
        ) {

            throw new Error(
                `${pattern.id}: missing page number ` +
                `${pageNumber}.`
            );
        }
    }


    return true;
};


/* ============================================================
 * VALIDATE SIDE
 * ============================================================
 */

const validateSide = ({
    pattern,
    sideName,
    side
}) => {

    const usedPositions =
        new Set();


    for (
        const entry
        of side
    ) {

        if (!entry) {

            throw new Error(
                `${pattern.id}: invalid ${sideName} entry.`
            );
        }


        /* ----------------------------------------------------
         * Row
         * ---------------------------------------------------- */

        const row =
            Number(
                entry.row
            );


        if (
            !Number.isInteger(
                row
            ) ||
            row < 0 ||
            row >= pattern.rows
        ) {

            throw new Error(
                `${pattern.id}: invalid ${sideName} ` +
                `row ${entry.row}.`
            );
        }


        /* ----------------------------------------------------
         * Column
         * ---------------------------------------------------- */

        const column =
            Number(
                entry.column
            );


        if (
            !Number.isInteger(
                column
            ) ||
            column < 0 ||
            column >= pattern.columns
        ) {

            throw new Error(
                `${pattern.id}: invalid ${sideName} ` +
                `column ${entry.column}.`
            );
        }


        /* ----------------------------------------------------
         * Position uniqueness
         * ---------------------------------------------------- */

        const positionKey =
            `${row}:${column}`;


        if (
            usedPositions.has(
                positionKey
            )
        ) {

            throw new Error(
                `${pattern.id}: duplicate ${sideName} ` +
                `position ${positionKey}.`
            );
        }


        usedPositions.add(
            positionKey
        );


        /* ----------------------------------------------------
         * Page number
         * ---------------------------------------------------- */

        const pageNumber =
            Number(
                entry.pageNumber
            );


        if (
            !Number.isInteger(
                pageNumber
            )
        ) {

            throw new Error(
                `${pattern.id}: invalid ${sideName} ` +
                `page number ${entry.pageNumber}.`
            );
        }


        /* ----------------------------------------------------
         * Rotation
         * ---------------------------------------------------- */

        normalizeRotation(
            entry.rotation ?? 0
        );
    }


    return true;
};


/* ============================================================
 * GET PATTERN SIDE
 * ============================================================
 */

const getPatternSide = ({
    pattern,
    side = "front"
}) => {

    validateFoldPattern(
        pattern
    );


    const normalizedSide =
        String(
            side
        )
            .trim()
            .toLowerCase();


    if (
        normalizedSide !== "front" &&
        normalizedSide !== "back"
    ) {

        throw new Error(
            `${pattern.id}: side must be ` +
            `'front' or 'back'.`
        );
    }


    const result =
        pattern[
            normalizedSide
        ];


    if (
        !Array.isArray(
            result
        )
    ) {

        throw new Error(
            `${pattern.id}: ${normalizedSide} ` +
            `side must be an array.`
        );
    }


    return result;
};


/* ============================================================
 * BUILD SIDE PLACEMENTS
 * ============================================================
 *
 * Converts the pattern into normalized placement data.
 *
 * NO physical x/y calculation happens here.
 *
 * Example:
 *
 * {
 *   pageNumber: 1,
 *   row: 0,
 *   column: 1,
 *   rotation: 0
 * }
 *
 * Physical coordinates are calculated later by
 * imposition.engine.js.
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
        (
            entry,
            index
        ) => {

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
                    normalizeRotation(
                        entry.rotation ?? 0
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
    rotation = 0,
    angle = 0
}) => {

    const baseRotation =
        normalizeRotation(
            rotation
        );


    const normalizedAngle =
        (
            Number(angle) % 360 +
            360
        ) % 360;


    if (
        !SUPPORTED_ROTATIONS.includes(
            normalizedAngle
        )
    ) {

        throw new Error(
            "Pattern rotation must be " +
            "0, 90, 180 or 270."
        );
    }


    return normalizeRotation(
        baseRotation +
        normalizedAngle
    );
};


/* ============================================================
 * ROTATE PATTERN
 * ============================================================
 *
 * Rotates the complete logical grid.
 *
 * This changes:
 *
 *   - row
 *   - column
 *   - page rotation
 *
 * It does NOT calculate physical x/y.
 *
 * ============================================================
 */

const rotatePattern = ({
    pattern,
    angle = 0
}) => {

    validateFoldPattern(
        pattern
    );


    const normalized =
        normalizeRotation(
            angle
        );


    if (
        normalized === 0
    ) {

        return {
            ...pattern,

            front:
                pattern.front
                    .map(
                        entry => ({
                            ...entry
                        })
                    ),

            back:
                pattern.back
                    .map(
                        entry => ({
                            ...entry
                        })
                    )
        };
    }


    const oldColumns =
        pattern.columns;


    const oldRows =
        pattern.rows;


    /* --------------------------------------------------------
     * Transform one side
     * -------------------------------------------------------- */

    const transformSide =
        side => {

            return side.map(
                entry => {

                    const row =
                        Number(
                            entry.row
                        );


                    const column =
                        Number(
                            entry.column
                        );


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


                        default:

                            newRow =
                                row;

                            newColumn =
                                column;
                    }


                    return {

                        pageNumber:
                            Number(
                                entry.pageNumber
                            ),

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


    /* --------------------------------------------------------
     * New grid dimensions
     * -------------------------------------------------------- */

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


    /* --------------------------------------------------------
     * Sort row/column
     * -------------------------------------------------------- */

    const sortSide =
        side => {

            return side
                .slice()
                .sort(
                    (
                        a,
                        b
                    ) => {

                        if (
                            a.row !==
                            b.row
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
        };


    const rotatedPattern = {

        ...pattern,

        columns:
            newColumns,

        rows:
            newRows,

        front:
            sortSide(
                transformSide(
                    pattern.front || []
                )
            ),

        back:
            sortSide(
                transformSide(
                    pattern.back || []
                )
            )
    };


    /*
     * Validate the resulting pattern before returning it.
     */

    validateFoldPattern(
        rotatedPattern
    );


    return rotatedPattern;
};


/* ============================================================
 * EXPORT
 * ============================================================
 */

export {

    resolveFoldPattern,

    validateFoldPattern,

    getPatternSide,

    buildSidePlacements,

    transformRotation,

    rotatePattern

};