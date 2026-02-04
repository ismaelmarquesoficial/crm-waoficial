import React, { useState } from 'react';
import {
  LayoutDashboard,
  MessageSquare,
  Kanban,
  Megaphone,
  Settings,
  LogOut,
  Bell,
  Search,
  ChevronDown,
  Menu,
  X
} from 'lucide-react';

import Dashboard from './components/Dashboard';
import ChatInterface from './components/ChatInterface';
import KanbanBoard from './components/KanbanBoard';
import IntegrationScreen from './components/Integrations';
import Campaigns from './components/Campaigns';
import LoginScreen from './components/LoginScreen';
import SuperAdminDashboard from './components/SuperAdminDashboard';

type View = 'dashboard' | 'chat' | 'crm' | 'campaigns' | 'settings';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('token');
  });
  const [user, setUser] = useState<any>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });
  const [currentView, setCurrentView] = useState<View>('dashboard');

  // State: determines if Expanded (true) or Collapsed/Hidden (false)
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(() => window.innerWidth > 768);

  const [companyName, setCompanyName] = useState('');

  React.useEffect(() => {
    const handleResize = () => {
      // On mobile, auto-close (hide)
      if (window.innerWidth < 768) setIsSidebarExpanded(false);
      // On desktop, we want it expanded by default only if logic requires, 
      // but let's persist user choice or default to expanded?
      // For now, let's just ensure if we resize to desktop it stays as is (mini or expanded).
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  React.useEffect(() => {
    if (isAuthenticated) {
      fetch('http://localhost:3001/api/settings/company', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      })
        .then(r => r.json())
        .then(d => { if (d.name) setCompanyName(d.name); })
        .catch(() => { });
    }
  }, [isAuthenticated]);

  const handleLogin = () => {
    setIsAuthenticated(true);
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  };

  if (!isAuthenticated) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Super Admin Check
  if (user?.role === 'superadmin') {
    return <SuperAdminDashboard onLogout={() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
      setUser(null);
    }} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard': return <Dashboard />;
      case 'chat': return <ChatInterface />;
      case 'crm': return <KanbanBoard />;
      case 'campaigns': return <Campaigns />;
      case 'settings': return <IntegrationScreen />;
      default: return <Dashboard />;
    }
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => {
          setCurrentView(view);
          // On mobile, close sidebar when item selected
          if (window.innerWidth < 768) setIsSidebarExpanded(false);
        }}
        title={!isSidebarExpanded ? label : ''} // Tooltip for mini sidebar
        className={`w-full flex items-center gap-3.5 py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
            ? 'text-meta shadow-sm bg-gradient-to-r from-indigo-50 to-white'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          } ${isSidebarExpanded ? 'px-4' : 'justify-center px-2'}`}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gradient rounded-r-full"></div>
        )}

        <Icon
          size={22}
          strokeWidth={isActive ? 2 : 1.5}
          className={`transition-colors relative z-10 shrink-0 ${isActive ? 'text-meta' : 'text-slate-400 group-hover:text-slate-600'}`}
        />

        {/* Label - Hidden in Mini Mode */}
        {isSidebarExpanded && (
          <span className="relative z-10 whitespace-nowrap animate-fade-in">{label}</span>
        )}
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans selection:bg-meta/20 selection:text-meta">

      {/* Mobile Backdrop */}
      {isSidebarExpanded && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden animate-fade-in"
          onClick={() => setIsSidebarExpanded(false)}
        />
      )}

      {/* Sidebar - Responsive Logic
          Mobile: Closed (w-0) | Open (w-72)
          Desktop: Closed (w-20 Mini) | Open (w-72)
      */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-50 bg-white flex flex-col justify-between 
          shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] border-r border-slate-100 
          transition-all duration-300 ease-in-out overflow-hidden
          ${isSidebarExpanded
            ? 'w-72 translate-x-0'
            : 'w-0 -translate-x-full md:w-20 md:translate-x-0 md:border-r'
          }
        `}
      >
        {/* Inner Container */}
        <div className={`flex flex-col h-full overflow-y-auto overflow-x-hidden bg-white ${isSidebarExpanded ? 'w-full' : 'w-full items-center'}`}>
          <div className={`p-6 ${!isSidebarExpanded && 'px-2'}`}>

            {/* Header / Logo */}
            <div className={`flex items-center mb-10 ${isSidebarExpanded ? 'justify-between px-2' : 'justify-center'}`}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center shadow-lg shadow-meta/20 text-white font-extrabold text-xl tracking-tight transform transition-transform hover:scale-105 shrink-0">
                  T
                </div>
                {isSidebarExpanded && (
                  <div className="animate-fade-in min-w-0">
                    <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none truncate">{companyName || 'Talke.ia'}</h1>
                    <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Workspace</span>
                  </div>
                )}
              </div>
              {/* Mobile Close Button */}
              {isSidebarExpanded && (
                <button onClick={() => setIsSidebarExpanded(false)} className="md:hidden text-slate-400 hover:text-slate-600">
                  <X size={20} />
                </button>
              )}
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              {isSidebarExpanded && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-2 animate-fade-in">Principal</p>}
              {!isSidebarExpanded && <div className="h-4"></div>}

              <NavItem view="dashboard" icon={LayoutDashboard} label="Visão Geral" />
              <NavItem view="crm" icon={Kanban} label="CRM Pipeline" />
              <NavItem view="chat" icon={MessageSquare} label="Chat & Atendimento" />

              {isSidebarExpanded && <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-8 animate-fade-in">Ferramentas</p>}
              {!isSidebarExpanded && <div className="h-8"></div>}

              <NavItem view="campaigns" icon={Megaphone} label="Campanhas" />
              <NavItem view="settings" icon={Settings} label="Configurações" />
            </nav>
          </div>

          {/* Footer Actions */}
          <div className={`p-6 mt-auto ${!isSidebarExpanded && 'px-2'}`}>

            {/* Plan Card - Only Visible when Expanded */}
            {isSidebarExpanded && (
              <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl p-4 border border-slate-100 mb-4 relative overflow-hidden animate-fade-in">
                <div className="flex items-center gap-3 mb-2 relative z-10">
                  <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-meta shadow-sm">
                    <Megaphone size={14} />
                  </div>
                  <p className="text-xs font-semibold text-slate-700">Plano Pro</p>
                </div>
                <p className="text-[10px] text-slate-500 mb-3 leading-relaxed relative z-10">Você usou 80% das mensagens mensais.</p>
                <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden relative z-10">
                  <div className="w-[80%] h-full bg-brand-gradient rounded-full shadow-[0_0_10px_rgba(6,104,225,0.4)]"></div>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsAuthenticated(false);
                setUser(null);
              }}
              title="Sair da conta"
              className={`w-full flex items-center gap-3 py-3 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors ${isSidebarExpanded ? 'px-4' : 'justify-center px-0'}`}
            >
              <LogOut size={20} strokeWidth={1.5} />
              {isSidebarExpanded && <span className="animate-fade-in">Sair da conta</span>}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative transition-all duration-300">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-transparent to-transparent"></div>

        {/* Header - Glassmorphism style */}
        <header className="h-20 flex items-center justify-between px-4 md:px-8 py-4 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarExpanded(!isSidebarExpanded)}
              className="p-2 -ml-2 text-slate-500 hover:bg-white/60 hover:text-meta rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>

            <div className="flex flex-col justify-center">
              <h2 className="text-base md:text-lg font-bold text-slate-900 capitalize tracking-tight flex items-center gap-2">
                {currentView === 'crm' ? 'Pipeline' : currentView === 'campaigns' ? 'Campanhas' : currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h2>
              <span className="text-[10px] md:text-xs text-slate-500 font-medium hidden sm:inline-block">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl p-1.5 pr-2 md:pr-6 md:pl-2 rounded-full shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-white">
            {/* Search Bar - Hidden on Mobile */}
            <div className="relative group hidden md:block">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400 group-focus-within:text-meta transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar..."
                className="bg-transparent border-none py-2 pl-10 pr-4 text-sm w-48 focus:w-64 transition-all duration-300 outline-none text-slate-700 placeholder:text-slate-400 rounded-full focus:bg-white"
              />
            </div>

            <div className="w-px h-6 bg-slate-200 mx-2 hidden md:block"></div>

            <button className="relative p-2 text-slate-500 hover:text-meta hover:bg-white rounded-full transition-all">
              <Bell size={20} strokeWidth={1.5} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm ring-1 ring-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                <img src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'User')}&background=random`} alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-sm font-bold text-slate-800">{user?.name?.split(' ')[0] || 'Usuário'}</p>
                <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">{user?.role === 'superadmin' ? 'Admin' : user?.role || 'Membro'}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden lg:block" />
            </div>
          </div>
        </header>

        {/* View Content Container */}
        <div className="flex-1 overflow-hidden px-4 md:px-6 pb-6 relative z-0">
          <div className="bg-white/40 backdrop-blur-md rounded-[2rem] md:rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full overflow-hidden relative ring-1 ring-slate-900/5">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;