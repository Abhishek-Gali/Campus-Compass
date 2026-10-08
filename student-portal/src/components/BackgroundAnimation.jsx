import React from 'react';
import { Pencil, Book, Ruler, Calculator, GraduationCap, Laptop, FlaskConical, Atom } from 'lucide-react';
import './BackgroundAnimation.css';

const BackgroundAnimation = () => {
    // Generate random positions and delays for a dynamic feel
    const icons = [
        Pencil, Book, Ruler, Calculator, GraduationCap, Laptop, FlaskConical, Atom,
        Pencil, Book, Ruler, Calculator, GraduationCap, Laptop, FlaskConical, Atom
    ];

    return (
        <div className="background-animation-container">
            {icons.map((Icon, index) => (
                <div 
                    key={index} 
                    className="floating-icon"
                    style={{
                        left: `${Math.random() * 100}%`,
                        top: `${Math.random() * 100}%`,
                        animationDelay: `${Math.random() * 5}s`,
                        animationDuration: `${15 + Math.random() * 15}s`,
                        opacity: 0.1 + Math.random() * 0.2
                    }}
                >
                    <Icon size={40 + Math.random() * 40} />
                </div>
            ))}
        </div>
    );
};

export default BackgroundAnimation;
