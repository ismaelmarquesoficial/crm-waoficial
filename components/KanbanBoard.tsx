import React, { useState, useEffect } from 'react';
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



const ContactDrawer = ({ contact, stages, onClose }: { contact: any, stages: PipelineStage[], onClose: () => void }) => {
   // Helpers para lidar com dados faltantes (visto que o banco ainda não tem tudo)
   const contactStage = stages.find(s => s.id === contact.current_stage_id);
   const probability = contact.probability || 0;
   const value = contact.value || 'R$ 0,00';

   return (
      <div className="absolute top-0 right-0 h-full w-[450px] bg-white border-l border-slate-200 shadow-2xl z-30 overflow-y-auto animate-fade-in-right flex flex-col" onClick={e => e.stopPropagation()}>
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
                     {contact.name?.[0]}
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
               <p className="text-slate-500">{contact.company || 'Empresa não informada'}</p>

               <div className="flex items-center gap-2 mt-3">
                  <span className="px-3 py-1 bg-meta/10 text-meta text-xs font-bold uppercase tracking-wider rounded-full">
                     {contactStage?.name || 'Etapa desconhecida'}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="font-semibold text-slate-700">{value}</span>
               </div>
            </div>
         </div>

         {/* Content */}
         <div className="px-8 pb-8 space-y-8 flex-1">
            {/* Probability Bar */}
            <div>
               <div className="flex justify-between text-xs font-medium text-slate-500 mb-2">
                  <span>Probabilidade de Fechamento</span>
                  <span>{probability}%</span>
               </div>
               <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                  <div
                     className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                     style={{ width: `${probability}%` }}
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
                  <p className="font-medium text-slate-700 mt-1 text-sm truncate">{contact.email || '-'}</p>
               </div>
            </div>

            <div>
               <h3 className="font-semibold text-slate-900 mb-4">Histórico Recente</h3>
               <div className="space-y-6 relative pl-4 border-l border-slate-200">
                  <div className="relative">
                     <div className="absolute -left-[21px] top-0 w-3 h-3 rounded-full bg-wa border-2 border-white shadow-sm"></div>
                     <p className="text-xs text-slate-400 mb-1">Hoje</p>
                     <p className="text-sm text-slate-600">Última interação registrada.</p>
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
};

const KanbanBoard: React.FC = () => {
   const [pipelines, setPipelines] = useState<any[]>([]);
   const [activePipelineId, setActivePipelineId] = useState<number | null>(null);
   const [stages, setStages] = useState<PipelineStage[]>([]);
   const [cards, setCards] = useState<any[]>([]);

   const [selectedContact, setSelectedContact] = useState<any>(null);
   const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
   const [isLoading, setIsLoading] = useState(true);

   // Load Pipelines
   useEffect(() => {
      const fetchPipelines = async () => {
         try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:3001/api/crm/pipelines', {
               headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (data.length > 0) {
               setPipelines(data);
               setActivePipelineId(data[0].id);
               // O backend já retorna 'stages' dentro de cada pipeline
               setStages(data[0].stages || []);
            }
         } catch (err) {
            console.error('Erro ao carregar pipelines', err);
         } finally {
            setIsLoading(false);
         }
      };

      fetchPipelines();
   }, []);

   // Load Cards when Active Pipeline Changes
   useEffect(() => {
      if (!activePipelineId) return;

      const pipeline = pipelines.find(p => p.id === activePipelineId);
      if (pipeline) {
         console.log('Active Pipeline:', pipeline);
         setStages(pipeline.stages || []);
      }

      const fetchCards = async () => {
         try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:3001/api/crm/pipelines/${activePipelineId}/cards`, {
               headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            console.log('Cards fetched:', data);
            setCards(data);
         } catch (err) {
            console.error('Erro ao carregar cards', err);
         }
      };

      fetchCards();
   }, [activePipelineId, pipelines]);


   const getTotalValue = (stageId: string) => {
      // Como ainda não temos campo 'value' no banco, vamos simular ou usar 0
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0);
   };

   if (isLoading) {
      return <div className="h-full flex items-center justify-center text-slate-500">Carregando CRM...</div>;
   }

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

            {/* Center: Pipeline Selector */}
            <div className="bg-slate-100 p-1.5 rounded-xl flex gap-1 shadow-inner overflow-x-auto max-w-[400px]">
               {pipelines.map((p) => {
                  const isActive = activePipelineId === p.id;
                  return (
                     <button
                        key={p.id}
                        onClick={() => setActivePipelineId(p.id)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-300 whitespace-nowrap ${isActive
                           ? 'bg-white text-slate-900 shadow-sm'
                           : 'text-slate-500 hover:text-slate-700'
                           }`}
                     >
                        {p.name}
                     </button>
                  );
               })}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
               {/* ... (fique à vontade para manter a search bar aqui) ... */}
               <button className="flex items-center gap-2 bg-brand-gradient text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition-opacity shadow-lg shadow-meta/20">
                  <Plus size={18} strokeWidth={2.5} /> <span className="hidden lg:inline">Novo Deal</span>
               </button>
            </div>
         </div>

         {/* Board Content */}
         <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 bg-slate-50/50">
            <div className="flex h-full gap-6 min-w-max">
               {stages.map(stage => {
                  // Filtra cards que pertencem a este stage
                  // Nota: O banco retorna 'current_stage_id', converter para string se preciso
                  const stageCards = cards.filter(c => c.current_stage_id == stage.id);
                  const stageValue = getTotalValue(stage.id);

                  return (
                     <div key={stage.id} className="w-80 flex flex-col h-full group/col">
                        {/* Column Header */}
                        <div className="flex flex-col mb-4 px-1">
                           <div className="flex justify-between items-center mb-1">
                              <h3 className="font-bold text-slate-700">{stage.name}</h3>
                              <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                 {stageCards.length}
                              </span>
                           </div>
                           <div className={`h-1 w-full rounded-full ${stage.color || 'bg-slate-200'} mb-2 opacity-80`}></div>
                           <p className="text-xs font-medium text-slate-400">Total: <span className="text-slate-600">{stageValue}</span></p>
                        </div>

                        {/* Cards Container */}
                        <div className="flex-1 overflow-y-auto space-y-3 pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                           {stageCards.map(card => (
                              <div
                                 key={card.id}
                                 onClick={() => setSelectedContact(card)}
                                 className="bg-white p-4 rounded-xl border border-slate-200 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_20px_-4px_rgba(0,0,0,0.1)] hover:border-meta/30 hover:-translate-y-1 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                              >
                                 {/* Stage Indicator Bar */}
                                 <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${stage.color || 'bg-slate-200'}`}></div>

                                 <div className="flex justify-between items-start mb-2 pl-2">
                                    <div>
                                       <h4 className="font-semibold text-slate-900 text-sm">{card.name}</h4>
                                       <p className="text-xs text-slate-500">{new Date(card.created_at).toLocaleDateString()}</p>
                                    </div>
                                 </div>

                                 <div className="flex items-center gap-1.5 text-slate-800 font-semibold text-sm mb-3">
                                    <DollarSign size={14} className="text-slate-400" />
                                    -
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
            </div>
         </div>

         {selectedContact && (
            <div className="absolute inset-0 z-20 bg-slate-900/20 backdrop-blur-[1px] animate-fade-in" onClick={() => setSelectedContact(null)}>
               <ContactDrawer contact={selectedContact} stages={stages} onClose={() => setSelectedContact(null)} />
            </div>
         )}
      </div>
   );
};

export default KanbanBoard;