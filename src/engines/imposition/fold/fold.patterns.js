/*
 * ============================================================
 * FOLD / PAGINATION PATTERNS
 * ============================================================
 *
 * IMPORTANT:
 *
 * A fold pattern ONLY defines:
 *
 *   - page number
 *   - logical row
 *   - logical column
 *   - page rotation
 *
 * It does NOT define:
 *
 *   - sheet dimensions
 *   - page dimensions
 *   - margins
 *   - gutter
 *   - bleed
 *   - scaling
 *
 * All physical geometry is calculated dynamically by
 * imposition.engine.js.
 *
 * ============================================================
 */


/* ============================================================
 * 2PP
 * ============================================================
 *
 * 2 source pages on one physical side.
 *
 * ┌────────────┬────────────┐
 * │     1      │     2      │
 * │     0°     │     0°     │
 * └────────────┴────────────┘
 */

const PATTERN_2PP = {

    id: "2PP-2X1",
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
 * 4PP
 * ============================================================
 *
 * THIS IS THE VERIFIED GEOMETRY FROM YOUR PREPS REFERENCE.
 *
 * ┌──────────────┬──────────────┐
 * │      3       │      2       │
 * │     180°     │     180°     │
 * ├──────────────┼──────────────┤
 * │      4       │      1       │
 * │       0°     │       0°     │
 * └──────────────┴──────────────┘
 *
 * ALL FOUR PAGES ARE ON ONE PHYSICAL SIDE.
 */

const PATTERN_4PP = {

    id: "4PP-2X2-COVER",
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
 * 8PP
 * ============================================================
 *
 * NOT production-confirmed yet.
 *
 * Multiple industry fold patterns exist for 8 pages.
 * Therefore we do NOT claim this is a universal 8PP
 * pagination.
 */

const PATTERN_8PP = {

    id: "8PP-UNCONFIRMED",
    pages: 8,

    columns: 2,
    rows: 4,

    physicalMappingConfirmed: false,

    front: [],
    back: []
};


/* ============================================================
 * 16PP
 * ============================================================
 *
 * NOT production-confirmed yet.
 */

const PATTERN_16PP = {

    id: "16PP-UNCONFIRMED",
    pages: 16,

    columns: 4,
    rows: 4,

    physicalMappingConfirmed: false,

    front: [],
    back: []
};


/* ============================================================
 * 32PP
 * ============================================================
 *
 * NOT production-confirmed yet.
 */

const PATTERN_32PP = {

    id: "32PP-UNCONFIRMED",
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
        PATTERN_2PP
    ],

    "4PP": [
        PATTERN_4PP
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
    patternId = null
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


    return patterns[0];
};


/* ============================================================
 * GET ALL PATTERNS
 * ============================================================
 */

const getSupportedFoldPatterns = (
    pagesPerLayout
) => {

    const key =
        `${Number(pagesPerLayout)}PP`;


    return (
        FOLD_PATTERNS[key] ||
        []
    );
};


export {
    FOLD_PATTERNS,
    getFoldPattern,
    getSupportedFoldPatterns
};