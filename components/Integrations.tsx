import React, { useState } from 'react';
import { MessageSquare, ShieldCheck, Link2, Users, Mail, Shield } from 'lucide-react';
import { User } from '../types';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@talke.ia', role: 'admin', avatar: 'https://picsum.photos/40/40?10' },
  { id: '2', name: 'Sarah Agent', email: 'sarah@talke.ia', role: 'agent', avatar: 'https://picsum.photos/40/40?11' },
];

const IntegrationScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'team'>('integrations');

  return (
    <div className="p-8 bg-white h-full overflow-y-auto animate-fade-in">
      <header className="mb-8 border-b border-slate-100 pb-2">
        <h1 className="text-2xl font-light tracking-tight text-slate-900">Configurações</h1>
        <div className="flex gap-6 mt-6">
            <button 
              onClick={() => setActiveTab('integrations')}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'integrations' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Integrações
            </button>
            <button 
              onClick={() => setActiveTab('team')}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'team' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Gestão de Equipe
            </button>
        </div>
      </header>

      {activeTab === 'integrations' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl animate-fade-in">
          {/* Card WhatsApp Oficial */}
          <div className="p-6 border border-slate-200 rounded-2xl bg-white hover:border-meta/30 hover:shadow-lg hover:shadow-meta/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-meta/10 rounded-lg text-meta">
                  <ShieldCheck size={24} strokeWidth={1.5} />
              </div>
              <div>
                  <h2 className="font-medium text-slate-900">WhatsApp API Oficial (Meta)</h2>
                  <p className="text-xs text-slate-400">Para operações de alto volume e verificadas.</p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">App ID</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-meta/20 focus:border-meta outline-none transition-all" placeholder="Ex: 10928..." />
                </div>
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">Phone ID</label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-meta/20 focus:border-meta outline-none transition-all" placeholder="Ex: 1044..." />
                </div>
              </div>
              
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">App Secret</label>
                <input type="password" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-meta/20 focus:border-meta outline-none transition-all" placeholder="••••••••" />
              </div>

              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">Access Token</label>
                <input type="password" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-meta/20 focus:border-meta outline-none transition-all" placeholder="EAAB..." />
              </div>
              <button className="w-full bg-slate-900 text-white text-sm font-medium py-3 rounded-lg hover:bg-meta transition-colors shadow-lg shadow-slate-200">
                Validar Conexão
              </button>
            </div>
          </div>

          {/* Card Evolution API */}
          <div className="p-6 border border-slate-200 rounded-2xl bg-white hover:border-wa/30 hover:shadow-lg hover:shadow-wa/10 transition-all duration-300">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-wa/10 rounded-lg text-wa">
                  <Link2 size={24} strokeWidth={1.5} />
              </div>
              <div>
                  <h2 className="font-medium text-slate-900">WhatsApp Business (Evolution)</h2>
                  <p className="text-xs text-slate-400">Conexão via QR Code para números existentes.</p>
              </div>
            </div>
            
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 hover:bg-white transition-colors h-[320px]">
              <div className="w-40 h-40 bg-white border border-slate-100 rounded-xl mb-6 flex items-center justify-center text-slate-300 shadow-sm relative overflow-hidden group">
                 <MessageSquare size={48} strokeWidth={1} className="group-hover:scale-110 transition-transform duration-500" />
                 <div className="absolute inset-0 bg-slate-900/5 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <span className="text-[10px] font-bold bg-white px-2 py-1 rounded text-slate-800 shadow-sm">Gerar QR</span>
                 </div>
              </div>
              <p className="text-xs text-slate-400 text-center max-w-[200px] leading-relaxed">
                  Clique no código acima para iniciar uma nova sessão da Evolution API.
              </p>
              <div className="mt-6 w-full max-w-xs">
                  <div className="flex justify-between text-xs text-slate-500 mb-1">
                      <span>Status da Instância</span>
                      <span className="text-wa font-medium">Online</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-1.5">
                      <div className="bg-wa h-1.5 rounded-full w-full shadow-[0_0_10px_rgba(37,211,102,0.5)]"></div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'team' && (
        <div className="max-w-4xl animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                 <h2 className="font-medium text-slate-900">Membros da Equipe</h2>
                 <p className="text-sm text-slate-400">Gerencie o acesso ao seu tenant.</p>
               </div>
               <button className="bg-white border border-slate-200 text-slate-700 hover:border-meta/30 hover:text-meta px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm">
                 Convidar Membro
               </button>
             </div>
             <div className="divide-y divide-slate-100">
               {MOCK_USERS.map(user => (
                 <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-4">
                       <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                       <div>
                         <h3 className="text-sm font-medium text-slate-900">{user.name}</h3>
                         <div className="flex items-center gap-2 text-xs text-slate-400">
                           <Mail size={12} /> {user.email}
                         </div>
                       </div>
                    </div>
                    <div className="flex items-center gap-4">
                       <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${
                         user.role === 'admin' ? 'bg-meta/10 text-meta' : 'bg-slate-100 text-slate-600'
                       }`}>
                         <Shield size={12} />
                         {user.role}
                       </span>
                       <button className="text-slate-400 hover:text-slate-600 text-sm font-medium">Editar</button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationScreen;