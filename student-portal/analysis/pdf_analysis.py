#!/usr/bin/env python
# coding: utf-8

# # PDF Analysis and ML Parsing Model
# 
# This notebook demonstrates how to extract text from image-based PDFs using OCR and then build a small Machine Learning model to parse the structured data (Semester, Subjects, Grades).
# 
# ## prerequisites
# 1. **Tesseract OCR**: You must have Tesseract installed on your system.
#    - **Windows**: Download installer from [UB-Mannheim/tesseract](https://github.com/UB-Mannheim/tesseract/wiki)
#    - Add Tesseract to your System PATH.
# 2. **Poppler**: Required for `pdf2image`.
#    - **Windows**: Download binary, extract, and add `bin/` to PATH.
# 
# ## Setup

# In[ ]:


# get_ipython().system('pip install pytesseract pdf2image scikit-learn pandas numpy opencv-python')


# In[1]:


import pytesseract
from pdf2image import convert_from_path
import pandas as pd
import numpy as np
import re
import os

# Set Tesseract Path (Update this if Tesseract is not in PATH)
# pytesseract.pytesseract.tesseract_cmd = r'C:\Program Files\Tesseract-OCR\tesseract.exe'


# ## 1. OCR Extraction
# Since the PDF contains images, standard text extraction fails. We use `pdf2image` to convert pages to images and `pytesseract` to read text.

# In[ ]:


pdf_path = 'Semester 4.pdf'

full_text = ""

if os.path.exists(pdf_path):
    try:
        # Convert PDF to images
        print("Converting PDF to images...")
        images = convert_from_path(pdf_path)

        print(f"Extracted {len(images)} pages. Running OCR...")
        for i, image in enumerate(images):
            text = pytesseract.image_to_string(image)
            full_text += text + "\n"
            print(f"-- Page {i+1} Processed --")

    except Exception as e:
        print(f"Error: {e}")
        print("Ensure Tesseract and Poppler are installed and in PATH.")
else:
    print("PDF file not found.")


# ## 2. Synthetic Data (Fallback)
# If OCR failed above (due to missing dependencies), we use this synthetic text that mimics the PDF structure to demonstrate the ML model.

# In[ ]:


if not full_text.strip():
    print("Using synthetic data for demonstration...")
    # We updated the synthetic data to better match the visual table format
    # Note: Often a Grade Point (integer) appears before the Letter Grade.
    full_text = """
    ANNA UNIVERSITY :: CHENNAI - 600 025.
    OFFICE OF THE CONTROLLER OF EXAMINATIONS
    Provisional Results of April / May Examination,2024.
    Semester-04
    Semester-4 21MAT06 - Probability and Statistics 6 B 4 Pass
    Semester-4 21CSE07 - Design and Analysis of Algorithms 7 B+ 3 Pass
    Semester-4 21CSE06 - Operating Systems 9 A+ 3 Pass
    Semester-4 21CSE11 - Computer Networks 7 B+ 3 Pass
    Semester-4 21CYS01 - Foundations of Cyber Security 7 B+ 3 Pass
    Semester-4 21CSEP6 - Operating Systems Lab 9 A+ 1 Pass
    Semester-4 21CYSP1 - Cyber Security Lab 10 O 1 Pass
    Semester-4 21IoT01 - Fundamentals of Database Management Systems 6 B 3 Pass
    Semester-4 21IoTP1 - Database Management Systems Lab 9 A+ 1 Pass
    """

lines = [line.strip() for line in full_text.split('\n') if line.strip()]


# ## 3. Feature Engineering for ML
# We want to classify each line into: `HEADER`, `SUBJECT`, or `NOISE`.
# We extract features like:
# - Does it start with 'Semester'?
# - Does it contain digits?
# - Does it have 'Pass' or 'Fail'?
# - Length of line.

# In[ ]:


def extract_features(line):
    return {
        'starts_with_sem': 1 if line.lower().startswith('semester') else 0,
        'has_pass_fail': 1 if 'pass' in line.lower() or 'fail' in line.lower() else 0,
        'num_digits': sum(c.isdigit() for c in line),
        'length': len(line),
        'has_dash': 1 if '-' in line else 0,
        'word_count': len(line.split())
    }

X_data = [extract_features(line) for line in lines]
df_features = pd.DataFrame(X_data)
df_features['text'] = lines # Keep text for reference
print(df_features.head())


# ## 4. Train Model
# We label a few samples manually to train a Random Forest Classifier.

# In[ ]:


from sklearn.ensemble import RandomForestClassifier

# Simple rule-based labeling for training set
def get_label(line):
    if re.search(r'Semester-\d+\s+.*(Pass|Fail|RA)', line, re.IGNORECASE):
        return 'SUBJECT'
    elif 'semester' in line.lower():
        return 'HEADER'
    else:
        return 'NOISE'

y_labels = [get_label(line) for line in lines]

clf = RandomForestClassifier(n_estimators=50)
clf.fit(df_features.drop('text', axis=1), y_labels)

print("Model Trained.")


# ## 5. Prediction & Parsing
# Use the model to predict line types and extract data.

# In[ ]:


predictions = clf.predict(df_features.drop('text', axis=1))

structured_data = []

for text, label in zip(lines, predictions):
    if label == 'SUBJECT':
        # If classified as subject, use Regex to extract details
        # The key change is capturing Grade Point (GP) before the Grade
        # Regex: Semester-X Code - Name GradePoint Grade Credits Result
        # Note the (\d+) before the grade group to capture GP (e.g. 7, 8, 9)
        match = re.search(r"Semester-(\d+)\s+(.+?)\s+(\d+)\s+([OABCPRF][+]?|RA|AB)\s+(\d+)\s+(Pass|Fail|RA)", text, re.IGNORECASE)
        if match:
            structured_data.append(match.groups())

df_results = pd.DataFrame(structured_data, columns=['Sem', 'Subject', 'GP', 'Grade', 'Credits', 'Result'])
print(df_results)

# Data Cleaning: Convert to numeric
df_results['GP'] = pd.to_numeric(df_results['GP'])
df_results['Credits'] = pd.to_numeric(df_results['Credits'])

# Calculate Credit Points
df_results['CreditPoints'] = df_results['GP'] * df_results['Credits']

print("\n" + "="*40)
print("PERFORMANCE ANALYSIS")
print("="*40)

# 1. SGPA Calculation per Semester
print("\n--- SGPA per Semester ---")
sem_groups = df_results.groupby('Sem')

for sem, group in sem_groups:
    total_credits = group['Credits'].sum()
    total_points = group['CreditPoints'].sum()
    sgpa = total_points / total_credits if total_credits > 0 else 0
    print(f"Semester {sem}: SGPA = {sgpa:.2f} (Credits: {total_credits}, Points: {total_points})")

# 2. Cumulative CGPA Calculation
print("\n--- Cumulative CGPA ---")
total_credits_all = df_results['Credits'].sum()
total_points_all = df_results['CreditPoints'].sum()
cgpa = total_points_all / total_credits_all if total_credits_all > 0 else 0

print(f"Total Credits Earned: {total_credits_all}")
print(f"Total Grade Points: {total_points_all}")
print(f"Current CGPA: {cgpa:.2f}")

# Function to calculate CGPA up to a specific semester
def calculate_cgpa_upto(df, sem_upto):
    # Ensure Sem column is numeric for comparison
    df['Sem_Num'] = pd.to_numeric(df['Sem'])
    subset = df[df['Sem_Num'] <= sem_upto]
    
    if subset.empty:
        return 0.0, 0, 0
    
    tot_cred = subset['Credits'].sum()
    tot_pts = subset['CreditPoints'].sum()
    cgpa = tot_pts / tot_cred if tot_cred > 0 else 0
    return cgpa, tot_cred, tot_pts

# Example usage for interactive selection (simulated here)
# print(f"CGPA up to Sem 4: {calculate_cgpa_upto(df_results, 4)[0]:.2f}")


