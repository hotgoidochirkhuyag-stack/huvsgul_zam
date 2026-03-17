import { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, Loader2, ArrowLeft } from 'lucide-react';
import { useLocation } from 'wouter';

const AdminLogin = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [location, setLocation] = useLocation();

  // Роль авах: pathname-аас (/admin/LAB → "LAB") эсвэл localStorage-аас
  const pathRole = location.split('/').filter(Boolean).pop()?.toUpperCase() ?? '';
  const selectedRole = (['ADMIN','BOARD','PROJECT','ENGINEER','HR','SUPERVISOR','MECHANIC','WAREHOUSE','LAB'].includes(pathRole))
    ? pathRole
    : localStorage.getItem("pendingRole") ?? '';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password, role: selectedRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Нэвтрэхэд алдаа гарлаа');
        return;
      }

      localStorage.setItem('adminToken', data.token);
      localStorage.setItem('userRole', data.role);
      localStorage.removeItem('pendingRole');

      // Рольдоо таарсан самбар луу шилжих
      const routes: Record<string, string> = {
        BOARD:      '/dashboard/board',
        PROJECT:    '/dashboard/project',
        ADMIN:      '/dashboard/admin',
        ENGINEER:   '/dashboard/engineer',
        HR:         '/dashboard/hr',
        SUPERVISOR: '/dashboard/supervisor',
        MECHANIC:   '/dashboard/mechanic',
        WAREHOUSE:  '/dashboard/warehouse',
        LAB:        '/dashboard/lab-qc',
      };
      setLocation(routes[data.role] ?? '/dashboard/admin');
    } catch (e) {
      setError('Серверт холбогдоход алдаа гарлаа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full"></div>
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] bg-indigo-600/10 blur-[120px] rounded-full"></div>
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} 
        animate={{ opacity: 1, y: 0 }} 
        className="w-full max-w-sm relative z-10"
      >
        <div className="bg-slate-900/60 backdrop-blur-xl p-8 rounded-3xl border border-white/10 shadow-2xl relative">

          {/* БУЦАХ ТОВЧ */}
          <button 
            onClick={() => setLocation('/select-role')}
            className="absolute top-4 left-4 p-2 text-slate-500 hover:text-white hover:bg-white/5 rounded-full transition-all"
            title="Үүрэг сонгох руу буцах"
          >
            <ArrowLeft size={20} />
          </button>

          <div className="flex items-center gap-3 mb-8 mt-6">
            <div className="p-3 bg-blue-600/20 rounded-2xl">
              <Lock className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white uppercase tracking-tight">
                {selectedRole ? `${selectedRole} - Нэвтрэх` : "Удирдах самбар"}
              </h2>
              <p className="text-xs text-slate-500">Хөвсгөл Зам ХХК</p>
            </div>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Хэрэглэгч</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500/50 outline-none transition-all"
                placeholder="Username"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-slate-400 uppercase tracking-widest">Нууц үг</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-5 py-4 text-white focus:border-blue-500/50 outline-none transition-all"
                placeholder="••••••••"
                required
              />
            </div>
            {error && <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">{error}</div>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-2xl transition-all flex items-center justify-center gap-2"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Нэвтэрч байна...</> : "НЭВТРЭХ"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLogin;