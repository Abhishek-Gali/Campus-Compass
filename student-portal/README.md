# Student Portal (ACFKA)

> **Architect & Creator:** Abhishek Gali (dedicated to B.Tech CSE / Cybersecurity section A13 slot 2)  
> Full technical documentation is available in [../DOCUMENTATION.md](../DOCUMENTATION.md).

## Quick Overview

**ACFKA Student Portal** is an academic management and attendance intelligence platform built with **React 19**, **Vite**, and **Supabase**.

### Key Modules
- **Attendance & Safe Bunk Intelligence:** Real-time calculation of conducted classes, attendance percentages, and bunk buffers (how many classes can be safely skipped or how many consecutive classes are needed to reach 75%).
- **Dynamic Timetable Engine:** Automatically calculates working days, institutional holidays, and alternating Saturday schedules (Monday vs. Tuesday orders), with support for real-time slot and day-order overrides.
- **Continuous Internal Assessment (CIA) Calculator:** Normalizes CAT 1 (50), CAT 2 (50), Model Exam (100), Assignments (10), and Seminars (5) to an institutional internal score out of 50.
- **CAMU PDF Transcript OCR & GPA Simulator:** Ingests official PDF semester marksheets using Tesseract.js and pdfjs-dist, extracts course grades and credits, and models target CGPA feasibility.
- **Multi-Role RBAC:** Role-based access control across Administrators (Level 0), Class Representatives (Level 1), Subject Faculty (Level 2), and Students (Level 3) with precedence-locked attendance editing.

## Local Development

```bash
# Install dependencies
npm install

# Run Vite dev server
npm run dev

# Build for production
npm run build
```

## Environment Configuration

Create or update `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

For complete architectural breakdowns, mathematical models, database schemas, and API references, see [DOCUMENTATION.md](../DOCUMENTATION.md).
