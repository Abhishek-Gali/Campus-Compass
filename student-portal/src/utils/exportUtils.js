
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { getScheduleForDate, SUBJECTS, getLocalISOString } from './schedule';

// Constants for semester dates
const SEMESTER_START = new Date(2026, 0, 5); // Jan 5, 2026
const SEMESTER_END = new Date(2026, 3, 29);  // April 29, 2026

export const generateScheduleExcel = async () => {
    const data = [];
    let currentDate = new Date(SEMESTER_START);

    // Iterate through each day of the semester
    while (currentDate <= SEMESTER_END) {
        const dateStr = getLocalISOString(currentDate);
        const dayName = currentDate.toLocaleDateString('en-US', { weekday: 'long' });
        
        // Skip Sundays if desired, or include them as holidays
        // We'll rely on getScheduleForDate to tell us the type
        const scheduleData = await getScheduleForDate(new Date(currentDate)); // Pass new Date object to avoid mutation issues if any

        if (scheduleData) {
            if (scheduleData.type === 'Working' && scheduleData.schedule) {
                scheduleData.schedule.forEach(slot => {
                    if (["Break", "Lunch"].includes(slot.code)) return; // Skip breaks for clean export? Or keep them? User asked for "subject and date, day and period timing". Usually breaks aren't needed. Let's skip.

                    const subject = SUBJECTS[slot.code];
                    const subjectName = subject ? subject.name : slot.code;
                    const faculty = subject ? subject.faculty : '-';

                    data.push({
                        Date: dateStr,
                        Day: dayName,
                        Time: slot.time,
                        "Subject Code": slot.code,
                        "Subject Name": subjectName,
                        Faculty: faculty,
                        Type: "Class"
                    });
                });
            } else if (scheduleData.type === 'Holiday') {
                 data.push({
                    Date: dateStr,
                    Day: dayName,
                    Time: "-",
                    "Subject Code": "-",
                    "Subject Name": scheduleData.name || "Holiday",
                    Faculty: "-",
                    Type: "Holiday"
                });
            }
        }
        
        // Next day
        currentDate.setDate(currentDate.getDate() + 1);
    }

    // Create Worksheet
    const ws = XLSX.utils.json_to_sheet(data);
    
    // Auto-width for columns
    const colWidths = [
        { wch: 12 }, // Date
        { wch: 10 }, // Day
        { wch: 15 }, // Time
        { wch: 12 }, // Subject Code
        { wch: 30 }, // Subject Name
        { wch: 25 }, // Faculty
        { wch: 10 }  // Type
    ];
    ws['!cols'] = colWidths;

    // Create Workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Semester Schedule");

    // Write file
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    
    saveAs(blob, `Semester_Schedule_2026.xlsx`);
};

// Export marks for a subject to Excel
export const generateMarksExcel = (subjectCode, subjectName, marksMap, studentData, calculateInternals) => {
    const today = new Date().toISOString().slice(0, 10);

    const data = studentData.map((student, index) => {
        const m = marksMap[student.id] || {};
        const { total } = calculateInternals(m);

        return {
            'S.No': index + 1,
            'Roll No': student.id.slice(-3),
            'Full Roll No': student.id,
            'Name': student.name,
            'CAT 1 (50)': m.cat1 ?? '',
            'CAT 2 (50)': m.cat2 ?? '',
            'Model (100)': m.model ?? '',
            'Assign 1 (5)': m.assignment1 ?? '',
            'Assign 2 (5)': m.assignment2 ?? '',
            'Seminar (5)': m.seminar ?? '',
            'Internal Total (50)': Number(total.toFixed(1))
        };
    });

    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
        { wch: 6 },  // S.No
        { wch: 8 },  // Roll No
        { wch: 14 }, // Full Roll No
        { wch: 38 }, // Name
        { wch: 10 }, // CAT 1
        { wch: 10 }, // CAT 2
        { wch: 12 }, // Model
        { wch: 12 }, // Assign 1
        { wch: 12 }, // Assign 2
        { wch: 12 }, // Seminar
        { wch: 18 }, // Internal Total
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `${subjectCode} Marks`);

    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8' });
    saveAs(blob, `Marks_${subjectCode}_${today}.xlsx`);
};
