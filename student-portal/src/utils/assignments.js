// Assignments Management Utilities
import { supabase } from './supabaseClient';
import { getLocalISOString } from './schedule';

/**
 * Get all assignments
 * @returns {Promise<Array>}
 */
export const getAssignments = async () => {
    try {
        const { data, error } = await supabase
            .from('assignments')
            .select('*')
            .order('due_date', { ascending: true });
        
        if (error) {
            console.error('Error fetching assignments:', error);
            return [];
        }
        
        // Map database fields to application fields if they differ
        // given_date -> givenDate, due_date -> dueDate
        return (data || []).map(a => ({
            ...a,
            givenDate: a.given_date,
            dueDate: a.due_date
        }));
    } catch (e) {
        console.error('Failed to get assignments:', e);
        return [];
    }
};

/**
 * Add a new assignment (Admin only)
 * @param {Object} assignment - { title, subject, dueDate, description }
 * @returns {Promise<Object>}
 */
export const addAssignment = async (assignment) => {
    try {
        const { data, error } = await supabase
            .from('assignments')
            .insert([{
                title: assignment.title,
                subject: assignment.subject,
                given_date: assignment.givenDate || getLocalISOString(new Date()),
                due_date: assignment.dueDate,
                description: assignment.description,
                status: 'pending'
            }])
            .select()
            .single();

        if (error) {
            console.error('Error adding assignment:', error);
            return { success: false, message: error.message };
        }

        return { 
            success: true, 
            assignment: {
                ...data,
                givenDate: data.given_date,
                dueDate: data.due_date
            } 
        };
    } catch (e) {
        console.error('Failed to add assignment:', e);
        return { success: false, message: e.message };
    }
};

/**
 * Update an existing assignment
 * @param {string} id 
 * @param {Object} updates 
 * @returns {Promise<Object>}
 */
export const updateAssignment = async (id, updates) => {
    try {
        const dbUpdates = {
            title: updates.title,
            subject: updates.subject,
            given_date: updates.givenDate,
            due_date: updates.dueDate,
            description: updates.description,
            status: updates.status
        };

        // Remove undefined fields
        Object.keys(dbUpdates).forEach(key => dbUpdates[key] === undefined && delete dbUpdates[key]);

        const { data, error } = await supabase
            .from('assignments')
            .update(dbUpdates)
            .eq('id', id)
            .select()
            .single();

        if (error) {
            console.error('Error updating assignment:', error);
            return { success: false, message: error.message };
        }

        return { 
            success: true, 
            assignment: {
                ...data,
                givenDate: data.given_date,
                dueDate: data.due_date
            } 
        };
    } catch (e) {
        console.error('Failed to update assignment:', e);
        return { success: false, message: e.message };
    }
};

/**
 * Delete an assignment
 * @param {string} id 
 * @returns {Promise<Object>}
 */
export const deleteAssignment = async (id) => {
    try {
        const { error } = await supabase
            .from('assignments')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting assignment:', error);
            return { success: false, message: error.message };
        }

        return { success: true };
    } catch (e) {
        console.error('Failed to delete assignment:', e);
        return { success: false, message: e.message };
    }
};
