// /*
//  * ============================================================
//  * FOLD / PAGINATION PATTERNS
//  * ============================================================
//  *
//  * IMPORTANT:
//  *
//  * A fold pattern ONLY defines:
//  *
//  *   - page number
//  *   - logical row
//  *   - logical column
//  *   - page rotation
//  *
//  * It does NOT define:
//  *
//  *   - sheet dimensions
//  *   - page dimensions
//  *   - margins
//  *   - gutter
//  *   - bleed
//  *   - scaling
//  *
//  * All physical geometry is calculated dynamically by
//  * imposition.engine.js.
//  *
//  * ============================================================
//  */


// /* ============================================================
//  * 2PP
//  * ============================================================
//  *
//  * 2 source pages on one physical side.
//  *
//  * ┌────────────┬────────────┐
//  * │     1      │     2      │
//  * │     0°     │     0°     │
//  * └────────────┴────────────┘
//  */

// const PATTERN_2PP = {

//     id: "2PP-2X1",
//     pages: 2,

//     columns: 2,
//     rows: 1,

//     physicalMappingConfirmed: true,

//     front: [
//         {
//             pageNumber: 1,
//             row: 0,
//             column: 0,
//             rotation: 0
//         },
//         {
//             pageNumber: 2,
//             row: 0,
//             column: 1,
//             rotation: 0
//         }
//     ],

//     back: []
// };


// /* ============================================================
//  * 4PP
//  * ============================================================
//  *
//  * THIS IS THE VERIFIED GEOMETRY FROM YOUR PREPS REFERENCE.
//  *
//  * ┌──────────────┬──────────────┐
//  * │      3       │      2       │
//  * │     180°     │     180°     │
//  * ├──────────────┼──────────────┤
//  * │      4       │      1       │
//  * │       0°     │       0°     │
//  * └──────────────┴──────────────┘
//  *
//  * ALL FOUR PAGES ARE ON ONE PHYSICAL SIDE.
//  */

// const PATTERN_4PP = {

//     id: "4PP-2X2-COVER",
//     pages: 4,

//     columns: 2,
//     rows: 2,

//     physicalMappingConfirmed: true,

//     front: [

//         {
//             pageNumber: 3,
//             row: 0,
//             column: 0,
//             rotation: 180
//         },

//         {
//             pageNumber: 2,
//             row: 0,
//             column: 1,
//             rotation: 180
//         },

//         {
//             pageNumber: 4,
//             row: 1,
//             column: 0,
//             rotation: 0
//         },

//         {
//             pageNumber: 1,
//             row: 1,
//             column: 1,
//             rotation: 0
//         }

//     ],

//     back: []
// };


// /* ============================================================
//  * 8PP
//  * ============================================================
//  *
//  * NOT production-confirmed yet.
//  *
//  * Multiple industry fold patterns exist for 8 pages.
//  * Therefore we do NOT claim this is a universal 8PP
//  * pagination.
//  */

// const PATTERN_8PP = {

//     id: "8PP-UNCONFIRMED",
//     pages: 8,

//     columns: 2,
//     rows: 4,

//     physicalMappingConfirmed: false,

//     front: [],
//     back: []
// };


// /* ============================================================
//  * 16PP
//  * ============================================================
//  *
//  * NOT production-confirmed yet.
//  */

// const PATTERN_16PP = {

//     id: "16PP-UNCONFIRMED",
//     pages: 16,

//     columns: 4,
//     rows: 4,

//     physicalMappingConfirmed: false,

//     front: [],
//     back: []
// };


// /* ============================================================
//  * 32PP
//  * ============================================================
//  *
//  * NOT production-confirmed yet.
//  */

// const PATTERN_32PP = {

//     id: "32PP-UNCONFIRMED",
//     pages: 32,

//     columns: 8,
//     rows: 4,

//     physicalMappingConfirmed: false,

//     front: [],
//     back: []
// };


// /* ============================================================
//  * REGISTRY
//  * ============================================================
//  */

// const FOLD_PATTERNS = {

//     "2PP": [
//         PATTERN_2PP
//     ],

//     "4PP": [
//         PATTERN_4PP
//     ],

//     "8PP": [
//         PATTERN_8PP
//     ],

//     "16PP": [
//         PATTERN_16PP
//     ],

//     "32PP": [
//         PATTERN_32PP
//     ]
// };


// /* ============================================================
//  * GET PATTERN
//  * ============================================================
//  */

// const getFoldPattern = ({
//     pagesPerLayout,
//     patternId = null
// }) => {

//     const key =
//         `${Number(pagesPerLayout)}PP`;


//     const patterns =
//         FOLD_PATTERNS[key];


//     if (!patterns) {

//         throw new Error(
//             `No fold patterns available for ${key}.`
//         );
//     }


//     if (patternId) {

//         const pattern =
//             patterns.find(
//                 item =>
//                     item.id === patternId
//             );


//         if (!pattern) {

//             throw new Error(
//                 `Fold pattern '${patternId}' ` +
//                 `not found for ${key}.`
//             );
//         }


//         return pattern;
//     }


//     return patterns[0];
// };


// /* ============================================================
//  * GET ALL PATTERNS
//  * ============================================================
//  */

// const getSupportedFoldPatterns = (
//     pagesPerLayout
// ) => {

//     const key =
//         `${Number(pagesPerLayout)}PP`;


//     return (
//         FOLD_PATTERNS[key] ||
//         []
//     );
// };


// export {
//     FOLD_PATTERNS,
//     getFoldPattern,
//     getSupportedFoldPatterns
// };



/*
 * ============================================================
 * FOLD / PAGINATION PATTERNS
 * ============================================================
 *
 * A pattern defines ONLY logical pagination:
 *
 *   - pages per layout
 *   - physical grid
 *   - page number
 *   - row
 *   - column
 *   - rotation
 *   - front / back side
 *
 * A pattern DOES NOT define:
 *
 *   - sheet size
 *   - source PDF dimensions
 *   - margins
 *   - gutter
 *   - bleed
 *   - scaling
 *   - physical x/y
 *
 * Physical geometry is calculated dynamically by the
 * imposition engine.
 *
 * ============================================================
 */


/* ============================================================
 * 2PP TEXT
 * ============================================================
 *
 * ┌────────────────────┬────────────────────┐
 * │         1          │         2          │
 * │         0°         │         0°         │
 * └────────────────────┴────────────────────┘
 */

const PATTERN_2PP_TEXT = {

    id: "2PP-2X1-TEXT",

    mode: "TEXT",

    pages: 2,

    columns: 2,
    rows: 1,

    physicalMappingConfirmed: true,

    front: [

        {
            pageNumber: 1,
            row: 0,
            column: 0,
            rotation: 0
        },

        {
            pageNumber: 2,
            row: 0,
            column: 1,
            rotation: 0
        }

    ],

    back: []
};


/* ============================================================
 * 2PP COVER
 * ============================================================
 *
 * Kept as a separate pattern so COVER pagination can later
 * have its own verified mapping without changing the engine.
 */

const PATTERN_2PP_COVER = {

    id: "2PP-2X1-COVER",

    mode: "COVER",

    pages: 2,

    columns: 2,
    rows: 1,

    physicalMappingConfirmed: true,

    front: [

        {
            pageNumber: 1,
            row: 0,
            column: 0,
            rotation: 0
        },

        {
            pageNumber: 2,
            row: 0,
            column: 1,
            rotation: 0
        }

    ],

    back: []
};


/* ============================================================
 * 4PP COVER
 * ============================================================
 *
 * VERIFIED FROM YOUR PREPS REFERENCE.
 *
 * ┌──────────────┬──────────────┐
 * │      3       │      2       │
 * │     180°     │     180°     │
 * ├──────────────┼──────────────┤
 * │      4       │      1       │
 * │      0°      │      0°      │
 * └──────────────┴──────────────┘
 */

const PATTERN_4PP_COVER = {

    id: "4PP-2X2-COVER",

    mode: "COVER",

    pages: 4,

    columns: 2,
    rows: 2,

    physicalMappingConfirmed: true,

    front: [

        {
            pageNumber: 3,
            row: 0,
            column: 0,
            rotation: 180
        },

        {
            pageNumber: 2,
            row: 0,
            column: 1,
            rotation: 180
        },

        {
            pageNumber: 4,
            row: 1,
            column: 0,
            rotation: 0
        },

        {
            pageNumber: 1,
            row: 1,
            column: 1,
            rotation: 0
        }

    ],

    back: []
};


/* ============================================================
 * 4PP TEXT TEST
 * ============================================================
 *
 * TEMPORARY GEOMETRY TEST.
 *
 * This is NOT the final production pagination for a folded
 * 4-page text signature.
 */

const PATTERN_4PP_TEXT_TEST = {
    id: "4PP-2X2-TEXT",
    mode: "TEXT",
    pages: 4,
    columns: 2,
    rows: 2,

    front: [
        {
            pageNumber: 3,
            row: 0,
            column: 0,
            rotation: 180
        },
        {
            pageNumber: 2,
            row: 0,
            column: 1,
            rotation: 180
        },
        {
            pageNumber: 4,
            row: 1,
            column: 0,
            rotation: 0
        },
        {
            pageNumber: 1,
            row: 1,
            column: 1,
            rotation: 0
        }
    ],

    back: []
};

/* ============================================================
 * 8PP — HOLD
 * ============================================================
 */

const PATTERN_8PP = {

    id: "8PP-UNCONFIRMED",

    mode: "TEXT",

    pages: 8,

    columns: 2,
    rows: 4,

    physicalMappingConfirmed: false,

    front: [],

    back: []
};


/* ============================================================
 * 16PP — HOLD
 * ============================================================
 */

const PATTERN_16PP = {

    id: "16PP-UNCONFIRMED",

    mode: "TEXT",

    pages: 16,

    columns: 4,
    rows: 4,

    physicalMappingConfirmed: false,

    front: [],

    back: []
};


/* ============================================================
 * 32PP — HOLD
 * ============================================================
 */

const PATTERN_32PP = {

    id: "32PP-UNCONFIRMED",

    mode: "TEXT",

    pages: 32,

    columns: 8,
    rows: 4,

    physicalMappingConfirmed: false,

    front: [],

    back: []
};


/* ============================================================
 * REGISTRY
 * ============================================================
 */

const FOLD_PATTERNS = {

    "2PP": [
        PATTERN_2PP_TEXT,
        PATTERN_2PP_COVER
    ],

    "4PP": [
        PATTERN_4PP_COVER,
        PATTERN_4PP_TEXT_TEST
    ],

    "8PP": [
        PATTERN_8PP
    ],

    "16PP": [
        PATTERN_16PP
    ],

    "32PP": [
        PATTERN_32PP
    ]
};


/* ============================================================
 * GET PATTERN
 * ============================================================
 */

const getFoldPattern = ({
    pagesPerLayout,
    patternId = null,
    mode = null
}) => {

    const key =
        `${Number(pagesPerLayout)}PP`;


    const patterns =
        FOLD_PATTERNS[key];


    if (!patterns) {

        throw new Error(
            `No fold patterns available for ${key}.`
        );
    }


    /* --------------------------------------------------------
     * Explicit pattern ID always wins
     * -------------------------------------------------------- */

    if (patternId) {

        const pattern =
            patterns.find(
                item =>
                    item.id === patternId
            );


        if (!pattern) {

            throw new Error(
                `Fold pattern '${patternId}' ` +
                `not found for ${key}.`
            );
        }


        return pattern;
    }


    /* --------------------------------------------------------
     * Filter by TEXT / COVER when supplied
     * -------------------------------------------------------- */

    if (mode) {

        const normalizedMode =
            String(mode)
                .trim()
                .toUpperCase();


        const modePattern =
            patterns.find(
                pattern =>
                    String(pattern.mode || "")
                        .toUpperCase() ===
                    normalizedMode
            );


        if (modePattern) {

            return modePattern;
        }
    }


    /* --------------------------------------------------------
     * Default
     * -------------------------------------------------------- */

    return patterns[0];
};


/* ============================================================
 * GET ALL SUPPORTED PATTERNS
 * ============================================================
 */

const getSupportedFoldPatterns = (
    pagesPerLayout,
    mode = null
) => {

    const key =
        `${Number(pagesPerLayout)}PP`;


    const patterns =
        FOLD_PATTERNS[key] || [];


    if (!mode) {

        return patterns;
    }


    const normalizedMode =
        String(mode)
            .trim()
            .toUpperCase();


    return patterns.filter(
        pattern =>
            String(pattern.mode || "")
                .toUpperCase() ===
            normalizedMode
    );
};


/* ============================================================
 * EXPORT
 * ============================================================
 */

export {

    FOLD_PATTERNS,

    PATTERN_2PP_TEXT,
    PATTERN_2PP_COVER,

    PATTERN_4PP_COVER,
    PATTERN_4PP_TEXT_TEST,

    PATTERN_8PP,
    PATTERN_16PP,
    PATTERN_32PP,

    getFoldPattern,
    getSupportedFoldPatterns
};