// Schedule Data extracted from User Documents
import { supabase } from './supabaseClient';


// Subjects and Faculty Mapping with Colors
export const SUBJECTS = {
  "21CYSP2": { name: "Web Mining Lab", faculty: "Mrs.D.Sasikala", color: "#a8e6cf", drive_link: "https://drive.google.com/drive/folders/1jOoECstiJE4bYwjaZIgJQUAe7zwdbYgB?usp=sharing" }, // Mint
  "21GEN06": { name: "Disaster Management", faculty: "Dr.M.G.Geena", color: "#dcedc1", drive_link: "https://drive.google.com/drive/folders/1gsvaeu-8lRU88E5qyxXAKMhyTxyozspC?usp=sharing" }, // Tea Green
  "21INT01": { name: "Info Retrieval System", faculty: "Dr.N.Sundara Rajulu", color: "#ffd3b6", drive_link: "https://drive.google.com/drive/folders/1jtLIPLfvBf4ioz-R4XhcB0vTBHiGgWTq?usp=sharing" }, // Peach
  "21AID10": { name: "Data Analytics", faculty: "Mrs.D.Sasikala", color: "#ffaaa5", drive_link: "https://drive.google.com/drive/folders/1NQrLTMEdTNKavA9lFyNFCtm3iDW2sGTm?usp=sharing" }, // Salmon
  "21CYS04": { name: "Web Mining", faculty: "Mrs.Sasikala", color: "#8be3f3", drive_link: "https://drive.google.com/drive/folders/1c21WJ5irMGvEZGLKRKjRs-eWgQQeQRG0?usp=sharing" }, // Cyan
  "21OEE13": { name: "Sensors and Transducers", faculty: "Mrs.R.Devika", color: "#bfaeeb", drive_link: "https://drive.google.com/drive/folders/1mNx7smzuflmsdNLsqT1EsrtiHI0g381m?usp=sharing" }, // Lavender
  "21CSE10": { name: "Cryptography & Net Sec", faculty: "Dr.N.Sundara Rajulu", color: "#faddbd", drive_link: "https://drive.google.com/drive/folders/13y0Hw6DgJCcDbeGVIwh-gMzBldt5J1ah?usp=sharing" }, // Apricot
  "21CSEMP": { name: "Mini Project", faculty: "Dr.N.Sundara Rajulu", color: "#ff8b94", drive_link: "https://drive.google.com/drive/folders/1OAgnmpb_CPcNKBXZEWVRDsrq26TIIcGd?usp=sharing" }, // Pink
  "21ENGP3": { name: "Prof Comm Lab", faculty: "Mr.A.Joseph Vinoth Kumar", color: "#cfd8dc", drive_link: "https://drive.google.com/drive/folders/18_WYHW_ALbG8wRMKyt13Lnokgbw_0Wy1?usp=sharing" }, // Grey Blue
  "Break": { name: "Break", faculty: "-", color: "rgba(255,255,255,0.05)" },
  "Lunch": { name: "Lunch", faculty: "-", color: "rgba(255,255,255,0.05)" }
};

/**
 * Returns YYYY-MM-DD string based on LOCAL system time, not UTC.
 * Resolves issue where early morning (e.g. 2 AM) returns previous day date.
 */
export const getLocalISOString = (dateObj = new Date()) => {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Weekly Timetable (0=Mon, 1=Tue, ... 5=Sat)
// Periods: 1-8. For simplicity, listing subject codes in order.
export const WEEKLY_TIMETABLE = {
  0: ["21CYSP2", "21CYSP2", "21CYSP2", "21GEN06", "21INT01", "21AID10", "21CYS04"],
  1: ["21CYS04", "Break", "21OEE13", "21CSE10", "Lunch", "21INT01", "21AID10", "21CYS04"], // Adjusted based on slot visual
  // Let's abstract slots to 8 periods for cleaner UI mapping
  // Visual Inspection of Image again:
  // Mon: 21CYSP2 (3 periods), Break, 21GEN06, 21INT01, Break, 21AID10, 21CYS04
  // Tue: Break, Break, ... Wait, the structure is:
  // Slots: 8:30, 9:20, 10:10 | 11:00 (Break) | 11:15, 12:05 | 12:55 (Lunch) | 1:25, 2:15 | 3:05 (Break) | 3:20, 4:10
  // Let's simplify to a list of sessions.
};

const RAW_TIMETABLE = {
    0: [ // Mon
        { time: "09:20 - 10:10", code: "21CYSP2" },  // Web Mining Lab Period 1
        { time: "10:10 - 11:00", code: "21CYSP2" },  // Web Mining Lab Period 2
        { time: "01:25 - 02:15", code: "21GEN06" },
        { time: "02:15 - 03:05", code: "21INT01" },
        { time: "03:20 - 04:10", code: "21AID10" },
        { time: "04:10 - 05:00", code: "21CYS04" },
    ],
    1: [ // Tue
        { time: "01:25 - 02:15", code: "21CYS04" },
        { time: "02:15 - 03:05", code: "21OEE13" },
        { time: "03:20 - 04:10", code: "21CSE10" },
        { time: "04:10 - 05:00", code: "21INT01" },
    ],
    2: [ // Wed
        { time: "11:15 - 12:05", code: "21ENGP3", type: "Lab" },  // English Lab Period 1
        { time: "12:05 - 12:55", code: "21ENGP3", type: "Lab" },  // English Lab Period 2
        { time: "01:25 - 02:15", code: "21OEE13" },
        { time: "02:15 - 03:05", code: "21CYS04" },
        { time: "03:20 - 04:10", code: "21CSEMP" },  // Mini Project Period 1
        { time: "04:10 - 05:00", code: "21CSEMP" },  // Mini Project Period 2
    ],
    3: [ // Thu
        { time: "01:25 - 02:15", code: "21GEN06" },
        { time: "02:15 - 03:05", code: "21AID10" },
        { time: "03:20 - 04:10", code: "21OEE13" },
        { time: "04:10 - 05:00", code: "21CSE10" },
    ],
    4: [ // Fri
        { time: "01:25 - 02:15", code: "21CSE10" },
        { time: "02:15 - 03:05", code: "21AID10" },
        { time: "03:20 - 04:10", code: "21GEN06" },
        { time: "04:10 - 05:00", code: "21INT01" },
    ]
};

// Holidays List (YYYY-MM-DD strings)
export const HOLIDAYS = [
    "2026-01-01", "2026-01-03", "2026-01-14", "2026-01-15", "2026-01-16", "2026-01-17", "2026-01-26",
    "2026-02-07", "2026-02-21",
    "2026-03-07", "2026-03-15", "2026-03-20",
    "2026-04-03", "2026-04-04", "2026-04-13", "2026-04-14", "2026-04-26"
];

const getCustomHolidays = () => {
  try {
    const stored = localStorage.getItem('custom_holidays');
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    return [];
  }
};

// Use local time constructor (year, month-1, day) to avoid timezone issues
// new Date("2026-01-05") is UTC midnight, which may differ from local midnight
const SEMESTER_START = new Date(2026, 0, 5); // Jan 5, 2026 (Monday) local time
const SEMESTER_END = new Date(2026, 3, 29);  // April 29, 2026 local time

// Timetable overrides cache
let timetableOverridesCache = {};
// Track which months we have fully fetched to avoid individual queries for empty days
let prefetchedMonths = new Set();

/**
 * Prefetch data for a given month to minimize DB calls
 */
export const prefetchMonthData = async (year, month) => {
    // Check if already prefetched to avoid double work
    const monthKey = `${year}-${month}`;
    if (prefetchedMonths.has(monthKey)) return;

    // 1. Fetch academic_schedule (Global Overrides)
    await fetchScheduleOverrides();

    // 2. Fetch timetable_overrides (Custom Slot Edits)
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0); // Last day of month
    
    // ISO Date Strings
    const startStr = getLocalISOString(startDate);
    const endStr = getLocalISOString(endDate);

    try {
        const { data, error } = await supabase
            .from('timetable_overrides')
            .select('date, schedule')
            .gte('date', startStr)
            .lte('date', endStr);
            
        if (error) {
            console.error('Error prefetching month data:', error);
            return;
        }

        if (data) {
            data.forEach(row => {
                timetableOverridesCache[row.date] = row.schedule;
            });
        }
        
        // Mark this month as completely fetched
        prefetchedMonths.add(monthKey);
        
    } catch (e) {
        console.error("Prefetch error:", e);
    }
};

/**
 * Get custom schedule override for a specific date from Supabase
 * @param {string} dateStr 
 * @returns {Promise<Array|null>}
 */
const getCustomSchedule = async (dateStr) => {
    // Check cache first (positive hit)
    if (timetableOverridesCache[dateStr]) return timetableOverridesCache[dateStr];

    // Check if we have already prefetched this month (negative hit logic)
    // If we prefetched the month, and it's not in cache, IT DOES NOT EXIST.
    const d = new Date(dateStr);
    const monthKey = `${d.getFullYear()}-${d.getMonth()}`;
    if (prefetchedMonths.has(monthKey)) {
        return null; // Return null immediately, do not fetch
    }

    try {
        const { data, error } = await supabase
            .from('timetable_overrides')
            .select('schedule')
            .eq('date', dateStr)
            .single();
        
        if (error) {
            if (error.code !== 'PGRST116') { // Not found error is expected
                console.error('Error fetching timetable override:', error);
            }
            return null;
        }
        
        // Cache it
        if (data) timetableOverridesCache[dateStr] = data.schedule;
        
        return data ? data.schedule : null;
    } catch (e) {
        console.error('Failed to get custom schedule:', e);
        return null;
    }
};

/**
 * Save custom schedule override to Supabase
 * @param {string} dateStr 
 * @param {Array} scheduleArray 
 * @returns {Promise<boolean>}
 */
export const saveCustomSchedule = async (dateStr, scheduleArray) => {
    try {
        const { error } = await supabase
            .from('timetable_overrides')
            .upsert([{ 
                date: dateStr, 
                schedule: scheduleArray 
            }], { onConflict: 'date' });
        
        if (error) {
            console.error('Error saving timetable override:', error);
            return false;
        }
        
        // Update local cache immediately
        timetableOverridesCache[dateStr] = scheduleArray;
        
        // Notify listeners (Dashboard, MockAttendance, etc.)
        notifyScheduleListeners();

        return true;
    } catch(e) {
        console.error('Failed to save custom schedule:', e);
        return false;
    }
};


// Schedule overrides cache
let scheduleOverridesCache = null;

// Fetch all schedule overrides from Supabase
export const fetchScheduleOverrides = async () => {
    try {
        const { data, error } = await supabase
            .from('academic_schedule')
            .select('*');
        
        if (error) {
            console.error('Error fetching schedule overrides:', error);
            return [];
        }
        
        scheduleOverridesCache = data || [];
        return scheduleOverridesCache;
    } catch (e) {
        console.error('Failed to fetch schedule overrides:', e);
        return [];
    }
};

// Add a schedule override (holiday or working day conversion)
export const addScheduleOverride = async (date, type, dayOrder = null, name = null, customSlots = null) => {
    try {
        const { data, error } = await supabase
            .from('academic_schedule')
            .upsert([{ 
                date, 
                type, 
                day_order: dayOrder, 
                name, 
                custom_slots: customSlots 
            }], { onConflict: 'date' });
        
        if (error) {
            console.error('Error adding schedule override:', error);
            return { success: false, error: error.message };
        }
        
        await fetchScheduleOverrides(); // Refresh cache
        notifyScheduleListeners();
        return { success: true };
    } catch (e) {
        console.error('Failed to add schedule override:', e);
        return { success: false, error: e.message };
    }
};

// Delete a schedule override
export const deleteScheduleOverride = async (date) => {
    try {
        const { error } = await supabase
            .from('academic_schedule')
            .delete()
            .eq('date', date);
        
        if (error) {
            console.error('Error deleting schedule override:', error);
            return { success: false, error: error.message };
        }
        
        await fetchScheduleOverrides(); // Refresh cache
        notifyScheduleListeners();
        return { success: true };
    } catch (e) {
        console.error('Failed to delete schedule override:', e);
        return { success: false, error: e.message };
    }
};

// Get override for a specific date (synchronous, uses cache)
const getScheduleOverride = (dateStr) => {
    if (!scheduleOverridesCache) return null;
    return scheduleOverridesCache.find(item => item.date === dateStr) || null;
};

export const getScheduleForDate = async (dateObj) => {
    // Basic checks
    if (dateObj < SEMESTER_START || dateObj > SEMESTER_END) return null;
    
    // Check Sunday
    if (dateObj.getDay() === 0) return { type: "Holiday", name: "Sunday" };

    // Check Holiday
    const dateStr = getLocalISOString(dateObj);
    
    // **Priority 1: Check Supabase Schedule Override (Holidays/Working Order)**
    const override = getScheduleOverride(dateStr);
    if (override) {
        if (override.type === 'holiday') {
            return { type: "Holiday", name: override.name || "Custom Holiday" };
        } else if (override.type === 'working' && override.day_order !== null) {
            // Use the raw timetable directly for the specified day order
            // IMPORTANT: Don't recursively call getScheduleForDate here - it causes infinite recursion
            // if the target date also has an override
            return { 
                type: "Working", 
                schedule: RAW_TIMETABLE[override.day_order] || [], 
                note: `Following ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'][override.day_order]} Order` 
            };
        }
    }
    
    // **Priority 2: Check Supabase Timetable Overrides (Edit Slot Logic)**
    const customSchedule = await getCustomSchedule(dateStr);
    if (customSchedule) {
        return { type: "Working", schedule: customSchedule, note: "Modified Schedule" };
    }

    // **Priority 3: Check Hardcoded Holidays**
    if (HOLIDAYS.includes(dateStr)) return { type: "Holiday", name: "Holiday" };
    
    // **Priority 4: Check localStorage Custom Holiday (legacy - soon to be removed if unwanted)**
    const customHolidays = getCustomHolidays();
    const customHoliday = customHolidays.find(h => h.date === dateStr);
    if (customHoliday) return { type: "Holiday", name: customHoliday.name || "Special Holiday" };

    // Check Saturday
    if (dateObj.getDay() === 6) {
        // Calculate Working Saturday Alternation
        // We need to count working saturdays from start of sem
        let workSatCount = 0;
        let d = new Date(SEMESTER_START);
        while (d <= dateObj) {
            const dStr = getLocalISOString(d);
            const isCustomHol = getCustomHolidays().some(h => h.date === dStr);
            
            if (d.getDay() === 6 && !HOLIDAYS.includes(dStr) && !isCustomHol) {
                if (d.getTime() === dateObj.getTime()) {
                    break;
                }
                workSatCount++;
            }
            d.setDate(d.getDate() + 1);
        }
        
        // Even index = Mon TT, Odd index = Tue TT
        const ttIndex = workSatCount % 2; 
        return { type: "Working", schedule: RAW_TIMETABLE[ttIndex], note: ttIndex === 0 ? "Monday Order" : "Tuesday Order" };
    }

    // Weekday
    return { type: "Working", schedule: RAW_TIMETABLE[dateObj.getDay() - 1] || [] };
};

// --- SUBSCRIPTION SYSTEM FOR REAL-TIME UPDATES (LOCAL) ---
const scheduleListeners = new Set();

export const subscribeToScheduleUpdates = (callback) => {
    scheduleListeners.add(callback);
    return () => scheduleListeners.delete(callback);
};

export const notifyScheduleListeners = () => {
    console.log(`Notifying ${scheduleListeners.size} listeners of schedule update...`);
    scheduleListeners.forEach(cb => cb());
};
