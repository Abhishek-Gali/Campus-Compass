import React, { useRef, useEffect } from "react";
import "./ScrollPicker.css";
import { STUDENT_DATA } from "../utils/studentData";
import { triggerHaptic, HapticPatterns } from "../utils/haptics";

const ScrollPicker = ({ selectedId, onSelect, disabled }) => {
  const containerRef = useRef(null);

  // Use imported data
  const students = STUDENT_DATA;
  const ids = students.map(s => s.id);

  // Scroll to selected on mount
  useEffect(() => {
    if (containerRef.current && selectedId) {
      const index = ids.indexOf(selectedId);
      if (index !== -1) {
        const itemHeight = 50; // Match CSS
        containerRef.current.scrollTop = index * itemHeight;
      }
    }
  }, []);

  const handleScroll = (e) => {
    if (disabled) return; // Prevent selection logic if disabled
    
    const container = e.target;
    const itemHeight = 50;
    const centerOffset = container.clientHeight / 2 - itemHeight / 2;
    const scrollPos = container.scrollTop;

    const centerIndex = Math.round(scrollPos / itemHeight);
    if (ids[centerIndex] && ids[centerIndex] !== selectedId) {
      triggerHaptic(HapticPatterns.selection);
      onSelect(ids[centerIndex]);
    }
  };

  return (
    <div className={`picker-container ${disabled ? 'disabled' : ''}`} style={disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}}>
      <div className="highlight-bar"></div>
      <div className="scroll-list" ref={containerRef} onScroll={handleScroll}>
        <div className="spacer"></div>
        {students.map((student) => (
          <div
            key={student.id}
            className={`picker-item ${student.id === selectedId ? "active" : ""}`}
            onClick={() => {
              if (!disabled) {
                triggerHaptic(HapticPatterns.selection);
                onSelect(student.id);
              }
            }}
          >
            {student.id}
          </div>
        ))}
        <div className="spacer"></div>
      </div>
    </div>
  );
};

export default ScrollPicker;
