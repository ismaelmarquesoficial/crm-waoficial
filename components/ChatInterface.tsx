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
  WifiOff
} from 'lucide-react';
import { Contact, Message, MessageType } from '../types';

const AudioPlayer = ({ isUser }: { isUser: boolean }) => {
  const [playing, setPlaying] = useState(false);
  return (
    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg w-64 backdrop-blur-sm ${isUser ? 'bg-white/20' : 'bg-slate-100/80'}`}>
      <button
        onClick={() => setPlaying(!playing)}
        className={`w-8 h-8 flex items-center justify-center rounded-full shadow-sm transition ${isUser ? 'bg-white text-meta' : 'bg-white text-slate-600'}`}
      >
        {playing ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
      </button>
      <div className="flex-1 space-y-1">
        <div className={`h-1 rounded-full w-full relative overflow-hidden ${isUser ? 'bg-white/40' : 'bg-slate-300'}`}>
          <div className={`absolute left-0 top-0 bottom-0 w-1/3 ${isUser ? 'bg-white' : 'bg-slate-500'} ${playing ? 'animate-pulse' : ''}`}></div>
        </div>
        <div className={`flex justify-between text-[10px] font-mono ${isUser ? 'text-white/80' : 'text-slate-500'}`}>
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
    <div className="flex h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Sidebar List */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-white">

        {/* Custom Channel Selector - Premium Look */}
        <div className="px-4 pt-4 pb-2 border-b border-slate-50 bg-slate-50/50 z-20">
          <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1.5 ml-0.5">Canal de Atendimento</label>
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setIsChannelDropdownOpen(!isChannelDropdownOpen)}
              className="w-full bg-white border border-slate-200 hover:border-meta/50 transition-colors text-slate-700 text-sm rounded-xl px-3 py-2.5 flex items-center justify-between group shadow-sm"
            >
              <div className="flex items-center gap-2.5 overflow-hidden">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedChannel === 'all' ? 'bg-meta/10 text-meta' : 'bg-green-100 text-green-600'}`}>
                  {selectedChannel === 'all' ? <Layers size={16} /> : <Smartphone size={16} />}
                </div>
                <div className="flex flex-col items-start truncate">
                  <span className="font-semibold text-xs text-slate-800 truncate block w-full text-left">{getSelectedChannelLabel()}</span>
                  <span className="text-[10px] text-slate-400">
                    {selectedChannel === 'all' ? 'Visualizar tudo' : 'Filtrado'}
                  </span>
                </div>
              </div>
              <ChevronDown size={14} className={`text-slate-400 group-hover:text-meta transition-transform duration-200 ${isChannelDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isChannelDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-down origin-top">
                <div className="max-h-60 overflow-y-auto py-1">
                  <button
                    onClick={() => { setSelectedChannel('all'); setIsChannelDropdownOpen(false); }}
                    className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${selectedChannel === 'all' ? 'bg-meta/5' : ''}`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <Layers size={16} />
                    </div>
                    <div>
                      <p className={`text-xs font-semibold ${selectedChannel === 'all' ? 'text-meta' : 'text-slate-700'}`}>Todas as Contas</p>
                      <p className="text-[10px] text-slate-400">Ver mensagens de todos</p>
                    </div>
                    {selectedChannel === 'all' && <Check size={14} className="ml-auto text-meta" />}
                  </button>

                  <div className="h-px bg-slate-100 my-1 mx-3"></div>

                  {channels.map((ch: any) => {
                    const isConnected = ch.status === 'CONNECTED';
                    const isSelected = selectedChannel === String(ch.id);
                    return (
                      <button
                        key={ch.id}
                        onClick={() => { setSelectedChannel(String(ch.id)); setIsChannelDropdownOpen(false); }}
                        className={`w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${isSelected ? 'bg-green-50/50' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isConnected ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                          {isConnected ? <Wifi size={16} /> : <WifiOff size={16} />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex justify-between items-center">
                            <p className={`text-xs font-semibold truncate ${isSelected ? 'text-green-700' : 'text-slate-700'}`}>
                              {ch.instance_name || ch.verified_name || 'Conta WhatsApp'}
                            </p>
                            {isConnected && <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>}
                          </div>
                          <p className="text-[10px] text-slate-400 truncate">{ch.display_phone_number || ch.phone_number_id}</p>
                        </div>
                        {isSelected && <Check size={14} className="ml-auto text-green-600" />}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-b border-slate-50 space-y-3">
          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-meta transition-colors" size={16} />
            <input
              type="text"
              placeholder="Search..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-meta transition-all focus:bg-white"
            />
          </div>

          <div className="flex justify-between items-center">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors ${showFilters ? 'bg-meta/10 text-meta' : 'text-slate-500 hover:bg-slate-50'}`}
            >
              <Filter size={14} /> Filtros
            </button>
            <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Inbox ({contacts.length})</span>
          </div>

          {showFilters && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-3 animate-fade-in-down">
              <div>
                <label className="block text-slate-400 mb-1">Status</label>
                <select className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-700 focus:outline-none" onChange={(e) => setFilterStatus(e.target.value)} value={filterStatus}> <option value="all">Todos</option> </select>
              </div>
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {contacts.map(contact => {
            const isActive = activeContactId === contact.id;
            return (
              <div
                key={contact.id}
                onClick={() => setActiveContactId(contact.id)}
                className={`p-4 flex gap-3 cursor-pointer transition-all border-b border-slate-50 last:border-0 relative group ${isActive ? 'bg-slate-50' : 'hover:bg-slate-50'}`}
              >
                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-brand-gradient"></div>}

                <div className="relative">
                  <img src={contact.avatar} alt={contact.name} className={`w-12 h-12 rounded-full object-cover border-2 transition-all ${isActive ? 'border-meta' : 'border-transparent'}`} />
                </div>
                <div className="flex-1 min-w-0 py-0.5">
                  <div className="flex justify-between items-baseline mb-1">
                    <h3 className={`text-sm font-medium truncate ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>{contact.name}</h3>
                    <span className={`text-[10px] ${isActive ? 'text-meta font-medium' : 'text-slate-400'}`}>{contact.lastMessageTime}</span>
                  </div>
                  <p className={`text-xs truncate flex items-center gap-1 ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                    {contact.lastMessage}
                  </p>
                </div>
                {contact.unreadCount > 0 && (
                  <div className="flex flex-col items-end justify-center">
                    <span className="w-5 h-5 bg-brand-gradient text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                      {contact.unreadCount}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5] relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Chat Header */}
        {activeContact ? (
          <>
            <div className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-100 flex justify-between items-center px-6 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <img src={activeContact.avatar} alt="" className="w-10 h-10 rounded-full border border-slate-200" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                    {activeContact.name}
                  </h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-500 font-mono tracking-tight">{activeContact.phone}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeContact.unreadCount > 0 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                      {activeContact.unreadCount > 0 ? 'Não lido' : 'Lido'}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <button className="p-2 hover:bg-slate-50 hover:text-meta rounded-full transition-colors"><Search size={20} /></button>
                <button className="p-2 hover:bg-slate-50 hover:text-meta rounded-full transition-colors"><MoreVertical size={20} /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {isLoading && <div className="text-center text-slate-400 text-xs py-4">Carregando mensagens...</div>}

              {messages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm text-sm relative group border transition-all hover:shadow-md ${msg.sender === 'user'
                      ? 'bg-brand-gradient text-white rounded-tr-none border-transparent'
                      : 'bg-white text-slate-800 rounded-tl-none border-slate-100'
                    }`}>
                    {msg.type === MessageType.TEXT && <p className="leading-relaxed">{msg.content}</p>}

                    {msg.type === MessageType.AUDIO && <AudioPlayer isUser={msg.sender === 'user'} />}

                    {msg.type === MessageType.IMAGE && (
                      <div className="mb-1 rounded-lg overflow-hidden border border-black/10">
                        <img src={msg.content} alt="Attachment" className="max-w-full h-auto object-cover" />
                      </div>
                    )}

                    {msg.fileName && (
                      <div className={`flex items-center gap-3 p-3 rounded-xl border ${msg.sender === 'user' ? 'bg-white/10 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                        <div className={`p-2 bg-white rounded-lg ${msg.sender === 'user' ? 'text-meta' : 'text-slate-600'}`}>
                          <FileText size={20} />
                        </div>
                        <div className="overflow-hidden">
                          <p className="font-medium truncate max-w-[150px]">{msg.fileName}</p>
                        </div>
                      </div>
                    )}

                    <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${msg.sender === 'user' ? 'text-white/80' : 'text-slate-400'}`}>
                      {msg.timestamp}
                      {msg.sender === 'user' && (
                        <span>
                          {msg.status === 'read' ? <CheckCheck size={12} /> :
                            msg.status === 'delivered' ? <CheckCheck size={12} className="text-slate-400" /> :
                              <Check size={12} />}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100">
              <div className="flex items-end gap-3 max-w-4xl mx-auto">
                <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 py-2.5 focus-within:ring-2 focus-within:ring-meta/20 focus-within:border-meta transition-all shadow-inner">
                  <input
                    type="text"
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type a message..."
                    className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
                  />
                </div>
                <button onClick={handleSendMessage} className="p-3 bg-brand-gradient text-white rounded-full hover:opacity-90 transition shadow-lg shadow-meta/20 transform hover:scale-105 active:scale-95">
                  <Send size={20} strokeWidth={2} className="ml-0.5" />
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-slate-400">
            <p>Selecione uma conversa para começar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;