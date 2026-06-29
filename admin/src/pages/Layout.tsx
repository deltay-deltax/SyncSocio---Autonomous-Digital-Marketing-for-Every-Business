import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Ticket, LogOut, Briefcase, BarChart3, ReceiptText, Activity, ClipboardList } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/transactions', icon: ReceiptText, label: 'Transactions' },
  { to: '/brands', icon: Briefcase, label: 'Brands' },
  { to: '/coupons', icon: Ticket, label: 'Coupons' },
  { to: '/system-health', icon: Activity, label: 'System Health' },
  { to: '/waitlist', icon: ClipboardList, label: 'Waitlist' },
];

export default function Layout() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="p-6 border-b border-border">
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">
            Velocity Admin
          </h1>
          <p className="text-xs text-muted-foreground mt-1">Platform Control Center</p>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 font-medium'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground'
                }`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Divider + Logout */}
        <div className="p-3 border-t border-border">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
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
