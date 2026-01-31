import React, { useState } from 'react';
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
  Video as VideoIcon
} from 'lucide-react';
import { Contact, Message, MessageType } from '../types';

// Mock Data
const MOCK_CONTACTS: Contact[] = [
  { id: '1', name: 'Alice Freeman', phone: '+55 11 99999-0001', avatar: 'https://picsum.photos/40/40?1', pipelineStage: 'Negotiation', lastMessage: 'Voice message (0:12)', lastMessageTime: '10:42', unreadCount: 2, tags: ['VIP'] },
  { id: '2', name: 'Bob Smith', phone: '+55 11 99999-0002', avatar: 'https://picsum.photos/40/40?2', pipelineStage: 'New Lead', lastMessage: 'Can you send the proposal?', lastMessageTime: 'Yesterday', unreadCount: 0, tags: [] },
  { id: '3', name: 'Charlie Davis', phone: '+55 11 99999-0003', avatar: 'https://picsum.photos/40/40?3', pipelineStage: 'Closed', lastMessage: 'Thanks!', lastMessageTime: 'Mon', unreadCount: 0, tags: ['Support'] },
];

const MOCK_MESSAGES: Message[] = [
  { id: '101', contactId: '1', sender: 'contact', type: MessageType.TEXT, content: 'Hi there! I have a question about the enterprise plan.', timestamp: '10:30', status: 'read' },
  { id: '102', contactId: '1', sender: 'user', type: MessageType.TEXT, content: 'Hello Alice! Sure, I can help with that. What specifically would you like to know?', timestamp: '10:32', status: 'read' },
  { id: '103', contactId: '1', sender: 'contact', type: MessageType.AUDIO, content: 'mock-audio-url', timestamp: '10:42', status: 'read' },
  { id: '104', contactId: '1', sender: 'user', type: MessageType.IMAGE, content: 'https://picsum.photos/300/200', timestamp: '10:45', status: 'delivered' },
  { id: '105', contactId: '1', sender: 'contact', type: MessageType.DOCUMENT, content: 'contract_draft_v1.pdf', fileName: 'contract_draft_v1.pdf', timestamp: '10:50', status: 'read' },
];

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
  const [activeContactId, setActiveContactId] = useState<string>('1');
  const [inputText, setInputText] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // Filter States
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterTag, setFilterTag] = useState('all');

  const activeContact = MOCK_CONTACTS.find(c => c.id === activeContactId);

  return (
    <div className="flex h-full bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
      {/* Sidebar List */}
      <div className="w-full md:w-80 border-r border-slate-100 flex flex-col bg-white">
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
             <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Inbox</span>
          </div>

          {showFilters && (
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 text-xs space-y-3 animate-fade-in-down">
               <div>
                 <label className="block text-slate-400 mb-1">Status</label>
                 <select 
                   className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-700 focus:outline-none"
                   value={filterStatus}
                   onChange={(e) => setFilterStatus(e.target.value)}
                 >
                   <option value="all">Todos</option>
                   <option value="open">Pendente</option>
                   <option value="resolved">Resolvido</option>
                 </select>
               </div>
               <div>
                 <label className="block text-slate-400 mb-1">Etiqueta</label>
                 <select 
                    className="w-full bg-white border border-slate-200 rounded p-1.5 text-slate-700 focus:outline-none"
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                 >
                   <option value="all">Todas</option>
                   <option value="vip">VIP</option>
                   <option value="support">Suporte</option>
                 </select>
               </div>
            </div>
          )}
        </div>
        
        <div className="flex-1 overflow-y-auto">
          {MOCK_CONTACTS.map(contact => {
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
                {contact.id === '1' && <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-wa border-2 border-white rounded-full"></div>}
              </div>
              <div className="flex-1 min-w-0 py-0.5">
                <div className="flex justify-between items-baseline mb-1">
                  <h3 className={`text-sm font-medium truncate ${isActive ? 'text-slate-900 font-semibold' : 'text-slate-700'}`}>{contact.name}</h3>
                  <span className={`text-[10px] ${isActive ? 'text-meta font-medium' : 'text-slate-400'}`}>{contact.lastMessageTime}</span>
                </div>
                <p className={`text-xs truncate flex items-center gap-1 ${isActive ? 'text-slate-600' : 'text-slate-400'}`}>
                  {contact.lastMessage.includes('Voice') ? <Mic size={10} /> : null}
                  {contact.lastMessage}
                </p>
                {contact.tags.length > 0 && (
                  <div className="flex gap-1 mt-1.5">
                    {contact.tags.map(tag => (
                      <span key={tag} className="text-[9px] px-1.5 py-0.5 bg-meta/10 text-meta rounded border border-meta/10 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              {contact.unreadCount > 0 && (
                <div className="flex flex-col items-end justify-center">
                  <span className="w-5 h-5 bg-brand-gradient text-white text-[10px] font-bold flex items-center justify-center rounded-full shadow-sm">
                    {contact.unreadCount}
                  </span>
                </div>
              )}
            </div>
          )})}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-[#f0f2f5] relative bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px]">
        {/* Chat Header */}
        <div className="h-20 bg-white/90 backdrop-blur-md border-b border-slate-100 flex justify-between items-center px-6 shadow-sm z-10">
          <div className="flex items-center gap-4">
             <div className="relative">
                 <img src={activeContact?.avatar} alt="" className="w-10 h-10 rounded-full border border-slate-200" />
                 <span className="absolute bottom-0 right-0 w-3 h-3 bg-wa border-2 border-white rounded-full"></span>
             </div>
             <div>
               <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                 {activeContact?.name}
                 <span className="text-[10px] text-slate-400 font-normal">Online</span>
               </h2>
               <div className="flex items-center gap-2 mt-0.5">
                 <span className="text-xs text-slate-500 font-mono tracking-tight">{activeContact?.phone}</span>
                 {activeContact?.pipelineStage && (
                   <span className="px-2 py-0.5 bg-meta/10 text-meta text-[10px] uppercase font-bold tracking-wider rounded-md border border-meta/10">
                     {activeContact.pipelineStage}
                   </span>
                 )}
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
          <div className="flex justify-center">
             <span className="bg-slate-100 text-slate-500 text-[10px] px-3 py-1 rounded-full uppercase tracking-widest font-bold shadow-sm border border-slate-200/50">Hoje</span>
          </div>

          {MOCK_MESSAGES.map(msg => (
            <div key={msg.id} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-sm text-sm relative group border transition-all hover:shadow-md ${
                msg.sender === 'user' 
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

                {msg.type === MessageType.VIDEO && (
                  <div className="mb-1 rounded-lg overflow-hidden border border-black/10 relative bg-black flex items-center justify-center min-h-[150px]">
                    <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center">
                      <Play size={20} fill="white" className="text-white ml-1" />
                    </div>
                  </div>
                )}

                {msg.type === MessageType.DOCUMENT && (
                   <div className={`flex items-center gap-3 p-3 rounded-xl border ${msg.sender === 'user' ? 'bg-white/10 border-white/10' : 'bg-slate-50 border-slate-100'}`}>
                      <div className={`p-2 bg-white rounded-lg ${msg.sender === 'user' ? 'text-meta' : 'text-slate-600'}`}>
                        <FileText size={20} />
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-medium truncate max-w-[150px]">{msg.fileName || msg.content}</p>
                        <p className={`text-[10px] ${msg.sender === 'user' ? 'text-white/80' : 'text-slate-400'}`}>PDF Document</p>
                      </div>
                   </div>
                )}

                <div className={`text-[10px] mt-1.5 flex items-center justify-end gap-1 ${msg.sender === 'user' ? 'text-white/80' : 'text-slate-400'}`}>
                  {msg.timestamp}
                  {msg.sender === 'user' && (
                    <span>
                      {msg.status === 'read' ? <CheckCheck size={12} /> : <Check size={12} />}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input Area */}
        <div className="p-4 bg-white border-t border-slate-100">
           <div className="flex items-end gap-3 max-w-4xl mx-auto">
             <div className="flex items-center gap-1">
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-meta rounded-full transition-colors">
                  <Paperclip size={20} strokeWidth={2} />
                </button>
                <button className="p-2.5 text-slate-400 hover:bg-slate-50 hover:text-meta rounded-full transition-colors">
                  <ImageIcon size={20} strokeWidth={2} />
                </button>
             </div>
             <div className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl flex items-center px-4 py-2.5 focus-within:ring-2 focus-within:ring-meta/20 focus-within:border-meta transition-all shadow-inner">
               <input 
                type="text" 
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Type a message..." 
                className="flex-1 bg-transparent border-none outline-none text-sm text-slate-800 placeholder:text-slate-400"
               />
             </div>
             {inputText ? (
               <button className="p-3 bg-brand-gradient text-white rounded-full hover:opacity-90 transition shadow-lg shadow-meta/20 transform hover:scale-105 active:scale-95">
                 <Send size={20} strokeWidth={2} className="ml-0.5" />
               </button>
             ) : (
                <button className="p-3 text-slate-400 hover:bg-slate-50 hover:text-meta rounded-full transition-colors">
                  <Mic size={20} strokeWidth={2} />
                </button>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;