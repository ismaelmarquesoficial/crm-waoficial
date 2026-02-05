import React, { useState } from 'react';
import TagManager from './TagManager';
import TagBadge from './TagBadge';

// Componente de exemplo para testar os gerenciadores de tags
const TagsTestPage = () => {
    const [testContact] = useState({
        id: '1',
        name: 'João Silva',
        phone: '5511999999999',
        tags: ['Campanha Black Friday', 'VIP', 'Cliente Premium']
    });

    const [tags, setTags] = useState(testContact.tags);

    const handleTagsChange = (newTags: string[]) => {
        console.log('Tags atualizadas:', newTags);
        setTags(newTags);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
            <div className="max-w-4xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl font-bold text-slate-900 mb-2">
                        Sistema de Tags de Contatos
                    </h1>
                    <p className="text-slate-600">
                        Teste os componentes de gerenciamento de tags
                    </p>
                </div>

                {/* Exemplo 1: TagBadge Pequeno */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-slate-900">
                        1. TagBadge - Tamanho Pequeno (para listas)
                    </h2>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                            <div>
                                <h3 className="font-semibold text-slate-900">{testContact.name}</h3>
                                <p className="text-sm text-slate-600">{testContact.phone}</p>
                                <div className="mt-2">
                                    <TagBadge tags={tags} maxVisible={2} size="sm" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Exemplo 2: TagBadge Médio */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-slate-900">
                        2. TagBadge - Tamanho Médio (para detalhes)
                    </h2>
                    <div className="p-4 bg-slate-50 rounded-lg">
                        <TagBadge tags={tags} maxVisible={10} size="md" />
                    </div>
                </div>

                {/* Exemplo 3: TagManager Completo */}
                <div className="bg-white rounded-2xl p-6 shadow-lg">
                    <h2 className="text-xl font-bold mb-4 text-slate-900">
                        3. TagManager - Gerenciador Completo
                    </h2>
                    <p className="text-sm text-slate-600 mb-4">
                        Adicione ou remova tags clicando no botão "Nova Tag" ou no X de cada tag.
                    </p>
                    <TagManager
                        contactId={testContact.id}
                        contactName={testContact.name}
                        initialTags={tags}
                        onTagsChange={handleTagsChange}
                    />
                </div>

                {/* Informações */}
                <div className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                    <h3 className="font-bold text-blue-900 mb-2">💡 Funcionalidades</h3>
                    <ul className="text-sm text-blue-800 space-y-1">
                        <li>✅ Tags são salvas automaticamente no backend</li>
                        <li>✅ Cores consistentes baseadas no nome da tag</li>
                        <li>✅ Evita duplicatas automaticamente</li>
                        <li>✅ Suporte a múltiplas tags por contato</li>
                        <li>✅ Visualização compacta com contador "+X"</li>
                    </ul>
                </div>

                {/* Estado Atual */}
                <div className="bg-slate-900 text-white rounded-2xl p-6">
                    <h3 className="font-bold mb-2">🔍 Estado Atual (JSON)</h3>
                    <pre className="text-xs overflow-auto">
                        {JSON.stringify({ contactId: testContact.id, tags }, null, 2)}
                    </pre>
                </div>
            </div>
        </div>
    );
};

export default TagsTestPage;
