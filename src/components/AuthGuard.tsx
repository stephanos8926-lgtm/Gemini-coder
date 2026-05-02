import React from 'react';
import { motion } from 'motion/react';
import { LogIn, Loader2, X, Plus, FolderOpen, Github } from 'lucide-react';

interface AuthGuardProps {
  user: any;
  isAuthLoading: boolean;
  isWorkspacesLoading: boolean;
  isWorkspacesError: boolean;
  workspaces: string[];
  workspaceName: string;
  showWorkspaceModal: boolean;
  onSignInGoogle: () => void;
  onSignInGithub: () => void;
  onShowWorkspaceModal: () => void;
  onRetry: () => void;
  idToken: string | null;
}

const SignInView = ({ onSignInGithub, onSignInGoogle }: any) => (
  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#1e1e1e]/90 backdrop-blur-md">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-8 max-w-md w-full shadow-2xl text-center"
    >
      <div className="w-16 h-16 bg-[#007acc]/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <LogIn className="w-8 h-8 text-[#007acc]" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Welcome to RapidForge</h2>
      <p className="text-[#858585] mb-8">Please sign in to access your secure development workspaces.</p>
      <div className="flex flex-col gap-4">
        <button 
          onClick={onSignInGithub}
          className="w-full py-3 bg-white text-black hover:bg-[#e5e5e5] rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        >
          <Github className="w-5 h-5" />
          Sign In with GitHub
        </button>
        <button 
          onClick={onSignInGoogle}
          className="w-full py-3 bg-[#4285F4] hover:bg-[#357ae8] text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
        >
          <LogIn className="w-5 h-5" />
          Sign In with Google
        </button>
      </div>
    </motion.div>
  </div>
);

const LoadingView = () => (
  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#1e1e1e]/90 backdrop-blur-md">
    <div className="flex flex-col items-center gap-4">
      <Loader2 className="w-12 h-12 text-[#007acc] animate-spin" />
      <span className="text-white font-medium">Loading your workspaces...</span>
    </div>
  </div>
);

const ErrorView = ({ onRetry }: any) => (
  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#1e1e1e]/90 backdrop-blur-md">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#252526] border border-red-500/20 rounded-xl p-8 max-w-md w-full shadow-2xl text-center"
    >
      <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <X className="w-8 h-8 text-red-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Failed to Load Workspaces</h2>
      <p className="text-[#858585] mb-8">There was an error connecting to the development server. Please check your connection and try again.</p>
      <button 
        onClick={onRetry}
        className="w-full py-3 bg-[#3c3c3c] hover:bg-[#454545] text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2"
      >
        Retry Loading
      </button>
    </motion.div>
  </div>
);

const NoWorkspacesView = ({ onShowWorkspaceModal }: any) => (
  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#1e1e1e]/90 backdrop-blur-md">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-8 max-w-md w-full shadow-2xl text-center"
    >
      <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <Plus className="w-8 h-8 text-green-500" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">No Workspaces Found</h2>
      <p className="text-[#858585] mb-8">You need to create your first workspace to start coding. Each workspace is a secure, isolated environment for your projects.</p>
      <button 
        onClick={onShowWorkspaceModal}
        className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-green-600/20"
      >
        <Plus className="w-5 h-5" />
        Create First Workspace
      </button>
    </motion.div>
  </div>
);

const SelectWorkspaceView = ({ onShowWorkspaceModal }: any) => (
  <div className="absolute inset-0 z-[100] flex items-center justify-center bg-[#1e1e1e]/90 backdrop-blur-md">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-8 max-w-md w-full shadow-2xl text-center"
    >
      <div className="w-16 h-16 bg-[#007acc]/10 rounded-full flex items-center justify-center mx-auto mb-6">
        <FolderOpen className="w-8 h-8 text-[#007acc]" />
      </div>
      <h2 className="text-2xl font-bold text-white mb-2">Select a Workspace</h2>
      <p className="text-[#858585] mb-8">Choose an existing workspace or create a new one to continue your work.</p>
      <button 
        onClick={onShowWorkspaceModal}
        className="w-full py-3 bg-[#007acc] hover:bg-[#005f9e] text-white rounded-lg font-semibold transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#007acc]/20"
      >
        <FolderOpen className="w-5 h-5" />
        Open Workspace Selector
      </button>
    </motion.div>
  </div>
);

export const AuthGuard: React.FC<AuthGuardProps> = (props) => {
  const {
    user,
    isAuthLoading,
    isWorkspacesLoading,
    isWorkspacesError,
    workspaces,
    workspaceName,
    showWorkspaceModal,
    onSignInGoogle,
    onSignInGithub,
    onShowWorkspaceModal,
    onRetry,
    idToken
  } = props;

  if (!user && !isAuthLoading) return <SignInView onSignInGithub={onSignInGithub} onSignInGoogle={onSignInGoogle} />;
  if (user && !isAuthLoading && isWorkspacesLoading && !showWorkspaceModal) return <LoadingView />;
  if (user && !isAuthLoading && isWorkspacesError && !showWorkspaceModal) return <ErrorView onRetry={onRetry} />;
  if (user && !isAuthLoading && !isWorkspacesLoading && !isWorkspacesError && idToken && workspaces.length === 0 && !workspaceName && !showWorkspaceModal) return <NoWorkspacesView onShowWorkspaceModal={onShowWorkspaceModal} />;
  if (user && !isAuthLoading && !isWorkspacesLoading && idToken && workspaces.length > 0 && !workspaceName && !showWorkspaceModal) return <SelectWorkspaceView onShowWorkspaceModal={onShowWorkspaceModal} />;

  return null;
};
