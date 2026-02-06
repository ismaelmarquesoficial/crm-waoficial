import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import {
  Search,
  MoreVertical,
  Paperclip,
  Mic,
  Send,
  Check,
  CheckCheck,
  Play,
  Pause,
  Filter,
  FileText,
  Image as ImageIcon,
  Video as VideoIcon,
  Smartphone,
  ChevronDown,
  Layers,
  Wifi,
  WifiOff,
  Smile,
  ArrowLeft,
  X,
  Tag as TagIcon,
  User,
  Mail,
  Phone,
  TrendingUp,
  Edit3,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  MoveRight,
  Instagram,
  MessageSquare,
  Globe,
  LayoutTemplate
} from 'lucide-react';
import TagBadge from './TagBadge';
import TagManager from './TagManager';
import { Contact, Message, MessageType } from '../types';

// Inject custom animations
const style = document.createElement('style');
style.innerHTML = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  @keyframes fadeInUp {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .animate-message {
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.2s ease-out forwards;
  }
  @keyframes highlight-pulse {
    0% { background-color: rgba(59, 130, 246, 0.1); border-color: rgba(59, 130, 246, 0.4); }
    50% { background-color: rgba(59, 130, 246, 0.2); border-color: rgba(59, 130, 246, 0.6); box-shadow: 0 0 15px rgba(59, 130, 246, 0.2); }
    100% { background-color: transparent; border-color: transparent; }
  }
  .animate-highlight {
    animation: highlight-pulse 1.5s ease-in-out infinite;
  }
  .scrollbar-hide::-webkit-scrollbar {
      display: none;
  }
  .glass-header {
      background: rgba(255, 255, 255, 0.90);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
  }
`;
document.head.appendChild(style);

const AudioPlayer = ({ isUser }: { isUser: boolean }) => {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-2xl w-64 backdrop-blur-sm transition-all duration-300 ${isUser ? 'bg-white/20 hover:bg-white/30' : 'bg-slate-100/80 hover:bg-slate-200/80'}`}>
      <button
        onClick={() => setPlaying(!playing)}
        className={`w-9 h-9 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-105 active:scale-95 ${isUser ? 'bg-white text-blue-600' : 'bg-white text-slate-600'}`}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
      </button>
      <div className="flex-1 space-y-1.5">
        <div className={`h-1.5 rounded-full w-full relative overflow-hidden ${isUser ? 'bg-white/30' : 'bg-slate-300'}`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1/3 rounded-full ${isUser ? 'bg-white' : 'bg-slate-500'} ${playing ? 'animate-progress-indeterminate' : ''}`}></div>
        </div>
        <div className={`flex justify-between text-[10px] font-medium ${isUser ? 'text-white/90' : 'text-slate-500'}`}>
          <span>0:12</span>
          <span>1:04</span>
        </div>
      </div>
    </div>
  );
};

interface ChatInterfaceProps {
  initialContactId?: string | null;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ initialContactId }) => {
  // 1. States
  const [activeContactId, setActiveContactId] = useState<string | null>(initialContactId || null);
  const [inputText, setInputText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  // Emoji Picker State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Contact Info Modal
  const [showContactInfo, setShowContactInfo] = useState(false);
  const [contactDetails, setContactDetails] = useState<any>(null);
  const [showTagManagerModal, setShowTagManagerModal] = useState(false);
  const [showPipelineModal, setShowPipelineModal] = useState(false);
  const [showCreatePipelineModal, setShowCreatePipelineModal] = useState(false);
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipeline, setSelectedPipeline] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');

  // Create Pipeline States
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineStages, setNewPipelineStages] = useState<{ name: string, color: string }[]>([
    { name: 'Novo Lead', color: '#3b82f6' },
    { name: 'Contato Inicial', color: '#8b5cf6' },
    { name: 'Proposta Enviada', color: '#f59e0b' },
    { name: 'Negociação', color: '#10b981' },
    { name: 'Fechado', color: '#22c55e' }
  ]);
  const [isCreatingPipeline, setIsCreatingPipeline] = useState(false);

  // Notification Toast
  const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Deal Management
  const [selectedDeal, setSelectedDeal] = useState<any>(null);
  const [showMoveDealModal, setShowMoveDealModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [dealToDelete, setDealToDelete] = useState<string | null>(null);
  const [flashingContacts, setFlashingContacts] = useState<Set<string>>(new Set());
  const [isPipelineDropdownOpen, setIsPipelineDropdownOpen] = useState(false);
  const [isLoadingDropdown, setIsLoadingDropdown] = useState(false);
  const [expandedPipelineId, setExpandedPipelineId] = useState<string | null>(null);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [isCreatingPipelineMode, setIsCreatingPipelineMode] = useState(false);






  // Channels and Filtering
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);

  // Template System & Variables
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [templates, setTemplates] = useState<any[]>([]);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<any | null>(null);
  const [pendingTemplateObj, setPendingTemplateObj] = useState<any | null>(null);

  // Variable Filling System
  const [companyVariables, setCompanyVariables] = useState<any[]>([]);
  const [showVariableFillModal, setShowVariableFillModal] = useState(false);
  const [pendingTemplateText, setPendingTemplateText] = useState('');
  const [pendingVariables, setPendingVariables] = useState<string[]>([]);
  const [variableValues, setVariableValues] = useState<Record<string, string>>({});

  // Quick Add Contact
  const [showAddContactModal, setShowAddContactModal] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactChannel, setNewContactChannel] = useState('');
  const [isAddingContact, setIsAddingContact] = useState(false);
  const [currentChatChannel, setCurrentChatChannel] = useState<string | null>(null);

  // Delete Conversation State
  const [showDeleteConvConfirm, setShowDeleteConvConfirm] = useState(false);
  const [convToDelete, setConvToDelete] = useState<string | null>(null);
  const [isDeletingConv, setIsDeletingConv] = useState(false);

  useEffect(() => {
    // Fetch Company Variables on Mount
    const token = localStorage.getItem('token');
    fetch('/api/settings/company', { headers: { 'Authorization': `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        if (data.custom_variables) setCompanyVariables(data.custom_variables);
      })
      .catch(e => console.error('Error fetching defaults', e));
  }, []);

  const fetchTemplates = useCallback(async () => {
    setIsLoadingTemplates(true);
    try {
      const token = localStorage.getItem('token');
      // Prioritize active chat channel, then selected filter. If 'all', don't filter.
      let channelId = currentChatChannel;
      if (!channelId && selectedChannel && selectedChannel !== 'all') {
        channelId = selectedChannel;
      }

      const query = channelId ? `?accountId=${channelId}` : '';

      const res = await fetch(`/api/channels/templates/all${query}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      } else {
        // Fallback Mock se falhar
        setTemplates([
          { id: 1, name: 'boas_vindas', components: [{ type: 'BODY', text: 'Olá {{1}}! Como posso ajudar você hoje?' }] },
          { id: 2, name: 'ausencia', components: [{ type: 'BODY', text: 'No momento não estamos disponíveis. Retornaremos em breve.' }] }
        ]);
      }
    } catch (error) {
      console.error('Erro ao buscar templates', error);
    } finally {
      setIsLoadingTemplates(false);
    }
  }, [currentChatChannel, selectedChannel]);

  useEffect(() => {
    if (showTemplateModal) {
      fetchTemplates();
    }
  }, [showTemplateModal, fetchTemplates]);

  const handleUseTemplate = (template: any) => {
    // Extrair texto do BODY
    const bodyComponent = template.components?.find((c: any) => c.type === 'BODY');
    let text = bodyComponent?.text || '';

    // Find ALL variables {{1}}, {{2}}...
    const remainingVars = text.match(/\{\{\d+\}\}/g);
    const uniqueVars = remainingVars ? Array.from(new Set(remainingVars)) : [];

    // Identify Contact Name for {{1}}
    let contactName = '';
    if (activeContactId) {
      const activeContact = contacts.find(c => String(c.id) === String(activeContactId));
      if (activeContact) contactName = activeContact.name || activeContact.phone;
    }

    if (uniqueVars.length > 0) {
      // Pre-fill {{1}}
      const initialValues: Record<string, string> = {};
      if (uniqueVars.includes('{{1}}') && contactName) {
        initialValues['{{1}}'] = contactName;
      }

      // Open Variable Fill Modal
      setPendingTemplateText(text);
      setPendingVariables(uniqueVars);
      setPendingTemplateObj(template); // Store for later
      setVariableValues(initialValues); // Set pre-filled values
      setShowVariableFillModal(true);
    } else {
      // No vars, use directly
      setInputText(text || `Template: ${template.name}`);

      // Set Active Template (No params)
      const langCode = typeof template.language === 'string' ? template.language : (template.language?.code || 'pt_BR');
      setActiveTemplate({
        name: template.name,
        language: { code: langCode },
        components: []
      });
      setShowTemplateModal(false);
    }
  };

  const finalizeTemplate = () => {
    let finalText = pendingTemplateText;
    const params: any[] = [];

    // Sort variables numerically {{1}}, {{2}} to ensure correct param order for Meta
    const sortedVars = [...pendingVariables].sort((a, b) => {
      const numA = parseInt(a.replace(/\D/g, '')) || 0;
      const numB = parseInt(b.replace(/\D/g, '')) || 0;
      return numA - numB;
    });

    sortedVars.forEach(v => {
      const val = variableValues[v] || '';
      // Replace ALL occurrences in text (Visual Preview)
      // Note: We use split/join on the ORIGINAL text (pendingTemplateText) ? 
      // No, we need to iterate globally or chained.
      // Better: Iterate sortedVars for params, but for text replacement order doesn't matter much 
      // UNLESS vars are nested (unlikely).

      // Add to params
      params.push({
        type: 'text',
        text: val
      });
    });

    // Generate Visual Text
    sortedVars.forEach(v => {
      const val = variableValues[v] || '';
      finalText = finalText.split(v).join(val);
    });

    setInputText(finalText);

    if (pendingTemplateObj) {
      const langCode = typeof pendingTemplateObj.language === 'string' ? pendingTemplateObj.language : (pendingTemplateObj.language?.code || 'pt_BR');
      setActiveTemplate({
        name: pendingTemplateObj.name,
        language: { code: langCode },
        components: [
          {
            type: 'body',
            parameters: params
          }
        ]
      });
    }

    setPendingTemplateObj(null);
    setShowVariableFillModal(false);
  };

  const handleQuickAddContact = async () => {
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    setIsAddingContact(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/chat/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          name: newContactName,
          phone: newContactPhone,
          custom_fields: newContactChannel ? { preferred_channel: newContactChannel } : null
        })
      });

      if (res.ok) {
        const newContact = await res.json();
        // Atualizar lista
        const formattedContact = {
          id: newContact.id,
          name: newContact.name,
          phone: newContact.phone,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newContact.name)}&background=random`,
          lastMessage: 'Nova conversa',
          lastMessageTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          unreadCount: 0,
          tags: []
        };
        setContacts(prev => [formattedContact, ...prev]);

        // Abrir conversa
        setActiveContactId(newContact.id);

        // Limpar e fechar
        setShowAddContactModal(false);
        setNewContactName('');
        setNewContactPhone('');
        setNewContactChannel('');
        setNotification({ type: 'success', message: 'Contato adicionado!' });
      } else {
        setNotification({ type: 'error', message: 'Erro ao criar contato' });
      }
    } catch (e) {
      console.error(e);
      setNotification({ type: 'error', message: 'Erro de conexão' });
    } finally {
      setIsAddingContact(false);
    }
  };

  // 2. Refs
  const activeContactIdRef = useRef(activeContactId);
  useEffect(() => { activeContactIdRef.current = activeContactId; }, [activeContactId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const contactModalRef = useRef<HTMLDivElement>(null);
  const tagModalRef = useRef<HTMLDivElement>(null);
  const pipelineModalRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsChannelDropdownOpen(false);
      }
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
      // Só fecha o modal de contato se não estiver clicando nos sub-modais
      if (contactModalRef.current && !contactModalRef.current.contains(event.target as Node)) {
        const clickedOnTagModal = tagModalRef.current && tagModalRef.current.contains(event.target as Node);
        const clickedOnPipelineModal = pipelineModalRef.current && pipelineModalRef.current.contains(event.target as Node);

        if (!clickedOnTagModal && !clickedOnPipelineModal) {
          setShowContactInfo(false);
        }
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Helper Functions
  const fetchChannels = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setChannels(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchChats = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const url = new URL(window.location.origin + '/api/chat');
      if (selectedChannel !== 'all') {
        url.searchParams.append('channelId', selectedChannel);
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      const mappedContacts: Contact[] = data.map((c: any) => ({
        id: c.id,
        name: c.name || c.phone,
        phone: c.phone,
        avatar: c.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name || c.phone)}&background=random`,
        pipelineStage: '',
        lastMessage: c.last_message || 'Nova conversa',
        lastMessageTime: c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '',
        unreadCount: parseInt(c.unread_count || '0'),
        tags: c.tags || [],
        email: c.email || ''
      }));

      setContacts(mappedContacts);
    } catch (err) {
      console.error('Erro ao buscar chats:', err);
    }
  }, [selectedChannel]);

  const fetchMessages = useCallback(async (contactId: string, offset = 0) => {

    if (offset === 0) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }

    const token = localStorage.getItem('token');
    try {
      const url = new URL(window.location.origin + `/api/chat/${contactId}/messages`);
      if (selectedChannel && selectedChannel !== 'all') {
        url.searchParams.append('channelId', selectedChannel);
      }
      if (offset > 0) {
        url.searchParams.append('offset', offset.toString());
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      // Handle both old format (array) and new format ({messages, hasMore})
      const messagesArray = Array.isArray(data) ? data : (data.messages || []);
      const hasMoreMessages = Array.isArray(data) ? false : (data.hasMore || false);

      const mappedMessages: Message[] = messagesArray.map((m: any) => {
        // Parse timestamp correctly - PostgreSQL returns UTC timestamps
        const date = new Date(m.timestamp);
        const localTime = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });



        return {
          id: m.id,
          contactId: m.contact_id,
          sender: m.direction === 'INBOUND' ? 'contact' : 'user',
          type: (m.type === 'template' ? 'text' : (m.type || 'text')) as MessageType,
          content: (['image', 'audio', 'video', 'document'].includes(m.type) && m.media_url) ? m.media_url : m.message,
          timestamp: localTime,
          status: m.status || 'read',
          fileName: m.file_name,
          channelId: m.whatsapp_account_id // Added mapping
        };
      });

      if (offset === 0) {
        setMessages(mappedMessages);

        // --- STICKY CHANNEL INIT ---
        // Se houver mensagens, pega o channelId da mensagem MAIS RECENTE (última do array reverso)
        // Se não houver messages, reseta para null ou usa o preferred do contato? 
        // Por enquanto, inicializa vazio e o usuário seleciona ou usa automático.
        if (mappedMessages.length > 0) {
          const lastMsg = mappedMessages[mappedMessages.length - 1];
          if (lastMsg.channelId) setCurrentChatChannel(lastMsg.channelId);
        } else {
          setCurrentChatChannel(null);
        }

        // Mark as read in backend and update local UI
        fetch(`/api/chat/${contactId}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).then(() => {
          setContacts(prev => prev.map(c =>
            c.id === contactId ? { ...c, unreadCount: 0 } : c
          ));
        }).catch(err => console.error('Error marking as read:', err));

      } else {
        // Prepend older messages
        setMessages(prev => [...mappedMessages, ...prev]);
      }

      setHasMore(hasMoreMessages);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [selectedChannel]);

  const loadMoreMessages = useCallback(() => {
    if (!activeContactId || isLoadingMore || !hasMore) return;
    fetchMessages(activeContactId, messages.length);
  }, [activeContactId, isLoadingMore, hasMore, messages.length, fetchMessages]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeContactId) return;
    const content = inputText;
    setInputText('');

    const token = localStorage.getItem('token');
    try {
      const payload: any = {
        channelId: currentChatChannel // Send manual selection
      };

      if (activeTemplate) {
        payload.type = 'template';
        payload.template = {
          name: activeTemplate.name,
          language: activeTemplate.language,
          components: activeTemplate.components
        };
        // Content is ignored by backend logic usually, or we send inputText as fallback?
        // Let's not send 'content' key if it's template to be safe, OR send it for logging.
        payload.content = inputText;
      } else {
        payload.type = 'text';
        payload.content = content;
      }

      await fetch(`http://localhost:3001/api/chat/${activeContactId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload)
      });

      setActiveTemplate(null); // Clear after send
      fetchMessages(activeContactId);
      fetchChats();
    } catch (err) { console.error(err); }
  };

  const handleDeleteConversation = async () => {
    if (!convToDelete) return;

    setIsDeletingConv(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/chat/contacts/${convToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.ok) {
        setContacts(prev => prev.filter(c => c.id !== convToDelete));
        if (activeContactId === convToDelete) {
          setActiveContactId(null);
          // setActiveContact(null); // activeContact is derived, so just ID is enough
        }
        setNotification({ type: 'success', message: 'Conversa excluída.' });
      } else {
        setNotification({ type: 'error', message: 'Erro ao excluir.' });
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: 'error', message: 'Erro ao excluir.' });
    } finally {
      setIsDeletingConv(false);
      setShowDeleteConvConfirm(false);
      setConvToDelete(null);
    }
  };



  const onEmojiClick = (emojiData: EmojiClickData) => {
    setInputText((prev) => prev + emojiData.emoji);
  };

  const fetchContactDetails = async (contactId: string) => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/chat/contacts/${contactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setContactDetails(data);
        setShowContactInfo(true);
      }
    } catch (err) {
      console.error('Erro ao buscar detalhes do contato:', err);
    }
  };

  const fetchPipelinesData = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/crm/pipelines', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPipelines(data);
      }
    } catch (err) {
      console.error('Erro ao buscar pipelines:', err);
    }
  };

  const handleTagsUpdate = (newTags: string[]) => {
    if (contactDetails) {
      setContactDetails({ ...contactDetails, tags: newTags });
      // Atualizar também na lista de contatos
      setContacts(prev => prev.map(c =>
        c.id === contactDetails.id ? { ...c, tags: newTags } : c
      ));
    }
  };

  const handleMoveToPipeline = async () => {
    if (!selectedPipeline || !selectedStage || !contactDetails) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/api/crm/deals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: contactDetails.name,
          phone: contactDetails.phone,
          value: 0,
          pipeline_id: selectedPipeline,
          stage_id: selectedStage
        })
      });

      if (res.ok) {
        // Recarregar detalhes do contato
        await fetchContactDetails(contactDetails.id);
        setShowPipelineModal(false);
        setSelectedPipeline('');
        setSelectedStage('');
        setNotification({ type: 'success', message: 'Contato adicionado ao pipeline com sucesso!' });
        setTimeout(() => setNotification(null), 4000);
      } else {
        const error = await res.json();
        setNotification({ type: 'error', message: error.error || 'Erro ao adicionar ao pipeline' });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.error('Erro ao mover para pipeline:', err);
      setNotification({ type: 'error', message: 'Erro ao adicionar ao pipeline' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleAddStage = () => {
    setNewPipelineStages([...newPipelineStages, { name: '', color: '#6366f1' }]);
  };

  const handleRemoveStage = (index: number) => {
    if (newPipelineStages.length > 1) {
      setNewPipelineStages(newPipelineStages.filter((_, i) => i !== index));
    }
  };

  const handleUpdateStage = (index: number, field: 'name' | 'color', value: string) => {
    const updated = [...newPipelineStages];
    updated[index][field] = value;
    setNewPipelineStages(updated);
  };

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim() || newPipelineStages.some(s => !s.name.trim())) {
      alert('Preencha o nome do pipeline e de todas as etapas');
      return;
    }

    setIsCreatingPipeline(true);
    const token = localStorage.getItem('token');

    try {
      const res = await fetch('/api/crm/pipelines', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newPipelineName,
          stages: newPipelineStages.map((stage, index) => ({
            name: stage.name,
            color: stage.color,
            order_index: index
          }))
        })
      });

      if (res.ok) {
        // Recarregar pipelines
        await fetchPipelinesData();
        // Fechar modal de criar e resetar
        setShowCreatePipelineModal(false);
        setNewPipelineName('');
        setNewPipelineStages([
          { name: 'Novo Lead', color: '#3b82f6' },
          { name: 'Contato Inicial', color: '#8b5cf6' },
          { name: 'Proposta Enviada', color: '#f59e0b' },
          { name: 'Negociação', color: '#10b981' },
          { name: 'Fechado', color: '#22c55e' }
        ]);
      }
    } catch (err) {
      console.error('Erro ao criar pipeline:', err);
    } finally {
      setIsCreatingPipeline(false);
    }
  };


  const handleRemoveDeal = async () => {
    if (!dealToDelete) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/crm/deals/${dealToDelete}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (res.ok) {
        await fetchContactDetails(contactDetails.id);
        setNotification({ type: 'success', message: 'Removido do pipeline com sucesso!' });
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({ type: 'error', message: 'Erro ao remover do pipeline' });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.error('Erro ao remover deal:', err);
      setNotification({ type: 'error', message: 'Erro ao remover do pipeline' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const handleMoveDeal = async () => {
    if (!selectedDeal || !selectedStage) return;

    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/api/crm/deals/${selectedDeal.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          stage_id: selectedStage,
          pipeline_id: selectedPipeline || selectedDeal.pipeline_id
        })
      });

      if (res.ok) {
        await fetchContactDetails(contactDetails.id);
        setShowMoveDealModal(false);
        setSelectedDeal(null);
        setSelectedPipeline('');
        setSelectedStage('');
        setNotification({ type: 'success', message: 'Movido com sucesso!' });
        setTimeout(() => setNotification(null), 4000);
      } else {
        setNotification({ type: 'error', message: 'Erro ao mover' });
        setTimeout(() => setNotification(null), 4000);
      }
    } catch (err) {
      console.error('Erro ao mover deal:', err);
      setNotification({ type: 'error', message: 'Erro ao mover' });
      setTimeout(() => setNotification(null), 4000);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  // 4. Effects
  useEffect(() => {
    if (initialContactId) {
      setActiveContactId(initialContactId);
    }
  }, [initialContactId]);

  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  // Helper para ícone de canal
  const getChannelIcon = (channel: string) => {
    const channelLower = channel?.toLowerCase() || '';

    if (channelLower.includes('waba') || channelLower.includes('business')) {
      return {
        icon: MessageSquare,
        color: 'text-green-700',
        bg: 'bg-green-100',
        label: 'WhatsApp Business',
        badgeColor: 'bg-green-600'
      };
    } else if (channelLower.includes('whatsapp') || channelLower.includes('oficial')) {
      return {
        icon: MessageSquare,
        color: 'text-emerald-700',
        bg: 'bg-emerald-100',
        label: 'WhatsApp',
        badgeColor: 'bg-emerald-600'
      };
    } else if (channelLower.includes('instagram')) {
      return {
        icon: Instagram,
        color: 'text-pink-700',
        bg: 'bg-pink-100',
        label: 'Instagram',
        badgeColor: 'bg-pink-600'
      };
    } else if (channelLower.includes('site') || channelLower.includes('web')) {
      return {
        icon: Globe,
        color: 'text-blue-700',
        bg: 'bg-blue-100',
        label: 'Site',
        badgeColor: 'bg-blue-600'
      };
    } else {
      // Default: Considerar como WhatsApp se não houver info, pois é o canal principal
      return {
        icon: MessageSquare,
        color: 'text-emerald-700',
        bg: 'bg-emerald-100',
        label: 'WhatsApp',
        badgeColor: 'bg-emerald-600'
      };
    }
  };

  // Infinite scroll: load more messages when scrolling to top
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (container.scrollTop < 100 && !isLoadingMore && hasMore) {
        const scrollHeight = container.scrollHeight;
        const scrollTop = container.scrollTop;

        loadMoreMessages();

        // Maintain scroll position after loading
        setTimeout(() => {
          if (messagesContainerRef.current) {
            const newScrollHeight = messagesContainerRef.current.scrollHeight;
            messagesContainerRef.current.scrollTop = scrollTop + (newScrollHeight - scrollHeight);
          }
        }, 100);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, [isLoadingMore, hasMore, loadMoreMessages]);

  useEffect(() => {
    const socket = io('http://localhost:3001');
    socket.on('connect', () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const u = JSON.parse(userStr);
          socket.emit('join_tenant', u.tenantId || u.tenant_id);
        } catch (e) { }
      }
    });

    socket.on('new_message', (data: any) => {
      // Extract contactId - handle both formats
      const messageContactId = data.contactId || data.message?.contact_id || data.contact_id;

      fetchChats();
      if (activeContactIdRef.current && messageContactId && activeContactIdRef.current == messageContactId) {
        fetchMessages(activeContactIdRef.current);
      }

      // Trigger Flash Animation
      if (messageContactId) {
        setFlashingContacts(prev => new Set(prev).add(String(messageContactId)));
        setTimeout(() => {
          setFlashingContacts(prev => {
            const next = new Set(prev);
            next.delete(String(messageContactId));
            return next;
          });
        }, 3000); // 3 seconds flash
      }
    });

    socket.on('message_status_update', (data: any) => {
      setMessages(prev => prev.map(m => m.id === data.id ? { ...m, status: data.status } : m));
    });

    return () => { socket.disconnect(); }
  }, [fetchChats, fetchMessages]);

  useEffect(() => {
    if (activeContactId) {
      fetchMessages(activeContactId);
    }
  }, [activeContactId, fetchMessages]);

  // Helper logic to get the derived active contact object
  // If it's not in the 'contacts' list (e.g. came from CRM deep link but not in recent chats), we might need to handle it.
  const activeContact = contacts.find(c => String(c.id) === String(activeContactId));

  useEffect(() => {
    // Optimization: If activeContactId is set but not in 'contacts', fetch it specifically
    if (activeContactId && !activeContact) {
      const token = localStorage.getItem('token');
      fetch(`http://localhost:3001/api/contacts/${activeContactId}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(r => r.json())
        .then(data => {
          if (data && data.id) {
            const newContact: Contact = {
              id: data.id,
              name: data.name || data.phone,
              phone: data.phone,
              avatar: data.profile_pic_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(data.name || data.phone)}&background=random`,
              pipelineStage: '',
              lastMessage: '',
              lastMessageTime: '',
              unreadCount: 0,
              tags: []
            };
            // Add to contacts list temporarily so UI renders
            setContacts(prev => [newContact, ...prev]);
          }
        })
        .catch(err => console.error('Error fetching deep linked contact', err));
    }
  }, [activeContactId, activeContact]);


  // Helper to get dropdown label
  const getSelectedChannelLabel = () => {
    if (selectedChannel === 'all') return 'Todas as Contas';
    const ch = channels.find(c => c.id === parseInt(selectedChannel));
    return ch ? (ch.instance_name || ch.verified_name || ch.phone_number_id) : 'Selecionar';
  };

  // 5. Render
  return (
    <div className="flex h-full bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl ring-1 ring-slate-900/5">

      {/* Sidebar List - Responsivo: Some no mobile se tiver chat ativo */}
      <div className={`w-full md:w-80 border-r border-slate-100 flex-col bg-gradient-to-br from-white to-slate-50 ${activeContactId ? 'hidden md:flex' : 'flex'}`}>

        {/* Custom Channel Selector */}
        <div className="px-5 pt-5 pb-3 bg-transparent z-20">
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
              className="w-full bg-white text-left border border-slate-200 hover:border-blue-400 transition-all duration-300 transform hover:-translate-y-0.5 text-slate-700 text-sm rounded-2xl px-3 py-3 flex items-center justify-between group shadow-sm hover:shadow-md"
            >
              <div className="flex items-center gap-3 overflow-hidden">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-inner ${selectedChannel === 'all' ? 'bg-gradient-to-br from-blue-500 to-teal-400 text-white' : 'bg-green-50 text-green-600'}`}>
                  {selectedChannel === 'all' ? <Layers size={18} /> : <Smartphone size={18} />}
                </div>
                <div className="flex flex-col items-start truncate min-w-0">
                  <span className="font-bold text-[10px] text-slate-400 uppercase tracking-widest mb-0.5">Canal Ativo</span>
                  <span className="font-semibold text-xs text-slate-800 truncate block w-full">{getSelectedChannelLabel()}</span>
                </div>
              </div>
              <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                <ChevronDown size={14} className={`text-slate-400 group-hover:text-blue-500 transition-transform duration-300 ${isChannelDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isChannelDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden animate-fade-in-down origin-top z-50">
                <div className="max-h-72 overflow-y-auto py-2 px-2 scrollbar-hide">
                  <button
                    onClick={() => { setSelectedChannel('all'); setIsChannelDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 ${selectedChannel === 'all' ? 'bg-blue-50 shadow-sm ring-1 ring-blue-100' : 'hover:bg-slate-50'}`}
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedChannel === 'all' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                      <Layers size={16} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${selectedChannel === 'all' ? 'text-blue-700' : 'text-slate-700'}`}>Todas as Contas</p>
                      <p className="text-[10px] text-slate-400 font-medium">Visão unificada</p>
                    </div>
                    {selectedChannel === 'all' && <Check size={16} className="ml-auto text-blue-600" />}
                  </button>

                  <div className="h-px bg-slate-100 my-2 mx-2"></div>

                  {channels.map((ch: any) => {
                    const isConnected = ch.status === 'CONNECTED';
                    const isSelected = selectedChannel === String(ch.id);
                    return (
                      <button
                        key={ch.id}
                        onClick={() => { setSelectedChannel(String(ch.id)); setIsChannelDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-3 rounded-xl flex items-center gap-3 transition-all duration-200 mb-1 ${isSelected ? 'bg-green-50/80 shadow-sm ring-1 ring-green-100' : 'hover:bg-slate-50'}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-center">
                            <p className={`text-xs font-bold truncate ${isSelected ? 'text-green-700' : 'text-slate-700'}`}>
                              {ch.instance_name || ch.verified_name || 'Nova Conexão'}
                            </p>
                            {isConnected && <span className="flex h-2 w-2 relative">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate font-mono mt-0.5">{ch.display_phone_number || ch.phone_number_id}</p>
                        </div>
                        {isSelected && <Check size={16} className="ml-auto text-green-600" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="px-5 pb-3">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
            <input
              type="text"
              placeholder="Buscar mensagem ou contato..."
              className="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 hover:border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 transition-all shadow-sm placeholder:text-slate-400"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-1 scrollbar-hide">
          <div className="flex justify-between items-center px-2 mb-2 mt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Inbox ({contacts.length})</span>
            <div className="flex gap-1.5">
              <button
                onClick={() => setShowAddContactModal(true)}
                className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors text-blue-600 bg-blue-50 hover:bg-blue-100"
                title="Novo Contato"
              >
                <Plus size={12} /> Novo
              </button>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'}`}
              >
                <Filter size={12} /> Filtros
              </button>
            </div>
          </div>

          {showFilters && (
            <div className="bg-slate-50 p-3 rounded-xl mb-3 border border-slate-100 animate-slide-up">
              <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Status da Conversa</label>
              <select className="w-full bg-white border border-slate-200 text-slate-700 text-xs rounded-lg p-2 focus:outline-none focus:ring-1 focus:ring-blue-500">
                <option value="all">Mostrar tudo</option>
                <option value="unread">Não lidos</option>
              </select>
            </div>
          )}

          {contacts.map(contact => {
            const isActive = activeContactId === contact.id;
            const isUnread = contact.unreadCount > 0;
            const channelInfo = getChannelIcon(contact.channel);

            return (
              <div
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={`p-3 flex gap-3 cursor-pointer transition-all duration-200 rounded-xl relative group 
                   border border-slate-200 mb-1.5 
                   ${isActive
                    ? 'bg-white shadow-md ring-1 ring-slate-300 transform scale-[1.02] z-10 border-transparent'
                    : isUnread
                      ? 'bg-blue-50/60 border-blue-200 shadow-sm border-l-4 border-l-blue-500'
                      : 'bg-white hover:shadow-sm hover:border-blue-200'
                  }`}
              >
                {/* Delete Button (Hover) */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConvToDelete(contact.id);
                    setShowDeleteConvConfirm(true);
                  }}
                  className="absolute right-1 top-1 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg opacity-0 group-hover:opacity-100 transition-all z-20"
                  title="Excluir Conversa"
                >
                  <Trash2 size={14} />
                </button>

                {/* Active Indicator Vertical Bar */}
                {isActive && <div className="absolute left-0 top-3 bottom-3 w-1 bg-gradient-to-b from-blue-500 to-teal-400 rounded-r-full"></div>}

                <div className="relative shrink-0">
                  <img src={contact.avatar} alt={contact.name} className={`w-12 h-12 rounded-full object-cover shadow-sm transition-all ${isActive ? 'ring-2 ring-offset-2 ring-blue-500' : ''}`} />
                  {contact.unreadCount > 0 &&
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-gradient-to-r from-teal-400 to-blue-500 border-2 border-white text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-lg animate-bounce">
                      {contact.unreadCount}
                    </span>
                  }

                </div>
                <div className="flex-1 min-w-0 py-0.5 flex flex-col justify-center">
                  <div className="flex justify-between items-start mb-0.5">
                    <h3 className={`text-sm truncate mr-2 ${isActive ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>{contact.name}</h3>

                    <div className="flex flex-col items-end">
                      <span className={`text-[10px] font-medium shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`}>
                        {contact.lastMessageTime}
                      </span>
                      {contact.unreadCount > 0 && (
                        <div className={`mt-1.5 w-2.5 h-2.5 rounded-full ${channelInfo.badgeColor} animate-pulse shadow-sm ring-1 ring-white/50`}></div>
                      )}
                    </div>
                  </div>

                  {/* Channel Badge - Visual e Destacado */}
                  {(() => {
                    const ChannelIcon = channelInfo.icon;
                    return (
                      <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md mb-1 w-fit ${channelInfo.bg}`}>
                        <ChannelIcon size={11} strokeWidth={2.5} className={channelInfo.color} />
                        <span className={`text-[9px] font-bold uppercase tracking-wide ${channelInfo.color}`}>
                          {channelInfo.label}
                        </span>
                      </div>
                    );
                  })()}

                  <p className={`text-xs truncate flex items-center gap-1 ${isActive ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    {contact.lastMessage}
                  </p>

                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Chat Area - Responsivo: Some no mobile se NÃO tiver ativa, em desktop sempre exibe */}
      <div className={`flex-1 flex-col bg-slate-50 relative ${activeContactId ? 'flex' : 'hidden md:flex'}`}>
        {/* Background Pattern (Subtle Dots) */}
        <div className="absolute inset-0 opacity-[0.4] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(#cbd5e1 1px, transparent 1px)`,
            backgroundSize: '24px 24px'
          }}>
        </div>

        {/* Chat Header */}
        {activeContact ? (
          <>
            <div className="glass-header h-20 border-b border-slate-200/60 flex justify-between items-center px-4 md:px-6 shadow-sm z-30 sticky top-0">
              <div className="flex items-center gap-2 md:gap-4">
                {/* Botão VOLTAR (Só mobile) */}
                <button
                  onClick={() => setActiveContactId(null)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-full"
                >
                  <ArrowLeft size={20} />
                </button>

                <div className="relative cursor-pointer group">
                  <img src={activeContact.avatar} alt="" className="w-10 h-10 md:w-11 md:h-11 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-105" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <h2
                    onClick={() => fetchContactDetails(activeContact.id)}
                    className="text-sm md:text-base font-bold text-slate-800 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors"
                  >
                    {activeContact.name}
                    <ChevronDown size={14} className="text-slate-400 hidden md:block" />
                  </h2>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] md:text-xs text-slate-500 font-mono tracking-tight bg-slate-100/50 px-1.5 rounded">{activeContact.phone}</span>
                    {activeContact.email && (
                      <span className="text-[10px] md:text-xs text-blue-500 font-medium bg-blue-50 px-1.5 rounded truncate max-w-[150px]">{activeContact.email}</span>
                    )}

                    {/* Canal Dropdown Manual */}
                    <div className="relative group/channel">
                      <div className="flex items-center gap-1 bg-slate-100/80 hover:bg-slate-200 px-2 py-0.5 rounded cursor-pointer transition-colors">
                        <Layers size={10} className="text-slate-500" />
                        <select
                          value={currentChatChannel || ''}
                          onChange={(e) => setCurrentChatChannel(e.target.value || null)}
                          className="bg-transparent text-[10px] font-bold uppercase tracking-wider text-slate-600 outline-none cursor-pointer appearance-none pr-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <option value="">Auto</option>
                          {channels.map((ch: any) => (
                            <option key={ch.id} value={ch.id}>
                              {ch.instance_name || ch.phone_number_id.slice(-4)}
                            </option>
                          ))}
                        </select>
                        <ChevronDown size={10} className="text-slate-400 absolute right-1 pointer-events-none" />
                      </div>
                    </div>

                    <span className="hidden md:inline text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Lead</span>
                    <div className="relative flex items-center">
                      <TagBadge tags={activeContact.tags} maxVisible={2} size="sm" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsTagDropdownOpen(!isTagDropdownOpen);
                        }}
                        className={`ml-1 p-1 rounded-lg transition-colors ${isTagDropdownOpen ? 'bg-blue-100 text-blue-600' : 'hover:bg-slate-100 text-slate-400 hover:text-blue-500'}`}
                        title="Gerenciar Tags"
                      >
                        <Plus size={14} strokeWidth={3} className={`transition-transform ${isTagDropdownOpen ? 'rotate-45' : ''}`} />
                      </button>

                      {isTagDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setIsTagDropdownOpen(false)}></div>
                          <div className="absolute top-full left-0 mt-2 w-72 z-50 animate-fade-in-up origin-top-left shadow-2xl rounded-2xl">
                            <TagManager
                              contactId={activeContact.id}
                              contactName={activeContact.name}
                              initialTags={activeContact.tags}
                              allAvailableTags={[]}
                              onTagsChange={(newTags) => {
                                setContacts(prev => prev.map(c =>
                                  c.id === activeContact.id ? { ...c, tags: newTags } : c
                                ));
                              }}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-3 text-slate-400">
                <button
                  onClick={async () => {
                    const token = localStorage.getItem('token');
                    try {
                      // Fetch rápido para pegar deals atuais e decidir qual modal abrir
                      const res = await fetch(`/api/chat/${activeContact.id}/details`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      const data = await res.json();
                      setContactDetails(data);

                      await fetchPipelinesData();

                      if (data.deals && data.deals.length > 0) {
                        // Tem deal! Vamos mover o primeiro
                        const deal = data.deals[0];
                        setSelectedDeal(deal);
                        setSelectedPipeline(deal.pipeline_id);
                        setSelectedStage(deal.stage_id);
                        setShowMoveDealModal(true);
                      } else {
                        // Não tem deal, criar novo
                        setShowPipelineModal(true);
                      }
                    } catch (e) {
                      console.error('Erro ao abrir funil:', e);
                      setContactDetails(activeContact as any);
                      setShowPipelineModal(true);
                    }
                  }}
                  className="hidden"
                >
                  <Layers size={14} />
                  Funil
                </button>

                <div className="relative mr-2">
                  <button
                    onClick={() => {
                      if (isPipelineDropdownOpen) {
                        setIsPipelineDropdownOpen(false);
                        return;
                      }

                      setIsPipelineDropdownOpen(true);
                      setIsLoadingDropdown(true);

                      const token = localStorage.getItem('token');
                      (async () => {
                        try {
                          await fetchPipelinesData();
                          const res = await fetch(`/api/chat/contacts/${activeContact.id}`, {
                            headers: { Authorization: `Bearer ${token}` }
                          });
                          if (!res.ok) throw new Error('Falha ao buscar detalhes');
                          const data = await res.json();
                          setContactDetails(data);
                        } catch (e) {
                          console.error(e);
                        } finally {
                          setIsLoadingDropdown(false);
                        }
                      })();
                    }}
                    className={`hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm border ${isPipelineDropdownOpen ? 'bg-blue-100 border-blue-300 text-blue-800' : 'bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-600 border-blue-100 hover:border-blue-200'}`}
                  >
                    <Layers size={14} />
                    Funil
                    <ChevronDown size={12} className={`ml-1 transition-transform ${isPipelineDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {/* Dropdown de Funil Rápido */}
                  {isPipelineDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsPipelineDropdownOpen(false)}></div>
                      <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-slate-100 p-2 z-50 animate-fade-in-up origin-top-right">
                        {isLoadingDropdown ? (
                          <div className="p-8 flex flex-col items-center justify-center gap-2 text-slate-400">
                            <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-[10px] font-bold uppercase tracking-wider">Carregando...</span>
                          </div>
                        ) : contactDetails?.deals && contactDetails.deals.length > 0 ? (
                          <div className="flex flex-col h-full overflow-y-auto max-h-[400px]">
                            {/* Lista de Deals Existentes */}
                            {contactDetails.deals.map((deal: any, index: number) => {
                              const currentPipeline = pipelines.find(p => p.id === deal.pipeline_id);
                              return (
                                <div key={deal.id} className={`mb-3 pb-3 ${index < contactDetails.deals.length - 1 ? 'border-b border-slate-100' : ''}`}>
                                  <div className="px-3 py-2 border-b border-slate-50 mb-2 bg-slate-50/50 rounded-t-lg">
                                    <div className="flex items-center justify-between mb-1">
                                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Negócio #{index + 1}</p>
                                      <button
                                        onClick={async (e) => {
                                          e.stopPropagation();
                                          if (!confirm('Tem certeza que deseja remover este negócio?')) return;

                                          const token = localStorage.getItem('token');
                                          try {
                                            await fetch(`/api/crm/deals/${deal.id}`, {
                                              method: 'DELETE',
                                              headers: { Authorization: `Bearer ${token}` }
                                            });
                                            setNotification({ type: 'success', message: 'Negócio removido!' });

                                            setContactDetails((prev: any) => ({
                                              ...prev,
                                              deals: prev.deals.filter((d: any) => d.id !== deal.id)
                                            }));
                                            setTimeout(() => setNotification(null), 3000);
                                          } catch (err) { console.error(err); }
                                        }}
                                        className="text-slate-400 hover:text-red-500 transition-colors p-0.5 rounded hover:bg-red-50"
                                        title="Remover negócio"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <p className="text-xs font-extrabold text-slate-800 truncate" title={deal.pipeline_name}>{deal.pipeline_name}</p>
                                      <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-100">
                                        {Number(deal.value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                      </span>
                                    </div>
                                  </div>

                                  <p className="text-[10px] font-bold text-slate-400 uppercase px-3 mb-1.5 tracking-wider">Mover para etapa:</p>
                                  <div className="space-y-1 max-h-40 overflow-y-auto px-1 scrollbar-hide">
                                    {currentPipeline?.stages.map((stage: any) => {
                                      const isCurrent = stage.id === deal.stage_id;
                                      return (
                                        <button
                                          key={stage.id}
                                          onClick={async () => {
                                            const token = localStorage.getItem('token');
                                            try {
                                              await fetch(`/api/crm/deals/${deal.id}`, {
                                                method: 'PUT',
                                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                body: JSON.stringify({ stage_id: stage.id, pipeline_id: deal.pipeline_id })
                                              });
                                              setNotification({ type: 'success', message: `Movido para ${stage.name}!` });
                                              setIsPipelineDropdownOpen(false);
                                              setTimeout(() => setNotification(null), 3000);
                                              // Refresh
                                              setContactDetails(null);
                                            } catch (e) {
                                              console.error(e);
                                            }
                                          }}
                                          className={`w-full text-left p-2.5 rounded-lg text-xs font-semibold flex items-center gap-3 transition-all ${isCurrent ? 'bg-blue-50/80 text-blue-700 ring-1 ring-blue-200' : 'text-slate-600 hover:bg-slate-50'}`}
                                        >
                                          <div className={`w-2.5 h-2.5 rounded-full shrink-0 shadow-sm ${isCurrent ? 'animate-pulse' : ''}`} style={{ backgroundColor: stage.color }}></div>
                                          <span className="truncate flex-1">{stage.name}</span>
                                          {isCurrent && <CheckCircle2 size={14} className="text-blue-600 shrink-0" />}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )
                            })}

                            <div className="border-t border-slate-50 mt-2 pt-2 pb-1 px-1">
                              <button
                                onClick={(e) => { e.stopPropagation(); setContactDetails({ ...contactDetails, deals: [] }); }}
                                className="w-full text-left p-2 rounded-lg text-xs font-bold text-slate-500 hover:text-blue-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition-colors"
                              >
                                <Plus size={12} />
                                Novo Negócio / Outro Funil
                              </button>
                            </div>
                          </div>
                        ) : isCreatingPipelineMode ? (
                          <div className="p-3">
                            <h3 className="text-xs font-bold text-slate-700 mb-3">Novo Funil Rápido</h3>
                            <input
                              autoFocus
                              id="new-pipeline-input"
                              className="w-full text-xs p-2 border border-slate-200 rounded-lg mb-3 focus:ring-2 focus:ring-blue-500 outline-none"
                              placeholder="Nome do funil (ex: Pós-Venda)"
                              onKeyDown={async (e) => {
                                if (e.key === 'Enter') {
                                  const val = e.currentTarget.value;
                                  if (!val.trim()) return;

                                  const token = localStorage.getItem('token');
                                  try {
                                    await fetch('/api/crm/pipelines', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ name: val })
                                    });
                                    await fetchPipelinesData();
                                    setIsCreatingPipelineMode(false);
                                    setNotification({ type: 'success', message: 'Funil criado!' });
                                    setTimeout(() => setNotification(null), 3000);
                                  } catch (err) { console.error(err); }
                                }
                              }}
                            />
                            <div className="flex gap-2">
                              <button
                                onClick={() => setIsCreatingPipelineMode(false)}
                                className="flex-1 py-1.5 text-xs font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg"
                              >
                                Cancelar
                              </button>
                              <button
                                onClick={async () => {
                                  const input = document.getElementById('new-pipeline-input') as HTMLInputElement;
                                  if (!input || !input.value.trim()) return;

                                  const token = localStorage.getItem('token');
                                  try {
                                    await fetch('/api/crm/pipelines', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                      body: JSON.stringify({ name: input.value })
                                    });
                                    await fetchPipelinesData();
                                    setIsCreatingPipelineMode(false);
                                    setNotification({ type: 'success', message: 'Funil criado!' });
                                    setTimeout(() => setNotification(null), 3000);
                                  } catch (err) { console.error(err); }
                                }}
                                className="flex-1 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                              >
                                Criar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="px-3 py-2 border-b border-slate-50 mb-2">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Novo Negócio</p>
                              <p className="text-xs text-slate-500">Selecione um funil para iniciar</p>
                            </div>
                            <div className="space-y-1 px-1">
                              {pipelines.map(p => (
                                <div key={p.id} className="border border-slate-100 rounded-lg overflow-hidden mb-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedPipelineId(expandedPipelineId === p.id ? null : p.id);
                                    }}
                                    className={`w-full text-left p-3 text-xs font-bold flex items-center gap-3 transition-colors ${expandedPipelineId === p.id ? 'bg-slate-50 text-blue-700' : 'text-slate-700 hover:bg-slate-50 hover:text-blue-600'}`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${expandedPipelineId === p.id ? 'bg-blue-100 text-blue-600' : 'bg-green-50 text-green-600 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                      <Layers size={16} />
                                    </div>
                                    <div className="flex flex-col flex-1">
                                      <span className="truncate">{p.name}</span>
                                      <span className="text-[10px] font-normal text-slate-400">{p.stages.length} etapas</span>
                                    </div>
                                    <ChevronDown size={12} className={`ml-auto text-slate-300 transition-transform ${expandedPipelineId === p.id ? 'rotate-180' : '-rotate-90'}`} />
                                  </button>

                                  {expandedPipelineId === p.id && (
                                    <div className="bg-slate-50/50 p-1 space-y-0.5 border-t border-slate-100">
                                      <p className="text-[9px] font-bold text-slate-400 uppercase px-2 py-1">Selecione etapa inicial:</p>
                                      {p.stages.map((stage: any) => (
                                        <button
                                          key={stage.id}
                                          onClick={async () => {
                                            const token = localStorage.getItem('token');
                                            try {
                                              await fetch('/api/crm/deals', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                                body: JSON.stringify({
                                                  contact_id: activeContact.id,
                                                  name: activeContact.name,
                                                  phone: activeContact.phone,
                                                  pipeline_id: p.id,
                                                  stage_id: stage.id,
                                                  value: 0
                                                })
                                              });
                                              setNotification({ type: 'success', message: 'Negócio criado!' });
                                              setIsPipelineDropdownOpen(false);
                                              setTimeout(() => setNotification(null), 3000);
                                              setContactDetails(null);
                                            } catch (e) {
                                              console.error(e);
                                            }
                                          }}
                                          className="w-full text-left p-2 rounded flex items-center gap-2 hover:bg-white hover:shadow-sm transition-all group"
                                        >
                                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></div>
                                          <span className="text-xs text-slate-600 group-hover:text-blue-700">{stage.name}</span>
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}

                              <button
                                onClick={() => setIsCreatingPipelineMode(true)}
                                className="w-full text-center p-2.5 text-xs text-blue-500 font-bold hover:bg-blue-50 rounded-lg mt-2 border border-dashed border-blue-200 transition-colors flex items-center justify-center gap-2"
                              >
                                <Plus size={14} />
                                Criar Novo Funil
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <button className="p-2.5 hover:bg-slate-100/80 hover:text-blue-600 rounded-xl transition-all hidden md:block"><Search size={20} /></button>
                <div className="h-6 w-px bg-slate-200 mx-1 hidden md:block"></div>
                <button className="p-2.5 hover:bg-slate-100/80 hover:text-blue-600 rounded-xl transition-all"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Messages */}
            <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 z-10">
              {/* Loading more indicator */}
              {isLoadingMore && (
                <div className="flex justify-center py-2">
                  <div className="bg-white/80 backdrop-blur px-3 py-1 rounded-full shadow-sm border border-slate-100 text-xs font-medium text-slate-500 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-bounce"></div>
                    Carregando mais...
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-center py-4">
                  <div className="bg-white/80 backdrop-blur px-4 py-1.5 rounded-full shadow-sm border border-slate-100 text-xs font-semibold text-blue-500 animate-pulse flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
                    Sincronizando...
                  </div>
                </div>
              )}

              {messages.map((msg, idx) => {
                const isUser = msg.sender === 'user';
                const showAvatar = idx === 0 || messages[idx - 1].sender !== msg.sender;

                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-message group`}>

                    {!isUser && showAvatar && (
                      <div className="w-8 h-8 rounded-full bg-slate-200 mr-2 self-end mb-1 overflow-hidden shrink-0 shadow-sm ring-2 ring-white hidden md:block">
                        <img src={activeContact.avatar} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {!isUser && !showAvatar && <div className="w-8 mr-2 shrink-0 hidden md:block"></div>}

                    <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2.5 md:px-5 md:py-3 shadow-sm text-sm relative transition-all duration-300 hover:shadow-md ${isUser
                      ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-tr-sm'
                      : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100'
                      }`}>
                      {msg.type === MessageType.TEXT && <p className="leading-relaxed whitespace-pre-wrap">{msg.content}</p>}

                      {msg.type === MessageType.AUDIO && <AudioPlayer isUser={msg.sender === 'user'} />}

                      {msg.type === MessageType.IMAGE && (
                        <div className="mb-2 rounded-xl overflow-hidden shadow-sm cursor-pointer hover:opacity-95 transition-opacity">
                          <img src={msg.content} alt="Attachment" className="max-w-full h-auto object-cover" />
                        </div>
                      )}

                      {msg.fileName && (
                        <div className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer hover:bg-opacity-10 transition-colors ${msg.sender === 'user' ? 'bg-white/10 border-white/20' : 'bg-slate-50 border-slate-100'}`}>
                          <div className={`p-2.5 rounded-lg ${msg.sender === 'user' ? 'bg-white/20 text-white' : 'bg-white text-blue-600 shadow-sm'}`}>
                            <FileText size={20} />
                          </div>
                          <div className="overflow-hidden">
                            <p className="font-semibold truncate max-w-[150px]">{msg.fileName}</p>
                            <p className={`text-[10px] ${isUser ? 'text-white/70' : 'text-slate-400'}`}>Documento PDF</p>
                          </div>
                        </div>
                      )}

                      <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 select-none ${isUser ? 'text-white/70' : 'text-slate-400'}`}>
                        {msg.timestamp}
                        {msg.sender === 'user' && (
                          <span className="ml-0.5">
                            {msg.status === 'read' ? <CheckCheck size={13} className="text-white" /> :
                              msg.status === 'delivered' ? <CheckCheck size={13} className="text-white/60" /> :
                                <Check size={13} className="text-white/60" />}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Elegant Floating Input Area */}
            <div className="p-2 md:p-4 z-20 relative">
              {/* Emoji Picker Popover */}
              {showEmojiPicker && (
                <div ref={emojiPickerRef} className="absolute bottom-20 left-4 md:left-10 z-50 shadow-2xl rounded-2xl animate-fade-in-up">
                  <EmojiPicker
                    onEmojiClick={onEmojiClick}
                    theme={Theme.LIGHT}
                    width={300}
                    height={400}
                    previewConfig={{ showPreview: false }}
                  />
                </div>
              )}

              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-end p-1.5 md:p-2 transition-shadow hover:shadow-2xl">
                <button className="p-2 md:p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Paperclip size={20} /></button>
                <button
                  onClick={() => setShowTemplateModal(true)}
                  title="Usar Modelo"
                  className="p-2 md:p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors hidden md:block"
                >
                  <LayoutTemplate size={20} />
                </button>
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className={`hidden md:block p-3 rounded-full transition-colors ${showEmojiPicker ? 'text-blue-600 bg-blue-50' : 'text-slate-400 hover:text-blue-600 hover:bg-blue-50'}`}
                >
                  <Smile size={20} />
                </button>

                <div className="flex-1 py-2 md:py-3 px-2">
                  {activeTemplate && (
                    <div className="flex items-center gap-2 mb-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-lg px-3 py-2 w-full md:w-fit animate-fade-in-up shadow-sm">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <LayoutTemplate size={14} className="text-blue-600" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[10px] font-bold text-blue-400 uppercase tracking-wider leading-none mb-0.5">Template Ativo</span>
                        <span className="text-xs font-bold text-blue-700 truncate block">{activeTemplate.name}</span>
                      </div>
                      <button
                        onClick={() => { setActiveTemplate(null); setInputText(''); }}
                        className="ml-auto md:ml-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Cancelar Template"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <textarea
                    value={inputText}
                    readOnly={!!activeTemplate}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder={activeTemplate ? "Template selecionado (pronto para enviar)" : "Digite..."}
                    className={`w-full bg-transparent border-none outline-none text-sm resize-none max-h-32 scrollbar-hide ${activeTemplate ? 'text-slate-500 italic cursor-not-allowed' : 'text-slate-800'}`}
                    rows={1}
                    style={{ minHeight: '24px' }}
                  />
                </div>

                {inputText.trim() ? (
                  <button
                    onClick={handleSendMessage}
                    className="p-3 bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-full hover:shadow-lg hover:opacity-90 transition-all transform hover:scale-105 active:scale-95 m-1"
                  >
                    <Send size={18} fill="currentColor" className="ml-0.5" />
                  </button>
                ) : (
                  <button className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors">
                    <Mic size={20} />
                  </button>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 p-4">
            <div className="w-20 h-20 md:w-24 md:h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 animate-pulse">
              <Smartphone size={32} className="md:w-10 md:h-10 text-blue-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Selecione uma conversa</h3>
            <p className="max-w-xs text-center text-xs md:text-sm text-slate-500">Escolha um contato na lista para começar a atender.</p>
          </div>
        )}
      </div>

      {/* Modal de Informações do Contato */}
      {showContactInfo && contactDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div ref={contactModalRef} className="bg-white rounded-[2.5rem] max-w-2xl w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
            {/* Header com degradê */}
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
              <div className="flex items-center gap-4 relative z-10">
                <div className="w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/30 font-bold text-2xl text-white shadow-lg">
                  {contactDetails.name?.charAt(0).toUpperCase() || '?'}
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-white">{contactDetails.name}</h2>
                  <div className="flex items-center gap-2 text-white/80 text-xs font-medium mt-1">
                    <div className="flex items-center gap-1">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                      Ativo no Sistema
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowContactInfo(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/20 rounded-xl text-white transition-all z-10"
              >
                <X size={22} />
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Informações de Contato</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-slate-50">
                        <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-teal-500 rounded-lg shadow-sm flex items-center justify-center text-white">
                          <Phone size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">WhatsApp</p>
                          <p className="text-xs font-bold text-slate-700">{contactDetails.phone}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 p-2.5 bg-white rounded-xl border border-slate-100 shadow-sm transition-all hover:bg-slate-50">
                        <div className="w-9 h-9 bg-gradient-to-r from-blue-600 to-teal-500 rounded-lg shadow-sm flex items-center justify-center text-white">
                          <Mail size={16} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">E-mail</p>
                          <p className="text-xs font-bold text-slate-700 truncate">{contactDetails.email || 'Não informado'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tags do Cliente</label>
                      <button
                        onClick={() => {
                          setShowTagManagerModal(true);
                          fetchPipelinesData();
                        }}
                        className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 transition-colors"
                      >
                        <Edit3 size={12} />
                        Gerenciar
                      </button>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 max-h-[120px] overflow-y-auto">
                      {contactDetails.tags && contactDetails.tags.length > 0 ? (
                        <TagBadge tags={contactDetails.tags} maxVisible={5} size="md" />
                      ) : (
                        <p className="text-[10px] text-slate-400 italic">Nenhuma tag atribuída</p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Presença em Pipelines</label>
                      <button
                        onClick={() => {
                          setShowPipelineModal(true);
                          fetchPipelinesData();
                        }}
                        className="text-[10px] font-bold text-green-600 hover:text-green-700 flex items-center gap-1 transition-colors"
                      >
                        <Plus size={12} />
                        Adicionar
                      </button>
                    </div>
                    <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                      {contactDetails.deals && contactDetails.deals.length > 0 ? (
                        contactDetails.deals.map((deal: any) => (
                          <div key={deal.id} className="group p-3 bg-white rounded-xl border border-slate-100 shadow-sm border-l-4 hover:shadow-md transition-all" style={{ borderLeftColor: deal.stage_color }}>
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-0.5">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase">{deal.pipeline_name}</p>
                                  <Layers size={12} className="text-slate-300" />
                                </div>
                                <p className="text-xs font-bold text-slate-700">{deal.stage_name}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => {
                                    setSelectedDeal(deal);
                                    setSelectedPipeline(deal.pipeline_id);
                                    setSelectedStage(deal.stage_id);
                                    setShowMoveDealModal(true);
                                    fetchPipelinesData();
                                  }}
                                  className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                  title="Mover"
                                >
                                  <MoveRight size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setDealToDelete(deal.id);
                                    setShowDeleteConfirm(true);
                                  }}
                                  className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                  title="Remover"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
                          <p className="text-[10px] text-slate-400 italic">Não está em nenhum funil</p>
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
                      {contactDetails.last_interaction ? new Date(contactDetails.last_interaction).toLocaleString() : 'Nunca interagiu'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Gerenciamento de Tags */}
      {showTagManagerModal && contactDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[75] p-4 animate-fade-in">
          <div ref={tagModalRef} className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-blue-600 to-teal-500 p-5 relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <TagIcon className="text-white" size={20} />
                  <div>
                    <h2 className="text-lg font-bold text-white">Gerenciar Tags</h2>
                    <p className="text-[10px] text-white/80 font-medium">Organize por etiquetas personalizadas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTagManagerModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="p-5">
              <TagManager
                contactId={contactDetails.id}
                contactName={contactDetails.name}
                initialTags={contactDetails.tags || []}
                onTagsChange={handleTagsUpdate}
              />
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar ao Pipeline */}
      {showPipelineModal && contactDetails && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[75] p-4 animate-fade-in">
          <div ref={pipelineModalRef} className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-green-600 to-emerald-500 p-5 relative overflow-hidden">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <Layers className="text-white" size={20} />
                  <div>
                    <h2 className="text-lg font-bold text-white">Adicionar ao Pipeline</h2>
                    <p className="text-[10px] text-white/80 font-medium">Mova o contato para um funil de vendas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPipelineModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {pipelines.length === 0 ? (
                <div className="text-center py-8 space-y-4">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto">
                    <Layers size={32} className="text-green-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-700 mb-1">Nenhum Pipeline Cadastrado</h3>
                    <p className="text-xs text-slate-500">Crie seu primeiro funil de vendas para organizar seus contatos</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowCreatePipelineModal(true);
                    }}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 text-white py-3 rounded-xl transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm font-bold"
                  >
                    <Plus size={18} strokeWidth={3} />
                    Criar Primeiro Pipeline
                  </button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Selecionar Pipeline</label>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setShowCreatePipelineModal(true);
                        }}
                        className="text-[10px] font-bold text-green-600 hover:text-green-700 flex items-center gap-1"
                      >
                        <Plus size={12} />
                        Novo
                      </button>
                    </div>
                    <select
                      value={selectedPipeline}
                      onChange={(e) => {
                        setSelectedPipeline(e.target.value);
                        setSelectedStage('');
                      }}
                      className="w-full bg-slate-50 border-0 p-3.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-green-500 transition-all outline-none"
                    >
                      <option value="">Escolha um funil...</option>
                      {pipelines.map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>

                  {selectedPipeline && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Selecionar Estágio</label>
                      <div className="grid grid-cols-2 gap-2">
                        {pipelines.find(p => p.id === parseInt(selectedPipeline))?.stages.map((stage: any) => (
                          <button
                            key={stage.id}
                            type="button"
                            onClick={() => setSelectedStage(stage.id)}
                            className={`p-3 rounded-xl text-[10px] font-bold border-2 transition-all flex flex-col items-center gap-1 ${String(selectedStage) === String(stage.id)
                              ? 'bg-green-50 border-green-500 shadow-sm'
                              : 'bg-white border-slate-100 text-slate-500'
                              }`}
                          >
                            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: stage.color }}></div>
                            {stage.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      handleMoveToPipeline();
                    }}
                    disabled={!selectedPipeline || !selectedStage}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-500 hover:from-green-700 hover:to-emerald-600 disabled:opacity-50 disabled:from-slate-300 disabled:to-slate-400 text-white py-3 rounded-xl transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm font-bold"
                  >
                    <Plus size={18} strokeWidth={3} />
                    Adicionar ao Pipeline
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Remoção */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[85] p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-red-600 to-orange-500 p-5">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center">
                  <AlertCircle className="text-white" size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">Confirmar Remoção</h2>
                  <p className="text-[10px] text-white/80 font-medium">Esta ação não pode ser desfeita</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <p className="text-sm text-slate-700 mb-6">
                Tem certeza que deseja <span className="font-bold">remover este contato do pipeline</span>?
                Esta ação é permanente e não poderá ser desfeita.
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteConfirm(false);
                    setDealToDelete(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRemoveDeal}
                  className="flex-1 bg-gradient-to-r from-red-600 to-orange-500 hover:from-red-700 hover:to-orange-600 text-white py-3 rounded-xl transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm font-bold"
                >
                  <Trash2 size={18} strokeWidth={3} />
                  Remover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Mover Deal */}
      {showMoveDealModal && selectedDeal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[75] p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-md w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-blue-600 to-emerald-500 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <MoveRight className="text-white" size={20} />
                  <div>
                    <h2 className="text-lg font-bold text-white">Mover Negócio</h2>
                    <p className="text-[10px] text-white/80 font-medium">{selectedDeal.pipeline_name}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowMoveDealModal(false);
                    setSelectedDeal(null);
                    setSelectedPipeline('');
                    setSelectedStage('');
                  }}
                  className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Seletor de Pipeline */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Escolher Funil</label>
                <select
                  value={selectedPipeline}
                  onChange={(e) => {
                    setSelectedPipeline(e.target.value);
                    setSelectedStage('');
                  }}
                  className="w-full bg-slate-50 border-0 p-3.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                >
                  {pipelines.map((pipeline: any) => (
                    <option key={pipeline.id} value={pipeline.id}>{pipeline.name}</option>
                  ))}
                </select>
              </div>

              {/* Seletor de Estágio */}
              {selectedPipeline && (
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Selecionar Estágio</label>
                  <div className="grid grid-cols-2 gap-2">
                    {pipelines.find(p => p.id === parseInt(selectedPipeline))?.stages.map((stage: any) => (
                      <button
                        key={stage.id}
                        type="button"
                        onClick={() => setSelectedStage(stage.id)}
                        className={`p-3 rounded-xl text-[10px] font-bold border-2 transition-all flex flex-col items-center gap-1 ${String(selectedStage) === String(stage.id)
                          ? 'bg-blue-50 border-blue-500 shadow-sm'
                          : 'bg-slate-50 border-slate-200 hover:border-blue-300'
                          }`}
                      >
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }}></div>
                        <span className="text-center leading-tight">{stage.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setShowMoveDealModal(false);
                    setSelectedDeal(null);
                    setSelectedPipeline('');
                    setSelectedStage('');
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleMoveDeal}
                  disabled={!selectedStage}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 disabled:opacity-50 disabled:from-slate-300 disabled:to-slate-400 text-white py-3 rounded-xl transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm font-bold"
                >
                  <MoveRight size={18} strokeWidth={3} />
                  Mover
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Criar Novo Pipeline */}
      {showCreatePipelineModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[80] p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-emerald-500 p-5 relative overflow-hidden sticky top-0 z-10">
              <div className="flex items-center justify-between relative z-10">
                <div className="flex items-center gap-3">
                  <Layers className="text-white" size={20} />
                  <div>
                    <h2 className="text-lg font-bold text-white">Criar Novo Pipeline</h2>
                    <p className="text-[10px] text-white/80 font-medium">Configure seu funil de vendas</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCreatePipelineModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Nome do Pipeline */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome do Pipeline</label>
                <input
                  type="text"
                  value={newPipelineName}
                  onChange={(e) => setNewPipelineName(e.target.value)}
                  placeholder="Ex: Vendas B2B, Atendimento..."
                  className="w-full bg-slate-50 border-0 p-3.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                />
              </div>

              {/* Etapas */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Etapas do Funil</label>
                  <button
                    type="button"
                    onClick={handleAddStage}
                    className="text-[10px] font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                  >
                    <Plus size={12} />
                    Adicionar
                  </button>
                </div>

                <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                  {newPipelineStages.map((stage, index) => (
                    <div key={index} className="flex items-center gap-2 p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <input
                        type="color"
                        value={stage.color}
                        onChange={(e) => handleUpdateStage(index, 'color', e.target.value)}
                        className="w-10 h-10 rounded-lg cursor-pointer border-2 border-white shadow-sm"
                      />
                      <input
                        type="text"
                        value={stage.name}
                        onChange={(e) => handleUpdateStage(index, 'name', e.target.value)}
                        placeholder={`Etapa ${index + 1}`}
                        className="flex-1 bg-white border-0 p-2.5 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-blue-500 transition-all outline-none"
                      />
                      {newPipelineStages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(index)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões */}
              <div className="flex gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCreatePipelineModal(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 py-3 rounded-xl transition-all font-bold text-sm"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleCreatePipeline}
                  disabled={isCreatingPipeline || !newPipelineName.trim()}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-700 hover:to-emerald-600 disabled:opacity-50 disabled:from-slate-300 disabled:to-slate-400 text-white py-3 rounded-xl transition-all duration-300 shadow-lg active:scale-95 flex items-center justify-center gap-2 text-sm font-bold"
                >
                  {isCreatingPipeline ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Criando...
                    </>
                  ) : (
                    <>
                      <Plus size={18} strokeWidth={3} />
                      Criar Pipeline
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Modal de Templates */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20 max-h-[80vh] flex flex-col">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <LayoutTemplate className="text-white" size={20} />
                  <div>
                    <h2 className="text-lg font-bold text-white">Modelos de Mensagem</h2>
                    <p className="text-[10px] text-white/80 font-medium">Selecione um template para usar</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowTemplateModal(false)}
                  className="p-2 hover:bg-white/10 rounded-xl text-white transition-colors"
                >
                  <X size={18} strokeWidth={2.5} />
                </button>
              </div>
              <div className="mt-4 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/60" size={16} />
                <input
                  type="text"
                  placeholder="Buscar modelo..."
                  value={templateSearch}
                  onChange={(e) => setTemplateSearch(e.target.value)}
                  className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder:text-white/60 focus:outline-none focus:bg-white/20 transition-all input-placeholder-white"
                />
              </div>
            </div>

            <div className="p-4 overflow-y-auto flex-1 space-y-3">
              {isLoadingTemplates ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : templates.filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase())).length === 0 ? (
                <div className="text-center py-10 text-slate-400">
                  Nenhum modelo encontrado.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {templates.filter(t => t.name.toLowerCase().includes(templateSearch.toLowerCase())).map(template => (
                    <button
                      key={template.id}
                      onClick={() => handleUseTemplate(template)}
                      className="text-left group bg-slate-50 hover:bg-blue-50 border border-slate-100 hover:border-blue-200 rounded-xl p-4 transition-all hover:shadow-md"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-bold text-slate-700 text-sm group-hover:text-blue-700 truncate capitalize">
                          {template.name.replace(/_/g, ' ')}
                        </h3>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${template.status === 'APPROVED' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-500'}`}>
                          {template.status || 'Ativo'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                        {template.components?.find((c: any) => c.type === 'BODY')?.text || 'Sem conteúdo de texto visualizável.'}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 text-center">
              <p className="text-[10px] text-slate-400">Templates são gerenciados no painel da Meta/WhatsApp.</p>
            </div>
          </div>
        </div>
      )}


      {/* Modal de Preenchimento de Variáveis */}
      {showVariableFillModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[95] p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-lg w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-5">
              <div className="flex items-center gap-3">
                <Edit3 className="text-white" size={20} />
                <div>
                  <h2 className="text-lg font-bold text-white">Preencher Variáveis</h2>
                  <p className="text-[10px] text-white/80 font-medium">Complete os campos faltantes do template</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {pendingVariables.map((v, idx) => (
                <div key={v} className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">
                    Variável {v}
                  </label>
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder={`Valor para ${v}...`}
                      value={variableValues[v] || ''}
                      onChange={(e) => setVariableValues(prev => ({ ...prev, [v]: e.target.value }))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 text-sm font-semibold focus:ring-2 focus:ring-indigo-500 outline-none"
                      autoFocus={idx === 0}
                    />
                    {/* Sugestões Globais */}
                    {companyVariables.length > 0 && (
                      <div className="flex flex-wrap gap-2 px-1">
                        {companyVariables.map(cv => (
                          <button
                            key={cv.key}
                            onClick={() => setVariableValues(prev => ({ ...prev, [v]: cv.value }))}
                            className="px-2 py-1 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold hover:bg-indigo-100 transition-colors"
                            title={cv.value}
                          >
                            {cv.key.replace(/_/g, ' ')}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setShowVariableFillModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={finalizeTemplate}
                  className="flex-1 py-3 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-md"
                >
                  Confirmar e Usar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Adicionar Contato Rápido */}
      {showAddContactModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[90] p-4 animate-fade-in">
          <div className="bg-white rounded-[2rem] max-w-sm w-full shadow-2xl animate-fade-in-up overflow-hidden border border-white/20">
            <div className="bg-gradient-to-r from-blue-500 to-cyan-500 p-5">
              <div className="flex items-center gap-3">
                <User className="text-white" size={20} />
                <div>
                  <h2 className="text-lg font-bold text-white">Novo Contato</h2>
                  <p className="text-[10px] text-white/80 font-medium">Adicionar para iniciar conversa</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Nome</label>
                <input
                  type="text"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  placeholder="Nome do contato..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Telefone (Whatsapp)</label>
                <input
                  type="tel"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  placeholder="55999999999"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <p className="text-[10px] text-slate-400 px-1">Digite apenas números (com DDD).</p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Canal de Envio (Opcional)</label>
                <select
                  value={newContactChannel}
                  onChange={(e) => setNewContactChannel(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <option value="">Automático (Padrão)</option>
                  {channels.map((ch: any) => (
                    <option key={ch.id} value={ch.id}>
                      {ch.instance_name || ch.verified_name || ch.phone_number_id}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  onClick={() => setShowAddContactModal(false)}
                  className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleQuickAddContact}
                  disabled={isAddingContact || !newContactName || !newContactPhone}
                  className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-bold text-sm hover:bg-blue-700 shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isAddingContact ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <>
                      <Check size={16} /> Salvar
                    </>
                  )}
                </button>
              </div>
            </div>
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
      {/* Delete Conversation Confirmation Modal */}
      {showDeleteConvConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[70] p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 animate-fade-in-up border border-slate-100">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center text-red-500 mb-2">
                <Trash2 size={24} />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Excluir Conversa?</h3>
              <p className="text-sm text-slate-500 leading-relaxed">
                Tem certeza que deseja apagar esta conversa? Todo o histórico e dados do contato serão removidos permanentemente.
              </p>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={() => setShowDeleteConvConfirm(false)}
                  className="flex-1 py-2.5 text-slate-600 font-bold text-sm bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteConversation}
                  disabled={isDeletingConv}
                  className="flex-1 py-2.5 text-white font-bold text-sm bg-red-500 hover:bg-red-600 rounded-xl transition-colors shadow-lg shadow-red-500/30 flex justify-center items-center gap-2"
                >
                  {isDeletingConv ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : 'Excluir'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ChatInterface;