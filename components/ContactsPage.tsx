import React, { useState, useEffect } from 'react';
import { Search, Tag as TagIcon, Phone, Mail, User, Filter, X, Plus, Edit2, Trash2, MessageCircle } from 'lucide-react';
import TagManager from './TagManager';
import TagBadge from './TagBadge';

interface Contact {
    id: string;
    name: string;
    phone: string;
    email?: string;
    tags: string[];
    last_interaction?: string;
    unread_count?: number;
}

const ContactsPage = () => {
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);
    const [showTagManager, setShowTagManager] = useState(false);
    const [selectedContact, setSelectedContact] = useState<Contact | null>(null);

    const token = localStorage.getItem('token');

    // Carregar contatos
    useEffect(() => {
        fetchContacts();
    }, []);

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

    const handleOpenChat = (contactId: string) => {
        // Redirecionar para o chat ou abrir o chat com este contato
        window.location.href = `/chat?contactId=${contactId}`;
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredContacts.map(contact => (
                            <div
                                key={contact.id}
                                className="bg-white rounded-2xl border border-slate-200 p-5 hover:shadow-lg transition-all duration-300 hover:scale-[1.02] group"
                            >
                                {/* Avatar e Nome */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-md">
                                            {contact.name.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-slate-900">{contact.name}</h3>
                                            {contact.unread_count && contact.unread_count > 0 && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
                                                    {contact.unread_count} não {contact.unread_count === 1 ? 'lida' : 'lidas'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Informações */}
                                <div className="space-y-2 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-slate-600">
                                        <Phone size={14} />
                                        <span>{contact.phone}</span>
                                    </div>
                                    {contact.email && (
                                        <div className="flex items-center gap-2 text-sm text-slate-600">
                                            <Mail size={14} />
                                            <span>{contact.email}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Tags */}
                                <div className="mb-4">
                                    {contact.tags && contact.tags.length > 0 ? (
                                        <TagBadge tags={contact.tags} maxVisible={3} size="sm" />
                                    ) : (
                                        <span className="text-xs text-slate-400 italic">Sem tags</span>
                                    )}
                                </div>

                                {/* Ações */}
                                <div className="flex gap-2 pt-3 border-t border-slate-100">
                                    <button
                                        onClick={() => handleOpenChat(contact.id)}
                                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-semibold"
                                    >
                                        <MessageCircle size={16} />
                                        Chat
                                    </button>
                                    <button
                                        onClick={() => handleOpenTagManager(contact)}
                                        className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors text-sm font-semibold"
                                    >
                                        <TagIcon size={16} />
                                        Tags
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal de Gerenciamento de Tags */}
            {showTagManager && selectedContact && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl animate-fade-in-up">
                        <div className="flex justify-between items-center p-6 border-b border-slate-200">
                            <h2 className="text-xl font-bold text-slate-900">Gerenciar Tags</h2>
                            <button
                                onClick={() => setShowTagManager(false)}
                                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-600"
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
            )}
        </div>
    );
};

export default ContactsPage;
