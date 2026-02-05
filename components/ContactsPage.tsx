import React, { useState, useEffect } from 'react';
import { Search, Tag as TagIcon, Phone, Mail, User, Filter, X, Plus, Edit2, Trash2, MessageCircle, Layers, TrendingUp } from 'lucide-react';
import TagManager from './TagManager';
import TagBadge from './TagBadge';

interface Deal {
    id: string;
    title: string;
    pipeline_id: string;
    pipeline_name: string;
    stage_id: string;
    stage_name: string;
    stage_color: string;
}

interface PipelineStage {
    id: string;
    name: string;
    color: string;
}

interface Pipeline {
    id: string;
    name: string;
    stages: PipelineStage[];
}

interface Contact {
    id: string;
    name: string;
    phone: string;
    email?: string;
    tags: string[];
    deals?: Deal[];
    last_interaction?: string;
    unread_count?: number;
}
interface ContactsPageProps {
    onNavigateToChat?: (contactId: string) => void;
}

const ContactsPage: React.FC<ContactsPageProps> = ({ onNavigateToChat }) => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
    const [showTagManager, setShowTagManager] = useState(false);
    const [showPipelineManager, setShowPipelineManager] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<{ id: string, name: string } | null>(null);
    const [newContact, setNewContact] = useState({ name: '', phone: '', email: '' });
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
    const [selectedStageId, setSelectedStageId] = useState<string>('');
    const [isSavingDeal, setIsSavingDeal] = useState(false);

    const token = localStorage.getItem('token');

    // Carregar contatos e pipelines
    useEffect(() => {
        fetchContacts();
        fetchPipelines();
    }, []);

    const fetchPipelines = async () => {
        try {
            const response = await fetch('http://localhost:3001/api/crm/pipelines', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setPipelines(data);
                if (data.length > 0) {
                    setSelectedPipelineId(data[0].id);
                    if (data[0].stages && data[0].stages.length > 0) {
                        setSelectedStageId(data[0].stages[0].id);
                    }
                }
            }
        } catch (error) {
            console.error('Erro ao carregar pipelines:', error);
        }
    };

    const fetchContacts = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:3001/api/chat/', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                setContacts(data);
            }
        } catch (error) {
            console.error('Erro ao carregar contatos:', error);
        } finally {
            setLoading(false);
        }
    };

    // Buscar todas as tags únicas
    const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];

    // Filtrar contatos
    const filteredContacts = contacts.filter(contact => {
        const matchesSearch =
            contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            contact.phone.includes(searchTerm);

        const matchesTag = !selectedTagFilter || contact.tags?.includes(selectedTagFilter);

        return matchesSearch && matchesTag;
    });

    const handleOpenTagManager = (contact: Contact) => {
        setSelectedContact(contact);
        setShowTagManager(true);
    };

    const handleTagsChange = (newTags: string[]) => {
        if (selectedContact) {
            setContacts(prev => prev.map(c =>
                c.id === selectedContact.id ? { ...c, tags: newTags } : c
            ));
            setSelectedContact({ ...selectedContact, tags: newTags });
        }
    };

    const handleOpenPipelineManager = (contact: Contact) => {
        setSelectedContact(contact);
        setShowPipelineManager(true);
        if (pipelines.length > 0) {
            setSelectedPipelineId(pipelines[0].id);
            if (pipelines[0].stages && pipelines[0].stages.length > 0) {
                setSelectedStageId(pipelines[0].stages[0].id);
            }
        }
    };

    const handleAddToPipeline = async () => {
        if (!selectedContact || !selectedPipelineId || !selectedStageId) return;

        setIsSavingDeal(true);
        try {
            const response = await fetch('http://localhost:3001/api/crm/deals', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    name: selectedContact.name,
                    phone: selectedContact.phone,
                    pipeline_id: selectedPipelineId,
                    stage_id: selectedStageId,
                    value: 0
                })
            });

            if (response.ok) {
                await fetchContacts(); // Recarrega contatos para mostrar o novo deal
                setShowPipelineManager(false);
            } else {
                const err = await response.json();
                alert('Erro ao adicionar ao pipeline: ' + (err.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao salvar deal:', error);
            alert('Erro de conexão ao salvar deal');
        } finally {
            setIsSavingDeal(false);
        }
    };

    const handleOpenChat = (contactId: string) => {
        if (onNavigateToChat) {
            onNavigateToChat(contactId);
        } else {
            // Fallback caso a prop não seja passada
            window.location.href = `/chat?contactId=${contactId}`;
        }
    };

    const handleDeleteContact = async () => {
        if (!contactToDelete) return;

        setIsDeleting(contactToDelete.id);
        try {
            const response = await fetch(`http://localhost:3001/api/chat/contacts/${contactToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
                setShowDeleteConfirm(false);
                setContactToDelete(null);
            } else {
                const err = await response.json();
                alert('Erro ao excluir contato: ' + (err.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao excluir contato:', error);
            alert('Erro de conexão ao excluir contato');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContact.name || !newContact.phone) return;

        setIsSavingContact(true);
        try {
            const response = await fetch('http://localhost:3001/api/chat/contacts', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(newContact)
            });

            if (response.ok) {
                await fetchContacts();
                setShowAddModal(false);
                setNewContact({ name: '', phone: '', email: '' });
            } else {
                const err = await response.json();
                alert('Erro ao criar contato: ' + (err.error || 'Erro desconhecido'));
            }
        } catch (error) {
            console.error('Erro ao criar contato:', error);
            alert('Erro de conexão ao criar contato');
        } finally {
            setIsSavingContact(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                                    <User className="text-white" size={24} strokeWidth={2.5} />
                                </div>
                                Contatos
                            </h1>
                            <p className="text-slate-600 mt-1">
                                Gerencie seus contatos e organize por tags
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-600">
                                {filteredContacts.length} {filteredContacts.length === 1 ? 'contato' : 'contatos'}
                            </span>
                            <button
                                onClick={() => setShowAddModal(true)}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-95 transition-all text-sm"
                            >
                                <Plus size={18} strokeWidth={3} />
                                Novo Contato
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Barra de Busca e Filtros */}
                <div className="mb-6 space-y-4">
                    {/* Busca */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                        />
                    </div>

                    {/* Filtro de Tags */}
                    {allTags.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
                            <div className="flex items-center gap-2 mb-3">
                                <Filter size={16} className="text-slate-600" />
                                <h3 className="font-semibold text-slate-900 text-sm">Filtrar por Tag</h3>
                                {selectedTagFilter && (
                                    <button
                                        onClick={() => setSelectedTagFilter(null)}
                                        className="ml-auto text-xs text-purple-600 hover:text-purple-700 font-semibold"
                                    >
                                        Limpar filtro
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedTagFilter(null)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!selectedTagFilter
                                        ? 'bg-purple-600 text-white shadow-md'
                                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                        }`}
                                >
                                    Todos
                                </button>
                                {allTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => setSelectedTagFilter(tag)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${selectedTagFilter === tag
                                            ? 'bg-purple-600 text-white shadow-md'
                                            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
                                            }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Lista de Contatos */}
                {loading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
                    </div>
                ) : filteredContacts.length === 0 ? (
                    <div className="bg-white rounded-2xl border-2 border-dashed border-slate-300 p-12 text-center">
                        <User size={48} className="mx-auto text-slate-300 mb-4" />
                        <h3 className="text-lg font-semibold text-slate-700 mb-2">
                            {searchTerm || selectedTagFilter ? 'Nenhum contato encontrado' : 'Nenhum contato ainda'}
                        </h3>
                        <p className="text-slate-500 text-sm">
                            {searchTerm || selectedTagFilter
                                ? 'Tente ajustar os filtros de busca'
                                : 'Os contatos aparecerão aqui quando você receber mensagens'}
                        </p>
                    </div>
                ) : (
                    <div className="bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-320px)] scrollbar-thin scrollbar-thumb-slate-200">
                            <table className="w-full text-left border-collapse min-w-[800px]">
                                <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
                                    <tr className="border-b border-slate-200">
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Contato</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tags</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">Pipelines CRM</th>
                                        <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredContacts.map(contact => (
                                        <tr
                                            key={contact.id}
                                            className="hover:bg-slate-50/50 transition-colors group cursor-pointer"
                                            onClick={() => {
                                                setSelectedContact(contact);
                                                setShowViewModal(true);
                                            }}
                                        >
                                            {/* Contato Info */}
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0">
                                                        {contact.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-slate-900 truncate hover:text-blue-600 transition-colors">{contact.name}</h3>
                                                            {contact.unread_count && contact.unread_count > 0 && (
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                                                    {contact.unread_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-0.5">
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                                                <Phone size={12} strokeWidth={2} />
                                                                <span>{contact.phone}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tags Badge */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[180px]">
                                                    {contact.tags && contact.tags.length > 0 ? (
                                                        <>
                                                            {contact.tags.slice(0, 2).map(tag => (
                                                                <span key={tag} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-[10px] font-bold border border-purple-100">
                                                                    {tag}
                                                                </span>
                                                            ))}
                                                            {contact.tags.length > 2 && (
                                                                <span
                                                                    className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold border border-slate-200 cursor-help"
                                                                    title={contact.tags.slice(2).join(', ')}
                                                                >
                                                                    +{contact.tags.length - 2}
                                                                </span>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 italic">Sem tags</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Pipelines Info */}
                                            <td className="px-6 py-4">
                                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                                    {contact.deals && contact.deals.length > 0 ? (
                                                        <>
                                                            {contact.deals.slice(0, 1).map(deal => (
                                                                <div
                                                                    key={deal.id}
                                                                    className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border bg-white shadow-sm"
                                                                    style={{
                                                                        borderColor: (deal.stage_color || '#cbd5e1') + '40',
                                                                        color: deal.stage_color || '#64748b'
                                                                    }}
                                                                >
                                                                    <Layers size={10} />
                                                                    <span className="truncate max-w-[120px]">{deal.pipeline_name || 'CRM'} » {deal.stage_name || '...'}</span>
                                                                </div>
                                                            ))}
                                                            {contact.deals.length > 1 && (
                                                                <div className="px-1.5 py-0.5 bg-slate-100 text-slate-500 rounded text-[10px] font-bold border border-slate-200" title={contact.deals.slice(1).map(d => d.pipeline_name).join(', ')}>
                                                                    +{contact.deals.length - 1}
                                                                </div>
                                                            )}
                                                        </>
                                                    ) : (
                                                        <span className="text-[10px] text-slate-300 italic">Fora de pipelines</span>
                                                    )}
                                                </div>
                                            </td>

                                            {/* Ações Rápidas */}
                                            <td className="px-6 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity translate-x-4 group-hover:translate-x-0">
                                                    <button
                                                        onClick={() => handleOpenChat(contact.id)}
                                                        title="Abrir Chat"
                                                        className="w-8 h-8 flex items-center justify-center bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow hover:shadow-lg active:scale-90"
                                                    >
                                                        <MessageCircle size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenTagManager(contact)}
                                                        title="Gerenciar Tags"
                                                        className="w-8 h-8 flex items-center justify-center bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-all active:scale-90"
                                                    >
                                                        <TagIcon size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleOpenPipelineManager(contact)}
                                                        title="Mover no Funil"
                                                        className="w-8 h-8 flex items-center justify-center bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all active:scale-90"
                                                    >
                                                        <TrendingUp size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            setContactToDelete({ id: contact.id, name: contact.name });
                                                            setShowDeleteConfirm(true);
                                                        }}
                                                        disabled={isDeleting === contact.id}
                                                        title="Excluir Contato"
                                                        className="w-8 h-8 flex items-center justify-center bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-all active:scale-90 disabled:opacity-50"
                                                    >
                                                        {isDeleting === contact.id ? (
                                                            <div className="w-4 h-4 border-2 border-red-600/30 border-t-red-600 rounded-full animate-spin"></div>
                                                        ) : (
                                                            <Trash2 size={16} />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
                }
            </div >

            {/* Modal de Gerenciamento de Tags */}
            {
                showTagManager && selectedContact && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in shadow-2xl">
                        <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50/50">
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Gerenciar Tags</h2>
                                    <p className="text-xs text-slate-500 font-medium">Organize por etiquetas personalizadas</p>
                                </div>
                                <button
                                    onClick={() => setShowTagManager(false)}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </div>
                            <div className="p-6">
                                <TagManager
                                    contactId={selectedContact.id}
                                    contactName={selectedContact.name}
                                    initialTags={selectedContact.tags}
                                    onTagsChange={handleTagsChange}
                                />
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Modal de Gerenciamento de Pipeline */}
            {
                showPipelineManager && selectedContact && (
                    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in shadow-2xl">
                        <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                            <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
                                        <TrendingUp className="text-white" size={24} />
                                    </div>
                                    <div>
                                        <h2 className="text-xl font-bold text-slate-900">Atribuir ao CRM</h2>
                                        <p className="text-xs text-slate-500 font-medium">Mover {selectedContact.name} no funil</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPipelineManager(false)}
                                    className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-slate-600"
                                >
                                    <X size={20} strokeWidth={2.5} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                {/* Seletor de Pipeline */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Pipeline</label>
                                    <select
                                        value={selectedPipelineId}
                                        onChange={(e) => {
                                            const pid = e.target.value;
                                            setSelectedPipelineId(pid);
                                            const pipe = pipelines.find(p => String(p.id) === String(pid));
                                            if (pipe && pipe.stages.length > 0) {
                                                setSelectedStageId(pipe.stages[0].id);
                                            }
                                        }}
                                        className="w-full bg-slate-50 border-0 p-4 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                    >
                                        {pipelines.map(p => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Seletor de Estágio */}
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Etapa Atual</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {pipelines.find(p => String(p.id) === String(selectedPipelineId))?.stages.map(s => (
                                            <button
                                                key={s.id}
                                                onClick={() => setSelectedStageId(s.id)}
                                                className={`p-3 rounded-xl text-[10px] font-bold border-2 transition-all flex flex-col gap-1 ${String(selectedStageId) === String(s.id)
                                                    ? 'bg-blue-50 border-blue-500 shadow-sm'
                                                    : 'bg-white border-slate-100 hover:border-slate-200 text-slate-500'
                                                    }`}
                                            >
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                                                {s.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <button
                                    onClick={handleAddToPipeline}
                                    disabled={isSavingDeal || !selectedStageId}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                                >
                                    {isSavingDeal ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        <>
                                            <Plus size={18} strokeWidth={3} />
                                            Confirmar Atribuição
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Modal de Adição de Contato */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in shadow-2xl">
                    <div className="bg-white rounded-[2.5rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                        <div className="flex justify-between items-center p-8 border-b border-slate-100 bg-slate-50/50">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
                                    <User className="text-white" size={24} />
                                </div>
                                <div>
                                    <h2 className="text-xl font-bold text-slate-900">Novo Contato</h2>
                                    <p className="text-xs text-slate-500 font-medium">Cadastre um novo lead manualmente</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-white hover:shadow-sm rounded-xl transition-all text-slate-400 hover:text-slate-600"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleAddContact} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        value={newContact.name}
                                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                        className="w-full bg-slate-50 border-0 p-4 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">WhatsApp / Telefone</label>
                                    <input
                                        required
                                        type="text"
                                        value={newContact.phone}
                                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value.replace(/\D/g, '') })}
                                        className="w-full bg-slate-50 border-0 p-4 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="Ex: 5511999999999"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">E-mail (Opcional)</label>
                                    <input
                                        type="email"
                                        value={newContact.email}
                                        onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                        className="w-full bg-slate-50 border-0 p-4 rounded-2xl text-sm font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="joao@exemplo.com"
                                    />
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSavingContact}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-5 rounded-2xl font-bold shadow-xl shadow-blue-200 hover:shadow-blue-300 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 flex items-center justify-center gap-3"
                            >
                                {isSavingContact ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Plus size={18} strokeWidth={3} />
                                        Criar Contato
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalhes do Contato */}
            {showViewModal && selectedContact && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4 animate-fade-in shadow-2xl">
                    <div className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                        {/* Header do Modal */}
                        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-700">
                            <button
                                onClick={() => setShowViewModal(false)}
                                className="absolute top-6 right-6 p-2 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl transition-all text-white border border-white/20"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                            <div className="absolute -bottom-10 left-8">
                                <div className="w-24 h-24 bg-white p-1.5 rounded-[2rem] shadow-xl">
                                    <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 rounded-[1.7rem] flex items-center justify-center text-white font-bold text-3xl">
                                        {selectedContact.name.charAt(0).toUpperCase()}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Conteúdo do Modal */}
                        <div className="pt-14 p-8 space-y-8">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">{selectedContact.name}</h2>
                                    <p className="text-slate-500 font-medium">Cliente desde {new Date().toLocaleDateString()}</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => {
                                            handleOpenChat(selectedContact.id);
                                            setShowViewModal(false);
                                        }}
                                        className="px-4 py-2 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:scale-[1.02] active:scale-95 transition-all text-sm flex items-center gap-2"
                                    >
                                        <MessageCircle size={18} />
                                        Abrir Chat
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-8">
                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Informações de Contato</label>
                                        <div className="space-y-3">
                                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                                                    <Phone size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</p>
                                                    <p className="text-sm font-bold text-slate-700">{selectedContact.phone}</p>
                                                </div>
                                            </div>
                                            {selectedContact.email && (
                                                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                                    <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600">
                                                        <Mail size={18} />
                                                    </div>
                                                    <div>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase">E-mail</p>
                                                        <p className="text-sm font-bold text-slate-700">{selectedContact.email}</p>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Tags do Cliente</label>
                                        <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex flex-wrap gap-2">
                                            {selectedContact.tags && selectedContact.tags.length > 0 ? (
                                                selectedContact.tags.map(tag => (
                                                    <span key={tag} className="px-3 py-1 bg-white text-purple-600 rounded-lg text-xs font-bold border border-purple-100 shadow-sm">
                                                        {tag}
                                                    </span>
                                                ))
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">Nenhuma tag atribuída</p>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Presença em Pipelines</label>
                                        <div className="space-y-3">
                                            {selectedContact.deals && selectedContact.deals.length > 0 ? (
                                                selectedContact.deals.map(deal => (
                                                    <div key={deal.id} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm border-l-4" style={{ borderLeftColor: deal.stage_color }}>
                                                        <div className="flex items-center justify-between mb-1">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase">{deal.pipeline_name}</p>
                                                            <Layers size={14} className="text-slate-300" />
                                                        </div>
                                                        <p className="text-sm font-bold text-slate-700">{deal.stage_name}</p>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                                                    <p className="text-xs text-slate-400 italic">Não está em nenhum funil</p>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 text-blue-700">
                                        <h4 className="text-xs font-bold uppercase mb-1 flex items-center gap-2">
                                            <TrendingUp size={14} />
                                            Última Atividade
                                        </h4>
                                        <p className="text-sm font-bold">
                                            {selectedContact.last_interaction ? new Date(selectedContact.last_interaction).toLocaleString() : 'Nunca interagiu'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {showDeleteConfirm && contactToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in shadow-2xl">
                    <div className="bg-white rounded-[2.5rem] max-w-sm w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                        <div className="p-8 text-center space-y-6">
                            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse">
                                <Trash2 size={40} />
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-xl font-bold text-slate-900">Excluir Contato?</h3>
                                <p className="text-sm text-slate-500 leading-relaxed px-4">
                                    Tem certeza que deseja excluir o contato <span className="font-bold text-slate-700">"{contactToDelete.name}"</span>?
                                    Isso removerá permanentemente o chat e os negócios vinculados.
                                </p>
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <button
                                    onClick={handleDeleteContact}
                                    disabled={isDeleting !== null}
                                    className="w-full bg-red-600 text-white p-4 rounded-2xl font-bold shadow-xl shadow-red-200 hover:bg-red-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {isDeleting !== null ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        "Sim, Excluir Agora"
                                    )}
                                </button>
                                <button
                                    onClick={() => {
                                        setShowDeleteConfirm(false);
                                        setContactToDelete(null);
                                    }}
                                    disabled={isDeleting !== null}
                                    className="w-full bg-slate-100 text-slate-600 p-4 rounded-2xl font-bold hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};

export default ContactsPage;
