import { supabase } from './supabaseClient';

export const getContacts = async () => {
    const { data, error } = await supabase
        .from('contacts')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('Error fetching contacts:', error);
        return [];
    }
    return data;
};

export const addContact = async (name, phone) => {
    const { data, error } = await supabase
        .from('contacts')
        .insert([{ name, phone }])
        .select();

    if (error) {
        console.error('Error adding contact:', error);
        return null;
    }
    return data ? data[0] : null;
};

export const deleteContact = async (id) => {
    const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting contact:', error);
        return false;
    }
    return true;
};
