/* ============================================================
 * FOLD PATTERNS REGISTRY (PREPRESS INDUSTRY STANDARD)
 * ============================================================
 *
 * Implements CIP4 / Kodak Preps / Heidelberg Signa Station
 * folding schemes for Book Text Signatures and Book Covers.
 *
 * All coordinates:
 *   - columns: 0-indexed from left to right
 *   - rows: 0-indexed from top to bottom
 *   - rotation: degrees clockwise (0, 90, 180, 270)
 * ============================================================
 */

/* ============================================================
 * 2PP TEXT
 * ============================================================
 */
const PATTERN_2PP_TEXT = {
    id: "2PP-2X1-TEXT",
    mode: "TEXT",
    pages: 2,
    columns: 2,
    rows: 1,
    physicalMappingConfirmed: true,
    front: [
        { pageNumber: 1, row: 0, column: 0, rotation: 0 },
        { pageNumber: 2, row: 0, column: 1, rotation: 0 }
    ],
    back: []
};

/* ============================================================
 * 2PP COVER
 * ============================================================
 */
const PATTERN_2PP_COVER = {
    id: "2PP-2X1-COVER",
    mode: "COVER",
    pages: 2,
    columns: 2,
    rows: 1,
    physicalMappingConfirmed: true,
    front: [
        { pageNumber: 1, row: 0, column: 0, rotation: 0 },
        { pageNumber: 2, row: 0, column: 1, rotation: 0 }
    ],
    back: []
};

/* ============================================================
 * 4PP FOLIO (CIP4 F4-1 BOOK TEXT DUPLEX)
 * ============================================================
 *
 * Standard 4-page single fold signature.
 * Front: Page 4 (col 0), Page 1 (col 1)
 * Back:  Page 2 (col 0), Page 3 (col 1)
 * Backing: 1 backs 2, 4 backs 3.
 */
const PATTERN_4PP_FOLIO = {
    id: "4PP-2X1-FOLIO",
    mode: "TEXT",
    pages: 4,
    columns: 2,
    rows: 1,
    physicalMappingConfirmed: true,
    front: [
        { pageNumber: 4, row: 0, column: 0, rotation: 0 },
        { pageNumber: 1, row: 0, column: 1, rotation: 0 }
    ],
    back: [
        { pageNumber: 2, row: 0, column: 0, rotation: 0 },
        { pageNumber: 3, row: 0, column: 1, rotation: 0 }
    ]
};

/* ============================================================
 * 4PP COVER (2x2 HEAD-TO-HEAD)
 * ============================================================
 *
 * ┌──────────────┬──────────────┐
 * │      3       │      2       │ (180°)
 * ├──────────────┼──────────────┤
 * │      4       │      1       │ (0°)
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
        { pageNumber: 3, row: 0, column: 0, rotation: 180 },
        { pageNumber: 2, row: 0, column: 1, rotation: 180 },
        { pageNumber: 4, row: 1, column: 0, rotation: 0 },
        { pageNumber: 1, row: 1, column: 1, rotation: 0 }
    ],
    back: []
};

/* ============================================================
 * 4PP TEXT TEST
 * ============================================================
 */
const PATTERN_4PP_TEXT_TEST = {
    id: "4PP-2X2-TEXT",
    mode: "TEXT",
    pages: 4,
    columns: 2,
    rows: 2,
    physicalMappingConfirmed: true,
    front: [
        { pageNumber: 3, row: 0, column: 0, rotation: 180 },
        { pageNumber: 2, row: 0, column: 1, rotation: 180 },
        { pageNumber: 4, row: 1, column: 0, rotation: 0 },
        { pageNumber: 1, row: 1, column: 1, rotation: 0 }
    ],
    back: []
};

/* ============================================================
 * 8PP TEXT (CIP4 F8-1 DUPLEX)
 * ============================================================
 *
 * Front (2x2):
 * [8, 1]
 * [2, 7]
 * Back (2x2):
 * [6, 3]
 * [4, 5]
 */
const PATTERN_8PP = {
    id: "8PP-2X2-DUPLEX-TEXT",
    mode: "TEXT",
    pages: 8,
    columns: 2,
    rows: 2,
    physicalMappingConfirmed: true,
    front: [
        { pageNumber: 8, row: 0, column: 0, rotation: 0 },
        { pageNumber: 1, row: 0, column: 1, rotation: 0 },
        { pageNumber: 2, row: 1, column: 0, rotation: 0 },
        { pageNumber: 7, row: 1, column: 1, rotation: 0 }
    ],
    back: [
        { pageNumber: 6, row: 0, column: 0, rotation: 0 },
        { pageNumber: 3, row: 0, column: 1, rotation: 0 },
        { pageNumber: 4, row: 1, column: 0, rotation: 0 },
        { pageNumber: 5, row: 1, column: 1, rotation: 0 }
    ]
};

/* ============================================================
 * 16PP — CIP4 F16-1 / KODAK PREPS RIGHT-ANGLE SIGNATURE
 * ============================================================
 *
 * Industry-standard 16-page right-angle book section.
 * Sheetwise duplex press sheet: 4 columns × 2 rows (8 front, 8 back).
 *
 * FRONT (Side 1):
 * Row 0 (180°): Col 0: P.5,  Col 1: P.12, Col 2: P.9,  Col 3: P.8
 * Row 1 (0°):   Col 0: P.4,  Col 1: P.13, Col 2: P.16, Col 3: P.1
 *
 * BACK (Side 2):
 * Row 0 (180°): Col 0: P.7,  Col 1: P.10, Col 2: P.11, Col 3: P.6
 * Row 1 (0°):   Col 0: P.2,  Col 1: P.15, Col 2: P.14, Col 3: P.3
 *
 * Backing: 1 backs 2, 3 backs 4, 5 backs 6, 7 backs 8,
 *          9 backs 10, 11 backs 12, 13 backs 14, 15 backs 16.
 */
const PATTERN_16PP = {
    id: "16PP-4X2-RIGHT-ANGLE",
    mode: "TEXT",
    pages: 16,
    columns: 4,
    rows: 2,
    physicalMappingConfirmed: true,
    front: [
        { pageNumber: 5, row: 0, column: 0, rotation: 180 },
        { pageNumber: 12, row: 0, column: 1, rotation: 180 },
        { pageNumber: 9, row: 0, column: 2, rotation: 180 },
        { pageNumber: 8, row: 0, column: 3, rotation: 180 },
        { pageNumber: 4, row: 1, column: 0, rotation: 0 },
        { pageNumber: 13, row: 1, column: 1, rotation: 0 },
        { pageNumber: 16, row: 1, column: 2, rotation: 0 },
        { pageNumber: 1, row: 1, column: 3, rotation: 0 }
    ],
    back: [
        { pageNumber: 7, row: 0, column: 0, rotation: 180 },
        { pageNumber: 10, row: 0, column: 1, rotation: 180 },
        { pageNumber: 11, row: 0, column: 2, rotation: 180 },
        { pageNumber: 6, row: 0, column: 3, rotation: 180 },
        { pageNumber: 2, row: 1, column: 0, rotation: 0 },
        { pageNumber: 15, row: 1, column: 1, rotation: 0 },
        { pageNumber: 14, row: 1, column: 2, rotation: 0 },
        { pageNumber: 3, row: 1, column: 3, rotation: 0 }
    ]
};

/* ============================================================
 * 32PP — CIP4 F32-1 / KODAK PREPS RIGHT-ANGLE SIGNATURE
 * ============================================================
 *
 * Industry-standard 32-page signature (4 columns × 4 rows duplex).
 * Front: 16 positions, Back: 16 positions. Total: 32 pages.
 */
const PATTERN_32PP = {
    id: "32PP-4X4-RIGHT-ANGLE",
    mode: "TEXT",
    pages: 32,
    columns: 4,
    rows: 4,
    physicalMappingConfirmed: true,
    front: [
        { pageNumber: 5, row: 0, column: 0, rotation: 180 },
        { pageNumber: 28, row: 0, column: 1, rotation: 180 },
        { pageNumber: 21, row: 0, column: 2, rotation: 180 },
        { pageNumber: 12, row: 0, column: 3, rotation: 180 },
        { pageNumber: 4, row: 1, column: 0, rotation: 0 },
        { pageNumber: 29, row: 1, column: 1, rotation: 0 },
        { pageNumber: 20, row: 1, column: 2, rotation: 0 },
        { pageNumber: 13, row: 1, column: 3, rotation: 0 },
        { pageNumber: 8, row: 2, column: 0, rotation: 180 },
        { pageNumber: 25, row: 2, column: 1, rotation: 180 },
        { pageNumber: 24, row: 2, column: 2, rotation: 180 },
        { pageNumber: 9, row: 2, column: 3, rotation: 180 },
        { pageNumber: 1, row: 3, column: 0, rotation: 0 },
        { pageNumber: 32, row: 3, column: 1, rotation: 0 },
        { pageNumber: 17, row: 3, column: 2, rotation: 0 },
        { pageNumber: 16, row: 3, column: 3, rotation: 0 }
    ],
    back: [
        { pageNumber: 11, row: 0, column: 0, rotation: 180 },
        { pageNumber: 22, row: 0, column: 1, rotation: 180 },
        { pageNumber: 27, row: 0, column: 2, rotation: 180 },
        { pageNumber: 6, row: 0, column: 3, rotation: 180 },
        { pageNumber: 14, row: 1, column: 0, rotation: 0 },
        { pageNumber: 19, row: 1, column: 1, rotation: 0 },
        { pageNumber: 30, row: 1, column: 2, rotation: 0 },
        { pageNumber: 3, row: 1, column: 3, rotation: 0 },
        { pageNumber: 10, row: 2, column: 0, rotation: 180 },
        { pageNumber: 23, row: 2, column: 1, rotation: 180 },
        { pageNumber: 26, row: 2, column: 2, rotation: 180 },
        { pageNumber: 7, row: 2, column: 3, rotation: 180 },
        { pageNumber: 15, row: 3, column: 0, rotation: 0 },
        { pageNumber: 18, row: 3, column: 1, rotation: 0 },
        { pageNumber: 31, row: 3, column: 2, rotation: 0 },
        { pageNumber: 2, row: 3, column: 3, rotation: 0 }
    ]
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
        PATTERN_4PP_FOLIO,
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
    const key = `${Number(pagesPerLayout)}PP`;
    const patterns = FOLD_PATTERNS[key];

    if (!patterns) {
        throw new Error(`No fold patterns available for ${key}.`);
    }

    if (patternId) {
        const pattern = patterns.find(item => item.id === patternId);
        if (!pattern) {
            throw new Error(`Fold pattern '${patternId}' not found for ${key}.`);
        }
        return pattern;
    }

    if (mode) {
        const normalizedMode = String(mode).trim().toUpperCase();
        const modePattern = patterns.find(
            pattern => String(pattern.mode || "").toUpperCase() === normalizedMode
        );
        if (modePattern) {
            return modePattern;
        }
    }

    return patterns[0];
};

/* ============================================================
 * GET ALL SUPPORTED PATTERNS
 * ============================================================
 */
const getSupportedFoldPatterns = (pagesPerLayout, mode = null) => {
    const key = `${Number(pagesPerLayout)}PP`;
    const patterns = FOLD_PATTERNS[key] || [];

    if (!mode) {
        return patterns;
    }

    const normalizedMode = String(mode).trim().toUpperCase();
    return patterns.filter(
        pattern => String(pattern.mode || "").toUpperCase() === normalizedMode
    );
};

/* ============================================================
 * EXPORTS
 * ============================================================
 */
export {
    FOLD_PATTERNS,
    PATTERN_2PP_TEXT,
    PATTERN_2PP_COVER,
    PATTERN_4PP_FOLIO,
    PATTERN_4PP_COVER,
    PATTERN_4PP_TEXT_TEST,
    PATTERN_8PP,
    PATTERN_16PP,
    PATTERN_32PP,
    getFoldPattern,
    getSupportedFoldPatterns
};
