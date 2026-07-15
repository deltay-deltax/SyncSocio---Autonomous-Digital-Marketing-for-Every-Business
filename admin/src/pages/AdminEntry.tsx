import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, ArrowRight, ClipboardList, Image } from 'lucide-react';
import logo from '../assets/logo.jpeg';

export default function AdminEntry() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.02] pointer-events-none"></div>
      
      {/* Header */}
      <header className="h-16 bg-card/80 backdrop-blur-lg border-b border-border z-20 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <img src={logo} alt="Sync Socio Logo" className="h-8 w-8 rounded-lg object-cover" />
          <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">
            Sync Socio Admin
          </h1>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-red-400 hover:bg-red-500/10 border border-transparent transition-all hover-lift"
        >
          <LogOut size={16} />
          <span>Logout</span>
        </button>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6 z-10">
        <div className="max-w-4xl w-full">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Welcome to Control Center</h2>
            <p className="text-muted-foreground text-lg">Select a module to continue</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Admin Dashboard Card */}
            <div 
              onClick={() => navigate('/dashboard')}
              className="glass-card group cursor-pointer hover:border-blue-500/50 transition-all duration-300 p-8 rounded-2xl flex flex-col items-center text-center hover-lift"
            >
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <LayoutDashboard className="w-10 h-10 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-blue-400 transition-colors">Admin Dashboard</h3>
              <p className="text-muted-foreground mb-8">Manage users, transactions, analytics, brands, coupons, and system health.</p>
              
              <div className="mt-auto flex items-center text-blue-500 font-medium group-hover:gap-2 transition-all">
                Enter Dashboard <ArrowRight className="w-5 h-5 ml-1" />
              </div>
            </div>

            {/* Leads & Brands Management Card */}
            <div 
              onClick={() => navigate('/leads-management')}
              className="glass-card group cursor-pointer hover:border-violet-500/50 transition-all duration-300 p-8 rounded-2xl flex flex-col items-center text-center hover-lift"
            >
              <div className="w-20 h-20 bg-violet-500/10 rounded-full flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ClipboardList className="w-10 h-10 text-violet-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3 group-hover:text-violet-400 transition-colors">Leads & Brands</h3>
              <p className="text-muted-foreground mb-8">Track approached brands, manage statuses, sticky notes, and add new leads manually.</p>
              
              <div className="mt-auto flex items-center text-violet-500 font-medium group-hover:gap-2 transition-all">
                Enter Leads Management <ArrowRight className="w-5 h-5 ml-1" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
