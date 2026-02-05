# Guia de Uso - Gerenciamento de Tags de Contatos

## Componentes Criados

### 1. **TagManager** - Gerenciador Completo
Componente principal para adicionar e remover tags de um contato.

```tsx
import TagManager from './components/TagManager';

// Uso básico
<TagManager
  contactId="123"
  contactName="João Silva"
  initialTags={["Campanha Black Friday", "VIP"]}
  onTagsChange={(newTags) => {
    console.log('Tags atualizadas:', newTags);
  }}
/>
```

**Props:**
- `contactId`: ID do contato (obrigatório)
- `contactName`: Nome do contato para exibição
- `initialTags`: Array de tags iniciais
- `onTagsChange`: Callback quando tags são modificadas

### 2. **TagBadge** - Visualização Compacta
Componente para exibir tags de forma compacta em listas.

```tsx
import TagBadge from './components/TagBadge';

// Uso em lista de contatos
<TagBadge 
  tags={contact.tags} 
  maxVisible={2}  // Mostra no máximo 2 tags
  size="sm"       // Tamanho pequeno
/>

// Uso em detalhes
<TagBadge 
  tags={contact.tags} 
  maxVisible={5}
  size="md"       // Tamanho médio
/>
```

**Props:**
- `tags`: Array de tags
- `maxVisible`: Máximo de tags visíveis (padrão: 2)
- `size`: 'sm' | 'md' (padrão: 'sm')

## Integração com ChatInterface

### Exemplo 1: Adicionar TagBadge na Lista de Conversas

```tsx
// No arquivo ChatInterface.tsx
import TagBadge from './TagBadge';

// Dentro do map de contatos
{contacts.map(contact => (
  <div key={contact.id} className="...">
    <div className="flex-1">
      <h4>{contact.name}</h4>
      <p>{contact.lastMessage}</p>
      
      {/* ADICIONAR AQUI */}
      <TagBadge tags={contact.tags} maxVisible={2} size="sm" />
    </div>
  </div>
))}
```

### Exemplo 2: Adicionar TagManager em Modal/Drawer

```tsx
// Criar um modal de detalhes do contato
import TagManager from './TagManager';

const ContactDetailsModal = ({ contact, onClose }) => {
  const handleTagsChange = (newTags) => {
    // Atualizar o estado local do contato
    setContacts(prev => prev.map(c => 
      c.id === contact.id ? { ...c, tags: newTags } : c
    ));
  };

  return (
    <div className="modal">
      <div className="p-6">
        <h2>{contact.name}</h2>
        <p>{contact.phone}</p>
        
        {/* Gerenciador de Tags */}
        <TagManager
          contactId={contact.id}
          contactName={contact.name}
          initialTags={contact.tags}
          onTagsChange={handleTagsChange}
        />
      </div>
    </div>
  );
};
```

### Exemplo 3: Adicionar no Header do Chat

```tsx
// No cabeçalho do chat ativo
const activeContact = contacts.find(c => c.id === activeContactId);

<div className="chat-header">
  <div className="contact-info">
    <h3>{activeContact?.name}</h3>
    <p>{activeContact?.phone}</p>
    
    {/* Tags do contato ativo */}
    <TagBadge tags={activeContact?.tags || []} maxVisible={3} size="md" />
  </div>
  
  <button onClick={() => setShowTagManager(true)}>
    Gerenciar Tags
  </button>
</div>

{/* Modal do Tag Manager */}
{showTagManager && activeContact && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
    <div className="bg-white rounded-2xl p-6 max-w-md w-full mx-4">
      <button onClick={() => setShowTagManager(false)}>Fechar</button>
      <TagManager
        contactId={activeContact.id}
        contactName={activeContact.name}
        initialTags={activeContact.tags}
        onTagsChange={(newTags) => {
          setContacts(prev => prev.map(c => 
            c.id === activeContact.id ? { ...c, tags: newTags } : c
          ));
        }}
      />
    </div>
  </div>
)}
```

## Exemplo Completo - Integração no ChatInterface

```tsx
import React, { useState } from 'react';
import TagManager from './TagManager';
import TagBadge from './TagBadge';
import { Tag as TagIcon } from 'lucide-react';

const ChatInterface = () => {
  const [showTagManager, setShowTagManager] = useState(false);
  const [contacts, setContacts] = useState([]);
  const [activeContactId, setActiveContactId] = useState(null);

  const activeContact = contacts.find(c => c.id === activeContactId);

  const handleTagsChange = (newTags) => {
    // Atualiza o contato no estado
    setContacts(prev => prev.map(c => 
      c.id === activeContactId ? { ...c, tags: newTags } : c
    ));
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar de Contatos */}
      <div className="w-80 border-r">
        {contacts.map(contact => (
          <div 
            key={contact.id}
            onClick={() => setActiveContactId(contact.id)}
            className="p-4 border-b hover:bg-slate-50 cursor-pointer"
          >
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-semibold">{contact.name}</h4>
              {contact.unreadCount > 0 && (
                <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">
                  {contact.unreadCount}
                </span>
              )}
            </div>
            <p className="text-sm text-slate-600 truncate mb-2">
              {contact.lastMessage}
            </p>
            
            {/* Tags do Contato */}
            <TagBadge tags={contact.tags} maxVisible={2} size="sm" />
          </div>
        ))}
      </div>

      {/* Área de Chat */}
      <div className="flex-1 flex flex-col">
        {activeContact && (
          <>
            {/* Header do Chat */}
            <div className="p-4 border-b bg-white">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-lg">{activeContact.name}</h3>
                  <p className="text-sm text-slate-600">{activeContact.phone}</p>
                  
                  {/* Tags Inline */}
                  <div className="mt-2">
                    <TagBadge tags={activeContact.tags} maxVisible={4} size="md" />
                  </div>
                </div>

                {/* Botão Gerenciar Tags */}
                <button
                  onClick={() => setShowTagManager(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors font-semibold text-sm"
                >
                  <TagIcon size={16} />
                  Tags
                </button>
              </div>
            </div>

            {/* Mensagens */}
            <div className="flex-1 overflow-y-auto">
              {/* Renderizar mensagens */}
            </div>

            {/* Input */}
            <div className="p-4">
              {/* Input de mensagem */}
            </div>
          </>
        )}
      </div>

      {/* Modal de Gerenciamento de Tags */}
      {showTagManager && activeContact && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-bold">Gerenciar Tags</h2>
              <button
                onClick={() => setShowTagManager(false)}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              <TagManager
                contactId={activeContact.id}
                contactName={activeContact.name}
                initialTags={activeContact.tags}
                onTagsChange={handleTagsChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatInterface;
```

## Filtrar Contatos por Tag

Você também pode criar um filtro de tags:

```tsx
const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

// Buscar todas as tags únicas
const allTags = [...new Set(contacts.flatMap(c => c.tags || []))];

// Filtrar contatos
const filteredContacts = selectedTagFilter
  ? contacts.filter(c => c.tags?.includes(selectedTagFilter))
  : contacts;

// UI do Filtro
<div className="p-4 border-b">
  <h4 className="font-semibold mb-2 text-sm">Filtrar por Tag</h4>
  <div className="flex flex-wrap gap-2">
    <button
      onClick={() => setSelectedTagFilter(null)}
      className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
        !selectedTagFilter 
          ? 'bg-blue-600 text-white' 
          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
      }`}
    >
      Todos
    </button>
    {allTags.map(tag => (
      <button
        key={tag}
        onClick={() => setSelectedTagFilter(tag)}
        className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
          selectedTagFilter === tag
            ? 'bg-purple-600 text-white'
            : 'bg-purple-100 text-purple-700 hover:bg-purple-200'
        }`}
      >
        {tag}
      </button>
    ))}
  </div>
</div>
```

## Cores das Tags

As cores são geradas automaticamente com base no nome da tag para consistência:
- Mesma tag sempre tem a mesma cor
- 8 combinações de cores diferentes
- Cores suaves e legíveis

## Próximos Passos

1. Integrar `TagBadge` na lista de contatos do ChatInterface
2. Adicionar botão de gerenciar tags no header do chat
3. Implementar filtro de tags na sidebar
4. Adicionar animações de entrada/saída das tags
5. Tornar as tags clicáveis para filtrar rapidamente

## Logs e Debug

O sistema já está preparado com logs no servidor:
```
🏷️ [WORKER] Tag "Campanha Black Friday" adicionada ao contato 123
```

No console do navegador:
- Sucesso ao adicionar tag
- Erro ao adicionar tag
- Sucesso ao remover tag
- Erro ao remover tag
