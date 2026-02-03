---
description: Implementação do Sistema de Chat Inbox Real-Time (Socket.io + Media + Status)
---

# Fase 1: Backend - Infraestrutura e Mídia
1.  Criar helper `MediaDownloader` para baixar arquivos da Meta API.
    *   Endpoint: `GET /v21.0/{media_id}` -> Recebe URL.
    *   Endpoint: `GET {url}` -> Baixa Blob.
    *   Salvar em: `public/midia_tenants/{tenant_id}/{type}/{filename}`.
2.  Atualizar `WhatsAppService.saveMessage`:
    *   Detectar tipos: image, audio, video, document, voice.
    *   Chamar `MediaDownloader`.
    *   Salvar caminho local no banco (`media_url`).
3.  Criar Migration/Script SQL para garantir índices na tabela `chat_logs`.

# Fase 2: Backend - Webhook Status
1.  Atualizar `server/webhooks/whatsapp/routes.js`:
    *   Detectar `entry[0].changes[0].value.statuses`.
    *   Iterar sobre status.
    *   Atualizar tabela `chat_logs` (`status`).
    *   Emitir evento Socket `message_update`.

# Fase 3: Frontend - Inbox UI
1.  Criar estrutura: `components/Inbox/`.
    *   `Sidebar`: Lista de conversas (ordenada por última mensagem).
    *   `ChatWindow`: Lista de mensagens (scroll infinito, agrupamento por data).
    *   `InputArea`: Envio de texto.
2.  Lógica Socket:
    *   Ouvir `new_message`: Adicionar no topo da lista / fim do chat.
    *   Ouvir `message_status_update`: Atualizar ticks.
3.  Integração API:
    *   `GET /api/crm/chats`: Listar contatos com conversas.
    *   `GET /api/crm/chats/:contactId/messages`: Histórico paginado.
    *   `POST /api/crm/chats/:contactId/send`: Enviar mensagem (Texto/Mídia).

# Fase 4: Opcionais e Polimento
1.  Indicador "Digitando..." via Socket.
2.  Players de Audio bonitos.
