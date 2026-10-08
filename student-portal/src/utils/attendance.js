import { getScheduleForDate, SUBJECTS, HOLIDAYS, prefetchMonthData, getLocalISOString } from './schedule';
import { supabase } from './supabaseClient';

// Configuration
const SEMESTER_START = new Date(2026, 0, 5); // Jan 5, 2026 (Monday - First working day)
const MODEL_EXAM_START = new Date(2026, 3, 20); // April 20, 2026 (Placeholder - Update if needed)

// Helper to prefetch all data for the semester at once
const prefetchSemesterData = async () => {
    // Current semester spans Jan (0) to April (3)
    // We prefetch Jan, Feb, Mar, Apr
    const promises = [0, 1, 2, 3].map(month => prefetchMonthData(2026, month));
    await Promise.all(promises);
};

// Calculate total periods and weekday breakdown for each subject until Model Exam
export const calculateSemesterPeriods = async () => {
    // 1. Prefetch All Data to avoid N+1
    await prefetchSemesterData();

    const subjectData = {};
    Object.keys(SUBJECTS).forEach(code => {
        if (!["Break", "Lunch"].includes(code)) {
            subjectData[code] = { 
                total: 0, 
                attended: 0,
                breakdown: { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 }
            };
        }
    });

    const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let currentDate = new Date(SEMESTER_START);
    let safeguard = 0;
    
    while (currentDate < MODEL_EXAM_START && safeguard < 365) {
        safeguard++;
        const dateStr = getLocalISOString(currentDate);
        const dayOfWeek = currentDate.getDay();
        
        if (dayOfWeek !== 0) { // Skip Sundays, let getScheduleForDate handle all other holiday/working logic
            const scheduleData = await getScheduleForDate(currentDate);
            if (scheduleData && scheduleData.type === 'Working' && scheduleData.schedule) {
                 scheduleData.schedule.forEach(slot => {
                    if (slot.code && subjectData[slot.code]) {
                        subjectData[slot.code].total++;
                        const mapDay = dayOfWeek === 6 ? "Sat" : WEEKDAYS[dayOfWeek];
                        subjectData[slot.code].breakdown[mapDay] = (subjectData[slot.code].breakdown[mapDay] || 0) + 1;
                    }
                });
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return subjectData;
};


// Calculate conducted periods up to today
export const calculateConductedClassesMap = async (targetDate = new Date()) => {
    const conducted = {};
    Object.keys(SUBJECTS).forEach(code => {
        if (!["Break", "Lunch"].includes(code)) {
            conducted[code] = 0;
        }
    });

    // Ensure data is cached
    await prefetchSemesterData();

    let currentDate = new Date(SEMESTER_START);
    let safeguard = 0;

    while (currentDate <= targetDate && safeguard < 365) {
        safeguard++;
        const dateStr = getLocalISOString(currentDate);
        const dayOfWeek = currentDate.getDay();

        if (dayOfWeek !== 0) { // Skip Sundays, let getScheduleForDate handle all other holiday/working logic
            const scheduleData = await getScheduleForDate(currentDate);
            if (scheduleData && scheduleData.type === 'Working' && scheduleData.schedule) {
                scheduleData.schedule.forEach(slot => {
                    if (slot.code && conducted[slot.code] !== undefined) {
                        conducted[slot.code]++;
                    }
                });
            }
        }
        currentDate.setDate(currentDate.getDate() + 1);
    }
    return conducted;
};

// Get attendance data from Supabase
export const getAttendanceData = async (userId) => {
    try {
        const calculated = await calculateSemesterPeriods();
        if (!userId) return { attendance: calculated, lastUpdated: null };

        const { data, error } = await supabase
            .from('student_attendance')
            .select('attendance_data, updated_at')
            .eq('user_id', userId)
            .single();
        
        if (error) {
            if (error.code !== 'PGRST116') {
                console.error('Error fetching attendance:', error);
            }
            return { attendance: calculated, lastUpdated: null };
        }

        const stored = data?.attendance_data || {};
        // Merge breakdown from calculated into stored
        Object.keys(stored).forEach(code => {
            if (calculated[code]) {
                stored[code].breakdown = calculated[code].breakdown;
                stored[code].total = calculated[code].total;
            }
        });
        
        // Ensure new subjects from subjects list are included
        Object.keys(calculated).forEach(code => {
            if (!stored[code]) {
                stored[code] = calculated[code];
            }
        });

        return { attendance: stored, lastUpdated: data?.updated_at || null };
    } catch (e) {
        console.error('Failed to get attendance data:', e);
        return { attendance: await calculateSemesterPeriods(), lastUpdated: null };
    }
};

// Save attendance data to Supabase
export const saveAttendanceData = async (userId, data) => {
    if (!userId) return { success: false, error: 'No User ID provided' };
    try {
        const { error } = await supabase
            .from('student_attendance')
            .upsert({
                user_id: userId,
                attendance_data: data, // Ensure column name matches DB
                updated_at: new Date().toISOString()
            }, { onConflict: 'user_id' });
        
        if (error) {
            console.error('Error saving attendance:', error);
            return { success: false, error: error.message || JSON.stringify(error) };
        }
        return { success: true };
    } catch (e) {
        console.error('Failed to save attendance:', e);
        return { success: false, error: e.message || 'Unknown error' };
    }
};

// Update attended count for a subject
export const updateAttendance = async (userId, subjectCode, attendedCount) => {
    const { attendance: data } = await getAttendanceData(userId);
    if (data[subjectCode]) {
        data[subjectCode].attended = attendedCount;
        await saveAttendanceData(userId, data);
    }
    return data;
};

// Calculate percentage for a subject
export const calculatePercentage = (attended, total) => {
    if (total === 0) return 0;
    return ((attended / total) * 100).toFixed(1);
};

// Get attendance status (color based on percentage)
export const getAttendanceStatus = (percentage) => {
    if (percentage >= 80) return { color: '#059669', label: 'Good', barColor: '#059669' };
    if (percentage >= 75) return { color: '#d97706', label: 'Warning', barColor: '#d97706' };
    if (percentage >= 65) return { color: '#ea580c', label: 'Low', barColor: '#ea580c' };
    return { color: '#dc2626', label: 'Critical', barColor: '#dc2626' };
};

// Calculate insight (Bunk Budget or Recovery Plan)
export const getAttendanceInsight = (attended, conducted, totalSemester) => {
    if (!conducted || conducted === 0) return { type: 'neutral', message: "No classes conducted yet." };

    const missed = conducted - attended;
    // You can miss 25% of the TOTAL semester classes.
    const maxMissable = Math.floor(0.25 * totalSemester); 
    const remainingBudget = maxMissable - missed;

    if (remainingBudget > 0) {
        return { type: 'good', message: `Safe to bunk ${remainingBudget} more classes.` };
    } else if (remainingBudget === 0) {
        return { type: 'warning', message: "On the edge! 0 bunks left." };
    } else {
        // Budget exceeded. How many must I attend to recover?
        // Actually, recovery is about raising percentage > 75%
        // But strictly speaking, if you miss > 25% of semester, you can NEVER reach 100% attendance,
        // but you might still reach 75%.
        // Let's stick to the user's "Budget" mental model.
        return { type: 'danger', message: `Limit exceeded by ${Math.abs(remainingBudget)} classes!` };
    }
};

// Helper: Levenshtein Distance (kept)
const levenshteinDistance = (a, b) => {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }
    return matrix[b.length][a.length];
};

// Ensemble Preprocessing
const createEnsembleImages = (imageElement) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const scale = 2; // Keep 2x upscaling
    canvas.width = imageElement.width * scale;
    canvas.height = imageElement.height * scale;
    ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
    
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const originalData = imageData.data; // Keep reference to raw upscaled data
    
    // Pass 1: Standard Grayscale (Good for standard text)
    const pass1 = ctx.createImageData(canvas.width, canvas.height);
    
    // Pass 2: High Contrast (Good for colored backgrounds)
    const pass2 = ctx.createImageData(canvas.width, canvas.height);
    
    // Pass 3: Inverted (Good if some text is light on dark)
    const pass3 = ctx.createImageData(canvas.width, canvas.height);

    for (let i = 0; i < originalData.length; i += 4) {
        const r = originalData[i];
        const g = originalData[i+1];
        const b = originalData[i+2];
        const a = originalData[i+3];
        
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Pass 1: Standard
        pass1.data[i] = gray; pass1.data[i+1] = gray; pass1.data[i+2] = gray; pass1.data[i+3] = a;

        // Pass 2: Threshold 90 (Aggressive)
        const thresh = gray > 90 ? 255 : 0;
        pass2.data[i] = thresh; pass2.data[i+1] = thresh; pass2.data[i+2] = thresh; pass2.data[i+3] = a;
        
        // Pass 3: Inverted of Pass 2
        const inverted = gray > 90 ? 0 : 255;
        pass3.data[i] = inverted; pass3.data[i+1] = inverted; pass3.data[i+2] = inverted; pass3.data[i+3] = a;
    }

    const toUrl = (data) => {
        const tCanvas = document.createElement('canvas');
        tCanvas.width = canvas.width;
        tCanvas.height = canvas.height;
        tCanvas.getContext('2d').putImageData(data, 0, 0);
        return tCanvas.toDataURL();
    }

    return [toUrl(pass1), toUrl(pass2), toUrl(pass3)];
};


// Process uploaded screenshot using Tesseract.js (browser-compatible)
export const processAttendanceScreenshot = async (imageFile) => {
    try {
        const Tesseract = (await import('tesseract.js')).default;
        const img = new Image();
        const objectUrl = URL.createObjectURL(imageFile);
        
        return new Promise((resolve) => {
            img.onload = async () => {
                // 1. Generate Ensemble Images
                const [url1, url2, url3] = createEnsembleImages(img);
                
                const recognizeParams = {
                    logger: m => console.log('OCR log:', m.status, m.progress),
                    tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789%/-().: ',
                    tessedit_pageseg_mode: '6'
                };

                // 2. Run Parallel OCR (The Neural Ensemble)
                console.log('Starting Ensemble processing...');
                const [res1, res2, res3] = await Promise.all([
                    Tesseract.recognize(url1, 'eng', recognizeParams),
                    Tesseract.recognize(url2, 'eng', recognizeParams),
                    Tesseract.recognize(url3, 'eng', recognizeParams)
                ]);
                
                console.log('Ensemble Complete. Merging results...');
                
                // 3. Merge Results
                // We concatenate text to give the parser multiple chances
                // (Or we could parse individually and merge objects. Concatenating is riskier for duplicate matching but with unique ID logic it works)
                // Better approach: Parse each, then merge Objects.
                
                const data1 = parseAttendanceFromOCR(res1.data.text);
                const data2 = parseAttendanceFromOCR(res2.data.text);
                const data3 = parseAttendanceFromOCR(res3.data.text);
                
                // Merge strategy: Take the one with highest 'attended' count? No.
                // Take unique keys. If collision, assume High Contrast (Pass 2) is best for this specific UI?
                // Let's just merge them.
                
                const finalResults = { ...data1, ...data2, ...data3 };
                // Actually, later passes might overwrite earlier. 
                // Pass 2 (High Contrast) usually fixes the "Red Bar" issue. So putting it last or 2nd is good.
                
                resolve(finalResults);
                URL.revokeObjectURL(objectUrl);
            };
            img.src = objectUrl;
        });
    } catch (e) { console.error(e); return null; }
};

// ... parsing logic ...
export const parseAttendanceFromOCR = (ocrText) => {
    const results = {};
    const lines = ocrText.replace(/\|/g, " ").replace(/\[/g, "(").replace(/\]/g, ")").split('\n');

    // Intelligent Parse with Collision Avoidance
    Object.keys(SUBJECTS).forEach(code => {
        if (["Break", "Lunch"].includes(code)) return;

        let bestLineIdx = -1;
        let minDistance = 999;

        // Scan every line
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line.length < 5) continue; 
            const words = line.split(/[\s,:-]+/);
            
            for (const word of words) {
                // Pre-filter by length to avoid '2' matching '21CYS04' via heavy delete
                if (Math.abs(word.length - code.length) > 2) continue;

                const dist = levenshteinDistance(word.toUpperCase(), code);
                
                // Stricter Threshold: 1 for short codes, 2 for long? 
                // Let's stick to 2 but pick buffer "Best Match"
                if (dist <= 2) {
                   // Check if this word matches ANOTHER code better? 
                   // E.g. Word "21CYSP2" vs Code "21CYS04" (dist 2). 
                   // But "21CYSP2" vs Code "21CYSP2" (dist 0).
                   // Complexity: We iterate codes loop. 
                   // Simple fix: Only accept if dist < minDistance for this code
                   if (dist < minDistance) {
                       minDistance = dist;
                       bestLineIdx = i;
                   }
                }
            }
        }

        // Only process if we found a decent match
        if (bestLineIdx !== -1) {
            // Found the Subject Code line. Now find numbers.
             for (let j = bestLineIdx; j <= Math.min(bestLineIdx + 2, lines.length - 1); j++) {
                const line = lines[j];
                const numsMatch = line.match(/(\d{1,3})\s*\/\s*(\d{1,3})/); // stricter 1-3 digits
                
                if (numsMatch) {
                    const attended = parseInt(numsMatch[1]);
                    const total = parseInt(numsMatch[2]);
                    
                    if (total > 0 && attended <= total) {
                        results[code] = {
                            attended: attended,
                            total: total,
                            percentage: calculatePercentage(attended, total)
                        };
                    }
                    break; 
                }
            }
        }
    });
    
    return results;
};

// Import attendance data from screenshot
export const importAttendanceFromScreenshot = async (userId, imageFile) => {
    const parsedData = await processAttendanceScreenshot(imageFile);
    if (!parsedData) return null;
    
    const { attendance: currentData } = await getAttendanceData(userId);
    
    // Update with parsed data
    Object.keys(parsedData).forEach(code => {
        if (currentData[code]) {
            currentData[code].attended = parsedData[code].attended;
            // Keep our calculated total, but use OCR total if ours is 0
            if (currentData[code].total === 0) {
                currentData[code].total = parsedData[code].total;
            }
        } else {
            // New subject from OCR
            currentData[code] = {
                total: parsedData[code].total,
                attended: parsedData[code].attended
            };
        }
    });
    
    await saveAttendanceData(userId, currentData);
    return currentData;
};
