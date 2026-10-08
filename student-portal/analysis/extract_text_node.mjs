import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createCanvas } from 'canvas';
import Tesseract from 'tesseract.js';

// Try standard import way for ESM
import * as pdfjsLib from 'pdfjs-dist/legacy/build/pdf.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function extractText() {
    console.log("Starting extraction process...");
    
    try {
        const testCanvas = createCanvas(100, 100);
        console.log("Canvas module works.");
    } catch (e) {
        console.error("Canvas module failed to load/work:", e);
        process.exit(1);
    }

    const pdfPath = path.resolve(__dirname, 'Semester 4.pdf');
    if (!fs.existsSync(pdfPath)) {
        console.error("PDF not found at:", pdfPath);
        process.exit(1);
    }
    
    console.log("Loading PDF:", pdfPath);
    const data = new Uint8Array(fs.readFileSync(pdfPath));
    
    // Disable worker
    pdfjsLib.GlobalWorkerOptions.workerSrc = ''; 

    try {
        const pdf = await pdfjsLib.getDocument({ 
            data, 
            cMapUrl: './node_modules/pdfjs-dist/cmaps/', 
            cMapPacked: true,
            standardFontDataUrl: './node_modules/pdfjs-dist/standard_fonts/'
        }).promise;
        
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
            
            const buffer = canvas.toBuffer('image/png');
            
            const result = await Tesseract.recognize(buffer, 'eng', {
                logger: m => {} 
            });
            
            console.log(`Page ${i} OCR Complete.`);
            
            fullText += result.data.text + '\n';
        }
        
        fs.writeFileSync(path.resolve(__dirname, 'extracted_text.txt'), fullText);
        console.log("Text saved to extracted_text.txt");
    } catch (err) {
        console.error("Error during PDF processing or OCR:", err);
        process.exit(1);
    }
}

extractText();
