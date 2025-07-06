import React, { useRef, useState } from "react";
import { twMerge } from "tailwind-merge";
import {
  Github,
  Briefcase,
} from "lucide-react";

const HeroSection: React.FC = () => {
  return (
    <section className="w-full flex flex-col items-center text-center gap-6">
      <div className="relative mb-2">
        <span className="absolute inset-0 rounded-full bg-gradient-to-tr from-pink-500 via-red-500 to-orange-400 opacity-60 blur-lg animate-glow" />
        <img
          src="/me.jpg"
          alt="avatar"
          className="relative size-32 rounded-full border-4 border-zinc-800 shadow-xl z-10"
        />
      </div>
      <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight font-geist drop-shadow-lg">
        Hi, I'm Mosabbir
      </h1>
      <p className="text-lg md:text-xl text-zinc-300 max-w-lg mx-auto font-inter font-normal">
        I craft beautiful, performant web experiences with React, TypeScript, and modern UI frameworks.
      </p>
    </section>
  );
};

interface SocialLink {
  href: string;
  label: string;
  icon: React.ReactNode;
  bg: string;
  text: string;
}

const socialLinks: SocialLink[] = [
  {
    href: 'https://github.com/mosabbir-maruf',
    label: 'GitHub',
    icon: <Github size={28} />,
    bg: 'bg-zinc-800',
    text: 'text-white',
  },
  {
    href: 'https://sites.google.com/diu.edu.bd/mosabbir-maruf/',
    label: 'Portfolio',
    icon: <Briefcase size={28} />,
    bg: 'bg-zinc-50',
    text: 'text-zinc-900',
  },
];

const SocialsBlock: React.FC = () => (
  <div className="flex flex-wrap justify-center gap-4 w-full font-inter">
    {socialLinks.map((link) => (
      <a
        key={link.label}
        href={link.href}
        aria-label={link.label}
        className={twMerge(
          'flex items-center gap-2 rounded-full border border-zinc-800 px-7 py-3 text-sm font-semibold shadow-lg transition-all duration-200 hover:scale-105 hover:shadow-xl hover:border-pink-400 focus:outline-none focus:ring-2 focus:ring-pink-300 bg-opacity-80',
          link.bg,
          link.text,
        )}
        style={{ minWidth: 140, minHeight: 56 }}
        tabIndex={0}
        target="_blank"
        rel="noopener noreferrer"
      >
        {link.icon}
        <span>{link.label}</span>
      </a>
    ))}
  </div>
);

const AboutBlock = () => (
  <div className="w-full rounded-2xl border border-zinc-800 bg-zinc-950/80 p-7 shadow-lg text-center font-inter">
    <p className="text-base md:text-lg text-zinc-200 font-normal">
      Passionate about building elegant, accessible, and high-performance web apps. Always learning, always sharing.<br />
    </p>
  </div>
);

const ConnectSection: React.FC = () => {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    try {
      const form = e.currentTarget;
      const formData = new FormData(form);
      // Add Web3Forms required fields
      formData.append('access_key', '29273541-912f-4f66-bc99-ec924156c8da');
      formData.append('subject', 'New message from SpendWiseGo contact form');
      const response = await fetch("https://api.web3forms.com/submit", {
        method: "POST",
        body: formData,
      });
      if (response.ok) {
        setSuccess(true);
        form.reset();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (err) {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full flex flex-col items-center text-center gap-4 mt-4 font-inter relative">
      <p className="text-base text-zinc-400 mb-3 max-w-md mx-auto font-normal">
        Interested in collaborating, chatting about tech, or just saying hi? Send me a message below!
      </p>
      <form
        onSubmit={handleSubmit}
        className="flex w-full max-w-xl gap-2 items-center justify-center"
      >
        <textarea
          name="message"
          placeholder="Type your message..."
          required
          rows={1}
          disabled={isSubmitting}
          className="flex-1 min-h-[48px] max-h-32 rounded-full border px-6 py-3 text-base text-zinc-100 placeholder-zinc-500 bg-zinc-900 border-zinc-700 focus:border-pink-400 transition-colors focus:outline-none shadow font-inter resize-y disabled:opacity-50"
          style={{ resize: "vertical" }}
        />
        <button
          type="submit"
          disabled={isSubmitting}
          className="rounded-full bg-gradient-to-r from-red-500 via-pink-500 to-orange-400 px-8 py-3 text-base font-semibold text-white shadow-lg focus:outline-none focus:ring-2 focus:ring-pink-300 transition-all hover:scale-105 hover:shadow-xl cursor-pointer opacity-100 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Sending...' : 'Send'}
        </button>
      </form>
      {error && (
        <div className="text-red-400 text-sm mt-2 max-w-xl text-center">
          {error}
        </div>
      )}
      {success && (
        <div className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none">
          <div className="bg-zinc-900 bg-opacity-95 rounded-2xl px-8 py-6 shadow-2xl text-white text-center max-w-xs mx-auto animate-fade-in">
            <div className="text-lg font-bold mb-1">Success!</div>
            <div>Your Message Received!</div>
          </div>
        </div>
      )}
      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </section>
  );
};

export const PersonalLanding = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900 px-4 py-16 text-zinc-50 font-inter relative overflow-hidden">
    {/* Animated background blob */}
    <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-gradient-to-tr from-pink-500 via-red-500 to-orange-400 opacity-20 rounded-full blur-3xl animate-pulse-slow z-0" />
    <div className="w-full max-w-2xl flex flex-col items-center gap-12 z-10">
      <HeroSection />
      <AboutBlock />
      <SocialsBlock />
      <ConnectSection />
    </div>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700;900&display=swap');
      .font-inter { font-family: 'Inter', 'Geist', system-ui, sans-serif; }
      .font-geist { font-family: 'Geist', 'Inter', system-ui, sans-serif; }
    `}</style>
  </div>
  );
}; 