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
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

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
          // Optional: close sidebar on mobile when item selected
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }}
        className={`w-full flex items-center gap-3.5 px-4 py-3 text-sm font-medium rounded-xl transition-all duration-300 group relative overflow-hidden ${isActive
          ? 'text-meta shadow-sm bg-gradient-to-r from-indigo-50 to-white'
          : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          }`}
      >
        {isActive && (
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gradient rounded-r-full"></div>
        )}

        <Icon
          size={20}
          strokeWidth={isActive ? 2 : 1.5}
          className={`transition-colors relative z-10 ${isActive ? 'text-meta' : 'text-slate-400 group-hover:text-slate-600'}`}
        />
        <span className="relative z-10 whitespace-nowrap">{label}</span>
      </button>
    );
  };

  return (
    <div className="flex h-screen bg-[#f8fafc] text-slate-900 overflow-hidden font-sans selection:bg-meta/20 selection:text-meta">

      {/* Mobile Backdrop */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-20 md:hidden animate-fade-in"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Modern Sidebar */}
      <aside
        className={`
          fixed md:relative inset-y-0 left-0 z-30 bg-white flex flex-col justify-between 
          shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)] border-r border-slate-100 
          transition-all duration-300 ease-in-out
          ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full md:w-0 md:translate-x-0 md:overflow-hidden md:border-none'}
        `}
      >
        {/* Inner container to maintain width during collapse */}
        <div className="w-72 flex flex-col h-full overflow-y-auto overflow-x-hidden">
          <div className="p-6">
            <div className="flex items-center justify-between mb-10 px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center shadow-lg shadow-meta/20 text-white font-extrabold text-xl tracking-tight transform transition-transform hover:scale-105">
                  T
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900 leading-none">Talke.ia</h1>
                  <span className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Workspace</span>
                </div>
              </div>
              {/* Mobile Close Button */}
              <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>

            <nav className="space-y-1">
              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-2">Principal</p>
              <NavItem view="dashboard" icon={LayoutDashboard} label="Visão Geral" />
              <NavItem view="crm" icon={Kanban} label="CRM Pipeline" />
              <NavItem view="chat" icon={MessageSquare} label="Chat & Atendimento" />

              <p className="px-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 mt-8">Ferramentas</p>
              <NavItem view="campaigns" icon={Megaphone} label="Campanhas em Massa" />
              <NavItem view="settings" icon={Settings} label="Configurações" />
            </nav>
          </div>

          <div className="p-6 mt-auto">
            <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 rounded-2xl p-4 border border-slate-100 mb-4 relative overflow-hidden">
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

            <button
              onClick={() => {
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                setIsAuthenticated(false);
                setUser(null);
                // Opcional: window.location.reload() para limpar memória completamente
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors"
            >
              <LogOut size={18} strokeWidth={1.5} />
              Sair da conta
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Wrapper */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50/50 relative">
        <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-50/40 via-transparent to-transparent"></div>

        {/* Header - Glassmorphism style */}
        <header className="h-20 flex items-center justify-between px-8 py-4 z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 -ml-2 text-slate-500 hover:bg-white/60 hover:text-meta rounded-xl transition-all shadow-sm hover:shadow active:scale-95"
            >
              <Menu size={24} strokeWidth={1.5} />
            </button>

            <div className="flex flex-col justify-center">
              <h2 className="text-lg font-bold text-slate-900 capitalize tracking-tight flex items-center gap-2">
                {currentView === 'crm' ? 'Pipeline de Vendas' : currentView.charAt(0).toUpperCase() + currentView.slice(1)}
              </h2>
              <span className="text-xs text-slate-500 font-medium">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 bg-white/80 backdrop-blur-xl p-1.5 pr-6 pl-2 rounded-full shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)] border border-white">
            {/* Search Bar */}
            <div className="relative group hidden sm:block">
              <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                <Search size={16} className="text-slate-400 group-focus-within:text-meta transition-colors" />
              </div>
              <input
                type="text"
                placeholder="Pesquisar..."
                className="bg-transparent border-none py-2 pl-10 pr-4 text-sm w-48 focus:w-64 transition-all duration-300 outline-none text-slate-700 placeholder:text-slate-400 rounded-full focus:bg-white"
              />
            </div>

            <div className="w-px h-6 bg-slate-200 mx-2 hidden sm:block"></div>

            <button className="relative p-2 text-slate-500 hover:text-meta hover:bg-white rounded-full transition-all">
              <Bell size={20} strokeWidth={1.5} />
              <span className="absolute top-1.5 right-2 w-2 h-2 bg-rose-500 rounded-full border-2 border-white shadow-sm ring-1 ring-white"></span>
            </button>

            <div className="flex items-center gap-3 pl-2 cursor-pointer hover:opacity-80 transition-opacity">
              <div className="w-9 h-9 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full overflow-hidden border-2 border-white shadow-sm ring-1 ring-slate-100">
                <img src="https://picsum.photos/200" alt="Avatar" className="w-full h-full object-cover" />
              </div>
              <div className="hidden lg:block text-left leading-tight">
                <p className="text-sm font-semibold text-slate-800">Admin User</p>
                <p className="text-[10px] font-medium text-slate-500">Tenant #1042</p>
              </div>
              <ChevronDown size={14} className="text-slate-400 hidden lg:block" />
            </div>
          </div>
        </header>

        {/* View Content Container */}
        <div className="flex-1 overflow-hidden px-6 pb-6 relative z-0">
          <div className="bg-white/40 backdrop-blur-md rounded-[2.5rem] border border-white/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] h-full overflow-hidden relative ring-1 ring-slate-900/5">
            {renderContent()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;