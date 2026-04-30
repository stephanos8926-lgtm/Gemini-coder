import React from 'react';
import { LogOut, LogIn, Github } from 'lucide-react';

interface UserProfileProps {
  user: any;
  onSignInGoogle: () => void;
  onSignInGithub: () => void;
  onSignOut: () => void;
}

export const UserProfile: React.FC<UserProfileProps> = ({
  user,
  onSignInGoogle,
  onSignInGithub,
  onSignOut
}) => {
  const ADMIN_EMAIL = process.env.ADMIN_EMAIL;

  return user ? (
    <div className="flex items-center gap-2 pl-1">
      <div className="hidden lg:flex flex-col items-end">
        <span className="text-[10px] font-bold text-white leading-none">{user.displayName || 'User'}</span>
        <span className="text-[9px] text-[#858585] leading-none mt-0.5">{user.email}</span>
      </div>
      {user?.role === 'admin' && (
        <a
          href="/admin"
          target="_blank"
          rel="noopener noreferrer"
          id="header-admin-link"
          className="p-1.5 bg-[#8b0000] hover:bg-[#a50000] rounded-full transition-all border border-[#a50000] text-white text-[10px] font-bold px-2"
          title="Admin Dashboard"
        >
          ADMIN
        </a>
      )}
      <button
        onClick={onSignOut}
        id="header-signout-btn"
        className="p-1.5 bg-[#3c3c3c] hover:bg-[#4c4c4c] rounded-full transition-all border border-[#4c4c4c] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007acc]"
        title="Sign Out"
        aria-label="Sign out of your account"
      >
        <LogOut className="w-3.5 h-3.5 text-[#cccccc]" />
      </button>
    </div>
  ) : (
    <div className="flex items-center gap-2">
      <button
        onClick={onSignInGithub}
        id="header-signin-github-btn"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-white text-black hover:bg-[#e5e5e5] rounded-md transition-all"
        title="Sign In with GitHub"
      >
        <Github className="w-3.5 h-3.5" />
        <span>GitHub</span>
      </button>
      <button
        onClick={onSignInGoogle}
        id="header-signin-google-btn"
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-[#4285F4] text-white hover:bg-[#357ae8] rounded-md transition-all"
        title="Sign In with Google"
      >
        <LogIn className="w-3.5 h-3.5" />
        <span>Google</span>
      </button>
    </div>
  );
};
