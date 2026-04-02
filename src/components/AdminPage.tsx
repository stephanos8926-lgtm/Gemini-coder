import React, { useState, useEffect } from 'react';
import { TerminalPanel } from './TerminalPanel';
import { Trash2, RefreshCw, GitBranch, Users, Server, Settings as SettingsIcon, AlertCircle } from 'lucide-react';

const AdminPage: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [secretKey, setSecretKey] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [status, setStatus] = useState('');
  const [logs, setLogs] = useState('');
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    const savedKey = sessionStorage.getItem('ADMIN_SECRET_KEY');
    if (savedKey) {
      setSecretKey(savedKey);
      setIsAuthenticated(true);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchSystemInfo();
      fetchLogs();
      fetchUsers();
    }
  }, [isAuthenticated]);

  const fetchUsers = async () => {
    const response = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey }),
    });
    if (response.ok) setUsers(await response.json());
  };

  const deleteUser = async (uid: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    await callAdminApi('/api/admin/users/delete', { uid });
    fetchUsers();
  };

  const fetchSystemInfo = async () => {
    const response = await fetch('/api/admin/system-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey }),
    });
    if (response.ok) setSystemInfo(await response.json());
  };

  const handleLogin = () => {
    sessionStorage.setItem('ADMIN_SECRET_KEY', secretKey);
    setIsAuthenticated(true);
  };

  const callAdminApi = async (endpoint: string, body: any = {}) => {
    setStatus(`Executing ${endpoint}...`);
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey, ...body }),
      });

      if (response.ok) {
        setStatus(`Success: ${endpoint} executed.`);
      } else {
        const error = await response.json();
        setStatus(`Error: ${error.error}`);
      }
    } catch (error) {
      setStatus(`Error: ${String(error)}`);
    }
  };

  const fetchLogs = async () => {
    const response = await fetch('/api/admin/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secretKey }),
    });
    if (response.ok) {
      const data = await response.json();
      setLogs(data.logs);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="p-6 max-w-md mx-auto bg-[#1e1e1e] text-[#d4d4d4] rounded-lg shadow-xl">
        <h2 className="text-xl font-bold mb-4">Admin Login</h2>
        <input
          type="password"
          value={secretKey}
          onChange={(e) => setSecretKey(e.target.value)}
          placeholder="Enter Admin Secret Key"
          className="bg-[#252526] border border-[#3c3c3c] p-2 w-full mb-4 rounded"
        />
        <button onClick={handleLogin} className="bg-[#007acc] text-white p-2 rounded w-full hover:bg-[#005f9e]">
          Login
        </button>
        <button onClick={onBack} className="mt-2 text-[#858585] w-full hover:text-white">Back</button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto bg-[#1e1e1e] text-[#d4d4d4] min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Admin Panel</h2>
        <button onClick={onBack} className="text-[#858585] hover:text-white">Back to App</button>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* System Info */}
        <div className="bg-[#252526] p-4 rounded-lg border border-[#3c3c3c]">
          <h3 className="font-bold mb-3 flex items-center gap-2"><Server className="w-4 h-4" /> System Metrics</h3>
          {systemInfo && (
            <div className="text-xs space-y-1 text-[#cccccc]">
              <p>Memory (RSS): {Math.round(systemInfo.memoryUsage.rss / 1024 / 1024)} MB</p>
              <p>Heap Used: {Math.round(systemInfo.memoryUsage.heapUsed / 1024 / 1024)} MB</p>
              <p>CPU: {systemInfo.cpuUsage}%</p>
              <p>Uptime: {Math.round(systemInfo.uptime / 60)} mins</p>
            </div>
          )}
        </div>

        {/* Git Section */}
        <div className="bg-[#252526] p-4 rounded-lg border border-[#3c3c3c]">
          <h3 className="font-bold mb-3 flex items-center gap-2"><GitBranch className="w-4 h-4" /> Git Control</h3>
          <div className="space-y-2">
            <button onClick={() => callAdminApi('/api/git/pull', { repoUrl: 'https://github.com/stephanos8926-lgtm/Gemini-coder.git', branch: 'main' })} className="bg-[#007acc] text-white p-2 rounded w-full text-sm hover:bg-[#005f9e]">
              Pull Latest Code
            </button>
            <button onClick={() => callAdminApi('/api/restart')} className="bg-[#d16969] text-white p-2 rounded w-full text-sm hover:bg-[#b94d4d]">
              Restart Server
            </button>
          </div>
        </div>

        {/* Logs */}
        <div className="bg-[#252526] p-4 rounded-lg border border-[#3c3c3c]">
          <h3 className="font-bold mb-3 flex items-center gap-2"><AlertCircle className="w-4 h-4" /> Recent Errors</h3>
          <pre className="text-[10px] bg-[#1e1e1e] p-2 rounded overflow-auto h-32 text-red-400">{logs}</pre>
        </div>
      </div>

      {/* Users Section */}
      <div className="bg-[#252526] p-4 rounded-lg border border-[#3c3c3c] mb-6">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Users className="w-4 h-4" /> User Management</h3>
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="text-[#858585] text-xs uppercase">
              <th className="pb-2">Email</th>
              <th className="pb-2">Role</th>
              <th className="pb-2">No Sandbox</th>
              <th className="pb-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="py-8 text-center italic text-[#858585]">No users found.</td>
              </tr>
            ) : (
              users.map((u, index) => (
                <tr key={u.uid || `user-${index}`} className="border-t border-[#3c3c3c]">
                <td className="py-2">{u.email}</td>
                <td className="py-2">{u.role}</td>
                <td className="py-2">
                  <input 
                    type="checkbox" 
                    checked={u.no_sandbox || false} 
                    onChange={(e) => {
                      callAdminApi('/api/admin/users/update', { uid: u.uid, no_sandbox: e.target.checked });
                      fetchUsers();
                    }}
                  />
                </td>
                <td className="py-2">
                  <button onClick={() => deleteUser(u.uid)} className="text-[#d16969] hover:text-red-400"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))
          )}
        </tbody>
        </table>
      </div>

      {status && <p className="mt-4 p-2 bg-[#252526] border border-[#3c3c3c] text-xs rounded text-[#cccccc]">{status}</p>}
    </div>
  );
};

export default AdminPage;
