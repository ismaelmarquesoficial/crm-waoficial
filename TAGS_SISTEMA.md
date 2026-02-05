# Sistema de Tags de Campanhas

## Visão Geral
Sistema que automaticamente adiciona tags aos contatos quando eles recebem mensagens de campanhas. Cada contato pode ter **múltiplas tags**, permitindo rastrear todas as campanhas das quais ele participou.

## Estrutura do Banco de Dados

### Tabela `contacts`
```sql
ALTER TABLE contacts 
ADD COLUMN tags TEXT[] DEFAULT '{}';

CREATE INDEX idx_contacts_tags ON contacts USING GIN(tags);
```

- **Tipo**: `TEXT[]` (array de texto)
- **Permite múltiplas tags**: Sim
- **Exemplo**: `["Campanha Black Friday", "Campanha Natal", "Lançamento Produto X"]`

## Funcionamento Automático

### 1. Quando uma mensagem é enviada
No arquivo `server/workers/campaignDispatcher.js`:

```javascript
// Após salvar o chat log e enviar via Meta API
await addCampaignTagToContact(contactId, msg.campaign_name);
```

### 2. Lógica de Adição de Tag
```javascript
const addCampaignTagToContact = async (contactId, campaignName) => {
    await db.query(`
        UPDATE contacts 
        SET tags = CASE 
            WHEN $2 = ANY(tags) THEN tags  -- Não adiciona se já existe
            ELSE array_append(tags, $2)     -- Adiciona se não existe
        END
        WHERE id = $1
    `, [contactId, campaignName]);
};
```

**Comportamento:**
- ✅ Adiciona a tag apenas se ela ainda não existir
- ✅ Evita duplicatas automaticamente
- ✅ Mantém todas as tags anteriores

## API Endpoints

### 1. Listar tags de um contato
```http
GET /api/chat/contacts/:contactId/tags
```

**Resposta:**
```json
{
  "tags": ["Campanha Black Friday", "Campanha Natal"]
}
```

### 2. Adicionar tag manualmente
```http
POST /api/chat/contacts/:contactId/tags
Content-Type: application/json

{
  "tag": "VIP"
}
```

### 3. Remover tag
```http
DELETE /api/chat/contacts/:contactId/tags/:tag
```

**Exemplo:**
```http
DELETE /api/chat/contacts/123/tags/Campanha%20Black%20Friday
```

### 4. Listar conversas (inclui tags)
```http
GET /api/chat/
```

**Resposta:**
```json
[
  {
    "id": 1,
    "name": "João Silva",
    "phone": "5511999999999",
    "tags": ["Campanha Black Friday", "VIP"],
    "last_message": "Olá!",
    "unread_count": 2
  }
]
```

## Logs de Debug

Quando uma tag é adicionada, o servidor loga:
```
🏷️ [WORKER] Tag "Campanha Black Friday" adicionada ao contato 123
```

## Casos de Uso

### Cenário 1: Contato recebe múltiplas campanhas
```
1. Campanha "Black Friday" → Tag adicionada: ["Black Friday"]
2. Campanha "Natal" → Tag adicionada: ["Black Friday", "Natal"]
3. Campanha "Black Friday" novamente → Tags permanecem: ["Black Friday", "Natal"]
```

### Cenário 2: Contato novo
```
1. Primeira campanha "Lançamento" → Contato criado com tags: ["Lançamento"]
```

### Cenário 3: Tag manual + automática
```
1. Admin adiciona tag "VIP" manualmente → Tags: ["VIP"]
2. Campanha "Especial VIP" → Tags: ["VIP", "Especial VIP"]
```

## Consultas PostgreSQL Úteis

### Buscar contatos com tag específica
```sql
SELECT * FROM contacts 
WHERE 'Campanha Black Friday' = ANY(tags);
```

### Contar contatos por tag
```sql
SELECT unnest(tags) as tag, COUNT(*) 
FROM contacts 
GROUP BY tag 
ORDER BY COUNT(*) DESC;
```

### Buscar contatos com múltiplas tags
```sql
SELECT * FROM contacts 
WHERE tags @> ARRAY['VIP', 'Black Friday']::TEXT[];
```

## Frontend - Como Usar

### Exibir tags na lista de conversas
```typescript
const ContactItem = ({ contact }) => (
  <div>
    <h3>{contact.name}</h3>
    <div className="tags">
      {contact.tags?.map(tag => (
        <span key={tag} className="tag">{tag}</span>
      ))}
    </div>
  </div>
);
```

### Adicionar tag manualmente
```typescript
const addTag = async (contactId: number, tag: string) => {
  await fetch(`http://localhost:3001/api/chat/contacts/${contactId}/tags`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ tag })
  });
};
```

### Remover tag
```typescript
const removeTag = async (contactId: number, tag: string) => {
  await fetch(
    `http://localhost:3001/api/chat/contacts/${contactId}/tags/${encodeURIComponent(tag)}`,
    {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }
  );
};
```

## Benefícios

1. **Rastreamento Automático**: Sabe quais campanhas cada contato recebeu
2. **Segmentação**: Pode criar campanhas direcionadas baseadas em tags
3. **Análise**: Identifica contatos mais engajados (múltiplas tags)
4. **Gestão Manual**: Admins podem adicionar tags customizadas (VIP, Parceiro, etc)
5. **Performance**: Índice GIN permite buscas rápidas em arrays
