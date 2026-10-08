const fs = require('fs');
const path = require('path');
const pdfjsLib = require('pdfjs-dist/legacy/build/pdf.js');
const { createCanvas, Image } = require('canvas');
const Tesseract = require('tesseract.js');

// Set worker source for pdfjs? Not needed for Node usually??
// Actually, pdfjs-dist in Node uses `pdfjs-dist/legacy/build/pdf.js` which has worker disabled or handled differently.

async function extractText() {
    const pdfPath = path.resolve(__dirname, 'Semester 4.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error("PDF not found at:", pdfPath);
        return;
    }
    
    console.log("Loading PDF:", pdfPath);
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    const pdf = await pdfjsLib.getDocument({ data, cMapUrl: './node_modules/pdfjs-dist/cmaps/', cMapPacked: true }).promise;
    
    console.log(`PDF Loaded. Pages: ${pdf.numPages}`);
    let fullText = '';
    
    for (let i = 1; i <= pdf.numPages; i++) {
        console.log(`Processing Page ${i}...`);
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 2.0 });
        
        const canvas = createCanvas(viewport.width, viewport.height);
        const context = canvas.getContext('2d');
        
        await page.render({ canvasContext: context, viewport }).promise;
        
        console.log(`Page ${i} Rendered. Starting OCR...`);
        
        // Tesseract.js recognize accepts buffer or canvas?
        // Node Canvas buffer is supported.
        const buffer = canvas.toBuffer('image/png');
        
        const result = await Tesseract.recognize(buffer, 'eng', {
            logger: m => {} // concise logs
        });
        
        console.log(`Page ${i} OCR Complete.`);
        console.log("--------------------------------------------------");
        console.log(result.data.text);
        console.log("--------------------------------------------------");
        
        fullText += result.data.text + '\n';
    }
    
    fs.writeFileSync(path.resolve(__dirname, 'extracted_text.txt'), fullText);
    console.log("Text saved to extracted_text.txt");
}

extractText().catch(console.error);
