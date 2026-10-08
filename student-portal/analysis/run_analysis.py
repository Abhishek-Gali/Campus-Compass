import pdfplumber
import os

pdf_filename = "Semester 4.pdf"
# Check current dir or parent dir
pdf_path = pdf_filename
if not os.path.exists(pdf_path):
    pdf_path = os.path.join("..", pdf_filename)
    if not os.path.exists(pdf_path):
        # Check inside analysis folder if script is run from root
        pdf_path = os.path.join("analysis", pdf_filename)


if not os.path.exists(pdf_path):
    print(f"Error: Could not find {pdf_filename}")
    exit(1)

print(f"Analyzing {pdf_path}...")

with pdfplumber.open(pdf_path) as pdf:
    for i, page in enumerate(pdf.pages):
        print(f"--- Page {i+1} ---")
        text = page.extract_text()
        if text:
            print(text)
        else:
            print("[No text extracted]")
        print("\n")
