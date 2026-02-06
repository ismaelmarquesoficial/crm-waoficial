import React, { useState, useEffect } from 'react';
import { Search, Tag as TagIcon, Phone, Mail, User, Filter, X, Plus, Edit2, Trash2, MessageCircle, Layers, TrendingUp, Download, AlertCircle, CheckCircle2 } from 'lucide-react';
import TagManager from './TagManager';
import TagBadge from './TagBadge';
import Papa from 'papaparse';

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
    custom_fields?: Record<string, string>;
    notes?: string;
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
    const [showImportModal, setShowImportModal] = useState(false);
    const [importText, setImportText] = useState('');
    const [importTag, setImportTag] = useState('');
    const [importPipelineId, setImportPipelineId] = useState('');
    const [importStageId, setImportStageId] = useState('');
    const [showViewModal, setShowViewModal] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [contactToDelete, setContactToDelete] = useState<{ id: string, name: string } | null>(null);
    const [newContact, setNewContact] = useState<{ name: string, phone: string, email: string, tags: string[], pipeline_id?: string, stage_id?: string, channel_id?: string }>({ name: '', phone: '', email: '', tags: [] });
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [channels, setChannels] = useState<any[]>([]);
    const [isSavingContact, setIsSavingContact] = useState(false);
    const [pipelines, setPipelines] = useState<Pipeline[]>([]);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
    const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
    const [selectedStageId, setSelectedStageId] = useState<string>('');
    const [isSavingDeal, setIsSavingDeal] = useState(false);
    const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [allTagsSystem, setAllTagsSystem] = useState<string[]>([]);
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    // Edit State
    const [isEditing, setIsEditing] = useState(false);
    const [editFormData, setEditFormData] = useState<any>({});
    const [customFieldsList, setCustomFieldsList] = useState<{ key: string, value: string }[]>([]);
    const [selectedPipelineToAdd, setSelectedPipelineToAdd] = useState<string>('');

    // Auto-hide notification
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => setNotification(null), 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);

    const token = localStorage.getItem('token');

    // Carregar contatos e pipelines
    useEffect(() => {
        fetchContacts();
        fetchPipelines();
        fetchAllTags();
        fetchChannels();
    }, []);

    const fetchChannels = async () => {
        try {
            const response = await fetch('/api/channels', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setChannels(data);
            }
        } catch (err) {
            console.error('Erro ao buscar canais:', err);
        }
    };

    const fetchAllTags = async () => {
        try {
            const response = await fetch('/api/chat/tags', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (response.ok) {
                const data = await response.json();
                setAllTagsSystem(data);
            }
        } catch (err) {
            console.error('Erro ao carregar tags:', err);
        }
    };

    const fetchPipelines = async () => {
        try {
            const response = await fetch('/api/crm/pipelines', {
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
            const response = await fetch('/api/chat', {
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
            contact.phone.includes(searchTerm) ||
            (contact.email && contact.email.toLowerCase().includes(searchTerm.toLowerCase()));

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
            const response = await fetch('/api/crm/deals', {
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
                await fetchContacts();
                setShowPipelineManager(false);
                setNotification({ message: 'Contato adicionado ao funil com sucesso!', type: 'success' });
            } else {
                const err = await response.json();
                setNotification({ message: err.error || 'Erro ao adicionar ao pipeline', type: 'error' });
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
            const response = await fetch(`/api/chat/contacts/${contactToDelete.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (response.ok) {
                setContacts(prev => prev.filter(c => c.id !== contactToDelete.id));
                setShowDeleteConfirm(false);
                setContactToDelete(null);
                setNotification({ message: 'Contato excluído com sucesso!', type: 'success' });
            } else {
                const err = await response.json();
                setNotification({ message: err.error || 'Erro ao excluir contato', type: 'error' });
            }
        } catch (error) {
            console.error('Erro ao excluir contato:', error);
            alert('Erro de conexão ao excluir contato');
        } finally {
            setIsDeleting(null);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (results) => {
                    const parsedData = results.data as any[];
                    // Mapeia nomes de colunas comuns
                    const formattedText = parsedData.map(row => {
                        const name = row.name || row.Nome || row.nome || row.NAME || '';
                        const phone = row.phone || row.Phone || row.telefone || row.Telefone || row.whatsapp || row.WhatsApp || '';
                        const email = row.email || row.Email || row.email || row.EMAIL || '';

                        if (name && phone) {
                            return `${name}, ${phone}${email ? `, ${email}` : ''}`;
                        }
                        return null;
                    }).filter(Boolean).join('\n');

                    if (formattedText) {
                        setImportText(formattedText);
                        setNotification({ message: 'Arquivo CSV processado! Os dados foram carregados no campo abaixo.', type: 'success' });
                    } else {
                        setNotification({ message: 'Nenhum contato válido encontrado. Certifique-se de que o CSV tenha colunas como "Nome" e "Telefone".', type: 'error' });
                    }
                    // Reset input
                    if (e.target) e.target.value = '';
                },
                error: (error) => {
                    console.error('Erro ao ler CSV:', error);
                    setNotification({ message: 'Erro ao processar o arquivo CSV.', type: 'error' });
                }
            });
        }
    };

    const handleImportContacts = async (e: React.FormEvent) => {
        e.preventDefault();
        const lines = importText.split('\n').filter(l => l.trim());
        const contactsToImport = lines.map(line => {
            const parts = line.split(',').map(p => p.trim());
            return {
                name: parts[0],
                phone: parts[1],
                email: parts[2] || null
            };
        }).filter(c => c.name && c.phone);

        if (contactsToImport.length === 0) {
            setNotification({ message: 'Nenhum contato válido encontrado (Formato: Nome, Telefone)', type: 'error' });
            return;
        }

        setIsSavingContact(true);
        try {
            const response = await fetch('/api/chat/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    contacts: contactsToImport,
                    tag: importTag || null,
                    pipeline_id: importPipelineId || null,
                    stage_id: importStageId || null
                })
            });

            if (response.ok) {
                await fetchContacts();
                setShowImportModal(false);
                setImportText('');
                setImportTag('');
                setImportPipelineId('');
                setImportStageId('');
                setNotification({ message: 'Importação concluída com sucesso!', type: 'success' });
            } else {
                const err = await response.json();
                setNotification({ message: err.error || 'Erro na importação', type: 'error' });
            }
        } catch (error) {
            console.error('Erro na importação:', error);
            setNotification({ message: 'Erro de conexão ao importar contatos', type: 'error' });
        } finally {
            setIsSavingContact(false);
        }
    };

    const handleAddContact = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newContact.name || !newContact.phone) return;

        setIsSavingContact(true);
        try {
            const isDuplicate = contacts.some(c => c.phone.replace(/\D/g, '') === newContact.phone.replace(/\D/g, ''));
            if (isDuplicate) {
                setNotification({ message: 'Já existe um contato com este telefone.', type: 'error' });
                setIsSavingContact(false);
                return;
            }

            // 1. Create Contact
            const contactRes = await fetch('/api/chat/contacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    name: newContact.name,
                    phone: newContact.phone,
                    email: newContact.email,
                    tags: newContact.tags,
                    custom_fields: newContact.channel_id ? { preferred_channel: newContact.channel_id } : null
                })
            });

            if (!contactRes.ok) {
                const err = await contactRes.json();
                throw new Error(err.error || 'Erro ao criar contato');
            }

            const createdContact = await contactRes.json();

            // 2. Create Deal if requested
            if (newContact.pipeline_id && newContact.stage_id) {
                await fetch('/api/crm/deals', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                    body: JSON.stringify({
                        contact_id: createdContact.id,
                        pipeline_id: newContact.pipeline_id,
                        stage_id: newContact.stage_id,
                        title: createdContact.name,
                        name: createdContact.name,
                        phone: createdContact.phone,
                        value: 0
                    })
                });
            }

            await fetchContacts();
            setShowAddModal(false);
            setNewContact({ name: '', phone: '', email: '', tags: [] }); // Reset
            setNotification({ message: 'Contato criado!', type: 'success' });

        } catch (error: any) {
            console.error(error);
            setNotification({ message: error.message || 'Erro', type: 'error' });
        } finally {
            setIsSavingContact(false);
        }
    };

    // --- Helpers para Edição Rápida e Tags ---

    const refreshContactDetails = async (id: string) => {
        const res = await fetch(`/api/chat/contacts/${id}`, { headers: { 'Authorization': `Bearer ${token}` } });
        if (res.ok) {
            const data = await res.json();
            setSelectedContact(data);
            setContacts(prev => prev.map(c => c.id === data.id ? data : c));
        }
    };

    const updateDealStage = async (dealId: string, stageId: string) => {
        try {
            await fetch(`/api/crm/deals/${dealId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ stage_id: stageId })
            });
            if (selectedContact) refreshContactDetails(selectedContact.id);
            setNotification({ message: 'Estágio atualizado!', type: 'success' });
        } catch (e) {
            setNotification({ message: 'Erro ao atualizar estágio', type: 'error' });
        }
    };

    const addDealToPipeline = async () => {
        if (!selectedPipelineToAdd || !selectedContact) return;
        const pipe = pipelines.find(p => String(p.id) === String(selectedPipelineToAdd));
        if (!pipe || pipe.stages.length === 0) return;

        try {
            await fetch('/api/crm/deals', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({
                    contact_id: selectedContact.id,
                    pipeline_id: pipe.id,
                    stage_id: selectedStageId || pipe.stages[0].id,
                    title: selectedContact.name,
                    name: selectedContact.name,
                    phone: selectedContact.phone,
                    value: 0
                })
            });
            refreshContactDetails(selectedContact.id);
            setNotification({ message: 'Adicionado ao funil!', type: 'success' });
            setSelectedPipelineToAdd('');
            setSelectedStageId('');
        } catch (e) {
            setNotification({ message: 'Erro ao criar negócio', type: 'error' });
        }
    };

    const handleEditTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.currentTarget.value.trim();
            if (val && !editFormData.tags?.includes(val)) {
                setEditFormData((prev: any) => ({ ...prev, tags: [...(prev.tags || []), val] }));
                e.currentTarget.value = '';
            }
        }
    };

    const removeEditTag = (tag: string) => {
        setEditFormData((prev: any) => ({ ...prev, tags: (prev.tags || []).filter((t: string) => t !== tag) }));
    };

    const handleNewTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.currentTarget.value.trim();
            if (val && !newContact.tags?.includes(val)) {
                setNewContact(prev => ({ ...prev, tags: [...(prev.tags || []), val] }));
                e.currentTarget.value = '';
            }
        }
    };

    const removeNewTag = (tag: string) => {
        setNewContact(prev => ({ ...prev, tags: prev.tags.filter(t => t !== tag) }));
    };



    const handleStartEdit = () => {
        if (!selectedContact) return;
        setEditFormData({
            name: selectedContact.name,
            phone: selectedContact.phone,
            email: selectedContact.email || '',
            notes: selectedContact.notes || '',
            tags: selectedContact.tags || []
        });
        const fields = selectedContact.custom_fields || {};
        const list = Object.entries(fields).map(([k, v]) => ({ key: k, value: v as string }));
        setCustomFieldsList(list);
        setIsEditing(true);
    };

    const handleSaveEdit = async () => {
        if (!selectedContact) return;
        setIsSavingContact(true);
        try {
            const custom_fields = customFieldsList.reduce((acc, curr) => {
                if (curr.key.trim()) acc[curr.key.trim()] = curr.value;
                return acc;
            }, {} as Record<string, string>);

            const body = {
                ...editFormData,
                custom_fields
            };

            const res = await fetch(`/api/chat/contacts/${selectedContact.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(body)
            });

            if (res.ok) {
                const updated = await res.json();
                setContacts(prev => prev.map(c => c.id === updated.id ? updated : c));
                setSelectedContact(updated);
                setIsEditing(false);
                setNotification({ message: 'Contato atualizado com sucesso!', type: 'success' });
            } else {
                let err;
                try {
                    err = await res.json();
                } catch (e) {
                    err = { error: `Erro ${res.status}: Tente reiniciar o servidor.` };
                }
                setNotification({ message: err.error || 'Erro ao atualizar', type: 'error' });
            }
        } catch (e) {
            console.error(e);
            setNotification({ message: 'Erro de conexão', type: 'error' });
        } finally {
            setIsSavingContact(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
            {/* Header */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                        <div>
                            <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                                <div className="w-10 h-10 bg-brand-gradient rounded-xl flex items-center justify-center shadow-lg">
                                    <User className="text-white" size={20} strokeWidth={2.5} />
                                </div>
                                Contatos
                            </h1>
                            <p className="text-slate-500 text-xs mt-0.5">
                                Gerencie seus contatos e organize por tags
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-sm font-semibold text-slate-600">
                                {filteredContacts.length} {filteredContacts.length === 1 ? 'contato' : 'contatos'}
                            </span>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setShowImportModal(true)}
                                    className="px-4 py-2 bg-white text-slate-700 rounded-xl font-semibold border border-slate-200 shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2 text-xs"
                                >
                                    <Download size={16} className="rotate-180" /> Importar
                                </button>
                                <button
                                    onClick={() => setShowAddModal(true)}
                                    className="bg-brand-gradient text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:contrast-125 active:scale-95 transition-all flex items-center gap-2 text-xs"
                                >
                                    <Plus size={18} /> Novo Contato
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                {/* Barra de Busca e Filtros */}
                <div className="mb-4 space-y-3">
                    {/* Busca */}
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou telefone..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs"
                        />
                    </div>

                    {/* Filtro de Tags */}
                    {allTags.length > 0 && (
                        <div className="bg-white rounded-xl border border-slate-200 p-3 shadow-sm">
                            <div className="flex items-center gap-2 mb-2">
                                <Filter size={14} className="text-slate-600" />
                                <h3 className="font-semibold text-slate-800 text-xs">Filtrar por Tag</h3>
                                {selectedTagFilter && (
                                    <button
                                        onClick={() => setSelectedTagFilter(null)}
                                        className="ml-auto text-xs text-blue-600 hover:text-blue-700 font-semibold"
                                    >
                                        Limpar filtro
                                    </button>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <button
                                    onClick={() => setSelectedTagFilter(null)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!selectedTagFilter
                                        ? 'bg-blue-600 text-white shadow-md'
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
                                            ? 'bg-blue-600 text-white shadow-md'
                                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
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
                    <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl mb-8 overflow-hidden">
                        <div className="overflow-auto max-h-[calc(100vh-320px)] relative">
                            <table className="w-full text-left border-separate border-spacing-0 min-w-[800px]">
                                <thead className="sticky top-0 z-30 bg-white shadow-sm">
                                    <tr>
                                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">Contato</th>
                                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">Tags</th>
                                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">Pipelines CRM</th>
                                        <th className="px-5 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest text-right bg-slate-50/80 backdrop-blur-sm border-b border-slate-100">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {filteredContacts.map(contact => (
                                        <tr
                                            key={contact.id}
                                            className="group hover:bg-slate-50/80 transition-all cursor-pointer border-l-4 border-l-transparent hover:border-l-meta"
                                            onClick={() => {
                                                setSelectedContact(contact);
                                                setShowViewModal(true);
                                            }}
                                        >
                                            {/* Contato Info */}
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-brand-gradient rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm shrink-0">
                                                        {contact.name.charAt(0).toUpperCase()}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <h3 className="font-bold text-slate-800 text-sm truncate hover:text-blue-600 transition-colors">{contact.name}</h3>
                                                            {contact.unread_count && contact.unread_count > 0 && (
                                                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white shadow-sm ring-2 ring-white">
                                                                    {contact.unread_count}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                                                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                                                <Phone size={10} strokeWidth={2.5} />
                                                                <span>{contact.phone}</span>
                                                            </div>
                                                            {contact.email && (
                                                                <div className="flex items-center gap-1.5 text-[10px] font-medium text-slate-400">
                                                                    <Mail size={10} strokeWidth={2.5} />
                                                                    <span className="truncate max-w-[200px]">{contact.email}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>

                                            {/* Tags Badge */}
                                            <td className="px-5 py-3">
                                                <TagBadge tags={contact.tags} maxVisible={2} />
                                            </td>

                                            {/* Pipelines Info */}
                                            <td className="px-5 py-3">
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
                                            <td className="px-5 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                                                <div className="flex items-center justify-end gap-1.5">
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
                                                        className="w-8 h-8 flex items-center justify-center bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-all active:scale-90"
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
                            <div className="modal-header-gradient">
                                <div className="flex items-center gap-3">
                                    <TagIcon className="text-white" size={20} />
                                    <div>
                                        <h2 className="text-lg font-bold">Gerenciar Tags</h2>
                                        <p className="text-[10px] text-white/80 font-medium">Organize por etiquetas personalizadas</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowTagManager(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                                >
                                    <X size={18} strokeWidth={2.5} />
                                </button>
                            </div>
                            <div className="p-5">
                                <TagManager
                                    contactId={selectedContact.id}
                                    contactName={selectedContact.name}
                                    initialTags={selectedContact.tags}
                                    allAvailableTags={allTagsSystem}
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
                        <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                            <div className="modal-header-gradient">
                                <div className="flex items-center gap-3">
                                    <TrendingUp className="text-white" size={20} />
                                    <div>
                                        <h2 className="text-lg font-bold">Atribuir ao CRM</h2>
                                        <p className="text-[10px] text-white/80 font-medium">Mover {selectedContact.name} no funil</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowPipelineManager(false)}
                                    className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
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
                                    className="btn-primary"
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
                    <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                        <div className="modal-header-gradient">
                            <div className="flex items-center gap-3">
                                <User className="text-white" size={20} />
                                <div>
                                    <h2 className="text-lg font-bold">Novo Contato</h2>
                                    <p className="text-[10px] text-white/80 font-medium">Cadastre um novo lead manualmente</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowAddModal(false)}
                                className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                            >
                                <X size={20} strokeWidth={2.5} />
                            </button>
                        </div>

                        <form onSubmit={handleAddContact} className="p-6 space-y-4">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        value={newContact.name}
                                        onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                                        className="w-full bg-slate-50 border-0 p-3.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">WhatsApp / Telefone</label>
                                    <input
                                        required
                                        type="text"
                                        value={newContact.phone}
                                        onChange={(e) => setNewContact({ ...newContact, phone: e.target.value.replace(/\D/g, '') })}
                                        className="w-full bg-slate-50 border-0 p-3.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                        placeholder="Ex: 5511999999999"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">E-mail</label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="email"
                                            placeholder="email@exemplo.com"
                                            value={newContact.email}
                                            onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                                            className="pl-10 w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-slate-700 mb-1">Canal de Envio (Opcional)</label>
                                    <div className="relative">
                                        <Layers className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <select
                                            value={newContact.channel_id || ''}
                                            onChange={(e) => setNewContact({ ...newContact, channel_id: e.target.value })}
                                            className="pl-10 w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none bg-white appearance-none"
                                        >
                                            <option value="">Automático (Padrão)</option>
                                            {channels.map((ch) => (
                                                <option key={ch.id} value={ch.id}>
                                                    {ch.instance_name || ch.verified_name || ch.phone_number_id}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isSavingContact}
                                className="btn-primary"
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

            {/* Modal de Detalhes / Edição do Contato */}
            {showViewModal && selectedContact && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[55] p-4 animate-fade-in shadow-2xl">
                    <div className={`bg-white rounded-[2.5rem] w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20 max-h-[90vh] flex flex-col transition-all duration-500 ${isEditing ? 'max-w-4xl' : 'max-w-md'}`}>
                        {/* Header com degradê padrão */}
                        <div className="modal-header-gradient relative overflow-hidden shrink-0">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/30 font-bold text-lg">
                                    {selectedContact.name.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1">
                                    {isEditing ? (
                                        <input
                                            value={editFormData.name}
                                            onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                                            className="text-xl font-bold bg-white/20 border border-white/30 rounded px-2 py-1 text-white placeholder-white/50 w-full outline-none focus:bg-white/30"
                                            placeholder="Nome do Contato"
                                        />
                                    ) : (
                                        <h2 className="text-xl font-bold">{selectedContact.name}</h2>
                                    )}
                                    <div className="flex items-center gap-2 text-white/80 text-[10px] font-medium mt-0.5">
                                        <div className="flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                                            {isEditing ? 'Editando Perfil' : 'Ativo no Sistema'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => { setShowViewModal(false); setIsEditing(false); }} className="p-2 hover:bg-white/20 rounded-xl text-white transition-all relative z-10">
                                <X size={22} />
                            </button>
                        </div>

                        {/* Conteúdo do Modal (Scrollable) */}
                        <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1">
                            {!isEditing ? (
                                <>
                                    <div className="flex justify-between items-center">
                                        <h3 className="text-sm font-bold text-slate-800">Detalhes do Perfil</h3>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={handleStartEdit}
                                                className="px-3 py-2 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all text-xs flex items-center gap-2"
                                            >
                                                <Edit2 size={14} /> Editar
                                            </button>
                                            <button
                                                onClick={() => {
                                                    handleOpenChat(selectedContact.id);
                                                    setShowViewModal(false);
                                                }}
                                                className="px-4 py-2 bg-brand-gradient text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:contrast-125 active:scale-95 transition-all text-xs flex items-center gap-2"
                                            >
                                                <MessageCircle size={16} />
                                                Abrir Chat
                                            </button>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Informações de Contato</label>
                                                <div className="space-y-2">
                                                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-slate-50">
                                                        <div className="w-9 h-9 bg-brand-gradient rounded-lg shadow-sm flex items-center justify-center text-white shrink-0">
                                                            <Phone size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</p>
                                                            <p className="text-xs font-bold text-slate-700">{selectedContact.phone}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-slate-50">
                                                        <div className="w-9 h-9 bg-brand-gradient rounded-lg shadow-sm flex items-center justify-center text-white shrink-0">
                                                            <Mail size={16} />
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail</p>
                                                            <p className="text-xs font-bold text-slate-700 truncate">{selectedContact.email || 'Não informado'}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Observações</label>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 min-h-[60px]">
                                                    <p className="text-xs text-slate-600 whitespace-pre-wrap">{selectedContact.notes || 'Nenhuma observação.'}</p>
                                                </div>
                                            </div>

                                            {selectedContact.custom_fields && Object.keys(selectedContact.custom_fields).length > 0 && (
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Campos Personalizados</label>
                                                    <div className="space-y-1">
                                                        {Object.entries(selectedContact.custom_fields).map(([k, v]) => (
                                                            <div key={k} className="flex justify-between items-center p-2 bg-slate-50 rounded-lg border border-slate-100">
                                                                <span className="text-[10px] font-bold text-slate-500 uppercase">{k}</span>
                                                                <span className="text-xs font-medium text-slate-700">{v as string}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-6">
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Tags do Cliente</label>
                                                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap gap-1.5">
                                                    {selectedContact.tags && selectedContact.tags.length > 0 ? (
                                                        selectedContact.tags.map(tag => (
                                                            <span key={tag} className="px-2.5 py-1 bg-white text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 shadow-sm">
                                                                {tag}
                                                            </span>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 italic">Nenhuma tag atribuída</p>
                                                    )}
                                                    <button onClick={() => { setShowTagManager(true); setShowViewModal(false); }} className="px-2 py-0.5 bg-blue-100 text-blue-600 rounded text-[10px] font-bold hover:bg-blue-200 transition-colors">+</button>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Presença em Pipelines</label>
                                                <div className="space-y-2">
                                                    {selectedContact.deals && selectedContact.deals.length > 0 ? (
                                                        selectedContact.deals.map(deal => (
                                                            <div key={deal.id} className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm border-l-4" style={{ borderLeftColor: deal.stage_color }}>
                                                                <div className="flex items-center justify-between mb-0.5">
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{deal.pipeline_name}</p>
                                                                    <Layers size={12} className="text-slate-300" />
                                                                </div>
                                                                <p className="text-xs font-bold text-slate-700">{deal.stage_name}</p>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                                                            <p className="text-[10px] text-slate-400 italic">Não está em nenhum funil</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                // --- EDIT MODE ---
                                <div className="animate-fade-in grid grid-cols-1 lg:grid-cols-2 gap-6 h-full content-start">
                                    {/* Coluna Esquerda: Dados Básicos */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                                            <User size={16} className="text-slate-400" />
                                            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Dados Pessoais</h4>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Telefone (WhatsApp)</label>
                                                <input
                                                    value={editFormData.phone}
                                                    onChange={e => setEditFormData({ ...editFormData, phone: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                />
                                                <p className="text-[9px] text-amber-500 px-1 font-medium">⚠️ Alterar o telefone pode desconectar o histórico de mensagens.</p>
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">E-mail</label>
                                                <input
                                                    value={editFormData.email}
                                                    onChange={e => setEditFormData({ ...editFormData, email: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                                    placeholder="email@exemplo.com"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Observações</label>
                                                <textarea
                                                    value={editFormData.notes}
                                                    onChange={e => setEditFormData({ ...editFormData, notes: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-medium focus:ring-2 focus:ring-blue-500 outline-none resize-none transition-all shadow-inner"
                                                    rows={5}
                                                    placeholder="Anotações internas sobre o contato..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Coluna Direita: CRM e Metadados */}
                                    <div className="space-y-5">
                                        <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                                            <Layers size={16} className="text-slate-400" />
                                            <h4 className="font-bold text-xs text-slate-500 uppercase tracking-wider">Classificação & CRM</h4>
                                        </div>

                                        <div className="space-y-4">
                                            {/* Tags */}
                                            <div className="space-y-2">
                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tags</label>
                                                <div className="flex flex-wrap gap-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 min-h-[46px] items-center">
                                                    {editFormData.tags && editFormData.tags.map((t: string) => (
                                                        <span key={t} className="px-2.5 py-1 bg-white text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 flex items-center gap-1.5 shadow-sm animate-fade-in-up">
                                                            {t}
                                                            <button type="button" onClick={() => removeEditTag(t)} className="hover:text-red-500 text-blue-300 rounded-full hover:bg-red-50 p-0.5 transition-colors"><X size={12} /></button>
                                                        </span>
                                                    ))}
                                                    <input
                                                        className="flex-1 bg-transparent min-w-[80px] outline-none text-xs font-semibold placeholder:font-normal text-slate-700"
                                                        placeholder="+ Tag"
                                                        onKeyDown={handleEditTagKeyDown}
                                                        list="tag-suggestions"
                                                    />
                                                    <datalist id="tag-suggestions">
                                                        {allTagsSystem.map(t => <option key={t} value={t} />)}
                                                    </datalist>
                                                </div>
                                            </div>

                                            {/* Funis e Negócios */}
                                            <div className="space-y-2">
                                                <div className="flex flex-col gap-2 px-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Funis Ativos (Criar Negócio)</label>
                                                    <div className="flex gap-2">
                                                        <select
                                                            className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500"
                                                            onChange={(e) => {
                                                                const pid = e.target.value;
                                                                setSelectedPipelineToAdd(pid);
                                                                const p = pipelines.find(x => String(x.id) === String(pid));
                                                                if (p && p.stages.length > 0) setSelectedStageId(p.stages[0].id);
                                                            }}
                                                            value={selectedPipelineToAdd}
                                                        >
                                                            <option value="">Selecione um Funil...</option>
                                                            {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                                        </select>

                                                        {selectedPipelineToAdd && (
                                                            <select
                                                                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 text-[10px] font-bold outline-none focus:ring-1 focus:ring-blue-500"
                                                                value={selectedStageId}
                                                                onChange={(e) => setSelectedStageId(e.target.value)}
                                                            >
                                                                {pipelines.find(p => String(p.id) === String(selectedPipelineToAdd))?.stages.map(s => (
                                                                    <option key={s.id} value={s.id}>{s.name}</option>
                                                                ))}
                                                            </select>
                                                        )}

                                                        <button
                                                            type="button"
                                                            onClick={addDealToPipeline}
                                                            disabled={!selectedPipelineToAdd}
                                                            className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center font-bold text-[10px]"
                                                            title="Criar Negócio"
                                                        >
                                                            <Plus size={14} className="mr-1" /> Criar
                                                        </button>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1 bg-slate-50/50 rounded-xl p-1">
                                                    {selectedContact && selectedContact.deals && selectedContact.deals.length > 0 ? (
                                                        selectedContact.deals.map(deal => (
                                                            <div key={deal.id} className="p-2 bg-white border border-slate-200 rounded-lg shadow-sm flex items-center gap-3 hover:border-blue-200 transition-colors">
                                                                <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: deal.stage_color }}></div>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-[10px] font-bold text-slate-700 truncate">{deal.pipeline_name}</p>
                                                                    <p className="text-[9px] text-slate-500 truncate">{deal.title}</p>
                                                                </div>
                                                                <select
                                                                    value={deal.stage_id}
                                                                    onChange={(e) => updateDealStage(deal.id, e.target.value)}
                                                                    className="text-[9px] bg-slate-50 border border-slate-200 rounded p-1 max-w-[90px] outline-none font-medium focus:ring-1 focus:ring-blue-500 truncate"
                                                                >
                                                                    {pipelines.find(p => String(p.id) === String(deal.pipeline_id))?.stages.map(s => (
                                                                        <option key={s.id} value={s.id}>{s.name}</option>
                                                                    ))}
                                                                </select>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <p className="text-[10px] text-slate-300 italic text-center py-4 border-2 border-dashed border-slate-100 rounded-xl">Sem negócios ativos</p>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Campos Personalizados */}
                                            <div className="space-y-2">
                                                <div className="flex justify-between items-center px-1">
                                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Campos Extras</label>
                                                    <button
                                                        type="button"
                                                        onClick={() => setCustomFieldsList([...customFieldsList, { key: '', value: '' }])}
                                                        className="text-[10px] font-bold text-blue-600 hover:bg-blue-50 px-2 py-0.5 rounded transition-colors"
                                                    >
                                                        + Campo
                                                    </button>
                                                </div>
                                                <div className="space-y-2 max-h-[150px] overflow-y-auto custom-scrollbar pr-1">
                                                    {customFieldsList.map((field, idx) => (
                                                        <div key={idx} className="flex gap-1.5 items-center animate-fade-in group">
                                                            <input
                                                                placeholder="Nome"
                                                                value={field.key}
                                                                onChange={e => {
                                                                    const list = [...customFieldsList];
                                                                    list[idx].key = e.target.value;
                                                                    setCustomFieldsList(list);
                                                                }}
                                                                className="flex-1 min-w-0 bg-slate-50 border border-slate-200 p-2 rounded-lg text-[10px] font-bold focus:ring-1 focus:ring-blue-500 outline-none uppercase placeholder:normal-case"
                                                            />
                                                            <input
                                                                placeholder="Valor"
                                                                value={field.value}
                                                                onChange={e => {
                                                                    const list = [...customFieldsList];
                                                                    list[idx].value = e.target.value;
                                                                    setCustomFieldsList(list);
                                                                }}
                                                                className="flex-[2] min-w-0 bg-slate-50 border border-slate-200 p-2 rounded-lg text-[10px] font-medium focus:ring-1 focus:ring-blue-500 outline-none"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const list = customFieldsList.filter((_, i) => i !== idx);
                                                                    setCustomFieldsList(list);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                                            >
                                                                <Trash2 size={12} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    {customFieldsList.length === 0 && (
                                                        <p className="text-[10px] text-slate-300 italic text-center py-2">Nenhum campo extra.</p>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer do Modal with Actions */}
                        {isEditing && (
                            <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end gap-2 shrink-0">
                                <button
                                    onClick={() => setIsEditing(false)}
                                    className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-200/50 rounded-xl transition-colors"
                                    disabled={isSavingContact}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveEdit}
                                    disabled={isSavingContact}
                                    className="px-6 py-2 bg-brand-gradient text-white font-bold text-xs rounded-xl shadow-lg shadow-blue-500/20 hover:contrast-125 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    {isSavingContact ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={16} />}
                                    Salvar Alterações
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Modal de Confirmação de Exclusão */}
            {showDeleteConfirm && contactToDelete && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in shadow-2xl">
                    <div className="bg-white rounded-[2rem] max-w-sm w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                        <div className="p-6 text-center space-y-5">
                            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto text-red-500 animate-pulse">
                                <Trash2 size={32} />
                            </div>

                            <div className="space-y-1.5">
                                <h3 className="text-lg font-bold text-slate-900">Excluir Contato?</h3>
                                <p className="text-xs text-slate-500 leading-relaxed px-4">
                                    Tem certeza que deseja excluir o contato <span className="font-bold text-slate-700">"{contactToDelete.name}"</span>?
                                    Isso removerá permanentemente o chat e os negócios vinculados.
                                </p>
                            </div>

                            <div className="flex flex-col gap-2.5 pt-1">
                                <button
                                    onClick={handleDeleteContact}
                                    disabled={isDeleting !== null}
                                    className="w-full bg-red-600 text-white p-3.5 rounded-xl font-bold shadow-xl shadow-red-200 hover:bg-red-700 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2.5 disabled:opacity-50 text-sm"
                                >
                                    {isDeleting !== null ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
                                    className="w-full bg-slate-100 text-slate-600 p-3.5 rounded-xl font-bold hover:bg-slate-200 transition-all active:scale-95 disabled:opacity-50 text-sm"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            {/* Modal de Novo Contato */}
            {showAddModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in shadow-2xl">
                    <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                        <div className="modal-header-gradient">
                            <div className="flex items-center gap-3">
                                <User className="text-white" size={20} />
                                <div>
                                    <h2 className="text-lg font-bold">Novo Contato</h2>
                                    <p className="text-[10px] text-white/80 font-medium">Adicionar manualmente</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAddModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>
                        <form onSubmit={handleAddContact} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome</label>
                                    <input required value={newContact.name} onChange={e => setNewContact({ ...newContact, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" placeholder="Nome Completo" />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Telefone</label>
                                    <input required value={newContact.phone} onChange={e => setNewContact({ ...newContact, phone: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" placeholder="5511999998888" />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Email (Opcional)</label>
                                <input type="email" value={newContact.email} onChange={e => setNewContact({ ...newContact, email: e.target.value })} className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500" placeholder="email@exemplo.com" />
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Tags (Enter para adicionar)</label>
                                <div className="flex flex-wrap gap-2 p-2 bg-slate-50 rounded-xl border border-slate-200 min-h-[42px] content-center">
                                    {newContact.tags && newContact.tags.map(t => (
                                        <span key={t} className="px-2 py-1 bg-white text-blue-600 rounded-lg text-[10px] font-bold border border-blue-100 flex items-center gap-1 shadow-sm">
                                            {t}
                                            <button type="button" onClick={() => removeNewTag(t)} className="hover:text-red-500 rounded-full hover:bg-red-50 p-0.5"><X size={10} /></button>
                                        </span>
                                    ))}
                                    <input
                                        className="flex-1 bg-transparent min-w-[100px] outline-none text-xs font-semibold placeholder:font-normal"
                                        placeholder="Nova tag..."
                                        onKeyDown={handleNewTagKeyDown}
                                        list="tag-suggestions-new"
                                    />
                                    <datalist id="tag-suggestions-new">
                                        {allTagsSystem.map(t => <option key={t} value={t} />)}
                                    </datalist>
                                </div>
                            </div>

                            <div className="space-y-1.5 pt-2 border-t border-slate-100">
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Criar Negócio (Opcional)</label>
                                <div className="grid grid-cols-2 gap-2">
                                    <select
                                        value={newContact.pipeline_id || ''}
                                        onChange={e => {
                                            const pid = e.target.value;
                                            const pipe = pipelines.find(p => String(p.id) === String(pid));
                                            setNewContact({ ...newContact, pipeline_id: pid, stage_id: pipe && pipe.stages.length > 0 ? pipe.stages[0].id : '' });
                                        }}
                                        className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500"
                                    >
                                        <option value="">Selecione Funil...</option>
                                        {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                    </select>
                                    <select
                                        value={newContact.stage_id || ''}
                                        onChange={e => setNewContact({ ...newContact, stage_id: e.target.value })}
                                        disabled={!newContact.pipeline_id}
                                        className="bg-slate-50 border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                                    >
                                        <option value="">Selecione Etapa...</option>
                                        {pipelines.find(p => String(p.id) === String(newContact.pipeline_id))?.stages.map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2 flex justify-end gap-2">
                                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-500 font-bold text-xs hover:bg-slate-100 rounded-xl transition-colors">Cancelar</button>
                                <button type="submit" disabled={isSavingContact} className="btn-primary px-6 py-2">
                                    {isSavingContact ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <CheckCircle2 size={16} />}
                                    Salvar Contato
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal de Importação */}
            {showImportModal && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[60] p-4 animate-fade-in shadow-2xl">
                    <div className="bg-white rounded-[2rem] max-w-2xl w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
                        <div className="modal-header-gradient">
                            <div className="flex items-center gap-3">
                                <Download size={20} className="text-white rotate-180" />
                                <div>
                                    <h2 className="text-lg font-bold">Importação em Massa</h2>
                                    <p className="text-[10px] text-white/80 font-medium">Cole sua lista de contatos para processamento</p>
                                </div>
                            </div>
                            <button onClick={() => setShowImportModal(false)} className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors">
                                <X size={18} />
                            </button>
                        </div>

                        <form onSubmit={handleImportContacts} className="p-6 space-y-5">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1 flex justify-between items-center">
                                        Lista de Contatos
                                        <div className="flex items-center gap-2">
                                            <span className="text-blue-500 lowercase font-normal italic">Formato: Nome, Telefone, Email</span>
                                            <button
                                                type="button"
                                                onClick={() => fileInputRef.current?.click()}
                                                className="bg-blue-50 text-blue-600 px-2.5 py-1 rounded-lg text-[10px] font-bold border border-blue-100 hover:bg-blue-100 transition-all flex items-center gap-1.5"
                                            >
                                                <Download size={12} className="rotate-180" />
                                                Upload CSV
                                            </button>
                                            <input
                                                type="file"
                                                ref={fileInputRef}
                                                onChange={handleFileUpload}
                                                accept=".csv"
                                                className="hidden"
                                            />
                                        </div>
                                    </label>
                                    <textarea
                                        required
                                        rows={6}
                                        value={importText}
                                        onChange={(e) => setImportText(e.target.value)}
                                        className="w-full bg-slate-50 border-0 p-3.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none resize-none shadow-inner"
                                        placeholder="Ex:&#10;João Silva, 551188887777&#10;Maria Oliveira, 551188886666, maria@email.com"
                                    />
                                    <div className="flex flex-col gap-2 mt-2">
                                        <div className="flex gap-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                                            <AlertCircle size={14} className="text-amber-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-amber-700 leading-relaxed font-medium">
                                                <span className="font-bold">Atenção ao Formato:</span> O número deve conter o Código do País (sem "+"), o DDD e apenas 8 dígitos (remova o "9" inicial, ex: 551188887777).
                                            </p>
                                        </div>
                                        <div className="flex gap-2 p-3 bg-blue-50 rounded-xl border border-blue-100">
                                            <Layers size={14} className="text-blue-600 shrink-0 mt-0.5" />
                                            <p className="text-[10px] text-blue-700 leading-relaxed font-medium">
                                                <span className="font-bold">Sincronização Inteligente:</span> Se um contato já existir, não criaremos um duplicado. Apenas adicionaremos a nova Tag ou o novo Funil ao cadastro dele.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Atribuir Tag (Opcional)</label>
                                        <div className="relative">
                                            <TagIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                value={importTag}
                                                onChange={(e) => setImportTag(e.target.value)}
                                                className="w-full bg-slate-50 border-0 pl-10 pr-3 py-3.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                                placeholder="Digite ou clique abaixo..."
                                                list="import-tags-list"
                                            />
                                        </div>
                                        <datalist id="import-tags-list">
                                            {allTagsSystem.map(t => <option key={t} value={t} />)}
                                        </datalist>
                                        {/* Chips de Tags Existentes */}
                                        {allTagsSystem.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {allTagsSystem.slice(0, 10).map(t => (
                                                    <button
                                                        key={t}
                                                        type="button"
                                                        onClick={() => setImportTag(t)}
                                                        className="px-2 py-1 bg-slate-100 hover:bg-blue-50 text-slate-500 hover:text-blue-600 rounded-lg text-[10px] font-bold border border-slate-200 transition-all"
                                                    >
                                                        #{t}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Mover para Funil (Opcional)</label>
                                        <div className="flex gap-2">
                                            <select
                                                value={importPipelineId}
                                                onChange={(e) => {
                                                    const pid = e.target.value;
                                                    setImportPipelineId(pid);
                                                    const pipe = pipelines.find(p => String(p.id) === String(pid));
                                                    if (pipe && pipe.stages.length > 0) setImportStageId(pipe.stages[0].id);
                                                }}
                                                className="flex-1 bg-slate-50 border-0 p-3.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                                            >
                                                <option value="">Selecione o Pipeline</option>
                                                {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {importPipelineId && (
                                    <div className="space-y-2 animate-fade-in">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Etapa do Funil</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {pipelines.find(p => String(p.id) === String(importPipelineId))?.stages.map(s => (
                                                <button
                                                    key={s.id}
                                                    type="button"
                                                    onClick={() => setImportStageId(s.id)}
                                                    className={`p-3 rounded-xl text-[10px] font-bold border-2 transition-all flex flex-col items-center gap-1 ${String(importStageId) === String(s.id) ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-100 text-slate-500'}`}
                                                >
                                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }}></div>
                                                    {s.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            <button
                                type="submit"
                                disabled={isSavingContact || !importText.trim()}
                                className="btn-primary"
                            >
                                {isSavingContact ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <Download size={18} className="rotate-180" />
                                        Iniciar Importação
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Sistema de Notificação (Toast) */}
            {notification && (
                <div className={`fixed bottom-6 right-6 z-[100] flex items-center gap-3 px-5 py-4 rounded-2xl shadow-2xl animate-slide-up border border-white/20 backdrop-blur-md ${notification.type === 'success'
                    ? 'bg-emerald-500/90 text-white'
                    : 'bg-red-500/90 text-white'
                    }`}>
                    {notification.type === 'success' ? (
                        <CheckCircle2 size={20} className="text-emerald-100" />
                    ) : (
                        <AlertCircle size={20} className="text-red-100" />
                    )}
                    <p className="text-sm font-bold tracking-tight">{notification.message}</p>
                    <button
                        onClick={() => setNotification(null)}
                        className="ml-2 p-1 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X size={16} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default ContactsPage;
