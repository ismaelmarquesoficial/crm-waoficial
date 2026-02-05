import React, { useState } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';

interface TagManagerProps {
    contactId: string;
    contactName: string;
    initialTags: string[];
    onTagsChange?: (tags: string[]) => void;
}

const TagManager: React.FC<TagManagerProps> = ({
    contactId,
    contactName,
    initialTags,
    onTagsChange
}) => {
    const [tags, setTags] = useState<string[]>(initialTags || []);
    const [newTag, setNewTag] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(false);

    const token = localStorage.getItem('token');

    const addTag = async () => {
        if (!newTag.trim()) return;

        setLoading(true);
        try {
            const response = await fetch(`http://localhost:3001/api/chat/contacts/${contactId}/tags`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ tag: newTag.trim() })
            });

            if (response.ok) {
                const updatedTags = [...tags, newTag.trim()];
                setTags(updatedTags);
                setNewTag('');
                setIsAdding(false);
                onTagsChange?.(updatedTags);
            }
        } catch (error) {
            console.error('Erro ao adicionar tag:', error);
            alert('Erro ao adicionar tag');
        } finally {
            setLoading(false);
        }
    };

    const removeTag = async (tag: string) => {
        setLoading(true);
        try {
            const response = await fetch(
                `http://localhost:3001/api/chat/contacts/${contactId}/tags/${encodeURIComponent(tag)}`,
                {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (response.ok) {
                const updatedTags = tags.filter(t => t !== tag);
                setTags(updatedTags);
                onTagsChange?.(updatedTags);
            }
        } catch (error) {
            console.error('Erro ao remover tag:', error);
            alert('Erro ao remover tag');
        } finally {
            setLoading(false);
        }
    };

    const getTagColor = (tag: string) => {
        // Gera cores consistentes baseadas no nome da tag
        const colors = [
            'bg-blue-100 text-blue-700 border-blue-200',
            'bg-green-100 text-green-700 border-green-200',
            'bg-purple-100 text-purple-700 border-purple-200',
            'bg-pink-100 text-pink-700 border-pink-200',
            'bg-yellow-100 text-yellow-700 border-yellow-200',
            'bg-indigo-100 text-indigo-700 border-indigo-200',
            'bg-red-100 text-red-700 border-red-200',
            'bg-teal-100 text-teal-700 border-teal-200',
        ];

        const hash = tag.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return colors[hash % colors.length];
    };

    return (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                    <TagIcon size={20} className="text-white" strokeWidth={2.5} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-900 text-sm">Gerenciar Tags</h3>
                    <p className="text-xs text-slate-500">{contactName}</p>
                </div>
            </div>

            {/* Tags List */}
            <div className="space-y-3 mb-4">
                {tags.length === 0 ? (
                    <div className="text-center py-6 text-slate-400 text-sm">
                        <TagIcon size={32} className="mx-auto mb-2 opacity-30" />
                        <p>Nenhuma tag adicionada</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {tags.map((tag, index) => (
                            <div
                                key={index}
                                className={`group flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all hover:shadow-md ${getTagColor(tag)}`}
                            >
                                <span>{tag}</span>
                                <button
                                    onClick={() => removeTag(tag)}
                                    disabled={loading}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity hover:scale-110 active:scale-95 disabled:opacity-50"
                                    title="Remover tag"
                                >
                                    <X size={14} strokeWidth={3} />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Add Tag Section */}
            {isAdding ? (
                <div className="flex gap-2 animate-fade-in-up">
                    <input
                        type="text"
                        value={newTag}
                        onChange={(e) => setNewTag(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') addTag();
                            if (e.key === 'Escape') {
                                setIsAdding(false);
                                setNewTag('');
                            }
                        }}
                        placeholder="Nome da tag..."
                        className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        autoFocus
                        disabled={loading}
                    />
                    <button
                        onClick={addTag}
                        disabled={loading || !newTag.trim()}
                        className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-semibold text-sm shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                    >
                        {loading ? 'Salvando...' : 'Adicionar'}
                    </button>
                    <button
                        onClick={() => {
                            setIsAdding(false);
                            setNewTag('');
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-slate-100 text-slate-600 rounded-lg font-semibold text-sm hover:bg-slate-200 transition-all disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                </div>
            ) : (
                <button
                    onClick={() => setIsAdding(true)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50 transition-all font-semibold text-sm group"
                >
                    <Plus size={18} className="group-hover:scale-110 transition-transform" strokeWidth={2.5} />
                    Nova Tag
                </button>
            )}
        </div>
    );
};

export default TagManager;
