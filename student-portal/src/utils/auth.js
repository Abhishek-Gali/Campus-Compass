import { sanitizeInput, validateId, validatePassword } from './security';
import { supabase } from './supabaseClient';

export const getUsers = async () => {
    // Password column is excluded from the returned payload for security
    const { data, error } = await supabase
        .from('users')
        .select('id, name, role, access_level, status, created_at, photo');
    
    if (error) {
        console.error('Supabase fetch error:', error);
        return [];
    }
    return data;
};

/**
 * Register a new student account.
 * Primary: Uses the server-side PostgreSQL function auth_register_user (pgcrypto bcrypt).
 * Fallback: Direct insert if migration is pending.
 */
export const register = async (id, password, name, photo) => {
  const sanitizedId = sanitizeInput(id, 32);
  const sanitizedName = sanitizeInput(name, 100);
  
  if (!validateId(sanitizedId)) {
    return { success: false, message: 'Invalid ID format. Alphanumeric only (3-32 characters).' };
  }

  const pwCheck = validatePassword(password);
  if (!pwCheck.valid) {
    return { success: false, message: pwCheck.message };
  }

  // Attempt server-side registration RPC (Bcrypt hashing in Postgres)
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('auth_register_user', {
        p_id: sanitizedId,
        p_password: password,
        p_name: sanitizedName,
        p_photo: photo || null
    });

    if (!rpcError && rpcResult) {
        return rpcResult;
    }
  } catch (e) {
    console.warn('RPC auth_register_user not available, attempting direct fallback...', e);
  }

  // Fallback: Check if ID exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', sanitizedId)
    .single();

  if (existingUser) {
      return { success: false, message: 'User ID already registered' };
  }
  
  const { error } = await supabase
    .from('users')
    .insert([
        {
            id: sanitizedId,
            password: password,
            name: sanitizedName,
            photo: photo,
            status: 'Pending',
            role: 'Student',
            access_level: 3,
            failed_attempts: 0
        }
    ]);

  if (error) {
      console.error('Registration error:', error);
      return { success: false, message: `Registration failed: ${error.message}` };
  }

  return { success: true, message: 'Registration successful! Please wait for admin approval.' };
};

/**
 * Student / ClassRep / Admin Login
 * Primary: Uses PostgreSQL stored procedure auth_login (atomic server-side 7-attempt lockout + bcrypt).
 * Fallback: Client-side check with warning if migration is not yet applied.
 */
export const login = async (id, password) => {
  const cleanId = sanitizeInput(id, 32);

  // 1. Primary: Server-enforced PostgreSQL RPC authentication
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('auth_login', {
        p_id: cleanId,
        p_password: password
    });

    if (!rpcError && rpcResult) {
        if (rpcResult.locked) {
            return {
                success: false,
                message: rpcResult.message,
                locked: true,
                lockedUntil: rpcResult.locked_until
            };
        }
        if (!rpcResult.success) {
            return { success: false, message: rpcResult.message };
        }
        return { success: true, user: rpcResult.user };
    }
  } catch (e) {
    console.warn('RPC auth_login unavailable, falling back to direct table query...', e);
  }

  // 2. Direct fallback (if SQL migration has not yet been executed in Supabase)
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', cleanId)
    .single();
  
  if (error || !user) {
    return { success: false, message: 'Invalid ID or password' };
  }

  // Check Lock Status
  if (user.locked_until) {
    const lockTime = new Date(user.locked_until);
    const now = new Date();
    
    if (now < lockTime) {
       const remainingMs = lockTime - now;
       const remainingMinutes = Math.ceil(remainingMs / 60000);
       return { 
         success: false, 
         message: `Account locked. Try again in ${remainingMinutes} minutes.`,
         locked: true,
         lockedUntil: user.locked_until 
       };
    }
  }
  
  if (user.password !== password) {
      const currentAttempts = user.failed_attempts || 0;
      const newFailedAttempts = currentAttempts + 1;
      
      let updateData = { failed_attempts: newFailedAttempts };
      let locked = false;
      let lockedUntil = null;

      if (newFailedAttempts >= 7) {
          const lockDuration = 5 * 60 * 1000;
          lockedUntil = new Date(Date.now() + lockDuration).toISOString();
          updateData.locked_until = lockedUntil;
          locked = true;
      }

      await supabase.from('users').update(updateData).eq('id', cleanId);

      if (locked) {
         return { 
            success: false, 
            message: `Account locked due to 7 failed attempts. Try again in 5 minutes.`,
            locked: true,
            lockedUntil: lockedUntil
         };
      }

      return { success: false, message: 'Invalid ID or password' };
  }
  
  // Reset counters on success
  if ((user.failed_attempts && user.failed_attempts > 0) || user.locked_until) {
      await supabase.from('users').update({ failed_attempts: 0, locked_until: null }).eq('id', cleanId);
  }
  
  if (user.status === 'Pending') {
    return { success: false, message: 'Account is pending approval' };
  }
  
  if (user.status === 'Rejected') {
    return { success: false, message: 'Account registration rejected' };
  }
  
  // Sanitize user object (never keep password in client state)
  const sanitizedUser = { ...user };
  delete sanitizedUser.password;
  return { success: true, user: sanitizedUser };
};

export const getPendingUsers = async () => {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, role, access_level, status, created_at, photo')
    .eq('status', 'Pending');
    
  return data || [];
};

export const updateUserStatus = async (id, status) => {
  const { error } = await supabase
    .from('users')
    .update({ status: status })
    .eq('id', id);
    
  return !error;
};

/**
 * Administrator login with database verification.
 * Avoids hardcoded plain credentials in the repository.
 */
export const adminLogin = async (username, password) => {
    // 1. Check database for an Admin role matching credentials
    const loginResult = await login(username, password);
    if (loginResult.success && loginResult.user?.role === 'Admin') {
        return { success: true, user: loginResult.user };
    }

    // 2. Check environment-defined bootstrap credentials if configured
    const bootstrapUser = import.meta.env.VITE_ADMIN_BOOTSTRAP_USER;
    const bootstrapPass = import.meta.env.VITE_ADMIN_BOOTSTRAP_PASS;
    if (bootstrapUser && bootstrapPass && username === bootstrapUser && password === bootstrapPass) {
        return { success: true, user: { id: 'ADMIN_BOOTSTRAP', name: 'System Administrator', role: 'Admin', access_level: 0 } };
    }

    return { success: false, message: 'Invalid Administrator Credentials' };
};

/**
 * Updates a user's password using the server-side bcrypt function.
 */
export const updateUserPassword = async (id, newPassword) => {
  const pwCheck = validatePassword(newPassword);
  if (!pwCheck.valid) {
    return { success: false, message: pwCheck.message };
  }

  try {
    const { data, error } = await supabase.rpc('admin_set_user_password', {
      p_target_id: id,
      p_new_password: newPassword
    });
    if (!error && data) return data;
  } catch (e) {
    console.warn('RPC admin_set_user_password not available, falling back to direct update...', e);
  }

  const { error } = await supabase
    .from('users')
    .update({ password: newPassword, failed_attempts: 0, locked_until: null })
    .eq('id', id);
    
  return !error;
};

export const checkNameExists = async (name) => {
    const { data, error } = await supabase
        .from('users')
        .select('name')
        .ilike('name', name);
        
    if (error) return false;
    return data.length > 0;
};

// --- Class Rep Management ---

export const createClassRep = async (id, password, name, level) => {
    const { data: existing } = await supabase.from('users').select('id').eq('id', id).single();
    if (existing) return { success: false, message: 'ID already exists' };

    const pwCheck = validatePassword(password);
    if (!pwCheck.valid) {
        return { success: false, message: pwCheck.message };
    }

    // Attempt RPC registration or fallback
    try {
        const { data: rpcResult, error: rpcError } = await supabase.rpc('auth_register_user', {
            p_id: id,
            p_password: password,
            p_name: name
        });
        if (!rpcError && rpcResult?.success) {
            await supabase.from('users').update({
                role: 'ClassRep',
                access_level: parseInt(level),
                status: 'Active'
            }).eq('id', id);
            return { success: true };
        }
    } catch (e) {
        console.warn('RPC fallback for createClassRep...', e);
    }

    const { error } = await supabase.from('users').insert([{
        id,
        password,
        name,
        role: 'ClassRep',
        access_level: parseInt(level),
        status: 'Active',
        photo: null
    }]);

    if (error) {
        console.error('Error creating Class Rep:', error);
        return { success: false, message: error.message };
    }
    return { success: true };
};

export const getClassReps = async () => {
    const { data, error } = await supabase
        .from('users')
        .select('id, name, role, access_level, status, created_at')
        .eq('role', 'ClassRep')
        .order('access_level', { ascending: true });
    
    if (error) return [];
    return data;
};

export const deleteUser = async (id) => {
    const { error } = await supabase.from('users').delete().eq('id', id);
    return !error;
};

// --- Teacher Management ---

export const teacherLogin = async (id, password) => {
  const cleanId = sanitizeInput(id, 32);

  // 1. Primary: Server-enforced PostgreSQL RPC authentication
  try {
    const { data: rpcResult, error: rpcError } = await supabase.rpc('auth_teacher_login', {
        p_id: cleanId,
        p_password: password
    });

    if (!rpcError && rpcResult) {
        if (rpcResult.locked) {
            return {
                success: false,
                message: rpcResult.message,
                locked: true,
                lockedUntil: rpcResult.locked_until
            };
        }
        if (!rpcResult.success) {
            return { success: false, message: rpcResult.message };
        }
        return { success: true, user: rpcResult.user };
    }
  } catch (e) {
    console.warn('RPC auth_teacher_login unavailable, falling back...', e);
  }

  // 2. Direct fallback
  const { data: teacher, error } = await supabase
    .from('teachers')
    .select('*')
    .eq('id', cleanId)
    .single();
  
  if (error || !teacher) {
    return { success: false, message: 'Invalid ID or password' };
  }

  if (teacher.locked_until) {
    const lockTime = new Date(teacher.locked_until);
    const now = new Date();
    
    if (now < lockTime) {
       const remainingMs = lockTime - now;
       const remainingMinutes = Math.ceil(remainingMs / 60000);
       return { 
         success: false, 
         message: `Account locked. Try again in ${remainingMinutes} minutes.`,
         locked: true,
         lockedUntil: teacher.locked_until 
       };
    }
  }
  
  if (teacher.password !== password) {
      const currentAttempts = teacher.failed_attempts || 0;
      const newFailedAttempts = currentAttempts + 1;
      
      let updateData = { failed_attempts: newFailedAttempts };
      let locked = false;
      let lockedUntil = null;

      if (newFailedAttempts >= 7) {
          const lockDuration = 5 * 60 * 1000;
          lockedUntil = new Date(Date.now() + lockDuration).toISOString();
          updateData.locked_until = lockedUntil;
          locked = true;
      }

      await supabase.from('teachers').update(updateData).eq('id', cleanId);

      if (locked) {
         return { 
            success: false, 
            message: `Account locked due to 7 failed attempts. Try again in 5 minutes.`,
            locked: true,
            lockedUntil: lockedUntil
         };
      }

      return { success: false, message: 'Invalid ID or password' };
  }
  
  if ((teacher.failed_attempts && teacher.failed_attempts > 0) || teacher.locked_until) {
      await supabase.from('teachers').update({ failed_attempts: 0, locked_until: null }).eq('id', cleanId);
  }
  
  if (teacher.status !== 'Active') {
    return { success: false, message: 'Account is not active' };
  }
  
  const sanitizedTeacher = { ...teacher };
  delete sanitizedTeacher.password;
  return { success: true, user: sanitizedTeacher };
};

export const createTeacher = async (id, password, name, subjectCode) => {
    const { data: existing } = await supabase.from('teachers').select('id').eq('id', id).single();
    if (existing) return { success: false, message: 'ID already exists' };

    const { error } = await supabase.from('teachers').insert([{
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
        console.error('Error creating Teacher:', error);
        return { success: false, message: error.message };
    }
    return { success: true };
};

export const getTeachers = async () => {
    const { data, error } = await supabase
        .from('teachers')
        .select('id, name, subject_code, role, access_level, status, created_at')
        .order('subject_code', { ascending: true });
    
    if (error) return [];
    return data;
};

export const updateTeacher = async (id, updates) => {
    const cleanUpdates = { ...updates };
    delete cleanUpdates.password; // Do not update password through generic update
    const { error } = await supabase
        .from('teachers')
        .update(cleanUpdates)
        .eq('id', id);
    
    return !error;
};

export const deleteTeacher = async (id) => {
    const { error } = await supabase.from('teachers').delete().eq('id', id);
    return !error;
};

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
        .update({ 
            password: newPassword,
            failed_attempts: 0,
            locked_until: null
        })
        .eq('id', id);
    
    if (error) {
        console.error('Error updating teacher password:', error);
        return { success: false, message: 'Failed to update password' };
    }
    
    return { success: true, message: 'Password updated successfully' };
};
