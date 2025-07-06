import React from 'react';
import { PersonalLanding } from '@/components/ui/personal-landing';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Contact: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="relative">
      {/* Back Button */}
      <button
        onClick={() => navigate(-1)}
        className="fixed top-4 left-4 md:top-6 md:left-6 z-50 flex items-center gap-2 bg-zinc-800/80 backdrop-blur-sm text-zinc-100 px-3 py-2 md:px-4 md:py-2 rounded-full border border-zinc-700 hover:bg-zinc-700/80 transition-all duration-200 hover:scale-105 shadow-lg"
        aria-label="Go back"
      >
        <ArrowLeft size={16} className="md:w-5 md:h-5" />
        <span className="font-medium text-sm md:text-base">Back</span>
      </button>
      
      <PersonalLanding />
    </div>
  );
};

export default Contact; 