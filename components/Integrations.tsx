import React, { useState, useEffect } from 'react';
import { MessageSquare, ShieldCheck, Link2, Users, Mail, Shield, Globe, Copy, Settings, LayoutDashboard, CheckCircle, AlertCircle, X, Smartphone, Wifi } from 'lucide-react';
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
  /* Step 2: Corrigir estado e loading */
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
    socket.on('channel_status_update', (data: { id: number, status: string }) => {
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
    try {
      const res = await fetch('http://localhost:3001/api/channels', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setChannels(data);
    } catch (error) { console.error(error); }
  };

  const fetchTeam = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/settings/team', { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setTeamMembers(data);
    } catch (error) { console.error(error); }
  };



  /* Step 3: Reimplementar fetchCompany com robustez */
  const fetchCompany = async () => {
    setLoadingCompany(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/settings/company', { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setCompanyData(data || {});
      } else {
        setCompanyData({}); // Fallback se 404
      }
    } catch (error) {
      console.error(error);
      setCompanyData({});
    } finally {
      setLoadingCompany(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza? Isso removerá a integração.')) return;
    const token = localStorage.getItem('token');
    await fetch(`http://localhost:3001/api/channels/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });
    fetchChannels();
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
        alert('Membro adicionado!');
      } else {
        const err = await res.json();
        alert('Erro: ' + err.error);
      }
    } catch (e) { alert('Erro de conexão'); }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Remover membro da equipe?')) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`http://localhost:3001/api/settings/team/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) fetchTeam();
      else alert('Erro ao remover membro');
    } catch (e) { alert('Erro de conexão'); }
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
        console.error('Erro detalhado:', errData);
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

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {channels.length === 0 && (
                  <div className="col-span-2 text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 shadow-soft">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-300">
                      <LayoutDashboard size={32} />
                    </div>
                    <p className="text-slate-400 font-medium">Nenhum canal conectado ainda.</p>
                  </div>
                )}

                {channels.map(channel => (
                  <div key={channel.id} className="group bg-white p-6 rounded-3xl shadow-soft border border-slate-100 hover:shadow-floating transition-all duration-300 relative overflow-hidden">
                    <div className="flex items-start justify-between mb-6">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl flex items-center justify-center text-meta shadow-inner border border-white">
                          <ShieldCheck size={28} />
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-slate-900 leading-tight">{channel.verified_name || channel.instance_name}</h3>
                          <p className="text-xs text-slate-500 font-mono mt-1 bg-slate-50 px-2 py-0.5 rounded-md inline-block">{channel.display_phone_number || `ID: ${channel.phone_number_id}`}</p>
                        </div>
                      </div>

                      <div className={`px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${(channel.status === 'CONNECTED' || channel.status === 'connected') ? 'bg-green-50 text-green-600 border-green-100' :
                        (channel.status === 'VERIFIED') ? 'bg-blue-50 text-blue-600 border-blue-100' :
                          (channel.status === 'PENDING') ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                        }`}>
                        {channel.status}
                      </div>
                    </div>

                    {channel.quality_rating && (
                      <div className="flex items-center gap-2 mb-6 ml-1">
                        <div className="flex gap-1">
                          {[1, 2, 3].map(i => (
                            <div key={i} className={`w-8 h-1.5 rounded-full ${channel.quality_rating === 'GREEN' ? 'bg-green-500' :
                              channel.quality_rating === 'YELLOW' && i <= 2 ? 'bg-amber-400' :
                                channel.quality_rating === 'RED' && i === 1 ? 'bg-red-500' : 'bg-slate-100'
                              }`}></div>
                          ))}
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{channel.quality_rating} QUALITY</span>
                      </div>
                    )}

                    <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                      <button onClick={() => { setEditId(channel.id); setViewMode('form'); }} className="flex-1 py-2.5 rounded-xl text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 transition-colors">CONFIGURAR</button>
                      <button onClick={() => handleTestConnection(channel.id)} disabled={testLoading === channel.id} className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${testLoading === channel.id ? 'bg-amber-50 text-amber-600' : 'bg-white border border-slate-100 text-slate-600 hover:border-slate-300'
                        }`}>
                        {testLoading === channel.id ? `TESTANDO ${timeLeft}s` : 'TESTAR ENVIO'}
                      </button>
                      <button onClick={() => handleDelete(channel.id)} className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <span className="text-xl">×</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {viewMode === 'form' && (
            <WhatsAppOfficialForm editId={editId} onCancel={() => setViewMode('list')} onSuccess={() => { setViewMode('list'); fetchChannels(); }} />
          )}
        </div>
      )}

      {activeTab === 'team' && (
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
      )}

      {activeTab === 'company' && (
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
      )}

      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 px-6 py-4 rounded-xl shadow-floating flex items-center gap-3 animate-fade-in-down border ${notification.type === 'success' ? 'bg-green-500 border-green-400 text-white' : 'bg-red-500 border-red-400 text-white'
          }`}>
          {notification.type === 'success' ? <CheckCircle size={20} /> : <AlertCircle size={20} />}
          <span className="font-bold text-sm">{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default IntegrationScreen;