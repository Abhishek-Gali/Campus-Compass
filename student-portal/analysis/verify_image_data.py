
import re
import pandas as pd

# Data transcibed from the user's image
image_text = """
Semester-4 21MAT06 - Probability and Statistics 6 B 4 Pass
Semester-4 21CSE07 - Design and Analysis of Algorithms 7 B+ 3 Pass
Semester-4 21CSE06 - Operating Systems 9 A+ 3 Pass
Semester-4 21CSE11 - Computer Networks 7 B+ 3 Pass
Semester-4 21CYS01 - Foundations of Cyber Security 7 B+ 3 Pass
Semester-4 21CSEP6 - Operating Systems Lab 9 A+ 1 Pass
Semester-4 21FYSP1 - Cyber Security Lab 10 O 1 Pass
Semester-4 21IOT01 - Fundamentals of Database Management Systems 6 B 3 Pass
Semester-4 21IOTP1 - Database Management Systems Lab 9 A+ 1 Pass
"""

lines = [line.strip() for line in image_text.split('\n') if line.strip()]

structured_data = []

print(f"Testing {len(lines)} lines from image data...")

# Regex from pdf_analysis.ipynb
# regex = r"Semester-(\d+)\s+(.+?)\s+(\d+)\s+([OABCPRF][+]?|RA|AB)\s+(\d+)\s+(Pass|Fail|RA)"
# Adjusted regex to be more flexible if needed, but starting with the one in the notebook

for text in lines:
    # replicate the notebook's regex
    match = re.search(r"Semester-(\d+)\s+(.+?)\s+(\d+)\s+([OABCPRF][+]?|RA|AB)\s+(\d+)\s+(Pass|Fail|RA)", text, re.IGNORECASE)
    if match:
        structured_data.append(match.groups())
    else:
        print(f"FAILED to match: {text}")

df_results = pd.DataFrame(structured_data, columns=['Sem', 'Subject', 'GP', 'Grade', 'Credits', 'Result'])
print("\nExtracted Data:")
print(df_results)
