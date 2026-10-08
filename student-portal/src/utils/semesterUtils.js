import { supabase } from './supabaseClient';
import { calculateSGPA, getGradePoint } from './pdfProcessor';

// Save full semester data
export const saveSemesterData = async (userId, semesterData) => {
    try {
        // 1. Check if semester exists for user
        const { data: existingSem, error: fetchError } = await supabase
            .from('semester_records')
            .select('id')
            .eq('user_id', userId)
            .eq('semester_name', semesterData.semester)
            .single();

        let semesterId;

        if (existingSem) {
            semesterId = existingSem.id;
            // Update existing semester stats
            const { error: updateError } = await supabase
                .from('semester_records')
                .update({
                    sgpa: semesterData.calculatedSGPA || semesterData.printedSGPA,
                    total_credits: semesterData.totalCredits
                })
                .eq('id', semesterId);

            if (updateError) throw updateError;

            // DELETE existing subjects to avoid duplicates (Clean Slate)
            const { error: deleteError } = await supabase
                .from('semester_subjects')
                .delete()
                .eq('semester_record_id', semesterId);
            
            if (deleteError) throw deleteError;

        } else {
            // Create new semester
            const { data: newSem, error: insertError } = await supabase
                .from('semester_records')
                .insert([{
                    user_id: userId,
                    semester_name: semesterData.semester,
                    sgpa: semesterData.calculatedSGPA || semesterData.printedSGPA,
                    total_credits: semesterData.totalCredits
                }])
                .select()
                .single();

            if (insertError) throw insertError;
            semesterId = newSem.id;
        }

        // 2. Insert Subjects
        // Deduplicate subjects by subject_code just in case the parser found duplicates
        const uniqueSubjects = new Map();
        semesterData.subjects.forEach(sub => {
            if (!uniqueSubjects.has(sub.code)) {
                uniqueSubjects.set(sub.code, {
                    semester_record_id: semesterId,
                    subject_code: sub.code,
                    subject_name: sub.name,
                    credits: sub.credits,
                    grade: sub.grade,
                    grade_point: getGradePoint(sub.grade),
                    user_id: userId,
                    result_status: getGradePoint(sub.grade) > 0 ? 'Pass' : 'Fail'
                });
            }
        });

        const subjectsToInsert = Array.from(uniqueSubjects.values());

        if (subjectsToInsert.length > 0) {
            const { error: subjectError } = await supabase
                .from('semester_subjects')
                .insert(subjectsToInsert);

            if (subjectError) throw subjectError;
        }

        return { success: true };
    } catch (error) {
        console.error('Error saving semester:', error);
        return { success: false, error: error.message };
    }
};

// Fetch all semesters for a user
export const fetchSemesters = async (userId) => {
    const { data, error } = await supabase
        .from('semester_records')
        .select('*')
        .eq('user_id', userId)
        .order('semester_name', { ascending: true }); // Need better sorting logic if "Semester 1", "Semester 2" string sort works ok for single digits.

    if (error) {
        console.error('Error fetching semesters:', error);
        return [];
    }
    return data;
};

// Calculate Overall CGPA
// Formula: Σ (SGPA * SemCredits) / Σ (TotalCredits)
export const calculateCGPA = (semesters) => {
    let totalWeightedPoints = 0;
    let totalCredits = 0;

    semesters.forEach(sem => {
        totalWeightedPoints += sem.sgpa * sem.total_credits;
        totalCredits += sem.total_credits;
    });

    if (totalCredits === 0) return 0;
    return parseFloat((totalWeightedPoints / totalCredits).toFixed(2));
};

// Fetch Student Goals
export const fetchStudentGoals = async (userId) => {
    const { data, error } = await supabase
        .from('student_goals')
        .select('*')
        .eq('user_id', userId)
        .single();
    
    if (error && error.code !== 'PGRST116') {
        console.error('Error fetching goals:', error);
    }
    return data || { target_cgpa: 0, target_sgpa_next: 0 };
};

// Save Goals
export const saveStudentGoals = async (userId, goals) => {
    const { error } = await supabase
        .from('student_goals')
        .upsert({
            user_id: userId,
            ...goals,
            updated_at: new Date().toISOString()
        });
    
    if (error) {
        console.error('Error saving goals:', error);
        return { success: false, error: error.message };
    }
    return { success: true };
};

/**
 * Calculate Required SGPA for Next Semester to reach Target CGPA
 * TargetCGPA = (CurrentCGPA * CurrentCredits + RequiredSGPA * NextSemCredits) / (CurrentCredits + NextSemCredits)
 * 
 * Solve for RequiredSGPA:
 * TargetCGPA * (CurrentCredits + NextSemCredits) = (CurrentCGPA * CurrentCredits) + (RequiredSGPA * NextSemCredits)
 * (TargetCGPA * (C + N)) - (CurrCGPA * C) = ReqSGPA * N
 * ReqSGPA = ((TargetCGPA * (C + N)) - (CurrCGPA * C)) / N
 */
export const calculateRequiredSGPA = (currentCGPA, currentCredits, targetCGPA, nextSemCredits = 24) => {
    // Default nextSemCredits to 24 if unknown (standard engineering semester)
    
    if (nextSemCredits === 0) return 0; // Avoid division by zero

    const numerator = (targetCGPA * (currentCredits + nextSemCredits)) - (currentCGPA * currentCredits);
    const requiredSGPA = numerator / nextSemCredits;

    return parseFloat(requiredSGPA.toFixed(2));
};

export const getFeasibility = (requiredSGPA) => {
    if (requiredSGPA > 10) return { status: 'Impossible', color: '#ff4757', message: '> 10.0' };
    if (requiredSGPA <= 0) return { status: 'Achieved', color: '#2ed573', message: 'Already Done' };
    if (requiredSGPA > 9) return { status: 'Difficult', color: '#ffa502', message: requiredSGPA };
    if (requiredSGPA > 8) return { status: 'Moderate', color: '#eccc68', message: requiredSGPA };
    return { status: 'Easy', color: '#7bed9f', message: requiredSGPA };
};

// Delete Semester
export const deleteSemester = async (semesterId) => {
    try {
        const { error } = await supabase
            .from('semester_records')
            .delete()
            .eq('id', semesterId);

        if (error) throw error;
        return { success: true };
    } catch (error) {
        console.error('Error deleting semester:', error);
        return { success: false, error: error.message };
    }
};
