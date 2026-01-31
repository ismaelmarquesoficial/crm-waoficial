import React, { useState } from 'react';
import { Send, Clock, Plus, LayoutTemplate, FileSpreadsheet, Calendar as CalendarIcon, X, Check, ChevronRight } from 'lucide-react';
import { Campaign, Template } from '../types';

const MOCK_CAMPAIGNS: Campaign[] = [
  { id: '1', name: 'Black Friday Promo', status: 'completed', sent: 1200, total: 1200, date: '2023-11-24' },
  { id: '2', name: 'New Feature Announcement', status: 'scheduled', sent: 0, total: 540, date: '2023-12-01' },
];

const MOCK_TEMPLATES: Template[] = [
  { id: 't1', name: 'welcome_message', language: 'pt_BR', status: 'approved', category: 'marketing' },
  { id: 't2', name: 'shipping_update', language: 'pt_BR', status: 'approved', category: 'utility' },
  { id: 't3', name: 'auth_code', language: 'en_US', status: 'approved', category: 'authentication' },
];

const CreateCampaignWizard = ({ onClose }: { onClose: () => void }) => {
  const [step, setStep] = useState(1);

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Nova Campanha</h2>
            <p className="text-sm text-slate-400">Passo {step} de 3</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="p-8 flex-1 overflow-y-auto">
           {step === 1 && (
             <div className="space-y-6 animate-fade-in">
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Nome da Campanha</label>
                   <input type="text" className="w-full border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-meta/20 focus:border-meta outline-none" placeholder="Ex: Promoção de Natal" />
                </div>
                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-2">Lista de Contatos</label>
                   <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 transition-colors cursor-pointer">
                      <div className="w-12 h-12 bg-meta/10 text-meta rounded-full flex items-center justify-center mb-3">
                         <FileSpreadsheet size={24} />
                      </div>
                      <p className="text-sm font-medium text-slate-900">Clique para enviar CSV</p>
                      <p className="text-xs text-slate-400 mt-1">ou arraste e solte seu arquivo aqui</p>
                   </div>
                </div>
             </div>
           )}

           {step === 2 && (
             <div className="space-y-4 animate-fade-in">
                <label className="block text-sm font-medium text-slate-700 mb-2">Selecione um Template</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {MOCK_TEMPLATES.map(t => (
                    <div key={t.id} className="border border-slate-200 rounded-xl p-4 hover:border-meta cursor-pointer hover:shadow-md transition-all">
                       <div className="flex justify-between mb-2">
                         <span className="font-medium text-slate-800">{t.name}</span>
                         <span className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold ${t.category === 'marketing' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'}`}>{t.category}</span>
                       </div>
                       <p className="text-xs text-slate-400 mb-2">{t.language}</p>
                       <div className="bg-slate-50 p-2 rounded text-xs text-slate-500 italic">
                         {`"Olá {{1}}, confira nossas ofertas..."`}
                       </div>
                    </div>
                  ))}
                </div>
             </div>
           )}

           {step === 3 && (
             <div className="space-y-6 animate-fade-in">
               <div className="text-center">
                 <div className="inline-block p-4 bg-wa/10 text-wa rounded-full mb-4">
                    <Check size={32} />
                 </div>
                 <h3 className="text-lg font-medium text-slate-900">Tudo pronto!</h3>
                 <p className="text-slate-500 text-sm">Configure o agendamento do disparo.</p>
               </div>
               
               <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                  <div className="flex items-center gap-4 mb-4">
                     <CalendarIcon className="text-slate-400" />
                     <input type="datetime-local" className="bg-white border border-slate-200 rounded-lg p-2 text-sm outline-none" />
                  </div>
                  <p className="text-xs text-slate-400">O sistema iniciará os disparos automaticamente na data e hora selecionadas.</p>
               </div>
             </div>
           )}
        </div>

        <div className="p-6 border-t border-slate-100 flex justify-between">
           {step > 1 ? (
             <button onClick={() => setStep(step - 1)} className="px-4 py-2 text-slate-500 hover:bg-slate-50 rounded-lg text-sm font-medium">Voltar</button>
           ) : <div></div>}
           
           {step < 3 ? (
             <button onClick={() => setStep(step + 1)} className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-meta transition-colors flex items-center gap-2">
               Próximo <ChevronRight size={16} />
             </button>
           ) : (
             <button onClick={onClose} className="px-6 py-2 bg-wa text-white rounded-lg text-sm font-medium hover:bg-wa/90 transition-colors shadow-lg shadow-wa/20">
               Agendar Disparo
             </button>
           )}
        </div>
      </div>
    </div>
  );
};

const Campaigns: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'templates'>('overview');
  const [showWizard, setShowWizard] = useState(false);

  return (
    <div className="p-8 h-full overflow-y-auto">
       <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-light tracking-tight text-slate-900">Campanhas</h1>
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setActiveTab('overview')}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'overview' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => setActiveTab('templates')}
              className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'templates' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              Templates (Meta)
            </button>
          </div>
        </div>
        <button 
          onClick={() => setShowWizard(true)}
          className="bg-meta hover:bg-meta/90 text-white px-4 py-2.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors shadow-lg shadow-meta/30"
        >
          <Plus size={16} /> Nova Campanha
        </button>
      </header>

      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
             <div className="bg-brand-gradient rounded-2xl p-6 text-white shadow-xl shadow-meta/20">
                <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                        <Send size={20} />
                    </div>
                    <span className="text-xs font-medium bg-white/20 px-2 py-1 rounded backdrop-blur-sm">Mensal</span>
                </div>
                <h3 className="text-4xl font-light mb-1">12,450</h3>
                <p className="text-white/80 text-sm">Mensagens enviadas este mês</p>
             </div>

             <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
                 <h3 className="text-lg font-medium text-slate-800 mb-4">Progresso Atual</h3>
                 {MOCK_CAMPAIGNS.filter(c => c.status === 'scheduled').map(c => (
                     <div key={c.id}>
                         <div className="flex justify-between text-sm mb-2">
                             <span className="text-slate-600">{c.name}</span>
                             <span className="text-meta font-mono">Agendado</span>
                         </div>
                         <div className="flex items-center gap-2 text-xs text-slate-400">
                            <Clock size={12} />
                            Disparo em: {c.date}
                         </div>
                     </div>
                 ))}
                  {MOCK_CAMPAIGNS.filter(c => c.status === 'scheduled').length === 0 && (
                      <p className="text-sm text-slate-400 italic">Nenhuma campanha ativa no momento.</p>
                  )}
             </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-sm text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase font-semibold text-slate-400">
                      <tr>
                          <th className="px-6 py-4">Nome da Campanha</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4">Progresso</th>
                          <th className="px-6 py-4">Data</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                      {MOCK_CAMPAIGNS.map(campaign => (
                          <tr key={campaign.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-4 font-medium text-slate-900">{campaign.name}</td>
                              <td className="px-6 py-4">
                                  <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                      campaign.status === 'completed' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'
                                  }`}>
                                      {campaign.status}
                                  </span>
                              </td>
                              <td className="px-6 py-4">
                                  <div className="flex items-center gap-3">
                                      <div className="w-24 bg-slate-200 rounded-full h-1.5">
                                          <div 
                                            className="bg-meta h-1.5 rounded-full" 
                                            style={{ width: `${(campaign.sent / campaign.total) * 100}%` }}
                                          ></div>
                                      </div>
                                      <span className="text-xs text-slate-400">{campaign.sent}/{campaign.total}</span>
                                  </div>
                              </td>
                              <td className="px-6 py-4 text-slate-400">{campaign.date}</td>
                          </tr>
                      ))}
                  </tbody>
              </table>
          </div>
        </div>
      )}

      {activeTab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
          {MOCK_TEMPLATES.map(template => (
            <div key={template.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-lg transition-all group">
               <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-slate-100 rounded-lg group-hover:bg-meta/10 group-hover:text-meta transition-colors">
                     <LayoutTemplate size={20} />
                  </div>
                  <span className="px-2 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase rounded-full">
                    {template.status}
                  </span>
               </div>
               <h3 className="font-medium text-slate-900 mb-1">{template.name}</h3>
               <p className="text-xs text-slate-400 mb-4">{template.language} • {template.category}</p>
               <div className="bg-slate-50 p-3 rounded-lg text-xs text-slate-500 italic border border-slate-100">
                  {`"Olá {{1}}, confira nossas ofertas..."`}
               </div>
            </div>
          ))}
          <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 flex flex-col items-center justify-center text-slate-400 hover:border-meta/30 hover:text-meta hover:bg-slate-50 transition-all cursor-pointer min-h-[200px]">
             <Plus size={32} strokeWidth={1} className="mb-2" />
             <span className="text-sm font-medium">Sincronizar Templates</span>
          </div>
        </div>
      )}

      {showWizard && <CreateCampaignWizard onClose={() => setShowWizard(false)} />}
    </div>
  );
};

export default Campaigns;