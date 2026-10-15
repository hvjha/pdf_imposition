import { PDFDocument } from 'pdf-lib';
import fs from 'fs';
import { runImposition } from '../src/engines/imposition/imposition.engine.js';

async function test() {
    const filePath = 'C:/Users/harsh/Downloads/Row2_Airsupra_compressed.pdf';
    const bytes = fs.readFileSync(filePath);
    
    // Simulate what frontend sends in BOX mode:
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
    
    console.log('Result layouts count:', result.layouts?.length);
    console.log('Layouts details:', result.layouts?.map(l => ({
        layoutNumber: l.layoutNumber,
        pageStart: l.pageStart,
        pageEnd: l.pageEnd,
        sidesCount: l.sides?.length,
        placementPages: l.sides?.[0]?.placements?.map(p => p.pageNumber)
    })));
    
    console.log('Sheet:', result.sheet);
    console.log('Geometry:', {
        sheetWidth: result.geometry?.sheetWidth,
        sheetHeight: result.geometry?.sheetHeight,
        pageWidth: result.geometry?.pageWidth,
        pageHeight: result.geometry?.pageHeight,
        cellWidth: result.geometry?.cellWidth,
        cellHeight: result.geometry?.cellHeight,
        scale: result.geometry?.scale
    });
    const outDoc = await PDFDocument.load(result.pdfBytes);
    console.log('Output PDF total pages:', outDoc.getPageCount());
}

test().catch(console.error);
