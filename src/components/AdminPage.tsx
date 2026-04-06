import React, { useState, useEffect } from 'react';
import { 
  Loader2, 
  ToggleLeft, 
  ToggleRight, 
  Users, 
  Settings, 
  Shield, 
  Trash2, 
  UserPlus, 
  GitPullRequest, 
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Terminal
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminPage() {
  console.log('AdminPage rendering');
  const [activeTab, setActiveTab] = useState<'users' | 'mcp' | 'system'>('users');
  const [users, setUsers] = useState<any[]>([]);
  const [mcpTools, setMcpTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [secretKey, setSecretKey] = useState(localStorage.getItem('gide_admin_key') || '');
  const [isAuthorized, setIsAuthorized] = useState(false);

  useEffect(() => {
    if (secretKey) {
      checkAuthorization();
    } else {
      setLoading(false);
    }
  }, []);

  const checkAuthorization = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey })
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
        setIsAuthorized(true);
        localStorage.setItem('gide_admin_key', secretKey);
        fetchMcpTools();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setIsAuthorized(false);
        localStorage.removeItem('gide_admin_key');
        if (secretKey) toast.error(errorData.error || 'Invalid admin secret key');
      }
    } catch (e) {
      console.error('Auth check failed', e);
      setIsAuthorized(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey })
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      }
    } catch (e) {
      toast.error('Failed to refresh users');
    }
  };

  const fetchMcpTools = async () => {
    try {
      const response = await fetch('/api/admin/mcp/tools');
      const data = await response.json();
      setMcpTools(data);
    } catch (e) {
      console.error('Failed to fetch MCP tools', e);
    }
  };

  const toggleMcpTool = async (name: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/admin/mcp/tools/${name}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !enabled })
      });
      if (response.ok) {
        toast.success(`Tool ${name} ${!enabled ? 'enabled' : 'disabled'}`);
        fetchMcpTools();
      } else {
        toast.error('Failed to toggle tool');
      }
    } catch (e) {
      toast.error('Failed to toggle tool');
    }
  };

  const updateUserSandbox = async (uid: string, no_sandbox: boolean) => {
    try {
      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey, uid, no_sandbox })
      });
      if (response.ok) {
        toast.success('User updated');
        fetchUsers();
      }
    } catch (e) {
      toast.error('Update failed');
    }
  };

  const updateUserRole = async (uid: string, role: 'user' | 'admin') => {
    try {
      const response = await fetch('/api/admin/users/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey, uid, role })
      });
      if (response.ok) {
        toast.success('User role updated');
        fetchUsers();
      }
    } catch (e) {
      toast.error('Role update failed');
    }
  };

  const deleteUser = async (uid: string) => {
    if (!window.confirm('Are you sure you want to delete this user? This action is irreversible.')) return;
    try {
      const response = await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey, uid })
      });
      if (response.ok) {
        toast.success('User deleted');
        fetchUsers();
      }
    } catch (e) {
      toast.error('Delete failed');
    }
  };

  const handleGitPull = async () => {
    const target = window.confirm('Update GIDE Application (root)? Click Cancel to update Projects (workspaces).') ? 'root' : 'workspaces';
    const repoUrl = prompt('Enter repository URL (optional if already initialized):');
    const branch = prompt('Enter branch name (default: main):') || 'main';
    
    toast.promise(
      fetch('/api/git/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey, repoUrl, branch, target })
      }),
      {
        loading: `Pulling latest changes into ${target}...`,
        success: 'Repository updated successfully',
        error: 'Git pull failed'
      }
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Loader2 className="w-8 h-8 animate-spin text-[#007acc]" />
        <p className="text-sm text-[#858585]">Authenticating Admin...</p>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 max-w-md mx-auto space-y-6">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
          <Shield className="w-8 h-8" />
        </div>
        <div className="text-center space-y-2">
          <h1 className="text-xl font-bold text-white">Admin Access Required</h1>
          <p className="text-sm text-[#858585]">Please enter the administrative secret key to access these management tools.</p>
        </div>
        <div className="w-full space-y-4">
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#858585]" />
            <input
              type="password"
              value={secretKey}
              onChange={(e) => setSecretKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && checkAuthorization()}
              placeholder="Admin Secret Key"
              className="w-full bg-[#252526] border border-[#3c3c3c] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-[#007acc] transition-all"
            />
          </div>
          <button
            onClick={checkAuthorization}
            disabled={loading}
            className="w-full bg-[#007acc] hover:bg-[#005f9e] text-white font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Unlock className="w-4 h-4" />
            )}
            {loading ? 'Authenticating...' : 'Unlock Admin Panel'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e]">
      {/* Admin Tabs */}
      <div className="flex items-center gap-1 p-4 border-b border-[#3c3c3c] bg-[#252526]">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'users' ? 'bg-[#37373d] text-white' : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d2d]'
          }`}
        >
          <Users className="w-4 h-4" />
          User Management
        </button>
        <button
          onClick={() => setActiveTab('mcp')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'mcp' ? 'bg-[#37373d] text-white' : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d2d]'
          }`}
        >
          <Settings className="w-4 h-4" />
          MCP Tools
        </button>
        <button
          onClick={() => setActiveTab('system')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === 'system' ? 'bg-[#37373d] text-white' : 'text-[#858585] hover:text-[#cccccc] hover:bg-[#2d2d2d]'
          }`}
        >
          <Terminal className="w-4 h-4" />
          System
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
        {activeTab === 'users' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-[#007acc]" />
                Registered Users ({users.length})
              </h2>
              <button 
                onClick={fetchUsers}
                className="p-2 hover:bg-[#3c3c3c] rounded-lg text-[#858585] transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
            
            <div className="grid gap-3">
              {users.map((user) => (
                <div key={user.uid} className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-4 flex items-center justify-between group hover:border-[#454545] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#007acc]/10 border border-[#007acc]/20 flex items-center justify-center">
                      {user.photoURL ? (
                        <img src={user.photoURL} alt="" className="w-full h-full rounded-full object-cover" />
                      ) : (
                        <Users className="w-5 h-5 text-[#007acc]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{user.displayName || 'Anonymous'}</span>
                        {user.role === 'admin' && (
                          <span className="text-[10px] bg-[#007acc]/20 text-[#007acc] px-1.5 py-0.5 rounded font-bold uppercase tracking-tighter">Admin</span>
                        )}
                      </div>
                      <div className="text-xs text-[#858585] font-mono">{user.email}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-[#858585] uppercase font-bold">Role</span>
                      <button 
                        onClick={() => updateUserRole(user.uid, user.role === 'admin' ? 'user' : 'admin')}
                        className={`text-xs font-medium px-2 py-0.5 rounded transition-colors ${
                          user.role === 'admin' 
                            ? 'bg-[#007acc]/20 text-[#007acc] hover:bg-[#007acc]/30' 
                            : 'bg-[#3c3c3c] text-[#858585] hover:bg-[#454545] hover:text-[#cccccc]'
                        }`}
                      >
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <span className="text-[10px] text-[#858585] uppercase font-bold">Sandbox</span>
                      <button 
                        onClick={() => updateUserSandbox(user.uid, !user.no_sandbox)}
                        className="transition-colors"
                      >
                        {user.no_sandbox ? (
                          <div className="flex items-center gap-1 text-red-400">
                            <AlertCircle className="w-4 h-4" />
                            <span className="text-xs">Disabled</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="text-xs">Enabled</span>
                          </div>
                        )}
                      </button>
                    </div>
                    <button 
                      onClick={() => deleteUser(user.uid)}
                      className="p-2 text-[#858585] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'mcp' && (
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Settings className="w-5 h-5 text-[#007acc]" />
              MCP Tool Management
            </h2>
            <div className="grid gap-3">
              {mcpTools.map((tool) => (
                <div key={tool.name} className="flex items-center justify-between p-4 bg-[#252526] border border-[#3c3c3c] rounded-xl">
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-white">{tool.name}</h3>
                    <p className="text-xs text-[#858585] mt-1 line-clamp-1">{tool.description || 'No description provided'}</p>
                  </div>
                  <button onClick={() => toggleMcpTool(tool.name, tool.enabled)} className="ml-4">
                    {tool.enabled ? (
                      <ToggleRight className="w-8 h-8 text-green-500" />
                    ) : (
                      <ToggleLeft className="w-8 h-8 text-[#858585]" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'system' && (
          <div className="space-y-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <Terminal className="w-5 h-5 text-[#007acc]" />
              System Operations
            </h2>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#007acc]/10 rounded-lg text-[#007acc]">
                    <GitPullRequest className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Git Pull</h3>
                    <p className="text-xs text-[#858585]">Update workspace from remote</p>
                  </div>
                </div>
                <button 
                  onClick={handleGitPull}
                  className="w-full bg-[#37373d] hover:bg-[#454545] text-white text-xs font-medium py-2 rounded-lg transition-colors"
                >
                  Execute Pull
                </button>
              </div>

              <div className="bg-[#252526] border border-[#3c3c3c] rounded-xl p-6 space-y-4 opacity-50 cursor-not-allowed">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#007acc]/10 rounded-lg text-[#007acc]">
                    <RefreshCw className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Restart Server</h3>
                    <p className="text-xs text-[#858585]">Trigger backend process restart</p>
                  </div>
                </div>
                <button disabled className="w-full bg-[#37373d] text-[#858585] text-xs font-medium py-2 rounded-lg">
                  Coming Soon
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

