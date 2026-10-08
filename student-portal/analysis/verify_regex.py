import re
import pandas as pd

# This text mimics the structure from the screenshot of "Semester 4.pdf"
# where Grade Point (GP) appears before the Grade.
sample_ocr_output = """
Semester-4 21MAT06 - Probability and Statistics 6 B 4 Pass
Semester-4 21CSE07 - Design and Analysis of Algorithms 7 B+ 3 Pass
Semester-4 21CSE06 - Operating Systems 9 A+ 3 Pass
Semester-4 21CSE11 - Computer Networks 7 B+ 3 Pass
Semester-4 21CYS01 - Foundations of Cyber Security 7 B+ 3 Pass
Semester-4 21CSEP6 - Operating Systems Lab 9 A+ 1 Pass
"""

print("Simulating extraction on text structure from PDF:")
print("-" * 50)
print(sample_ocr_output.strip())
print("-" * 50)

extracted_data = []
lines = sample_ocr_output.strip().split('\n')

# Updated Regex to capture Grade Point (GP)
# Pattern: Semester-X Code - Name [GP] [Grade] [Credits] [Result]
regex = re.compile(r"Semester-(\d+)\s+(.+?)\s+(\d+)\s+([OABCPRF][+]?|RA|AB)\s+(\d+)\s+(Pass|Fail|RA)", re.IGNORECASE)

for line in lines:
    match = regex.search(line)
    if match:
        extracted_data.append(match.groups())

df = pd.DataFrame(extracted_data, columns=['Sem', 'Subject', 'GP', 'Grade', 'Credits', 'Result'])

print("\nExtracted Dataframe:")
print(df)

if len(df) > 0:
    print("\nSUCCESS: Regex matched the PDF structure!")
else:
    print("\nFAILURE: Regex did not match.")
