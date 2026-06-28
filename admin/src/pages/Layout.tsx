import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Ticket, LogOut, Briefcase } from 'lucide-react';

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">
            Velocity Admin
          </h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <NavLink
            to="/dashboard"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`
            }
          >
            <LayoutDashboard size={20} />
            <span className="font-medium">Dashboard</span>
          </NavLink>
          
          <NavLink
            to="/users"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`
            }
          >
            <Users size={20} />
            <span className="font-medium">Users Management</span>
          </NavLink>

          <NavLink
            to="/brands"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`
            }
          >
            <Briefcase size={20} />
            <span className="font-medium">Registered Brands</span>
          </NavLink>

          <NavLink
            to="/coupons"
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive 
                  ? 'bg-blue-500/10 text-blue-400' 
                  : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
              }`
            }
          >
            <Ticket size={20} />
            <span className="font-medium">Coupons Management</span>
          </NavLink>
        </nav>

        <div className="p-4 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={20} />
            <span className="font-medium">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background/95">
        <div className="p-8 max-w-7xl mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
