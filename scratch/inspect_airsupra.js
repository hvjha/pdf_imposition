import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { detectContentBoundingBox } from '../src/engines/imposition/imposition.utils.js';

async function run() {
    const filePath = 'C:/Users/harsh/Downloads/Row2_Airsupra_compressed.pdf';
    const bytes = fs.readFileSync(filePath);
    const doc = await PDFDocument.load(bytes);
    console.log('Page count:', doc.getPageCount());
    
    for (let i = 0; i < doc.getPageCount(); i++) {
        const page = doc.getPage(i);
        const m = page.getMediaBox();
        const c = page.getCropBox();
        const t = page.getTrimBox ? page.getTrimBox() : null;
        const a = page.getArtBox ? page.getArtBox() : null;
        console.log('Page ' + (i + 1) + ':');
        console.log('  MediaBox:', m);
        console.log('  CropBox:', c);
        console.log('  TrimBox:', t);
        console.log('  ArtBox:', a);
        const detected = detectContentBoundingBox(page);
        console.log('  Detected Content BBox:', detected);
    }
}

run().catch(console.error);
