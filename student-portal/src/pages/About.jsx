import React from 'react';
import { Award, Code, Star, Heart } from 'lucide-react';
import creatorPhoto from '../assets/creator.jpg';

const About = () => {
    return (
        <div className="animate-fade-in p-8 flex flex-col items-center justify-center min-h-[80vh] text-center">
            <div className="bg-gradient-to-br from-[#1e1e1e] to-[#2a2a2a] p-12 rounded-3xl border border-white/5 shadow-2xl max-w-3xl transform hover:scale-[1.02] transition-all duration-500 relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#ff4757] via-[#2ed573] to-[#ffa502]"></div>
                
                <div className="mb-8 relative inline-block">
                    <div className="absolute -inset-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-lg opacity-40 animate-pulse"></div>
                    <img 
                        src={creatorPhoto}
                        alt="Creator" 
                        className="w-32 h-32 rounded-full border-4 border-[#2ed573] shadow-lg relative z-10 bg-[#1e1e1e] object-cover"
                    />
                    <Award className="absolute -bottom-2 -right-2 text-yellow-400 fill-yellow-400 drop-shadow-lg z-20" size={40} />
                </div>

                <h1 className="text-5xl font-extrabold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white via-[#2ed573] to-blue-400">
                    A Creation of Abhishek Gali
                </h1>
                
                <p className="text-xl text-white/60 mb-8 font-light tracking-wide">
                    Student Portal • Attendance • Absent / Bunks • 
                </p>

                <div className="space-y-6 text-lg text-white/80 leading-relaxed">
                    <p>
                        You are looking at the work of a <span className="text-[#2ed573] font-bold">51 Hours</span>. 
                        This Student Portal isn't just code; it's a made to help My Friend
                        This is to make a good check for attendance From your Friend <strong className="text-white">Abhishek Gali</strong>.
                    </p>
                    <p>
                        I made this with most of my knowledge ofcourse i used AI but the core logic behind all the programs or mine 
                        I decided the work Flow and how it works built it 
                        HOPE IT HELPS OTHERS
                    </p>
                </div>

                <div className="mt-12 flex justify-center gap-4">
                    <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                        <Code className="text-blue-400" size={20} />
                        <span className="font-semibold">TO A13 slot 2</span>
                    </div>
                    <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                        <Star className="text-yellow-400" size={20} />
                        <span className="font-semibold">From</span>
                    </div>
                    <div className="flex items-center gap-2 px-6 py-3 bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                        <Heart className="text-[#ff4757]" size={20} />
                        <span className="font-semibold">Abhishek</span>
                    </div>
                </div>

                <div className="mt-12 pt-8 border-t border-white/5">
                    <p className="text-sm opacity-40 font-mono">
                        "Thankyou."
                    </p>
                </div>
            </div>
        </div>
    );
};

export default About;
