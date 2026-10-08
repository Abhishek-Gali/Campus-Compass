import { supabase } from './supabaseClient';
import { STUDENT_DATA } from './studentData';

// Hierarchy: 0=Admin, 1=Level 1, 2=Level 2, 3=Level 3
// Lower number = Higher Authority

export const fetchMockAttendance = async (date, period) => {
    try {
        const { data, error } = await supabase
            .from('mock_attendance')
            .select('*')
            .eq('date', date)
            .eq('period', period); // Granular fetch

        if (error) throw error;
        return { success: true, data };
    } catch (err) {
        console.error('Error fetching mock attendance:', err);
        return { success: false, error: err.message };
    }
};

export const saveMockAttendance = async (date, period, updates, userRole, userLevel) => {
    // Determine numeric level for current user
    let currentLevel = 3; // Default lowest
    if (userRole === 'Admin') {
        currentLevel = 0; // Usage: Admin overrides all
    } else if (userRole === 'ClassRep') {
        currentLevel = userLevel || 3;
    } else {
        return { success: false, message: 'Unauthorized' };
    }

    try {
        // 1. Fetch existing records for this date AND period to check conflicts
        const { data: existingRecords } = await supabase
            .from('mock_attendance')
            .select('student_id, updated_by_role')
            .eq('date', date)
            .eq('period', period);

        const existingMap = {};
        if (existingRecords) {
            existingRecords.forEach(r => existingMap[r.student_id] = r.updated_by_role);
        }

        // 2. Filter updates that differ from current state
        const validUpdates = [];
        const permissionDeniedLists = [];

        for (const update of updates) {
            const existingLevel = existingMap[update.student_id];
            
            // Logic: Can only overwrite if Current Level is <= Existing Level (Higher or Equal authority)
            // If no existing record (existingLevel is undefined), we can write.
            if (existingLevel !== undefined && currentLevel > existingLevel) {
                permissionDeniedLists.push(update.student_id);
                continue; 
            }

            validUpdates.push({
                date: date,
                period: period, // Add period to record
                student_id: update.student_id,
                status: update.status,
                reason: update.reason || null,
                updated_by_role: currentLevel,
                last_updated: new Date().toISOString()
            });
        }

        if (validUpdates.length === 0 && permissionDeniedLists.length > 0) {
            return { success: false, message: 'Permission Denied: Higher authority has locked these records.' };
        }

        if (validUpdates.length > 0) {
            // Upsert valid updates
            // Composite PK in Supabase should now be (date, period, student_id)
            const { error } = await supabase
                .from('mock_attendance')
                .upsert(validUpdates, { onConflict: 'date, period, student_id' }); 

            if (error) throw error;
        }

        return { 
            success: true, 
            message: `Saved ${validUpdates.length} records.` + (permissionDeniedLists.length > 0 ? ` (${permissionDeniedLists.length} skipped due to hierarchy)` : '')
        };

    } catch (err) {
        console.error('Error saving mock attendance:', err);
        const errMsg = err?.message || String(err);
        if (errMsg.includes('Security Policy Violation') || errMsg.includes('Permission Denied')) {
            return { success: false, message: 'Database Security Policy: Cannot override attendance locked by a higher authority.' };
        }
        return { success: false, error: errMsg };
    }
};

export const deleteMockAttendance = async (date, period) => {
    try {
        // Only Admin usually, but we check role in UI/RLS often. 
        // Here we assume caller validates permission (Admin only).
        const { error } = await supabase
            .from('mock_attendance')
            .delete()
            .eq('date', date)
            .eq('period', period);

        if (error) throw error;
        return { success: true, message: 'Attendance records deleted.' };
    } catch (err) {
        console.error('Error deleting mock attendance:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Fetch list of periods that have attendance taken for a specific date.
 * Optimized for Egress: ONLY selects 'period' column, no student data.
 */
export const getAttendanceSummary = async (date) => {
    try {
        const { data, error } = await supabase
            .from('mock_attendance')
            .select('period')
            .eq('date', date);

        if (error) throw error;
        
        // Return unique periods
        const periods = new Set(data.map(item => item.period));
        return { success: true, periods: Array.from(periods) };
    } catch (err) {
        console.error('Error fetching attendance summary:', err);
        return { success: false, error: err.message };
    }
};

/**
 * Subscribe to Realtime changes for mock_attendance on a specific date.
 * Triggers callback whenever any Insert/Update/Delete happens for that date.
 */
export const subscribeToAttendanceForDate = (date, callback) => {
    const channel = supabase
        .channel(`attendance_updates_${date}`)
        .on(
            'postgres_changes',
            {
                event: '*',
                schema: 'public',
                table: 'mock_attendance',
                filter: `date=eq.${date}`
            },
            (payload) => {
                console.log('Realtime Attendance Change:', payload);
                callback();
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};
