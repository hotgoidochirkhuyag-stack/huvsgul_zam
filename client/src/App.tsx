import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import RoleSelection from "@/pages/RoleSelection";
import AdminLogin from "@/pages/AdminLogin";
import BoardDashboard from "@/pages/BoardDashboard";
import ProjectDashboard from "@/pages/ProjectDashboard";
import AdminDashboard from "@/pages/AdminDashboard";
import EngineerDashboard from "@/pages/EngineerDashboard";


const ProtectedRoute = ({ component: Component, role }: { component: React.ComponentType, role: string }) => {
  const userRole = localStorage.getItem('userRole');
  const token = localStorage.getItem('adminToken');

  // 1. Токен байхгүй бол нэвтрэх хуудас руу
  if (!token) return <Redirect to="/admin" />;

  // 2. Үүрэг таарахгүй бол, хэрэглэгчийн үүрэгт нь тохирсон хуудас руу шилжүүлэх
  if (userRole !== role) {
    if (userRole === 'BOARD') return <Redirect to="/dashboard/board" />;
    if (userRole === 'PROJECT') return <Redirect to="/dashboard/project" />;
    if (userRole === 'ADMIN') return <Redirect to="/dashboard/admin" />;
    if (userRole === 'ENGINEER') return <Redirect to="/dashboard/engineer" />;
    return <Redirect to="/admin" />;
  }

  return <Component />;
};

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/admin" component={AdminLogin} />

      {/* Самбарын замууд */}
      <Route path="/select-role" component={RoleSelection} />
      <Route path="/dashboard/board" component={() => <ProtectedRoute component={BoardDashboard} role="BOARD" />} />
      <Route path="/dashboard/project" component={() => <ProtectedRoute component={ProjectDashboard} role="PROJECT" />} />
      <Route path="/dashboard/admin" component={() => <ProtectedRoute component={AdminDashboard} role="ADMIN" />} />
      <Route path="/dashboard/engineer" component={() => <ProtectedRoute component={EngineerDashboard} role="ENGINEER" />} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;