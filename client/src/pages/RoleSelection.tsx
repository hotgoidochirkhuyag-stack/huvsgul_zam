// RoleSelection.tsx
import { useLocation } from "wouter";
import { ArrowLeft } from "lucide-react"; // Буцах сумны дүрс

export default function RoleSelection() {
  const [, setLocation] = useLocation();

  const roles = [
    { name: "Онлайн хурал", path: "BOARD" },
    { name: "Төслийн хяналт", path: "PROJECT" },
    { name: "Үйлдвэрлэлийн хяналт", path: "ADMIN" },
    { name: "Техникийн дэмжлэг", path: "ENGINEER" },
  ];

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-4 text-white relative">

      {/* НҮҮР ХУУДАС РУУ БУЦАХ ТОВЧ */}
      <button 
        onClick={() => setLocation('/')}
        className="absolute top-8 left-8 flex items-center gap-2 text-slate-400 hover:text-white transition-all hover:bg-white/5 px-4 py-2 rounded-xl"
      >
        <ArrowLeft size={20} /> Нүүр хуудас
      </button>

      <h1 className="text-3xl font-bold mb-8">ХАНДАХ СИСТЕМЭЭ СОНГОНО УУ</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-2xl">
        {roles.map((r) => (
          <button 
            key={r.path}
            onClick={() => setLocation(`/admin?role=${r.path}`)}
            className="p-8 bg-slate-900 border border-white/10 rounded-2xl hover:border-blue-500 transition-all text-xl font-semibold"
          >
            {r.name}
          </button>
        ))}
      </div>
    </div>
  );
}