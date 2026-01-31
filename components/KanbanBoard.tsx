import React, { useState } from 'react';
import { 
  MoreHorizontal, 
  Plus, 
  X, 
  Phone, 
  Mail, 
  Calendar, 
  MessageCircle,
  Search,
  Filter,
  DollarSign,
  Clock,
  ArrowRight,
  LayoutGrid,
  List
} from 'lucide-react';
import { Contact, PipelineStage } from '../types';

// Mock Stages with specific colors for the top border/accent
const STAGES: PipelineStage[] = [
  { id: 'lead', title: 'Novo Lead', color: 'bg-indigo-500' },
  { id: 'contacted', title: 'Em Contato', color: 'bg-blue-500' },
  { id: 'proposal', title: 'Proposta Enviada', color: 'bg-amber-500' },
  { id: 'negotiation', title: 'Em Negociação', color: 'bg-purple-500' },
  { id: 'closed', title: 'Fechado', color: 'bg-emerald-500' },
];

// Enhanced Mock Data with Values and Probabilities
const CARDS: (Partial<Contact> & { value: string; probability: number; dealValue: number })[] = [
  { id: '1', name: 'Maria Silva', pipelineStage: 'lead', dealValue: 5000, value: 'R$ 5.000', probability: 20, tags: ['Quente'], company: 'Tech Solutions', email: 'maria@tech.com', phone: '(11) 99999-1234', lastMessageTime: '2h atrás' },
  { id: '2', name: 'João Souza', pipelineStage: 'contacted', dealValue: 2500, value: 'R$ 2.500', probability: 40, tags: [], company: 'Consultoria ABC', email: 'joao@abc.com', phone: '(11) 98888-4321', lastMessageTime: '1d atrás' },
  { id: '3', name: 'Ana Pereira', pipelineStage: 'proposal', dealValue: 12000, value: 'R$ 12.000', probability: 60, tags: ['Enterprise'], company: 'Grupo X', email: 'ana@grupox.com', phone: '(21) 97777-5678', lastMessageTime: '3d atrás' },
  { id: '4', name: 'Carlos Lima', pipelineStage: 'negotiation', dealValue: 8500, value: 'R$ 8.500', probability: 80, tags: ['Urgente'], company: 'Lima Transportes', email: 'carlos@lima.com', phone: '(31) 96666-1234', lastMessageTime: '5h atrás' },
];

const ContactDrawer = ({ contact, onClose }: { contact: any, onClose: () => void }) => (
  <div className="absolute top-0 right-0 h-full w-[450px] bg-white border-l border-slate-200 shadow-2xl z-30 overflow-y-auto animate-fade-in-right flex flex-col">
    {/* Header with Cover */}
    <div className="h-32 bg-brand-gradient relative flex-shrink-0">
       <button 
         onClick={onClose} 
         className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/10 hover:bg-black/20 p-2 rounded-full backdrop-blur-sm transition-colors"
       >
         <X size={20} />
       </button>
    </div>
    
    {/* Profile Section */}
    <div className="px-8 -mt-12 mb-6 flex-shrink-0">
       <div className="flex justify-between items-end">
         <div className="w-24 h-24 bg-white p-1 rounded-2xl shadow-lg">
            <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-3xl font-bold text-slate-400">
               {contact.name[0]}
            </div>
         </div>
         <div className="flex gap-2 mb-1">
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-wa hover:bg-wa hover:text-white transition-colors shadow-sm" title="WhatsApp">
              <MessageCircle size={20} />
            </button>
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-meta hover:border-meta transition-colors shadow-sm" title="Email">
              <Mail size={20} />
            </button>
            <button className="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-meta hover:border-meta transition-colors shadow-sm" title="Opções">
              <MoreHorizontal size={20} />
            </button>
         </div>
       </div>
       
       <div className="mt-4">
         <h2 className="text-2xl font-bold text-slate-900">{contact.name}</h2>
         <p className="text-slate-500">{contact.company}</p>
         
         <div className="flex items-center gap-2 mt-3">
            <span className="px-3 py-1 bg-meta/10 text-meta text-xs font-bold uppercase tracking-wider rounded-full">
               {STAGES.find((s: any) => s.id === contact.pipelineStage)?.title}
            </span>
            <span className="text-slate-300">•</span>
            <span className="font-semibold text-slate-700">{contact.value}</span>
         </div>
       </div>
    </div>

    {/* Content */}
    <div className="px-8 pb-8 space-y-8 flex-1">
       {/* Probability Bar */}
       <div>
          <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
             <span>Probabilidade de Fechamento</span>
             <span>{contact.probability}%</span>
          </div>
          <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
             <div 
               className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" 
               style={{ width: `${contact.probability}%` }}
             ></div>
          </div>
       </div>

       <div className="grid grid-cols-2 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
             <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Telefone</span>
             <p className="font-medium text-slate-700 mt-1 text-sm">{contact.phone}</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
             <span className="text-xs text-slate-400 uppercase font-bold tracking-wider">Email</span>
             <p className="font-medium text-slate-700 mt-1 text-sm truncate">{contact.email}</p>
          </div>
       </div>

       <div>
          <h3 className="font-semibold text-slate-900 mb-4">Histórico Recente</h3>
          <div className="space-y-6 relative pl-4 border-l border-slate-200">
             <div className="relative">
                <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-wa border-2 border-white shadow-sm"></div>
                <p className="text-xs text-slate-400 mb-1">Hoje, 10:42</p>
                <p className="text-sm text-slate-600">Mensagem recebida via WhatsApp.</p>
             </div>
             <div className="relative">
                <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-slate-300 border-2 border-white shadow-sm"></div>
                <p className="text-xs text-slate-400 mb-1">Ontem, 15:30</p>
                <p className="text-sm text-slate-600">Status alterado para <span className="font-medium">Em Negociação</span>.</p>
             </div>
          </div>
       </div>
    </div>
    
    <div className="p-4 border-t border-slate-100 bg-slate-50 mt-auto">
       <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-medium hover:bg-slate-800 transition-colors">
          Editar Informações
       </button>
    </div>
  </div>
);

const KanbanBoard: React.FC = () => {
  const [activePipeline, setActivePipeline] = useState('vendas');
  const [selectedContact, setSelectedContact] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  const getTotalValue = (stageId: string) => {
    const total = CARDS
      .filter(c => c.pipelineStage === stageId)
      .reduce((acc, curr) => acc + (curr.dealValue || 0), 0);
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total);
  };

  return (
    <div className="h-full flex flex-col bg-white relative">
      {/* Header Toolbar */}
      <div className="px-6 py-5 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-sm z-10">
        
        {/* Left: Title & Views */}
        <div className="flex items-center gap-6">
          <h1 className="text-xl font-bold text-slate-900">Pipeline</h1>
          <div className="flex bg-slate-100 p-1 rounded-lg">
             <button 
               onClick={() => setViewMode('board')}
               className={`p-1.5 rounded-md transition-all ${viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <LayoutGrid size={18} />
             </button>
             <button 
               onClick={() => setViewMode('list')}
               className={`p-1.5 rounded-md transition-all ${viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
             >
               <List size={18} />
             </button>
          </div>
        </div>

        {/* Center: Pipeline Selector (Floating Segmented Control) */}
        <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 shadow-inner">
           {['Captação', 'Vendas', 'Pós-Venda'].map((p) => {
             const slug = p.toLowerCase().replace(' ', '-').replace('ó', 'o');
             const isActive = activePipeline.includes(slug.split('-')[0]); // simple matching
             return (
               <button
                 key={p}
                 onClick={() => setActivePipeline(slug)}
                 className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                   isActive 
                     ? 'bg-white text-slate-900 shadow-sm' 
                     : 'text-slate-500 hover:text-slate-700'
                 }`}
               >
                 {p}
               </button>
             );
           })}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
           <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                placeholder="Buscar..." 
                className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-meta/20 w-48 transition-all"
              />
           </div>
           <button className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-900/10">
              <Filter size={16} /> Filtros
           </button>
           <button className="flex items-center gap-2 bg-brand-gradient text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-meta/20">
              <Plus size={18} strokeWidth={2.5} /> <span className="hidden lg:inline">Novo Deal</span>
           </button>
        </div>
      </div>

      {/* Board Content */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-slate-50/50">
         <div className="flex h-full gap-6 min-w-max">
            {STAGES.map(stage => {
              const stageCards = CARDS.filter(c => c.pipelineStage === stage.id);
              const stageValue = getTotalValue(stage.id);

              return (
                <div key={stage.id} className="w-80 flex flex-col h-full group/col">
                   {/* Column Header */}
                   <div className="flex flex-col mb-4 px-1">
                      <div className="flex justify-between items-center mb-1">
                         <h3 className="font-bold text-slate-700">{stage.title}</h3>
                         <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                            {stageCards.length}
                         </span>
                      </div>
                      <div className={`h-1 w-full rounded-full ${stage.color} mb-2 opacity-80`}></div>
                      <p className="text-xs font-medium text-slate-400">Total: <span className="text-slate-600">{stageValue}</span></p>
                   </div>

                   {/* Cards Container */}
                   <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                      {stageCards.map(card => (
                        <div 
                          key={card.id} 
                          onClick={() => setSelectedContact(card)}
                          className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] hover:border-meta/30 hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative"
                        >
                           {/* Priority/Tags */}
                           {card.tags && card.tags.length > 0 && (
                             <div className="flex gap-1 mb-3">
                                {card.tags.map(tag => (
                                  <span key={tag} className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-50 text-rose-600 border border-rose-100">
                                    {tag}
                                  </span>
                                ))}
                             </div>
                           )}

                           <div className="flex justify-between items-start mb-2">
                              <div>
                                 <h4 className="font-semibold text-slate-900 text-sm">{card.name}</h4>
                                 <p className="text-xs text-slate-500">{card.company}</p>
                              </div>
                           </div>

                           <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-sm mb-3">
                              <DollarSign size={14} className="text-slate-400" />
                              {card.value}
                           </div>
                           
                           {/* Probability Bar */}
                           <div className="w-full bg-slate-100 h-1.5 rounded-full mb-4 overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${card.probability && card.probability > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`} 
                                style={{ width: `${card.probability || 0}%` }}
                              ></div>
                           </div>

                           <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                              <div className="flex items-center gap-1 text-[10px] text-slate-400">
                                 <Clock size={12} /> {card.lastMessageTime}
                              </div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-1 group-hover:translate-y-0 duration-200">
                                 <button className="p-1.5 rounded bg-wa text-white shadow-sm hover:opacity-90">
                                    <MessageCircle size={14} />
                                 </button>
                                 <button className="p-1.5 rounded bg-white border border-slate-200 text-slate-500 hover:text-meta hover:border-meta">
                                    <Calendar size={14} />
                                 </button>
                              </div>
                           </div>
                        </div>
                      ))}

                      {/* Add Button */}
                      <button className="w-full py-3 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-medium hover:border-meta/50 hover:text-meta hover:bg-meta/5 transition-all flex items-center justify-center gap-2 opacity-60 hover:opacity-100">
                         <Plus size={16} /> Adicionar
                      </button>
                   </div>
                </div>
              );
            })}

            {/* New Stage Column */}
            <div className="w-80 flex-shrink-0 pt-10 px-4 opacity-50 hover:opacity-100 transition-opacity">
                <button className="w-full h-40 border-2 border-dashed border-slate-300 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:bg-slate-100 transition-colors">
                   <Plus size={32} strokeWidth={1} className="mb-2" />
                   <span className="font-medium">Adicionar Etapa</span>
                </button>
            </div>
         </div>
      </div>

      {selectedContact && (
        <div className="absolute inset-0 z-20 bg-slate-900/20 backdrop-blur-[1px] animate-fade-in" onClick={() => setSelectedContact(null)}>
           <ContactDrawer contact={selectedContact} onClose={() => setSelectedContact(null)} />
        </div>
      )}
    </div>
  );
};

export default KanbanBoard;