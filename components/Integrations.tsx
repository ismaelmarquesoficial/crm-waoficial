import React, { useState, useEffect } from 'react';
import { MessageSquare, ShieldCheck, Link2, Users, Mail, Shield, Globe, Copy, Settings, LayoutDashboard, CheckCircle, AlertCircle, X, Smartphone, Wifi, Trash2, Check, RefreshCw } from 'lucide-react';
import { io } from 'socket.io-client';
import { User } from '../types';

const MOCK_USERS: User[] = [
  { id: '1', name: 'Admin User', email: 'admin@talke.ia', role: 'admin', avatar: 'https://picsum.photos/40/40?10' },
  { id: '2', name: 'Sarah Agent', email: 'sarah@talke.ia', role: 'agent', avatar: 'https://picsum.photos/40/40?11' },
];

const WhatsAppOfficialForm = ({ editId, onCancel, onSuccess }: { editId?: number | null, onCancel: () => void, onSuccess: () => void }) => {
  const [formData, setFormData] = useState({
    id: null,
    instanceName: '',
    appId: '',
    appSecret: '',
    phoneNumberId: '',
    wabaId: '',
    permanentToken: ''
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (editId) {
      const load = async () => {
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`http://localhost:3001/api/channels/${editId}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const data = await res.json();
          setFormData({
            id: data.id,
            instanceName: data.instance_name || '',
            appId: data.app_id || '',
            appSecret: data.app_secret || '',
            phoneNumberId: data.phone_number_id || '',
            wabaId: data.waba_id || '',
            permanentToken: data.permanent_token || ''
          });
        } catch (error) {
          console.error(error);
        }
      };
      load();
    } else {
      setFormData({
        id: null,
        instanceName: '',
        appId: '',
        appSecret: '',
        phoneNumberId: '',
        wabaId: '',
        permanentToken: ''
      });
    }
  }, [editId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/channels/whatsapp-official', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        onSuccess();
      } else {
        const errData = await res.json();
        alert('Erro: ' + (errData.error || 'Erro ao salvar conexão'));
      }
    } catch (error) {
      console.error(error);
      alert('Erro de conexão com o servidor');
    } finally {
      setIsLoading(false);
    }
  };

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const tenantId = user.tenant_id || user.tenantId;
  const tenantVerifyToken = tenantId ? `talke_tenant_${tenantId}` : 'talke_ia_master_secure_2024';

  return (
    <div className="animate-fade-in bg-white rounded-[2rem] shadow-soft border border-slate-100 overflow-hidden relative">
      <div className="absolute top-0 w-full h-1.5 bg-gradient-to-r from-meta to-wa"></div>

      <div className="p-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h3 className="font-bold text-2xl text-slate-900">{editId ? 'Configurar Conexão' : 'Nova Conexão'}</h3>
            <p className="text-slate-500 text-sm mt-1">Conecte a API Oficial do WhatsApp Business.</p>
          </div>
          <div className="bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-green-100">
            Oficial
          </div>
        </div>

        {/* Webhook Block */}
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-6 mb-8 relative overflow-hidden group hover:border-blue-200 transition-colors">
          <div className="flex items-start gap-4 z-10 relative">
            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 shrink-0">
              <Globe size={20} />
            </div>
            <div className="flex-1">
              <h4 className="text-slate-900 font-bold text-sm mb-1">Webhook Configuration</h4>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">Use estes dados no painel da Meta for Developers para habilitar eventos.</p>

              <div className="grid grid-cols-1 gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Callback URL</label>
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-blue-400 transition-colors group/input cursor-pointer" onClick={() => navigator.clipboard.writeText('https://SEU_DOMINIO/api/webhooks/whatsapp')}>
                    <code className="text-xs text-slate-600 font-mono flex-1 truncate">https://SEU_DOMINIO/api/webhooks/whatsapp</code>
                    <Copy size={12} className="text-slate-300 group-hover/input:text-blue-500 transition-colors" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    <label className="text-[10px] uppercase font-bold text-slate-400">Verify Token</label>
                  </div>
                  <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2.5 hover:border-blue-400 transition-colors group/input cursor-pointer" onClick={() => navigator.clipboard.writeText(tenantVerifyToken)}>
                    <code className="text-xs text-slate-900 font-bold font-mono flex-1">{tenantVerifyToken}</code>
                    <Copy size={12} className="text-slate-300 group-hover/input:text-blue-500 transition-colors" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nome da Instância</label>
            <input
              name="instanceName" value={formData.instanceName} onChange={handleChange}
              type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-meta/20 focus:bg-white transition-all placeholder:text-slate-300" placeholder="Ex: WhatsApp Vendas"
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">App ID</label>
              <input name="appId" value={formData.appId} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-meta/20 focus:bg-white transition-all placeholder:text-slate-300" placeholder="Ex: 10928..." />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">App Secret</label>
              <input name="appSecret" value={formData.appSecret} onChange={handleChange} type="password" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-meta/20 focus:bg-white transition-all placeholder:text-slate-300 tracking-widest" placeholder="••••••••" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">WABA ID</label>
              <input name="wabaId" value={formData.wabaId} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-meta/20 focus:bg-white transition-all placeholder:text-slate-300" placeholder="ID da Conta WhatsApp" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Phone ID</label>
              <input name="phoneNumberId" value={formData.phoneNumberId} onChange={handleChange} type="text" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-meta/20 focus:bg-white transition-all placeholder:text-slate-300" placeholder="ID do Número" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Token Permanente</label>
            <input name="permanentToken" value={formData.permanentToken} onChange={handleChange} type="password" className="w-full bg-slate-50 border-none rounded-2xl p-4 text-sm font-medium outline-none focus:ring-2 focus:ring-meta/20 focus:bg-white transition-all placeholder:text-slate-300 font-mono text-xs" placeholder="EAAB..." />
          </div>
        </div>

        <div className="flex gap-4 pt-10">
          <button onClick={onCancel} className="flex-1 py-4 text-slate-500 font-bold hover:bg-slate-50 rounded-2xl transition-colors">Cancelar</button>
          <button onClick={handleSave} disabled={isLoading} className="flex-1 bg-slate-900 text-white font-bold py-4 rounded-2xl hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:hover:translate-y-0 text-sm tracking-wide">
            {isLoading ? 'CONECTANDO...' : 'SALVAR E CONECTAR'}
          </button>
        </div>
      </div>
    </div>
  );
};


const IntegrationScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'integrations' | 'team' | 'company'>('integrations');
  const [channels, setChannels] = useState<any[]>([]);
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [companyData, setCompanyData] = useState<any>({});
  const [loadingCompany, setLoadingCompany] = useState(false);
  const [isEditingCompany, setIsEditingCompany] = useState(false);

  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [testLoading, setTestLoading] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  // New User Form State
  const [newUserOpen, setNewUserOpen] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'agent' });
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [showTestModal, setShowTestModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteChannelId, setDeleteChannelId] = useState<number | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const tenantId = user.tenant_id || user.tenantId;
  const tenantVerifyToken = tenantId ? `talke_tenant_${tenantId}` : 'talke_ia_master_secure_2024';

  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3000);
  };

  const handleTestConnection = async (id: number) => {
    setTestLoading(id);
    setTimeLeft(30);
    setShowTestModal(true);
  };

  const testLoadingRef = React.useRef<number | null>(null);
  useEffect(() => { testLoadingRef.current = testLoading; }, [testLoading]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (testLoading && timeLeft > 0) {
      interval = setInterval(() => { setTimeLeft((prev) => prev - 1); }, 1000);
    } else if (testLoading && timeLeft === 0) {
      handleTestFailure(testLoading);
    }
    return () => clearInterval(interval);
  }, [testLoading, timeLeft]);

  const handleTestFailure = async (id: number) => {
    setChannels(prev => prev.map(ch => ch.id === id ? { ...ch, status: 'PENDING' } : ch));
    setTestLoading(null);
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:3001/api/channels/${id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: 'PENDING' })
      });
    } catch (e) { console.error(e); }

    setTimeout(() => {
      setShowTestModal(false);
      showNotification('Teste falhou: Verifique se enviou a mensagem.', 'error');
      fetchChannels();
    }, 100);
  };

  useEffect(() => {
    const socket = io('http://localhost:3001');
    const userString = localStorage.getItem('user');

    socket.on('connect', () => {
      setSocketConnected(true);
      if (userString) {
        try {
          const user = JSON.parse(userString);
          if (user.tenantId || user.tenant_id) {
            const tId = user.tenantId || user.tenant_id;
            socket.emit('join_tenant', tId);
          }
        } catch (e) { console.error(e); }
      }
    });

    socket.on('disconnect', () => setSocketConnected(false));

    socket.on('webhook_log', (data: { message: string }) => {
      showNotification(data.message, 'success');
    });

    socket.on('channel_status_update', (data: { id: number, status: string }) => {
      console.log('📡 Socket Update Recebido:', data);

      if (data.status === 'CONNECTED') {
        showNotification('🎉 Canal Conectado com Sucesso! Pronto para uso.', 'success');
      } else if (data.status === 'VERIFIED') {
        showNotification('⚡ Webhook Verificado! Próxima etapa liberada.', 'success');
      }

      setChannels(prev => prev.map(ch => ch.id === data.id ? { ...ch, status: data.status } : ch));
      fetchChannels();
    });
    socket.on('new_message', (data) => {
      if (testLoadingRef.current) {
        setShowTestModal(false);
        showNotification('Teste CONCLUÍDO! Conexão verificada com sucesso.', 'success');
        setTestLoading(null);
        setTimeLeft(0);
        fetchChannels();
      }
    });

    return () => { socket.disconnect(); };
  }, [activeTab, viewMode]);

  useEffect(() => {
    if (activeTab === 'integrations' && viewMode === 'list') fetchChannels();
    if (activeTab === 'team') fetchTeam();
    if (activeTab === 'company') fetchCompany();
  }, [activeTab, viewMode]);

  const fetchChannels = async () => {
    const token = localStorage.getItem('token');
    if (!token) return;
    try {
      const res = await fetch('http://localhost:3001/api/channels', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) {
        if (res.status === 401) showNotification('Sessão expirada.', 'error');
        setChannels([]);
        return;
      }
      const data = await res.json();
      setChannels(Array.isArray(data) ? data : []);
    } catch (error) { console.error(error); setChannels([]); }
  };

  const fetchTeam = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/settings/team', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) setTeamMembers(data);
        else setTeamMembers([]);
      } else {
        setTeamMembers([]);
      }
    } catch (error) { console.error(error); setTeamMembers([]); }
  };

  const fetchCompany = async () => {
    setLoadingCompany(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/settings/company', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCompanyData(data || {});
      } else {
        setCompanyData({});
      }
    } catch (error) {
      console.error(error);
      setCompanyData({});
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleDelete = (id: number) => {
    setDeleteChannelId(id);
  };

  const executeDeleteChannel = async () => {
    if (!deleteChannelId) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3001/api/channels/${deleteChannelId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchChannels();
        showNotification('Conexão removida com sucesso!', 'success');
      } else {
        showNotification('Erro ao remover conexão.', 'error');
      }
    } catch (e) { showNotification('Erro de conexão.', 'error'); }
    setDeleteChannelId(null);
  };

  const handleAddUser = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/settings/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newUser)
      });
      if (res.ok) {
        setNewUserOpen(false);
        setNewUser({ name: '', email: '', password: '', role: 'agent' });
        fetchTeam();
        showNotification('Membro adicionado com sucesso!', 'success');
      } else {
        const err = await res.json();
        showNotification(`Erro: ${err.error}`, 'error');
      }
    } catch (e) { showNotification('Erro de conexão ao adicionar membro.', 'error'); }
  };

  const handleDeleteUser = (id: string) => {
    setDeleteTarget(id);
  };

  const executeDeleteUser = async () => {
    if (!deleteTarget) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3001/api/settings/team/${deleteTarget}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchTeam();
        showNotification('Membro removido com sucesso!', 'success');
      } else {
        showNotification('Erro ao remover membro.', 'error');
      }
    } catch (e) { showNotification('Erro de conexão.', 'error'); }
    setDeleteTarget(null);
  };

  const handleSaveCompany = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/settings/company', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(companyData)
      });
      if (res.ok) {
        showNotification('Dados da empresa atualizados com sucesso!', 'success');
        fetchCompany();
      } else {
        const errData = await res.json().catch(() => ({}));
        showNotification(`Erro ao salvar: ${errData.error || res.statusText}`, 'error');
      }
    } catch (e) {
      console.error(e);
      showNotification('Erro de conexão ao salvar empresa.', 'error');
    }
  };

  return (
    <div className="p-8 bg-slate-50 h-full overflow-y-auto animate-fade-in font-sans text-slate-900">
      <header className="mb-10">
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-white rounded-2xl shadow-soft">
            <Settings className="w-6 h-6 text-meta" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Configurações</h1>
            <p className="text-slate-500 font-medium mt-1 text-sm">Gerencie canais, equipe e dados da empresa.</p>
          </div>
          <div className="ml-auto flex items-center gap-3 bg-white px-4 py-2 rounded-full shadow-soft border border-slate-100">
            <div title={socketConnected ? "Tempo Real Ativo" : "Desconectado do Servidor"} className={`w-2.5 h-2.5 rounded-full transition-all duration-500 ${socketConnected ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.4)]' : 'bg-red-400'}`}></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{socketConnected ? 'Online' : 'Offline'}</span>
          </div>
        </div>

        <div className="flex gap-2 p-1.5 bg-white/50 backdrop-blur-sm rounded-xl border border-slate-200/60 inline-flex">
          {['integrations', 'team', 'company'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`px-6 py-2.5 text-sm font-bold rounded-lg transition-all duration-300 ${activeTab === tab
                ? 'bg-white text-meta shadow-soft translate-y-[-1px]'
                : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'
                }`}
            >
              {tab === 'integrations' ? 'Canais' : tab === 'team' ? 'Equipe' : 'Empresa'}
            </button>
          ))}
        </div>
      </header>

      {/* NOTIFICATION TOAST */}
      {notification && (
        <div className={`fixed top-6 right-6 px-6 py-4 rounded-xl shadow-2xl z-50 flex items-center gap-3 animate-slide-in text-white font-bold ${notification.type === 'success' ? 'bg-emerald-500' : 'bg-rose-500'}`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          {notification.message}
        </div>
      )}



      {activeTab === 'integrations' && (
        <div className="max-w-5xl animate-fade-in">
          {viewMode === 'list' && (
            <div>
              <div className="flex justify-between items-end mb-8">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Canais de WhatsApp</h2>
                  <p className="text-slate-500 text-sm mt-1">Conecte seus números da API Oficial.</p>
                </div>
                <button onClick={() => { setEditId(null); setViewMode('form'); }} className="bg-slate-900 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg shadow-slate-900/10 hover:-translate-y-0.5 flex items-center gap-2">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center">+</div>
                  Nova Conexão
                </button>
              </div>

              <div className="flex flex-col gap-6">
                {channels.length === 0 && (
                  <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-soft">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <LayoutDashboard size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">Nenhum canal conectado ainda.</p>
                  </div>
                )}

                {channels.map(channel => {
                  const status = channel.status ? channel.status.toUpperCase() : 'PENDING';
                  const isConnected = status === 'CONNECTED';
                  const isVerified = status === 'VERIFIED';
                  const isPending = status === 'PENDING' || status === 'API_CONNECTED';

                  // Verifica se já existe OUTRO canal conectado (para sugerir webhook compartilhado)
                  const hasActiveConnection = channels.some(c => c.id !== channel.id && (c.status?.toUpperCase() === 'CONNECTED' || c.status?.toUpperCase() === 'VERIFIED'));

                  return (
                    <div key={channel.id} className="bg-white rounded-3xl p-6 shadow-soft border border-slate-100 hover:border-slate-200 transition-all group relative overflow-hidden">

                      {/* MODAL DE DELEÇÃO DE CANAL ESPECIFICO (INTERNAL) */}
                      {deleteTarget === 'channel' && deleteChannelId === channel.id && (
                        <div className="absolute inset-0 bg-white/90 backdrop-blur-sm z-20 flex items-center justify-center animate-fade-in p-6 text-center">
                          <div>
                            <p className="font-bold text-slate-900 mb-4">Tem certeza que deseja remover este canal?</p>
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => { setDeleteTarget(null); setDeleteChannelId(null); }} className="px-4 py-2 border rounded-lg text-sm font-bold text-slate-500">Cancelar</button>
                              <button onClick={async () => {
                                setDeleteTarget(null);
                                setDeleteChannelId(null);
                                const token = localStorage.getItem('token');
                                try {
                                  await fetch(`http://localhost:3001/api/channels/${channel.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
                                  fetchChannels();
                                  showNotification('Removido!', 'success');
                                } catch (e) { showNotification('Erro.', 'error'); }
                              }} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm font-bold">Sim, Remover</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Exibição Compacta se CONECTADO */}
                      {isConnected ? (
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 bg-[#25D366] rounded-2xl flex items-center justify-center text-white shadow-lg shadow-green-200 shrink-0">
                            <Smartphone size={32} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="font-bold text-slate-900 text-xl tracking-tight">{channel.instance_name}</h3>
                              <span className="bg-green-100 text-green-700 text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border border-green-200 tracking-wide">Oficial</span>
                            </div>
                            <p className="text-sm text-slate-500 font-medium font-mono">{channel.display_phone_number || 'Sem número'}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex flex-col items-end mr-4">
                              <div className="flex items-center gap-1.5 text-green-600 font-bold text-xs uppercase tracking-wider mb-1">
                                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Ativo
                              </div>
                              <span className="text-[10px] text-slate-400 font-bold">{channel.quality_rating || 'GREEN'} QUALITY</span>
                            </div>
                            <button onClick={() => { setEditId(channel.id); setViewMode('form'); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"><Settings size={18} /></button>
                            <button onClick={() => { setDeleteTarget('channel'); setDeleteChannelId(channel.id); }} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"><Trash2 size={18} /></button>
                          </div>
                        </div>
                      ) : (
                        /* Wizard de Configuração */
                        <div>
                          <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-400">
                                <Settings size={22} />
                              </div>
                              <div>
                                <h3 className="font-bold text-slate-900 text-lg">{channel.instance_name}</h3>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-2" >
                                  Configuração Pendente ({status})
                                  <button onClick={fetchChannels} title="Atualizar Status" className="hover:text-blue-500 hover:bg-slate-100 p-1 rounded-full transition-colors"><RefreshCw size={12} /></button>
                                </p>
                              </div>
                            </div>
                            <button onClick={() => { setDeleteTarget('channel'); setDeleteChannelId(channel.id); }} className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-50 text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors"><X size={16} /></button>
                          </div>

                          {/* Stepper Visual */}
                          <div className="grid grid-cols-3 gap-3 mb-8 px-2 relative">
                            {/* Linha de Conexão */}
                            <div className="absolute top-2.5 left-10 right-10 h-0.5 bg-slate-100 -z-10" />

                            {/* Step 1: Credenciais */}
                            <div className="flex flex-col items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-bold border-2 border-white ring-2 ring-emerald-100"><CheckCircle size={12} /></div>
                              <span className="text-[10px] font-bold uppercase text-emerald-600 tracking-wider">Credenciais</span>
                            </div>
                            {/* Step 2: Webhook */}
                            <div className="flex flex-col items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ring-2 transition-all ${(isVerified || isConnected || hasActiveConnection) ? 'bg-emerald-500 text-white ring-emerald-100' : 'bg-white text-slate-400 ring-slate-100'}`}>
                                {(isVerified || isConnected || hasActiveConnection) ? <CheckCircle size={12} /> : '2'}
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${(isVerified || isConnected || hasActiveConnection) ? 'text-emerald-600' : 'text-slate-400'}`}>Webhook</span>
                            </div>
                            {/* Step 3: Validação */}
                            <div className="flex flex-col items-center gap-2">
                              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold border-2 border-white ring-2 transition-all ${isConnected ? 'bg-emerald-500 text-white ring-emerald-100' : 'bg-white text-slate-400 ring-slate-100'}`}>
                                {isConnected ? <CheckCircle size={12} /> : '3'}
                              </div>
                              <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors ${isConnected ? 'text-emerald-600' : 'text-slate-400'}`}>Validação</span>
                            </div>
                          </div>

                          {/* Area de Instruções Dinâmicas */}
                          <div className="bg-slate-50/80 rounded-2xl p-6 border border-slate-200/60 relative overflow-hidden">
                            {/* Decoração de fundo */}
                            <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none"><Settings size={100} /></div>

                            {isVerified ? (
                              <div className="space-y-4 relative z-10">
                                <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                                  <CheckCircle size={18} />
                                  Webhook Validado! Último passo.
                                </div>
                                <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                                  A conexão lógica está pronta. Agora precisamos validar o tráfego de mensagens.
                                  <br />Envie uma mensagem (ex: "Oi") do seu celular para este número ou use o teste abaixo.
                                </p>
                                <button onClick={() => handleTestConnection(channel.id)} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-sm shadow-lg shadow-blue-600/20 hover:bg-blue-700 hover:scale-[1.02] transition-all flex items-center gap-2 w-max">
                                  {testLoading === channel.id ? <RefreshCw className="animate-spin" size={16} /> : <Wifi size={16} />}
                                  {testLoading === channel.id ? `Aguardando Mensagem (${timeLeft}s)` : 'Iniciar Validação de Recebimento'}
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-4 relative z-10">
                                {hasActiveConnection ? (
                                  <>
                                    <div className="flex items-center gap-2 text-blue-600 font-bold text-sm">
                                      <CheckCircle size={18} />
                                      Webhook Compartilhado Detectado
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                                      Como você já tem canais conectados, o Webhook da Meta provavelmente já está ativo para este App.
                                      <br /><span className="font-bold text-slate-700">NÃO altere a URL na Meta para não derrubar os outros.</span>
                                    </p>

                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mt-4 flex items-center gap-3 animate-pulse">
                                      <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center shrink-0">
                                        <Smartphone size={16} className="animate-bounce" />
                                      </div>
                                      <div>
                                        <p className="text-blue-700 font-bold text-[10px] uppercase tracking-wider mb-0.5">Aguardando Recebimento</p>
                                        <p className="text-blue-900 text-sm font-bold">Envie uma mensagem (ex: "Oi") para este número agora para concluir a ativação.</p>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <div className="flex items-center gap-2 text-amber-600 font-bold text-sm">
                                      <div className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
                                      Ação Necessária: Assinar Webhook
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed max-w-lg">
                                      Para receber mensagens, você precisa configurar o Webhook no painel da Meta for Developers.
                                      <br />O sistema detectará automaticamente assim que você clicar em <b>"Verificar e Salvar"</b> lá.
                                    </p>
                                  </>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">URL de Callback (HTTPS)</label>
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2.5">
                                      <code className="text-xs font-mono font-bold text-slate-700 flex-1 truncate select-all">https://sua-url-ngrok.ngrok-free.app/api/webhooks/whatsapp</code>
                                      <button onClick={() => showNotification("Copie a URL do seu Ngrok/Servidor", "success")} className="text-slate-400 hover:text-blue-500"><Copy size={14} /></button>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1">* Use a URL pública do seu servidor/ngrok.</p>
                                  </div>

                                  <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Token de Verificação</label>
                                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-2.5">
                                      <code className="text-xs font-mono font-bold text-slate-700 flex-1 truncate select-all">{tenantVerifyToken}</code>
                                      <button onClick={() => { navigator.clipboard.writeText(tenantVerifyToken); showNotification("Token copiado!", "success"); }} className="text-slate-400 hover:text-blue-500"><Copy size={14} /></button>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}

              </div>
            </div>
          )}

          {viewMode === 'form' && (
            <WhatsAppOfficialForm editId={editId} onCancel={() => setViewMode('list')} onSuccess={() => { setViewMode('list'); fetchChannels(); }} />
          )}
        </div >
      )}


      {
        activeTab === 'team' && (
          <div className="max-w-4xl animate-fade-in">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-xl font-bold text-slate-800">Membros da Equipe</h2>
                <p className="text-slate-500 text-sm mt-1">Gerencie quem tem acesso ao painel.</p>
              </div>
              <button onClick={() => setNewUserOpen(true)} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all shadow-lg btn-hover-effect">
                + Convidar
              </button>
            </div>

            {newUserOpen && (
              <div className="mb-8 p-6 bg-white rounded-3xl shadow-soft border border-slate-100 animate-slide-up">
                <h3 className="font-bold text-slate-900 mb-4">Novo Membro</h3>
                <div className="grid grid-cols-2 gap-5 mb-6">
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Nome</label>
                    <input type="text" className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-meta/20 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} placeholder="Nome completo" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Email</label>
                    <input type="email" className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-meta/20 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} placeholder="email@exemplo.com" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Senha Provisória</label>
                    <input type="password" className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-meta/20 outline-none transition-all placeholder:text-slate-300 text-sm font-medium" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••" />
                  </div>
                  <div className="col-span-1">
                    <label className="text-xs font-bold text-slate-400 uppercase ml-1 mb-1 block">Função</label>
                    <select className="w-full p-3 bg-slate-50 border-none rounded-xl focus:ring-2 focus:ring-meta/20 outline-none transition-all text-sm font-medium text-slate-700" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                      <option value="agent">Agente (Padrão)</option>
                      <option value="admin">Administrador</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setNewUserOpen(false)} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                  <button onClick={handleAddUser} className="bg-meta text-white px-4 py-1.5 rounded text-sm font-bold">Salvar</button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-3xl shadow-soft border border-slate-100 overflow-hidden">
              <div className="divide-y divide-slate-50">
                {teamMembers.map(member => (
                  <div key={member.id} className="p-5 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-center gap-5">
                      <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center text-slate-500 font-bold text-lg shadow-inner">
                        {member.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{member.name}</h3>
                        <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                          <Mail size={12} /> {member.email}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 ${member.role === 'admin' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>
                        <Shield size={10} /> {member.role}
                      </span>
                      <button onClick={() => handleDeleteUser(member.id)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all">
                        <span className="text-xl block pb-1">×</span>
                      </button>
                    </div>
                  </div>
                ))}
                {teamMembers.length === 0 && <div className="p-8 text-center text-slate-400 text-sm">Nenhum membro encontrado.</div>}
              </div>
            </div>
          </div>
        )
      }

      {
        activeTab === 'company' && (
          <div className="max-w-3xl animate-fade-in mx-auto">
            {!companyData ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-300 mb-6"></div>
                <p className="font-medium animate-pulse">Carregando dados...</p>
              </div>
            ) : (
              <div className="bg-white rounded-[2rem] p-10 shadow-soft border border-slate-100 relative">
                {/* Header Decorativo */}
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-meta to-wa rounded-t-[2rem]"></div>

                <div className="flex justify-between items-start mb-10">
                  <div>
                    <h2 className="text-2xl font-bold text-slate-900">Perfil da Empresa</h2>
                    <p className="text-slate-500 mt-1">Esses dados aparecerão nas faturas e relatórios.</p>
                  </div>
                  {!isEditingCompany && (
                    <button onClick={() => setIsEditingCompany(true)} className="bg-blue-50 text-blue-600 px-5 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-100 transition-colors">
                      Editar Dados
                    </button>
                  )}
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nome da Empresa</label>
                    <input disabled={!isEditingCompany} type="text" className={`w-full p-4 rounded-2xl transition-all duration-300 font-medium text-slate-700 ${isEditingCompany ? 'bg-white border-2 border-primary/20 focus:border-meta shadow-sm' : 'bg-slate-50 border-2 border-transparent text-slate-500 cursor-not-allowed'}`} value={companyData.company_name || ''} onChange={e => setCompanyData({ ...companyData, company_name: e.target.value })} placeholder="Ex: Minha Empresa Ltda" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">CNPJ</label>
                      <input disabled={!isEditingCompany} type="text" className={`w-full p-4 rounded-2xl transition-all duration-300 font-medium text-slate-700 ${isEditingCompany ? 'bg-white border-2 border-primary/20 focus:border-meta shadow-sm' : 'bg-slate-50 border-2 border-transparent text-slate-500 cursor-not-allowed'}`} value={companyData.cnpj || ''} onChange={e => setCompanyData({ ...companyData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Telefone</label>
                      <input disabled={!isEditingCompany} type="text" className={`w-full p-4 rounded-2xl transition-all duration-300 font-medium text-slate-700 ${isEditingCompany ? 'bg-white border-2 border-primary/20 focus:border-meta shadow-sm' : 'bg-slate-50 border-2 border-transparent text-slate-500 cursor-not-allowed'}`} value={companyData.contact_phone || ''} onChange={e => setCompanyData({ ...companyData, contact_phone: e.target.value })} placeholder="(00) 00000-0000" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Email Financeiro</label>
                    <input disabled={!isEditingCompany} type="text" className={`w-full p-4 rounded-2xl transition-all duration-300 font-medium text-slate-700 ${isEditingCompany ? 'bg-white border-2 border-primary/20 focus:border-meta shadow-sm' : 'bg-slate-50 border-2 border-transparent text-slate-500 cursor-not-allowed'}`} value={companyData.contact_email || ''} onChange={e => setCompanyData({ ...companyData, contact_email: e.target.value })} placeholder="financeiro@empresa.com" />
                  </div>
                  <div className="grid grid-cols-3 gap-6">
                    <div className="col-span-1">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Website</label>
                      <input disabled={!isEditingCompany} type="text" className={`w-full p-4 rounded-2xl transition-all duration-300 font-medium text-slate-700 ${isEditingCompany ? 'bg-white border-2 border-primary/20 focus:border-meta shadow-sm' : 'bg-slate-50 border-2 border-transparent text-slate-500 cursor-not-allowed'}`} value={companyData.website || ''} onChange={e => setCompanyData({ ...companyData, website: e.target.value })} placeholder="https://..." />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Endereço</label>
                      <input disabled={!isEditingCompany} type="text" className={`w-full p-4 rounded-2xl transition-all duration-300 font-medium text-slate-700 ${isEditingCompany ? 'bg-white border-2 border-primary/20 focus:border-meta shadow-sm' : 'bg-slate-50 border-2 border-transparent text-slate-500 cursor-not-allowed'}`} value={companyData.address || ''} onChange={e => setCompanyData({ ...companyData, address: e.target.value })} placeholder="Rua..., Cidade - UF" />
                    </div>
                  </div>

                  {isEditingCompany && (
                    <div className="pt-8 mt-4 border-t border-slate-100 flex justify-end gap-3 animate-slide-up">
                      <button onClick={() => { setIsEditingCompany(false); fetchCompany(); }} className="text-slate-500 px-6 py-3 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
                      <button onClick={async () => { await handleSaveCompany(); setIsEditingCompany(false); }} className="bg-slate-900 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.02] transition-transform">Salvar Alterações</button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )
      }

      {/* Notification Toast */}


      {/* Test Modal (Added) */}
      {
        showTestModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md relative animate-slide-up overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-meta to-wa"></div>

              <div className="text-center mb-8 pt-4">
                <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                  <Smartphone size={40} className="text-meta" />
                  <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm">
                    <Wifi size={16} className="text-green-500 animate-pulse" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-slate-800 mb-2">Teste de Conexão</h3>
                <p className="text-slate-500 text-sm px-4 leading-relaxed">Envie uma mensagem do <b>SEU celular</b> para o número conectado <b>AGORA</b>.</p>
              </div>

              <div className="flex flex-col items-center justify-center mb-8">
                <div className="text-4xl font-black text-slate-900 font-mono tracking-tight mb-1">
                  00:{timeLeft < 10 ? `0${timeLeft}` : timeLeft}
                </div>
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Segundos Restantes</p>
              </div>

              <button onClick={() => { setShowTestModal(false); setTestLoading(null); }} className="w-full py-3.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">
                Cancelar Teste
              </button>
            </div>
          </div>
        )
      }

      {/* Delete Confirmation Modal (User Only) */}
      {deleteTarget && deleteTarget !== 'channel' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm relative animate-slide-up overflow-hidden">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Remover Item?</h3>
              <p className="text-slate-500 text-sm">Essa ação não pode ser desfeita.</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition-colors">Cancelar</button>
              <button onClick={activeTab === 'team' ? executeDeleteUser : () => setDeleteTarget(null)} className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-500/20">Remover</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationScreen;