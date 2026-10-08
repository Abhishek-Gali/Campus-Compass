
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
Semester-4 21MAT006 - 6 B 4 Pass
Probability
and Statistics
Semester-4 21CSEOQ7 - 7 B+ 3 Pass
Design and
Analysis of
Algorithms
Semester-4 21CSE06 - 9 A+ 3 Pass
Operating
`;

// Current Regex (Failed)
const failedRegex = /Semester-(\d+)\s+([A-Z0-9\/\-\s]+?)[\s-]*\s+(\d+)\s+([A-Z+]+|0)\s+(\d+)\s+(Pass|Fail|RA|AB|FA)/gi;

// Proposed Regex (Robust)
// 1. Allow spaces in code (.+?)
// 2. Expect a separator that might be space, hyphen, en-dash, etc.
// 3. Handle O/0 in Grade
const robustRegex = /Semester-(\d+)\s+(.+?)[\s\u2013\u2014-]*\s+(\d+)\s+([A-Z+]+|0|O)\s+(\d+)\s+(Pass|Fail|RA|AB|FA)/gi;

console.log("--- Testing Failed Regex ---");
let match;
while ((match = failedRegex.exec(text)) !== null) {
    console.log(`Matched: ${match[2]} | Grade: ${match[4]} | Credits: ${match[5]}`);
}

console.log("\n--- Testing Robust Regex ---");
while ((match = robustRegex.exec(text)) !== null) {
    console.log(`Matched: ${match[2].trim()} | Grade: ${match[4]} | Credits: ${match[5]}`);
}
