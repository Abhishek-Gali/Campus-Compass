from datetime import date, timedelta

# Define Dates
semester_start = date(2026, 1, 5)
semester_end = date(2026, 4, 29) # Last day before Model Exam

# Holidays (YYYY, M, D)
# Based on Calendar PDF
# Saturdays and Sundays included in holiday definition if marked
# If not marked, Saturday is working. Sunday is always holiday.

# Explicit Holidays from PDF
holidays = {
    # Jan
    date(2026, 1, 1), # New Year
    date(2026, 1, 3), # Holiday
    date(2026, 1, 7), # Holiday (from OCR/Visual check - Sat 7th is clearly marked Holiday in Jan? No wait)
    # Re-checking Jan grid:
    # 1(Thu), 2(Fri), 3(Sat-Holiday), 4(Sun-Holiday)
    # 5(Mon), 6(Tue), 7(Wed), 8(Thu), 9(Fri), 10(Sat-W2)
    # Wait, previous OCR analysis had some confusion. 
    # Let's rely on standard weekend logic + explicit holidays.
    # explicit_holidays_set:
    date(2026, 1, 14), # Pongal
    date(2026, 1, 15), # Pongal
    date(2026, 1, 16), # Pongal
    date(2026, 1, 17), # Pongal (Sat)
    date(2026, 1, 26), # Republic Day
    
    # Feb
    # Feb 1 (Sun)
    date(2026, 2, 7), # Holiday (Sat)
    # Feb 8 (Sun)
    date(2026, 2, 21), # Holiday (Sat)
    # Feb 22 (Sun)
    
    # Mar
    # Mar 1 (Sun)
    date(2026, 3, 7), # Holiday (Sat)
    # Mar 8 (Sun)
    date(2026, 3, 15), # Holiday (Sun)
    # "Telugu New Year Holidays" - Fri Mar 20? 
    # Let's assume Mar 20 is a holiday based on "Telugu New Year Holidays" label blocking Fri/Sat?
    # Actually, Telugu New Year (Ugadi) in 2026 is Likely March 19 or 20.
    # The PDF shows a block around March 20 (Fri).
    date(2026, 3, 20), 
    
    # Tamil New Year Holidays? - April.
    # Apr 13 (Mon)? April 14 (Tue)?
    # PDF Page 2: "Tamil New Year Holidays" block around Apr 13/14?
    # Apr 14 is generally Tamil New Year.
    # Let's assume Apr 13 and 14 are holidays.
    date(2026, 4, 13),
    date(2026, 4, 14),
    
    # Good Friday - Apr 3
    date(2026, 4, 3),
    
    # Other Saturdays in April
    date(2026, 4, 4), # Holiday
    date(2026, 4, 5), # Sun
    date(2026, 4, 18), # Working (W15, CAT Exam 2 Starts)
    date(2026, 4, 19), # Sun
    date(2026, 4, 26), # Holiday (Sun)
}

# Add standard Sundays if not already in list (logic handled in loop)

# Timetable Definition (periods count)
# Subjects
# 21CYSP2 (Lab)
# 21GEN06
# 21INT01
# 21AID10
# 21CYS04
# 21OEE13
# 21CSE10
# 21CSEMP (Mini Project)
# 21ENGP3 (Lab)

timetable = {
    0: { # Monday
        "21CYSP2": 2, 
        "21GEN06": 1, 
        "21INT01": 1, 
        "21AID10": 1, 
        "21CYS04": 1
    },
    1: { # Tuesday
        "21CYS04": 1,
        "21OEE13": 1,
        "21CSE10": 1,
        "21INT01": 1
    },
    2: { # Wednesday
        "21OEE13": 1,
        "21CYS04": 1,
        "21CSEMP": 2
    },
    3: { # Thursday
        "21ENGP3": 2,
        "21GEN06": 1,
        "21AID10": 1,
        "21OEE13": 1,
        "21CSE10": 1
    },
    4: { # Friday
        "21CSE10": 1,
        "21AID10": 1,
        "21GEN06": 1,
        "21INT01": 1
    }
}

subject_totals = {
    "21CYSP2": 0,
    "21GEN06": 0,
    "21INT01": 0,
    "21AID10": 0,
    "21CYS04": 0,
    "21OEE13": 0,
    "21CSE10": 0,
    "21CSEMP": 0,
    "21ENGP3": 0
}

# Saturday Logic
# Work Sat Index: 0 -> Mon TT, 1 -> Tue TT, 2 -> Mon TT, ...
work_saturday_count = 0

current_date = semester_start
while current_date <= semester_end:
    is_holiday = False
    
    # Check Explicit Holiday
    if current_date in holidays:
        is_holiday = True
        
    # Check Sunday
    if current_date.weekday() == 6:
        is_holiday = True
        
    # Check Saturday Logic
    if current_date.weekday() == 5:
        if is_holiday:
            # Holiday Saturday, do nothing
            pass
        else:
            # Working Saturday
            # Determine TT (Mon or Tue)
            tt_day = work_saturday_count % 2 # 0 or 1
            # Add periods
            day_schedule = timetable[tt_day]
            for subj, count in day_schedule.items():
                subject_totals[subj] += count
            
            print(f"{current_date} (Sat): Working - Using {'Monday' if tt_day==0 else 'Tuesday'} Timetable")
            work_saturday_count += 1
            
    elif not is_holiday:
        # Weekday (Mon-Fri)
        day_idx = current_date.weekday()
        if day_idx in timetable:
            day_schedule = timetable[day_idx]
            for subj, count in day_schedule.items():
                subject_totals[subj] += count

    current_date += timedelta(days=1)

print("\nFinal Subject Period Counts (Jan 5 - Apr 29):")
for subj, total in subject_totals.items():
    print(f"{subj}: {total}")
