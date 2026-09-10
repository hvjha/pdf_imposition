import { PDFDocument } from "pdf-lib";

const POINTS_PER_INCH = 72;
const EPSILON = 0.01;


const pointsToInches = (points) => {
    return Number(
        (points / POINTS_PER_INCH).toFixed(4)
    );
};


const approximatelyEqual = (a, b) => {
    return Math.abs(a - b) <= EPSILON;
};


const boxesAreEqual = (boxA, boxB) => {
    if (!boxA || !boxB) {
        return false;
    }

    return (
        approximatelyEqual(boxA.x, boxB.x) &&
        approximatelyEqual(boxA.y, boxB.y) &&
        approximatelyEqual(boxA.width, boxB.width) &&
        approximatelyEqual(boxA.height, boxB.height)
    );
};


const getOrientation = (width, height) => {

    if (approximatelyEqual(width, height)) {
        return "SQUARE";
    }

    return width > height
        ? "LANDSCAPE"
        : "PORTRAIT";
};


const getBoxData = (box) => {

    if (!box) {
        return null;
    }

    return {
        x: box.x,
        y: box.y,

        width: box.width,
        height: box.height,

        widthInches: pointsToInches(box.width),
        heightInches: pointsToInches(box.height)
    };
};


const analyzePage = (page, pageNumber) => {

    const mediaBox = page.getMediaBox();
    const cropBox = page.getCropBox();
    const bleedBox = page.getBleedBox();
    const trimBox = page.getTrimBox();
    const artBox = page.getArtBox();

    const rotation = page.getRotation();

    const width = page.getWidth();
    const height = page.getHeight();


    const cropEqualsMedia =
        boxesAreEqual(
            mediaBox,
            cropBox
        );

    const trimEqualsMedia =
        boxesAreEqual(
            mediaBox,
            trimBox
        );

    const bleedEqualsMedia =
        boxesAreEqual(
            mediaBox,
            bleedBox
        );


    const separateTrimDetected =
        !trimEqualsMedia;

    const separateBleedDetected =
        !bleedEqualsMedia;


    return {

        pageNumber,

        source: {

            widthPt: width,
            heightPt: height,

            widthInches:
                pointsToInches(width),

            heightInches:
                pointsToInches(height),

            orientation:
                getOrientation(
                    width,
                    height
                ),

            rotation: rotation.angle
        },


        boxes: {

            media:
                getBoxData(mediaBox),

            crop:
                getBoxData(cropBox),

            trim:
                getBoxData(trimBox),

            bleed:
                getBoxData(bleedBox),

            art:
                getBoxData(artBox)
        },


        boxRelationship: {

            cropEqualsMedia,

            trimEqualsMedia,

            bleedEqualsMedia,

            separateTrimDetected,

            separateBleedDetected,

            trimDetected:
                separateTrimDetected,

            bleedDetected:
                separateBleedDetected,

            productionTrimAvailable:
                separateTrimDetected,

            productionBleedAvailable:
                separateBleedDetected,

            requiresProductionRule:
                !separateTrimDetected
                && !separateBleedDetected
        }
    };
};


const analyzePdf = async (buffer) => {

    const pdfDoc =
        await PDFDocument.load(buffer);


    const pageCount =
        pdfDoc.getPageCount();


    const pages = [];


    for (
        let index = 0;
        index < pageCount;
        index++
    ) {

        const page =
            pdfDoc.getPage(index);

        pages.push(
            analyzePage(
                page,
                index + 1
            )
        );
    }


    const metadata = {

        title:
            pdfDoc.getTitle() || null,

        author:
            pdfDoc.getAuthor() || null,

        subject:
            pdfDoc.getSubject() || null,

        creator:
            pdfDoc.getCreator() || null,

        producer:
            pdfDoc.getProducer() || null,

        creationDate:
            pdfDoc.getCreationDate() || null,

        modificationDate:
            pdfDoc.getModificationDate() || null
    };


    const allPagesSameSize =
        pages.every(
            (page) =>
                page.source.widthPt ===
                    pages[0].source.widthPt
                &&
                page.source.heightPt ===
                    pages[0].source.heightPt
        );


    const allPagesSameOrientation =
        pages.every(
            (page) =>
                page.source.orientation ===
                pages[0].source.orientation
        );


    const hasSeparateTrim =
        pages.some(
            (page) =>
                page.boxRelationship
                    .separateTrimDetected
        );


    const hasSeparateBleed =
        pages.some(
            (page) =>
                page.boxRelationship
                    .separateBleedDetected
        );


    return {

        pageCount,

        pages,

        document: {

            allPagesSameSize,

            allPagesSameOrientation,

            hasSeparateTrim,

            hasSeparateBleed,

            trimInformationAvailable:
                hasSeparateTrim,

            bleedInformationAvailable:
                hasSeparateBleed,

            requiresProductionRule:
                !hasSeparateTrim &&
                !hasSeparateBleed
        },

        metadata
    };
};


export default analyzePdf;