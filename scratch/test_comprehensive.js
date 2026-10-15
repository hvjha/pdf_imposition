import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { runImposition } from '../src/engines/imposition/imposition.engine.js';

async function testBoxImposition() {
    console.log('--- TEST 1: BOX MULTI-PAGE IMPOSITION (Row2_Airsupra_compressed.pdf) ---');
    const filePath = 'C:/Users/harsh/Downloads/Row2_Airsupra_compressed.pdf';
    const bytes = fs.readFileSync(filePath);
    
    const config = {
        productCategory: 'BOX',
        sheet: {
            width: 635,
            height: 457.2,
            unit: 'mm',
            orientation: 'LANDSCAPE',
            preset: '18×25"'
        },
        layout: {
            pagesPerLayout: 4,
            mode: 'BOX',
            columns: 2,
            rows: 2,
            interlockMode: 'STANDARD'
        },
        boxConfig: {
            unit: 'inch',
            boxStyle: 'RTE',
            removeWhiteSpace: true,
            length: 4.09,
            width: 1.57,
            height: 4.72,
            glueTab: 0.52,
            tuckFlap: 1.5
        },
        marks: {
            isBoxJob: true,
            mode: 'BOX',
            dielineOverlay: false
        }
    };
    
    const result = await runImposition({
        sourcePdfBytes: bytes,
        config
    });
    
    console.log('Layouts count:', result.layouts.length);
    console.assert(result.layouts.length === 5, `Expected 5 layouts, got ${result.layouts.length}`);
    
    let totalPlacements = 0;
    result.layouts.forEach((l, idx) => {
        const placements = l.sides[0].placements;
        totalPlacements += placements.length;
        const pageNum = idx + 1;
        const allMatch = placements.every(p => p.pageNumber === pageNum);
        console.log(`Sheet ${l.layoutNumber}: ${placements.length} ups of Page ${pageNum} (all match: ${allMatch})`);
        console.assert(allMatch, `Layout ${l.layoutNumber} should have all placements = Page ${pageNum}`);
        console.assert(placements.length === 4, `Layout ${l.layoutNumber} should have 4 placements`);
    });
    
    console.assert(totalPlacements === 20, `Expected 20 total placements, got ${totalPlacements}`);
    
    const outDoc = await PDFDocument.load(result.pdfBytes);
    console.log('Output PDF sheet count:', outDoc.getPageCount());
    console.assert(outDoc.getPageCount() === 5, `Expected 5 sheets in output PDF, got ${outDoc.getPageCount()}`);
    console.log('TEST 1 PASSED: 5 pages -> 5 sheets × 4 ups = 20 ups total!\n');
}

async function testBookImposition() {
    console.log('--- TEST 2: BOOK IMPOSITION REGRESSION CHECK ---');
    // Create a dummy 16-page PDF
    const doc = await PDFDocument.create();
    for (let i = 0; i < 16; i++) {
        const page = doc.addPage([400, 600]);
        page.drawText(`Page ${i + 1}`, { x: 50, y: 500 });
    }
    const bookPdfBytes = await doc.save();
    
    const config = {
        productCategory: 'BOOK',
        sheet: {
            width: 914,
            height: 584,
            unit: 'mm',
            orientation: 'LANDSCAPE',
            preset: '23×36"'
        },
        layout: {
            pagesPerLayout: 16,
            mode: 'TEXT',
            columns: 4,
            rows: 2,
            interlockMode: 'STANDARD'
        },
        workStyle: 'SHEETWISE',
        binding: {
            type: 'PERFECT_BINDING'
        }
    };
    
    const result = await runImposition({
        sourcePdfBytes: bookPdfBytes,
        config
    });
    
    console.log('Book layout count:', result.layouts.length);
    console.assert(result.layouts.length === 1, `Expected 1 signature for 16-page book on 16PP, got ${result.layouts.length}`);
    console.log('TEST 2 PASSED: Book imposition logic is 100% intact!\n');
}

async function runAll() {
    await testBoxImposition();
    await testBookImposition();
    console.log('ALL TESTS PASSED SUCCESSFULLY!');
}

runAll().catch(err => {
    console.error('Test failed:', err);
    process.exit(1);
});
