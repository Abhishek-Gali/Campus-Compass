
const text = `
2/12/26, 9:53 PM My Camu
1 Dhanalakshmi Srinivasan University- School of Engineering and Technology
| Invalid date
End Semester Examination (Jun-2025)
Student Name: G ABHISHEK Reg. No.: 11523060002
Semester: Semester-4 Gender: Male
ProgramB.Tech - Computer Science and Engineering
(Cyber Security)
SEMESTER COURSE NAME GRADE POINT(P)GRADES CREDIT RESULT STATUS
Semester-4 21MATO06 - [) B 4 Pass
Probability
and Statistics
Semester-4 21CSEQ7 - 7 B+ 3 Pass
Design and
Analysis of
Algorithms
Semester-4 21CSEOQ6 - 9 A+ 3 Pass
Operating
Systems
Semester-4 21CSE11- 7 B+ 3 Pass
Computer
Networks
Semester-4 21CYSO01- 7 B+ 3 Pass
Foundations
of Cyber
Security
Semester-4 21CSEP6 - 9 A+ 1 Pass
Operating
Systems Lab
https://www.mycamu.co.in/v2/Final_result 1/2

2/12/26, 9:53 PM My Camu
1 Dhanalakshmi Srinivasan University- School of Engineering and Technology
| Invalid date
SEMESTER COURSE NAME GRADE POINT(P)GRADES CREDIT RESULT STATUS
Semester-4 21CYSP1 - 10 (e] 1 Pass
Cyber
Security Lab
Semester-4 21l0TO1- [) B 3 Pass
Fundamental
s of Database
Management
Systems
Semester-4 2110TP1 - 9 A+ 1 Pass
Database
Management
Systems Lab
`;

// Current Regex (Fails on `[)`)
// const rowRegex = /Semester-(\d+)\s+(.+?)[\s\u2013\u2014-]*\s+(\d+)\s+([A-Z+]+|0|O)\s+(\d+)\s+(Pass|Fail|RA|AB|FA)/gi;

// Proposed Regex:
// 1. Group 3 (GP) accepts \S+ (non-whitespace) to allow garbage like `[)`
// 2. Group 4 (Grade) accepts \S+ (non-whitespace) to allow garbage line `(e]`
const rowRegex = /Semester-(\d+)\s+(.+?)[\s\u2013\u2014-]+\s*(\S+)\s+(\S+)\s+(\d+)\s+(Pass|Fail|RA|AB|FA)/gi;

let match;
while ((match = rowRegex.exec(text)) !== null) {
    const sem = match[1];
    const code = match[2];
    const gp = match[3];
    let grade = match[4];
    const credit = match[5];
    
    console.log(`Matched: ${code.trim()} | GP: ${gp} | Grade: ${grade} | Credit: ${credit}`);

    // Post-processing test
    if (grade === '(e]' || grade === '[e]') grade = 'O';
    if (grade === '0') grade = 'O';
    
    console.log(`  -> Cleaned Grade: ${grade}`);
}
