import React from 'react';
import { Github, Sparkles } from 'lucide-react';
import { RW_APP_NAME, RW_APP_DESCRIPTION } from '../constants/app';

export const LandingPage: React.FC<{ onSignInGoogle: () => void; onSignInGithub: () => void }> = ({ onSignInGoogle, onSignInGithub }) => {
  return (
    <div className="h-full bg-[#121212] flex flex-col items-center justify-center p-6 text-center">
      <div className="mb-8 p-4 bg-[#007acc]/10 rounded-2xl border border-[#007acc]/20">
        <Sparkles className="w-12 h-12 text-[#007acc]" />
      </div>
      <h1 className="text-4xl font-bold text-white mb-4">Welcome to {RW_APP_NAME}</h1>
      <p className="text-[#858585] max-w-md mb-8">
        {RW_APP_DESCRIPTION}
      </p>
      <div className="flex flex-col gap-4">
        <button
          onClick={onSignInGithub}
          className="flex items-center gap-3 px-6 py-3 bg-white text-black hover:bg-[#e5e5e5] rounded-xl font-bold transition-all shadow-lg"
        >
          <Github className="w-5 h-5" />
          Sign in with GitHub
        </button>
        <button
          onClick={onSignInGoogle}
          className="flex items-center gap-3 px-6 py-3 bg-[#4285F4] text-white hover:bg-[#357ae8] rounded-xl font-bold transition-all shadow-lg"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M21.35 11.1h-9.2v2.8h5.27c-.8 2.2-2.8 3.7-5.27 3.7-3.3 0-6-2.7-6-6s2.7-6 6-6c1.5 0 2.9.5 4 1.5l2.1-2.1c-1.7-1.6-4-2.5-6.1-2.5-5.5 0-10 4.5-10 10s4.5 10 10 10c5.3 0 9.5-3.7 9.5-9 0-.6-.1-1.2-.2-1.8z" />
          </svg>
          Sign in with Google
        </button>
      </div>
    </div>
  );
};
