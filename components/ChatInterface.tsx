import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io } from 'socket.io-client';
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
  Smile
} from 'lucide-react';
import { Contact, Message, MessageType } from '../types';

// Inject custom animations
const style = document.createElement('style');
style.innerHTML = `
  @keyframes slideIn {
    from { opacity: 0; transform: translateY(10px) scale(0.98); }
    to { opacity: 1; transform: translateY(0) scale(1); }
  }
  .animate-message {
    animation: slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
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

const ChatInterface: React.FC = () => {
  // 1. States
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');

  // Channels and Filtering
  const [channels, setChannels] = useState<any[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<string>('all');
  const [isChannelDropdownOpen, setIsChannelDropdownOpen] = useState(false);

  // 2. Refs
  const activeContactIdRef = useRef(activeContactId);
  useEffect(() => { activeContactIdRef.current = activeContactId; }, [activeContactId]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsChannelDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 3. Helper Functions
  const fetchChannels = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setChannels(data);
    } catch (err) { console.error(err); }
  }, []);

  const fetchChats = useCallback(async () => {
    const token = localStorage.getItem('token');
    try {
      const url = new URL('http://localhost:3001/api/chat');
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
        lastMessageTime: c.last_message_time ? new Date(c.last_message_time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }) : '',
        unreadCount: parseInt(c.unread_count || '0'),
        tags: []
      }));

      setContacts(mappedContacts);
    } catch (err) {
      console.error('Erro ao buscar chats:', err);
    }
  }, [selectedChannel]);

  const fetchMessages = useCallback(async (contactId: string) => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const url = new URL(`http://localhost:3001/api/chat/${contactId}/messages`);
      if (selectedChannel && selectedChannel !== 'all') {
        url.searchParams.append('channelId', selectedChannel);
      }

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();

      const mappedMessages: Message[] = data.map((m: any) => ({
        id: m.id,
        contactId: m.contact_id,
        sender: m.direction === 'INBOUND' ? 'contact' : 'user',
        type: (m.type || 'text') as MessageType,
        content: (['image', 'audio', 'video', 'document'].includes(m.type) && m.media_url) ? m.media_url : m.message,
        timestamp: new Date(m.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' }),
        status: m.status || 'read',
        fileName: m.file_name
      }));

      setMessages(mappedMessages);
    } catch (err) {
      console.error('Erro ao buscar mensagens:', err);
    } finally {
      setIsLoading(false);
    }
  }, [selectedChannel]);

  const handleSendMessage = async () => {
    if (!inputText.trim() || !activeContactId) return;
    const content = inputText;
    setInputText('');

    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:3001/api/chat/${activeContactId}/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ type: 'text', content })
      });
      fetchMessages(activeContactId);
      fetchChats();
    } catch (err) { console.error(err); }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  };

  // 4. Effects
  useEffect(() => {
    fetchChannels();
  }, [fetchChannels]);

  useEffect(() => {
    fetchChats();
  }, [fetchChats]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

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
      console.log('Nova mensagem recebida:', data);
      fetchChats();
      if (activeContactIdRef.current && data.contactId === activeContactIdRef.current) {
        fetchMessages(activeContactIdRef.current);
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

  const activeContact = contacts.find(c => c.id === activeContactId);

  // Helper to get dropdown label
  const getSelectedChannelLabel = () => {
    if (selectedChannel === 'all') return 'Todas as Contas';
    const ch = channels.find(c => c.id === parseInt(selectedChannel));
    return ch ? (ch.instance_name || ch.verified_name || ch.phone_number_id) : 'Selecionar';
  };

  // 5. Render
  return (
    <div className="flex h-full bg-white rounded-3xl overflow-hidden border border-slate-200 shadow-2xl ring-1 ring-slate-900/5">
      {/* Sidebar List - Subtle Gradient on Background */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-gradient-to-br from-white to-slate-50">

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
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-lg transition-colors ${showFilters ? 'bg-blue-100 text-blue-700' : 'text-slate-400 hover:bg-slate-100'}`}
            >
              <Filter size={12} /> Filtros
            </button>
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
            return (
              <div
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={`p-3 flex gap-3 cursor-pointer transition-all duration-200 rounded-xl relative group ${isActive ? 'bg-white shadow-md ring-1 ring-slate-200 transform scale-[1.02]' : 'hover:bg-white hover:shadow-sm'}`}
              >
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
                  <div className="flex justify-between items-baseline mb-0.5">
                    <h3 className={`text-sm truncate mr-2 ${isActive ? 'font-bold text-slate-800' : 'font-semibold text-slate-700'}`}>{contact.name}</h3>
                    <span className={`text-[10px] font-medium shrink-0 ${isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-500'}`}>{contact.lastMessageTime}</span>
                  </div>
                  <p className={`text-xs truncate flex items-center gap-1 ${isActive ? 'text-slate-600 font-medium' : 'text-slate-400'}`}>
                    {contact.lastMessage}
                  </p>
                  {/* Tags or Pipeline Stage could go here */}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-slate-50 relative">
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
            <div className="glass-header h-20 border-b border-slate-200/60 flex justify-between items-center px-6 shadow-sm z-30 sticky top-0">
              <div className="flex items-center gap-4">
                <div className="relative cursor-pointer group">
                  <img src={activeContact.avatar} alt="" className="w-11 h-11 rounded-full border-2 border-white shadow-md transition-transform group-hover:scale-105" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></span>
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 cursor-pointer hover:text-blue-600 transition-colors">
                    {activeContact.name}
                    <ChevronDown size={14} className="text-slate-400" />
                  </h2>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500 font-mono tracking-tight bg-slate-100/50 px-1.5 rounded">{activeContact.phone}</span>
                    {/* Tags */}
                    <span className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full uppercase tracking-wider">Lead</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 text-slate-400">
                <button className="p-2.5 hover:bg-slate-100/80 hover:text-blue-600 rounded-xl transition-all"><Search size={20} /></button>
                <div className="h-6 w-px bg-slate-200 mx-1"></div>
                <button className="p-2.5 hover:bg-slate-100/80 hover:text-blue-600 rounded-xl transition-all"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 z-10">
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
                      <div className="w-8 h-8 rounded-full bg-slate-200 mr-2 self-end mb-1 overflow-hidden shrink-0 shadow-sm ring-2 ring-white">
                        <img src={activeContact.avatar} className="w-full h-full object-cover" />
                      </div>
                    )}
                    {!isUser && !showAvatar && <div className="w-8 mr-2 shrink-0"></div>}

                    <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm text-sm relative transition-all duration-300 hover:shadow-md ${isUser
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
            <div className="p-4 z-20">
              <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 flex items-end p-2 transition-shadow hover:shadow-2xl">
                <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Paperclip size={20} /></button>
                <button className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors"><Smile size={20} /></button>

                <div className="flex-1 py-3 px-2">
                  <textarea
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Digite sua mensagem..."
                    className="w-full bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400 resize-none max-h-32 scrollbar-hide"
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
              <div className="text-center mt-2">
                <p className="text-[10px] text-slate-400 font-medium">Pressione <kbd className="font-sans px-1 py-0.5 bg-slate-100 rounded text-slate-500 border border-slate-200">Enter</kbd> para enviar</p>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
            <div className="w-24 h-24 bg-white rounded-full shadow-lg flex items-center justify-center mb-6 animate-pulse">
              <Smartphone size={40} className="text-blue-200" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">Selecione uma conversa</h3>
            <p className="max-w-xs text-center text-sm text-slate-500">Escolha um contato na lista ao lado ou inicie uma nova conversa para começar a atender.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
// Force reload