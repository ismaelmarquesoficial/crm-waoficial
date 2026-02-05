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
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { Contact, PipelineStage } from '../types';
import { io } from 'socket.io-client';



const ContactDrawer = ({ contact, stages, onClose, onMoveStage, onChat }: { contact: any, stages: PipelineStage[], onClose: () => void, onMoveStage: (stageId: string) => void, onChat?: () => void }) => {
   // Helpers para lidar com dados faltantes (visto que o banco ainda não tem tudo)
   const contactStage = stages.find(s => String(s.id) === String(contact.current_stage_id));
   const currentIdx = stages.findIndex(s => String(s.id) === String(contact.current_stage_id));

   const probability = contact.probability || 0;
   const value = contact.value || '0,00';

   return (
      <div
         className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scale-in relative border border-slate-100"
         onClick={e => e.stopPropagation()}
      >
         {/* Decorative Header */}
         <div className="h-14 bg-gradient-to-r from-blue-600 to-emerald-500 relative flex-shrink-0">
            <button
               onClick={onClose}
               className="absolute top-4 right-4 text-white/60 hover:text-white bg-white/10 hover:bg-white/20 p-1.5 rounded-full backdrop-blur-md transition-colors z-10"
            >
               <X size={20} />
            </button>
            <div className="absolute -bottom-10 left-8 flex items-end">
               <div className="w-20 h-20 bg-white p-1 rounded-2xl shadow-xl">
                  <div className="w-full h-full bg-slate-100 rounded-xl flex items-center justify-center text-2xl font-bold text-slate-400 overflow-hidden">
                     {contact.profile_pic_url ? <img src={contact.profile_pic_url} alt="" className="w-full h-full object-cover" /> : contact.name?.[0]}
                  </div>
               </div>
            </div>
         </div>

         {/* STAGE STEPPER (Interativo) */}
         <div className="mt-14 px-8 mb-2">
            <div className="flex items-center w-full gap-1">
               {stages.map((bs, i) => {
                  const isPassed = i <= currentIdx;
                  const isCurrent = i === currentIdx;
                  return (
                     <div key={bs.id} className="flex-1 flex items-center group cursor-pointer" onClick={() => onMoveStage(String(bs.id))}>
                        <div
                           className={`h-2 w-full rounded-full transition-all duration-300 relative ${isPassed ? '' : 'bg-slate-100'}`}
                           style={isPassed ? { backgroundColor: bs.color || '#cbd5e1' } : {}}
                        >
                           {isCurrent && (
                              <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-white border-2 shadow-sm animate-pulse" style={{ borderColor: bs.color }}></div>
                           )}
                        </div>
                        {/* Separator if not last */}
                        {i < stages.length - 1 && <div className="w-1"></div>}

                        {/* Tooltip on Hover */}
                        <div className="hidden group-hover:block absolute -mt-8 bg-slate-800 text-white text-[10px] px-2 py-1 rounded shadow-lg whitespace-nowrap z-50">
                           Movimentar para: {bs.name}
                        </div>
                     </div>
                  )
               })}
            </div>
            <div className="flex justify-between mt-1 px-1">
               <span className="text-[10px] font-bold text-slate-400">{stages[0]?.name}</span>
               <span className="text-[10px] font-bold text-slate-400 text-right">{stages[stages.length - 1]?.name}</span>
            </div>
         </div>

         {/* Header Info */}
         <div className="mt-0 px-8 mb-6 flex-shrink-0 flex justify-between items-start">
            <div>
               <h2 className="text-2xl font-bold text-slate-900 leading-tight">{contact.name}</h2>
               <p className="text-slate-500 font-medium">{contact.company || 'Empresa não informada'}</p>
               <div className="flex items-center gap-2 mt-2">
                  <span className="px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider border border-blue-100">
                     {contactStage?.name || 'Etapa desconhecida'}
                  </span>
               </div>
            </div>

            <div className="flex gap-2">
               <button
                  onClick={onChat}
                  className="p-2.5 bg-slate-50 text-wa rounded-xl hover:bg-wa hover:text-white transition-colors border border-slate-100"
               >
                  <MessageCircle size={20} />
               </button>
               <button className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-100">
                  <Phone size={20} />
               </button>
               <button className="p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-200 transition-colors border border-slate-100">
                  <Mail size={20} />
               </button>
               <button className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-slate-100 transition-colors border border-slate-100">
                  <MoreHorizontal size={20} />
               </button>
            </div>
         </div>

         {/* Content Scrollable */}
         <div className="px-8 pb-8 overflow-y-auto custom-scrollbar space-y-8">

            {/* Value & Prob */}
            <div className="grid grid-cols-2 gap-4">
               <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Valor do Deal</label>
                  <div className="text-xl font-bold text-slate-700 flex items-center gap-1">
                     <span className="text-sm text-slate-400">R$</span> {value}
                  </div>
               </div>
               <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block flex justify-between">
                     <span>Probabilidade</span>
                     <span>{probability}%</span>
                  </label>
                  <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                     <div
                        className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded-full transition-all duration-1000"
                        style={{ width: `${probability}%` }}
                     />
                  </div>
               </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
               <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><LayoutGrid size={16} className="text-slate-400" /> Dados de Contato</h3>
                  <div className="space-y-3">
                     <div>
                        <label className="text-xs text-slate-400 font-bold uppercase">Telefone</label>
                        <p className="text-sm font-medium text-slate-700">{contact.phone}</p>
                     </div>
                     <div>
                        <label className="text-xs text-slate-400 font-bold uppercase">Email</label>
                        <p className="text-sm font-medium text-slate-700">{contact.email || '-'}</p>
                     </div>
                  </div>
               </div>

               <div>
                  <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Clock size={16} className="text-slate-400" /> Histórico</h3>
                  <div className="relative pl-4 border-l-2 border-slate-100 space-y-4">
                     <div className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white shadow-sm"></div>
                        <p className="text-xs font-bold text-slate-500 mb-0.5">Hoje, 14:30</p>
                        <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">Card aberto pelo usuário.</p>
                     </div>
                     <div className="relative opacity-60">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 rounded-full bg-slate-300 border-2 border-white"></div>
                        <p className="text-xs font-bold text-slate-400 mb-0.5">Ontem</p>
                        <p className="text-sm text-slate-500">Campanha disparada via WhatsApp.</p>
                     </div>
                  </div>
               </div>
            </div>

         </div>

         {/* Footer Actions */}
         <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3 rounded-b-2xl">
            <button className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-200/50 rounded-lg transition-colors" onClick={onClose}>Cancelar</button>
            <button className="px-6 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 shadow-lg shadow-slate-300 active:scale-95 transition-all">Salvar Alterações</button>
         </div>
      </div>
   );
};

interface Deal {
   id: number | string;
   current_stage_id: number | string;
   contact_id: number | string;
   name: string;
   description?: string;
   value?: string;
   probability?: number;
   company?: string;
   phone?: string;
   email?: string;
   created_at: string;
   [key: string]: any;
}

interface KanbanBoardProps {
   onNavigateToChat?: (contactId: string) => void;
}

const KanbanBoard: React.FC<KanbanBoardProps> = ({ onNavigateToChat }) => {
   const [pipelines, setPipelines] = useState<any[]>([]);
   const [activePipelineId, setActivePipelineId] = useState<number | null>(null);
   const [stages, setStages] = useState<PipelineStage[]>([]);
   const [cards, setCards] = useState<Deal[]>([]);

   const [selectedContact, setSelectedContact] = useState<Deal | null>(null);
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

   // Socket.IO Listener para Updates em Tempo Real
   useEffect(() => {
      if (!activePipelineId) return;

      const tokenStr = localStorage.getItem('token');
      if (!tokenStr) return;

      const tenantId = JSON.parse(atob(tokenStr.split('.')[1])).tenantId;
      const newSocket = io('http://localhost:3001');

      newSocket.on('connect', () => {
         console.log('🔌 CRM Socket Connected');
         newSocket.emit('join_tenant', tenantId);
      });

      newSocket.on('crm_deal_update', (data: any) => {
         console.log('📡 CRM Update recebido:', data);
         // Se o update for neste pipeline, recarrega
         if (String(data.pipelineId) === String(activePipelineId)) {
            // Fetch manual simples para atualizar
            fetch(`http://localhost:3001/api/crm/pipelines/${activePipelineId}/cards`, {
               headers: { 'Authorization': `Bearer ${tokenStr}` }
            })
               .then(r => r.json())
               .then(newCards => {
                  console.log('🔄 Cards atualizados via Socket');
                  setCards(newCards);
               });
         }
      });

      return () => { newSocket.disconnect(); };
   }, [activePipelineId]);


   const getTotalValue = (stageId: string) => {
      // Como ainda não temos campo 'value' no banco, vamos simular ou usar 0
      return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(0);
   };

   if (isLoading) {
      return <div className="h-full flex items-center justify-center text-slate-500">Carregando CRM...</div>;
   }

   const handleMoveDeal = async (stageId: string) => {
      if (!selectedContact) return;

      // Otimistic Update Local
      const updatedCard = { ...selectedContact, current_stage_id: stageId };
      setSelectedContact(updatedCard); // Atualiza modal
      setCards(prev => prev.map(c => c.id === selectedContact.id ? updatedCard : c)); // Atualiza board

      try {
         const token = localStorage.getItem('token');
         await fetch(`http://localhost:3001/api/crm/deals/${selectedContact.id}`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ stage_id: stageId })
         });
         // Não precisamos recarregar tudo porque o Socket vai confirmar ou o Otimistic já resolveu.
      } catch (e) {
         console.error('Erro ao mover deal', e);
         alert('Erro ao mover negócio.');
      }
   };

   const onDragEnd = async (result: DropResult) => {
      const { destination, source, draggableId } = result;

      // Se não houve destino ou se o destino é o mesmo
      if (!destination) return;
      if (
         destination.droppableId === source.droppableId &&
         destination.index === source.index
      ) {
         return;
      }

      // Encontrar o card
      const cardId = draggableId;
      const newStageId = destination.droppableId;
      const card = cards.find(c => String(c.id) === String(cardId));

      if (!card) return;

      // 1. Optimistic Update
      const updatedCard = { ...card, current_stage_id: newStageId };

      setCards(prevCards =>
         prevCards.map(c =>
            String(c.id) === String(cardId) ? updatedCard : c
         )
      );

      // 2. Persist to Backend
      try {
         const token = localStorage.getItem('token');
         await fetch(`http://localhost:3001/api/crm/deals/${cardId}`, {
            method: 'PUT',
            headers: {
               'Content-Type': 'application/json',
               'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ stage_id: newStageId })
         });
      } catch (err) {
         console.error('Erro ao mover card via drag-and-drop', err);
         alert('Erro ao mover o card.');
         // Revert on error could be implemented here
      }
   };

   return (
      <div className="h-full flex flex-col bg-white relative">
         {/* Header Toolbar */}
         <div className="h-20 px-8 border-b border-slate-200/60 flex flex-col md:flex-row justify-between items-center gap-4 bg-white/80 backdrop-blur-xl z-20 sticky top-0">

            {/* Left: Title & Views */}
            <div className="flex items-center gap-6">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                     <LayoutGrid size={20} />
                  </div>
                  <div>
                     <h1 className="text-lg font-bold text-slate-800 leading-tight">Pipeline de Vendas</h1>
                     <p className="text-xs text-slate-400 font-medium">Gerencie suas oportunidades</p>
                  </div>
               </div>
            </div>

            {/* Center: Pipeline Selector (Premium Pill Design) */}
            <div className="flex gap-1 p-1 bg-slate-100/50 rounded-2xl border border-slate-200/50 overflow-x-auto max-w-[500px] scrollbar-hide">
               {pipelines.map((p) => {
                  const isActive = activePipelineId === p.id;
                  return (
                     <button
                        key={p.id}
                        onClick={() => setActivePipelineId(p.id)}
                        className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-300 whitespace-nowrap flex items-center gap-2 ${isActive
                           ? 'bg-slate-800 text-white shadow-lg shadow-slate-200 scale-[1.02]'
                           : 'text-slate-500 hover:bg-white hover:text-slate-700'
                           }`}
                     >
                        {p.name}
                        {isActive && <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />}
                     </button>
                  );
               })}
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
               <button className="p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-xl transition-colors">
                  <Search size={20} />
               </button>
               <button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-500/20 active:scale-95 group">
                  <Plus size={18} className="group-hover:rotate-90 transition-transform" />
                  <span className="hidden lg:inline">Novo Deal</span>
               </button>
            </div>
         </div>

         {/* Board Content */}
         <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-8 bg-slate-50/50" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
               <div className="flex h-full gap-8 min-w-max pb-4">
                  {stages.map(stage => {
                     const stageCards = cards.filter(c => String(c.current_stage_id) === String(stage.id));
                     const stageValue = getTotalValue(stage.id as string);

                     return (
                        <div key={stage.id} className="w-80 flex flex-col h-full group/col">
                           {/* Column Header */}
                           <div className="flex flex-col mb-5 px-1">
                              <div className="flex justify-between items-center mb-3">
                                 <h3 className="font-bold text-slate-700 text-sm uppercase tracking-wide flex items-center gap-2">
                                    <div
                                       className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white"
                                       style={{ backgroundColor: stage.color?.startsWith('#') ? stage.color : '#cbd5e1' }}
                                    />
                                    {stage.name}
                                 </h3>
                                 <span className="bg-white border border-slate-200 text-slate-500 text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm">
                                    {stageCards.length}
                                 </span>
                              </div>
                              <div className="h-1 w-full bg-slate-200/50 rounded-full overflow-hidden">
                                 <div
                                    className="h-full rounded-full opacity-80"
                                    style={{
                                       width: '100%',
                                       backgroundColor: stage.color?.startsWith('#') ? stage.color : '#cbd5e1'
                                    }}
                                 />
                              </div>
                           </div>

                           {/* Cards Container */}
                           <Droppable droppableId={String(stage.id)}>
                              {(provided, snapshot) => (
                                 <div
                                    ref={provided.innerRef}
                                    {...provided.droppableProps}
                                    className={`flex-1 overflow-y-auto space-y-4 pr-2 pb-4 scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent ${snapshot.isDraggingOver ? 'bg-slate-100/50 rounded-xl' : ''}`}
                                 >
                                    {stageCards.map((card, index) => (
                                       // @ts-ignore
                                       <Draggable key={String(card.id)} draggableId={String(card.id)} index={index}>
                                          {(provided, snapshot) => (
                                             <div
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                onClick={() => setSelectedContact(card)}
                                                style={{ ...provided.draggableProps.style }}
                                                className={`bg-white p-5 rounded-2xl border border-transparent shadow-[0_2px_12px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_12px_24px_-8px_rgba(0,0,0,0.12)] hover:border-blue-100 transition-all duration-300 cursor-pointer group relative overflow-hidden ring-1 ring-slate-100 ${snapshot.isDragging ? 'shadow-2xl ring-2 ring-blue-400 rotate-2' : ''}`}
                                             >
                                                <div className="flex justify-between items-start mb-3">
                                                   <div className="flex items-center gap-3">
                                                      <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-500 font-bold text-sm border border-slate-100 shadow-inner">
                                                         {card.profile_pic_url ? <img src={card.profile_pic_url} className="w-full h-full rounded-full object-cover" /> : (card.name?.[0] || '?')}
                                                      </div>
                                                      <div>
                                                         <h4 className="font-bold text-slate-800 text-sm leading-tight">{card.name}</h4>
                                                         <p className="text-[10px] uppercase font-bold text-slate-400 mt-1 tracking-wider">{card.title || 'Oportunidade'}</p>
                                                      </div>
                                                   </div>
                                                </div>

                                                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-50">
                                                   <div className="flex items-center gap-1.5 text-slate-600 font-bold text-xs bg-slate-50 px-2.5 py-1.5 rounded-lg">
                                                      <DollarSign size={12} className="text-slate-400" />
                                                      {card.value ? parseFloat(card.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'R$ -'}
                                                   </div>
                                                   <div className="flex-1 text-right">
                                                      <span className="text-[10px] text-slate-400 font-medium flex items-center justify-end gap-1">
                                                         <Clock size={10} /> {new Date(card.created_at).toLocaleDateString()}
                                                      </span>
                                                   </div>
                                                </div>
                                             </div>
                                          )}
                                       </Draggable>
                                    ))}
                                    {provided.placeholder}

                                    {/* Add Button - only show if not dragging over to keep clean? kept for now */}
                                    <button className="w-full py-4 border-2 border-dashed border-slate-200/80 rounded-2xl text-slate-400 text-sm font-bold hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 transition-all flex items-center justify-center gap-2 opacity-70 hover:opacity-100 group">
                                       <div className="p-1 rounded-md bg-slate-100 group-hover:bg-blue-100 transition-colors">
                                          <Plus size={14} />
                                       </div>
                                       Adicionar Negócio
                                    </button>
                                 </div>
                              )}
                           </Droppable>
                        </div>
                     );
                  })}
               </div>
            </div>
         </DragDropContext>

         {selectedContact && (
            <div className="absolute inset-0 z-20 bg-slate-900/60 backdrop-blur-sm animate-fade-in flex items-center justify-center p-4" onClick={() => setSelectedContact(null)}>
               <ContactDrawer
                  contact={selectedContact}
                  stages={stages}
                  onClose={() => setSelectedContact(null)}
                  onMoveStage={handleMoveDeal}
                  onChat={() => {
                     if (onNavigateToChat && selectedContact) {
                        onNavigateToChat(String(selectedContact.contact_id));
                     }
                  }}
               />
            </div>
         )}
      </div>
   );
};

export default KanbanBoard;