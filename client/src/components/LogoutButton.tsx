import { useLocation } from "wouter";
import { LogOut } from "lucide-react";

export default function LogoutButton() {
  const [, setLocation] = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('userRole');
    setLocation('/select-role');
  };

  return (
    <button 
      onClick={handleLogout}
      className="flex items-center gap-2 px-4 py-2 bg-red-600/20 text-red-400 hover:bg-red-600/30 rounded-xl transition-all font-medium border border-red-500/20"
    >
      <LogOut className="w-4 h-4" />
      Гарах
    </button>
  );
}