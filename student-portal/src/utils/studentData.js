// Synthetic demo roster for demonstration, local testing, and UI preview.
// In compliance with data privacy standards, no real student names, registration numbers,
// or personal identifiable information (PII) are stored in this repository.

export const STUDENT_DATA = [
  { "id": "11523060001", "name": "ADITYA SHARMA" },
  { "id": "11523060002", "name": "ALEX CHEN" },
  { "id": "11523060003", "name": "ANANYA PATEL" },
  { "id": "11523060004", "name": "ARAVIND KUMAR" },
  { "id": "11523060005", "name": "BHAVYA REDDY" },
  { "id": "11523060006", "name": "CHETAN VERMA" },
  { "id": "11523060007", "name": "DANIEL MARTINEZ" },
  { "id": "11523060008", "name": "DEEPESH GUPTA" },
  { "id": "11523060009", "name": "DIVYA KRISHNAN" },
  { "id": "11523060010", "name": "EMMA WATSON" },
  { "id": "11523060011", "name": "FARHAN ALI" },
  { "id": "11523060012", "name": "GIRISH VARMA" },
  { "id": "11523060013", "name": "HARINI IYER" },
  { "id": "11523060014", "name": "ISHAN MALHOTRA" },
  { "id": "11523060015", "name": "JASPER VANCE" },
  { "id": "11523060016", "name": "JORDAN LEE" },
  { "id": "11523060017", "name": "KAVYA SREENIVAS" },
  { "id": "11523060018", "name": "KIRAN RAO" },
  { "id": "11523060019", "name": "LAKSHMI NARAYAN" },
  { "id": "11523060020", "name": "MADHAV JOSHI" },
  { "id": "11523060021", "name": "MANISH PANDEY" },
  { "id": "11523060022", "name": "MEERA NAIR" },
  { "id": "11523060023", "name": "MOHAMMED ZAYN" },
  { "id": "11523060024", "name": "NAVEEN PRASAD" },
  { "id": "11523060025", "name": "NEHA CHOUDHARY" },
  { "id": "11523060026", "name": "NITHIN CHAKRAVARTHY" },
  { "id": "11523060027", "name": "OLIVER BROWN" },
  { "id": "11523060028", "name": "PAVAN KALYAN G" },
  { "id": "11523060029", "name": "POOJA HEGDE" },
  { "id": "11523060030", "name": "PRANAV SURI" },
  { "id": "11523060031", "name": "PRIYA RAMAN" },
  { "id": "11523060032", "name": "RAHUL DESHMUKH" },
  { "id": "11523060033", "name": "RAJESH KOOTHAN" },
  { "id": "11523060034", "name": "RITHIK SHENOY" },
  { "id": "11523060035", "name": "ROHAN MUKHERJEE" },
  { "id": "11523060036", "name": "SAI PRAKASH" },
  { "id": "11523060037", "name": "SAMANTHA REED" },
  { "id": "11523060038", "name": "SANJAY MENON" },
  { "id": "11523060039", "name": "SHREYA GHOSHAL V" },
  { "id": "11523060040", "name": "SIDDHARTH RAJ" },
  { "id": "11523060041", "name": "SNEHA KULKARNI" },
  { "id": "11523060042", "name": "SRINATH VENKAT" },
  { "id": "11523060043", "name": "SURYA TEJA" },
  { "id": "11523060044", "name": "SWATHI REDDY" },
  { "id": "11523060045", "name": "TANMAY BHATT" },
  { "id": "11523060046", "name": "TEJASWI RAO" },
  { "id": "11523060047", "name": "TARUN KHANNA" },
  { "id": "11523060048", "name": "VARUN DHAWAN K" },
  { "id": "11523060049", "name": "VIKRAM RATHORE" },
  { "id": "11523060050", "name": "YASHWANTH GOUD" }
];

/**
 * Dynamically loads the student roster from Supabase if connected and authenticated.
 * Falls back to the synthetic demo roster if offline or unauthenticated.
 */
export const loadStudentRoster = async (supabaseClient) => {
  if (!supabaseClient) return STUDENT_DATA;
  try {
    const { data, error } = await supabaseClient
      .from('users')
      .select('id, name')
      .eq('role', 'Student')
      .eq('status', 'Active')
      .order('id', { ascending: true });

    if (!error && data && data.length > 0) {
      return data;
    }
  } catch (err) {
    console.warn('Failed to load dynamic student roster from database, using synthetic demo dataset:', err);
  }
  return STUDENT_DATA;
};