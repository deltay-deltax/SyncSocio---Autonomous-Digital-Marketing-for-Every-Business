import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, Ticket, LogOut, Briefcase, BarChart3, ReceiptText, Activity, ClipboardList, Menu, X, RotateCcw, CalendarClock, Image, MessageSquare, Package, Smartphone, Bell, Target, BrainCircuit } from 'lucide-react';
import logo from '../assets/logo.jpeg';
import axios from 'axios';

const API = `${import.meta.env.VITE_API_URL || 'http://localhost:5050'}/api/admin`;

const NAV_SECTIONS = [
  {
    title: 'OVERVIEW',
    items: [
      { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    ]
  },
  {
    title: 'USERS & BRANDS',
    items: [
      { to: '/users', icon: Users, label: 'Users' },
      { to: '/brands', icon: Briefcase, label: 'Brands' },
      { to: '/support-tickets', icon: ClipboardList, label: 'Support Tickets' },
    ]
  },
  {
    title: 'COMMERCE',
    items: [
      { to: '/transactions', icon: ReceiptText, label: 'Transactions' },
      { to: '/refunds', icon: RotateCcw, label: 'Refund History' },
      { to: '/coupons', icon: Ticket, label: 'Coupons' },
    ]
  },
  {
    title: 'CONTENT',
    items: [
      { to: '/generations', icon: Image, label: 'Generations' },
      { to: '/scheduled-posts', icon: CalendarClock, label: 'Scheduled Posts' },
    ]
  },
  {
    title: 'MESSAGING & SALES',
    items: [
      { to: '/whatsapp-templates', icon: Smartphone, label: 'WhatsApp Templates' },
      { to: '/dm-automations', icon: MessageSquare, label: 'DM Automations' },
      { to: '/nexa-conversations', icon: Target, label: 'Nexa Conversations' },
      { to: '/nexa-knowledge', icon: MessageSquare, label: 'Nexa Knowledge Base' },
    ]
  },
  {
    title: 'CATALOG',
    items: [
      { to: '/products', icon: Package, label: 'Products' },
    ]
  },
  {
    title: 'GROWTH',
    items: [
      { to: '/lead-generation', icon: ClipboardList, label: 'Lead Generation' },
      { to: '/leads-management', icon: ClipboardList, label: 'Leads CRM' },
      { to: '/marketing-crm', icon: ClipboardList, label: 'Marketing CRM' },
      { to: '/creators', icon: Users, label: 'Creators' },
      { to: '/waitlist', icon: ClipboardList, label: 'Waitlist' },
    ]
  },
  {
    title: 'SYSTEM',
    items: [
      { to: '/system-health', icon: Activity, label: 'System Health' },
      { to: '/ai-operations', icon: BrainCircuit, label: 'AI Operations' },
      { to: '/ads-console', icon: Target, label: 'Ads Console' },
      { to: '/campaigns', icon: Target, label: 'Campaigns Monitor' },
      { to: '/landing-gallery', icon: LayoutDashboard, label: 'Landing Gallery' },
      { to: '/creative-showcase-gallery', icon: LayoutDashboard, label: 'Creative Showcase' },
    ]
  }
];

export default function Layout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        if (!token) return;
        const res = await axios.get(`${API}/notifications/count`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) setUnreadNotifications(res.data.unreadCount);
      } catch (err) {
        console.error('Failed to fetch notification count');
      }
    };
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

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

      {/* Top Header Navigation (Desktop) */}
      <div className="hidden md:flex fixed top-0 right-0 left-56 h-16 bg-transparent z-20 items-center justify-end px-8 pointer-events-none">
        <div className="pointer-events-auto flex items-center gap-4">
          <button 
            onClick={() => navigate('/notifications')}
            className="relative p-2.5 rounded-xl bg-card/80 backdrop-blur-sm border border-border/50 text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all hover-lift shadow-sm"
          >
            <Bell size={18} />
            {unreadNotifications > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-rose-500 rounded-full ring-2 ring-card animate-pulse" />
            )}
          </button>
        </div>
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
        <nav className="flex-1 px-3 py-4 space-y-6 overflow-y-auto scrollbar-hide pb-20">
          {NAV_SECTIONS.filter(section => {
            const role = localStorage.getItem('adminRole');
            if (role === 'marketing') {
              return section.title === 'GROWTH';
            }
            return true;
          }).map((section, idx) => {
            const role = localStorage.getItem('adminRole');
            const items = role === 'marketing' 
              ? section.items.filter(item => item.to === '/marketing-crm')
              : section.items;
              
            if (items.length === 0) return null;

            return (
              <div key={idx}>
                <h3 className="px-4 text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest mb-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {items.map(({ to, icon: Icon, label }) => (
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
                </div>
              </div>
            );
          })}
        </nav>

        {/* Divider + Logout */}
        <div className="p-3 border-t border-border">
          <button
            onClick={() => {
              localStorage.removeItem('adminToken');
              localStorage.removeItem('adminRole');
              navigate('/login');
            }}
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
