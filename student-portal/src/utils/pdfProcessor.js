import * as pdfjsLib from 'pdfjs-dist';
import Tesseract from 'tesseract.js';

// Set worker source
import pdfWorker from 'pdfjs-dist/build/pdf.worker?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts text from a PDF file, using OCR if necessary.
 * @param {File} file - PDF file object
 * @returns {Promise<string>} - Extracted text content
 */
export const extractTextFromPDF = async (file) => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    console.log(`PDF Loaded. Pages: ${pdf.numPages}`);

    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        
        console.log(`Page ${i}: Starting OCR (Forced)...`);
        
        // Render to Canvas for OCR
        // Increased scale to 2.5 for better resolution on small text
        const viewport = page.getViewport({ scale: 2.5 }); 
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        
        await page.render({ canvasContext: context, viewport: viewport }).promise;
        
        // Run Tesseract
        // Added whitelist to focus on alphanumeric and relevant distinct chars to reduce noise
        const result = await Tesseract.recognize(canvas, 'eng', {
            logger: m => console.log(`[OCR Page ${i}] ${m.status}: ${parseInt(m.progress * 100)}%`),
            tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-:().+ ' 
        });
        
        console.log(`Page ${i} OCR Complete.`);
        fullText += result.data.text + '\n';
    }
    }
    
    console.log("Full Extracted Text:", fullText);
    return fullText;
};

/**
 * Parses the raw text from CAMU result PDF into structured data
 * @param {string} text - Raw text from PDF
 * @returns {Object} - Structured data
 */
export const parseSemesterResult = (text) => {
    const semestersMap = {};

    // Regex to match subject rows with explicit semester number
    // "Semester-1 21MAT01 - 6 B 4 Pass"
    // Handles garbage in GP (e.g. '[)') and Grade (e.g. '(e]')
    // Structure: Sem - Code - GP - Grade - Credits - Result
    const rowRegex = /Semester-(\d+)\s+(.+?)[\s\u2013\u2014-]+\s*(\S+)\s+(\S+)\s+(\d+)\s+(Pass|Fail|RA|AB|FA)/gi;
    
    let match;
    while ((match = rowRegex.exec(text)) !== null) {
        const semNum = match[1];
        const code = match[2].trim();
        const gpRaw = match[3];
        let grade = match[4].trim();
        const credits = parseInt(match[5]);

        // Clean up Grade
        // Handle common OCR errors for 'O' (Outstanding) => 10 points
        if (grade === '0' || grade === '(e]' || grade === '[e]' || grade === 'e]' || grade === '(e') {
            grade = 'O';
        }
        
        // If Grade is garbage but GP is 10, assume Grade is 'O'
        if (gpRaw === '10' && !['O', 'A+', 'A', 'B+', 'B', 'C', 'P', 'F'].includes(grade)) {
            grade = 'O';
        }

        // If Grade is valid but GP is garbage (e.g. '[)'), we rely on Grade.
        // If both are garbage, we might have an issue, but standard grades (A-F) usually OCR okay.
        
        // Fix OCR '0' to 'O'
        if (grade === '0') {
            grade = 'O';
        }

        const semesterKey = `Semester ${semNum}`;

        if (!semestersMap[semesterKey]) {
            semestersMap[semesterKey] = {
                semester: semesterKey,
                subjects: [],
                printedSGPA: 0 
            };
        }

        semestersMap[semesterKey].subjects.push({
            code: code,
            name: code,
            credits: credits,
            grade: grade
        });
    }

    // Convert map to array and calculate stats
    const results = Object.values(semestersMap).map(semData => {
        const totalCredits = semData.subjects.reduce((sum, sub) => sum + sub.credits, 0);
        
        // Calculate SGPA locally since extracting specific printed SGPA for each block is hard without layout
        // We can reuse the exported calculateSGPA but we are inside the module. 
        // Let's define it or call a helper if possible. 
        // Ideally we assume the caller will recalculate or we do it simple here.
        
        let totalPoints = 0;
        semData.subjects.forEach(sub => {
            totalPoints += sub.credits * getGradePoint(sub.grade);
        });
        
        const calculatedSGPA = totalCredits > 0 ? parseFloat((totalPoints / totalCredits).toFixed(2)) : 0;

        return {
            semester: semData.semester,
            subjects: semData.subjects,
            totalCredits,
            printedSGPA: calculatedSGPA, // Use calculated as printed for now
            calculatedSGPA: calculatedSGPA
        };
    });

    // If no rows matched regex, maybe try the fallback single-sem extraction?
    // For now, if results is empty, return object structure to fail gracefully in UI checks.
    if (results.length === 0) {
        // Fallback for PDF that might not have "Semester-X" in rows but has header?
        // The previous screenshot showed strict row format "Semester-1 ...". 
        // If that fails, we return empty structure.
        return { subjects: [] }; // Legacy check expects this
    }

    return results;
};

/**
 * Converts Grade to Grade Point
 */
export const getGradePoint = (grade) => {
    switch (grade.toUpperCase()) {
        case 'O': return 10;
        case 'A+': return 9;
        case 'A': return 8;
        case 'B+': return 7;
        case 'B': return 6;
        case 'C': return 5;
        case 'P': return 5; 
        case 'RA': return 0;
        case 'F': return 0;
        case 'FA': return 0;
        case 'AB': return 0;
        default: return 0;
    }
};

/**
 * Calculates SGPA from subjects list
 * Formula: Σ(Credit * GP) / Σ(Credits)
 */
export const calculateSGPA = (subjects) => {
    let totalPoints = 0;
    let totalCredits = 0;

    subjects.forEach(sub => {
        const gp = getGradePoint(sub.grade);
        totalPoints += sub.credits * gp;
        totalCredits += sub.credits;
    });

    if (totalCredits === 0) return 0;
    return parseFloat((totalPoints / totalCredits).toFixed(2));
};
