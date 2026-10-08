import { supabase } from './supabaseClient';

// Calculation Constants
const CAT_MAX = 50;
const MODEL_MAX = 100;
const ASSIGNMENT_MAX = 10; // 5 + 5
const SEMINAR_MAX = 5;

// Formula:
// CAT1 (50) -> 10 marks (mark * 2 / 10) => mark * 0.2
// CAT2 (50) -> 10 marks => mark * 0.2
// Model (100) -> 15 marks (mark / 6.6)
// Assign 1 (5) -> 5
// Assign 2 (5) -> 5
// Seminar (5) -> 5
// Total -> 50

export const calculateInternals = (marks) => {
    if (!marks) return { total: 0, breakdown: {} };
    
    const c1 = Number(marks.cat1 || 0);
    const c2 = Number(marks.cat2 || 0);
    const m = Number(marks.model || 0);
    const a1 = Number(marks.assignment1 || 0);
    const a2 = Number(marks.assignment2 || 0);
    const s = Number(marks.seminar || 0);

    const cat1Score = (c1 * 2) / 10;
    const cat2Score = (c2 * 2) / 10;
    const modelScore = m / 6.6;
    
    // Total
    const total = cat1Score + cat2Score + modelScore + a1 + a2 + s;

    return {
        total: Math.min(50, total), // Cap at 50 just in case
        breakdown: {
            cat1: cat1Score.toFixed(2),
            cat2: cat2Score.toFixed(2),
            model: modelScore.toFixed(2),
            assignment1: a1,
            assignment2: a2,
            seminar: s
        }
    };
};

export const fetchMarksForSubject = async (subjectCode) => {
    const { data, error } = await supabase
        .from('exam_marks')
        .select('*')
        .eq('subject_code', subjectCode);
    
    if (error) {
        console.error('Error fetching marks:', error);
        return [];
    }
    return data || [];
};

export const fetchStudentMarks = async (studentId) => {
     const { data, error } = await supabase
        .from('exam_marks')
        .select('*')
        .eq('student_id', studentId);

    if (error) {
        console.error('Error fetching student marks:', error);
        return [];
    }
    return data || [];
};

export const saveStudentMark = async (studentId, subjectCode, markData) => {
    const { error } = await supabase
        .from('exam_marks')
        .upsert([{
            student_id: studentId,
            subject_code: subjectCode,
            ...markData,
            updated_at: new Date().toISOString()
        }], { onConflict: 'student_id,subject_code' });

    if (error) {
        console.error('Error saving mark:', error);
        return { success: false, message: error.message };
    }
    return { success: true };
};
