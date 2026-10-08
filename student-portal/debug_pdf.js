import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas } from 'canvas';
import Tesseract from 'tesseract.js';

const run = async () => {
    try {
        console.log("Loading PDF...");
        const loadingTask = getDocument("e:\\Anti Gravity (Projects)\\ACFKA\\Semester 4.pdf");
        const pdf = await loadingTask.promise;
        console.log("PDF Loaded. Pages: " + pdf.numPages);
        
        for (let i = 1; i <= pdf.numPages; i++) {
            try {
                const page = await pdf.getPage(i);
                console.log(`Processing Page ${i}...`);
                
                // Render to Canvas
                const viewport = page.getViewport({ scale: 1.5 }); // Reduced scale
                const canvas = createCanvas(viewport.width, viewport.height);
                const context = canvas.getContext('2d');
                
                await page.render({ canvasContext: context, viewport: viewport }).promise;
                
                const buffer = canvas.toBuffer('image/png');
                console.log(`Page ${i} rendered to buffer. Starting OCR...`);
                
                const result = await Tesseract.recognize(buffer, 'eng');
                console.log(`\n--- Page ${i} OCR Result ---`);
                console.log(result.data.text);

            } catch (err) {
                console.error(`Error on page ${i}:`, err);
            }
        }

    } catch (e) {
        console.error("Critical Error:", e);
    }
};

run();

