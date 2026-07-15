import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Ticket, LogOut, Briefcase, BarChart3, ReceiptText, Activity, ClipboardList, Menu, X, ShieldCheck, RotateCcw, CalendarClock } from 'lucide-react';
import logo from '../assets/logo.jpeg';

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/users', icon: Users, label: 'Users' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/transactions', icon: ReceiptText, label: 'Transactions' },
  { to: '/refunds', icon: RotateCcw, label: 'Refund History' },
  { to: '/scheduled-posts', icon: CalendarClock, label: 'Scheduled Posts' },
  { to: '/brands', icon: Briefcase, label: 'Brands' },
  { to: '/coupons', icon: Ticket, label: 'Coupons' },
  { to: '/system-health', icon: Activity, label: 'System Health' },
  { to: '/waitlist', icon: ClipboardList, label: 'Waitlist' },
  { to: '/testers', icon: ShieldCheck, label: 'Tester' },
  { to: '/landing-gallery', icon: LayoutDashboard, label: 'Landing Gallery' },
];

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  const closeSidebar = () => setSidebarOpen(false);

  return (
    <div className="flex h-screen bg-background text-foreground overflow-hidden">
      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-card/80 backdrop-blur-lg border-b border-border z-20 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Sync Socio Logo" className="h-8 w-8 rounded-lg object-cover" />
          <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">
            Sync Socio
          </h1>
        </div>
        <button onClick={() => setSidebarOpen(true)} className="p-2 text-foreground">
          <Menu size={24} />
        </button>
      </div>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30 backdrop-blur-sm transition-opacity" 
          onClick={closeSidebar} 
        />
      )}

      {/* Sidebar */}
      <aside className={`fixed md:static inset-y-0 left-0 z-40 w-56 border-r border-border bg-card/90 backdrop-blur-xl flex flex-col flex-shrink-0 transition-transform duration-300 ease-in-out ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 glass-card`}>
        {/* Logo */}
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Sync Socio Logo" className="h-9 w-9 rounded-xl object-cover shadow-sm" />
            <div>
              <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">
                Sync Socio
              </h1>
              <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">Control Center</p>
            </div>
          </div>
          <button onClick={closeSidebar} className="md:hidden p-1 text-muted-foreground hover:text-foreground">
            <X size={20} />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-hide">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all ${
                  isActive
                    ? 'bg-blue-500/10 text-blue-400 font-medium border border-blue-500/20 shadow-sm'
                    : 'text-muted-foreground hover:bg-white/5 hover:text-foreground hover-lift border border-transparent'
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
            className="flex items-center gap-3 px-3 py-2.5 w-full rounded-xl text-sm text-red-400 hover:bg-red-500/10 hover:border-red-500/20 border border-transparent transition-all hover-lift"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto bg-background/95 pt-16 md:pt-0 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none"></div>
        <div className="p-4 md:p-6 w-full mx-auto relative z-10">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
