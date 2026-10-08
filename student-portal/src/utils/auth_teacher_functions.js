import { supabase } from './supabaseClient';
import { validatePassword } from './security';

export const deleteTeacher = async (id) => {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    return !error;
};

// Update teacher password (for admin use) using bcrypt RPC
export const updateTeacherPassword = async (id, newPassword) => {
    const pwCheck = validatePassword(newPassword);
    if (!pwCheck.valid) {
        return { success: false, message: pwCheck.message };
    }

    try {
        const { data, error } = await supabase.rpc('admin_set_teacher_password', {
            p_teacher_id: id,
            p_new_password: newPassword
        });
        if (!error && data) return data;
    } catch (e) {
        console.warn('RPC admin_set_teacher_password unavailable, falling back...', e);
    }

    const { error } = await supabase
        .from('teachers')
        .update({ password: newPassword, failed_attempts: 0, locked_until: null })
        .eq('id', id);
    
    if (error) {
        console.error('Error updating teacher password:', error);
        return { success: false, message: 'Failed to update password' };
    }
    
    return { success: true, message: 'Password updated successfully' };
};

// Create new teacher account (for admin use)
export const createTeacher = async (id, password, name, subjectCode) => {
    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
        return { success: false, message: pwCheck.message };
    }

    const { error } = await supabase
        .from('teachers')
        .insert([{
            id,
            password,
            name,
            subject_code: subjectCode,
            role: 'Teacher',
            access_level: 2,
            status: 'Active',
            failed_attempts: 0
        }]);
    
    if (error) {
        console.error('Error creating teacher:', error);
        return { success: false, message: error.message };
    }
    
    return { success: true };
};
