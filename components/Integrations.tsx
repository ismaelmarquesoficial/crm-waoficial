import React, { useState, useEffect } from 'react';
import { MessageSquare, ShieldCheck, Link2, Users, Mail, Shield, Globe, Copy } from 'lucide-react';
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
      // Reset form for new connection
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
  // Ajuste: tenant_id vem do banco/login como snake_case
  const tenantId = user.tenant_id || user.tenantId;
  const tenantVerifyToken = tenantId ? `talke_tenant_${tenantId}` : 'talke_ia_master_secure_2024';

  return (
    <div className="space-y-4 animate-fade-in border border-slate-200 p-6 rounded-2xl bg-white shadow-sm">
      <h3 className="font-bold text-lg text-slate-800">{editId ? 'Editar Conexão' : 'Nova Conexão Oficial'}</h3>

      {/* Webhook Configuration Block */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <h4 className="text-blue-800 font-bold text-sm mb-2 flex items-center gap-2">
          <Globe size={16} /> Configuração do Webhook (Meta)
        </h4>
        <p className="text-xs text-blue-600 mb-3">
          Para ativar o recebimento de mensagens, configure estes dados no painel do seu App na Meta.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Callback URL</label>
            <div className="flex items-center bg-white border border-blue-200 rounded px-3 py-2">
              <code className="text-xs text-slate-600 flex-1 overflow-hidden text-ellipsis whitespace-nowrap">
                https://SEU_DOMINIO/api/webhooks/whatsapp
              </code>
              <button className="text-blue-500 hover:text-blue-700 ml-2" title="Lembre-se de trocar SEU_DOMINIO pela URL do Ngrok">
                <Copy size={12} />
              </button>
            </div>
          </div>
          <div>
            <label className="block text-[10px] uppercase font-bold text-blue-400 mb-1">Verify Token</label>
            <div className="flex items-center bg-white border border-blue-200 rounded px-3 py-2">
              <code className="text-xs text-slate-800 font-bold flex-1">{tenantVerifyToken}</code>
              <button
                onClick={() => navigator.clipboard.writeText(tenantVerifyToken)}
                className="text-blue-500 hover:text-blue-700 ml-2"
              >
                <Copy size={12} />
              </button>
            </div>
          </div>
        </div>
      </div>


      <div>
        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">Nome da Instância (Identificação)</label>
        <input
          name="instanceName" value={formData.instanceName} onChange={handleChange}
          type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-meta transition-all" placeholder="Ex: WhatsApp Vendas"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">App ID</label>
          <input name="appId" value={formData.appId} onChange={handleChange} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-meta transition-all" placeholder="Ex: 10928..." />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">App Secret</label>
          <input name="appSecret" value={formData.appSecret} onChange={handleChange} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-meta transition-all" placeholder="••••••••" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">WABA ID</label>
          <input name="wabaId" value={formData.wabaId} onChange={handleChange} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-meta transition-all" placeholder="ID da Conta WhatsApp" />
        </div>
        <div>
          <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">Phone Number ID</label>
          <input name="phoneNumberId" value={formData.phoneNumberId} onChange={handleChange} type="text" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-meta transition-all" placeholder="ID do Número" />
        </div>
      </div>

      <div>
        <label className="block text-[10px] uppercase font-bold text-slate-400 mb-1.5 tracking-widest">Permanent Token (Token de Acesso)</label>
        <input name="permanentToken" value={formData.permanentToken} onChange={handleChange} type="password" className="w-full bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm outline-none focus:border-meta transition-all" placeholder="EAAB..." />
      </div>

      <div className="flex gap-2 pt-2">
        <button onClick={onCancel} className="flex-1 py-3 text-slate-500 hover:bg-slate-100 rounded-lg text-sm font-medium transition-colors">
          Cancelar
        </button>
        <button onClick={handleSave} disabled={isLoading} className="flex-1 bg-slate-900 text-white text-sm font-medium py-3 rounded-lg hover:bg-meta transition-colors shadow-lg shadow-slate-200 disabled:opacity-70">
          {isLoading ? 'Salvando...' : 'Salvar'}
        </button>
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

  const handleTestConnection = async (id: number) => {
    setTestLoading(id);
    setTimeLeft(30);
    alert('⏳ MODO DE TESTE ATIVADO:\n\nEnvie uma mensagem do SEU celular para o número conectado AGORA.\n\nVocê tem 30 segundos!');
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
      alert('⚠️ FALHA: Nenhuma mensagem recebida em 30s.\n\nO status da conexão foi alterado para PENDIENTE (Amarelo). Verifique seu Webhook e tente novamente.');
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
        alert('✅ SUCESSO! Mensagem recebida.\n\nA conexão foi confirmada e o status atualizado para CONECTADO (Verde).');
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
        alert('Dados da empresa atualizados!');
        fetchCompany();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Erro ao salvar dados: ${errData.error || res.statusText}`);
        console.error('Erro detalhado:', errData);
      }
    } catch (e) {
      console.error(e);
      alert('Erro de conexão ao salvar empresa.');
    }
  };

  return (
    <div className="p-8 bg-white h-full overflow-y-auto animate-fade-in">
      <header className="mb-8 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-light tracking-tight text-slate-900">Configurações</h1>
          <div title={socketConnected ? "Tempo Real Ativo" : "Desconectado do Servidor"} className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`}></div>
        </div>
        <div className="flex gap-6 mt-6">
          <button onClick={() => setActiveTab('integrations')} className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'integrations' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Integrações</button>
          <button onClick={() => setActiveTab('team')} className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'team' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Equipe</button>
          <button onClick={() => setActiveTab('company')} className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'company' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}>Empresa</button>
        </div>
      </header>

      {activeTab === 'integrations' && (
        <div className="max-w-4xl">
          {viewMode === 'list' && (
            <div className="animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h2 className="font-bold text-slate-800">Canais Conectados</h2>
                  <p className="text-sm text-slate-500">Gerencie suas conexões de WhatsApp.</p>
                </div>
                <button onClick={() => { setEditId(null); setViewMode('form'); }} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2">
                  + Nova Conexão
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {channels.length === 0 && <div className="text-slate-400 text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum canal conectado.</div>}

                {channels.map(channel => (
                  <div key={channel.id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-white shadow-sm hover:border-meta/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-meta/10 rounded-full flex items-center justify-center text-meta"><ShieldCheck size={24} /></div>
                      <div>
                        <h3 className="font-bold text-slate-900">{channel.verified_name || channel.instance_name}</h3>
                        <p className="text-xs text-slate-500 font-mono tracking-wide">{channel.display_phone_number || `ID: ${channel.phone_number_id}`}</p>
                        {channel.quality_rating && (
                          <div className="flex items-center gap-1 mt-1">
                            <div className={`w-2 h-2 rounded-full ${channel.quality_rating === 'GREEN' ? 'bg-green-500' : channel.quality_rating === 'RED' ? 'bg-red-500' : 'bg-amber-400'}`}></div>
                            <span className="text-[10px] text-slate-400 uppercase font-bold">{channel.quality_rating} QUALITY</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Badge Status Lógica aqui (igual anterior) */}
                      <span className={`px-2 py-1 text-[10px] font-bold rounded-full uppercase ${(channel.status === 'CONNECTED' || channel.status === 'connected') ? 'bg-green-100 text-green-700' :
                        (channel.status === 'VERIFIED') ? 'bg-blue-100 text-blue-700' :
                          (channel.status === 'PENDING') ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'
                        }`}>{channel.status}</span>

                      <button onClick={() => handleTestConnection(channel.id)} disabled={testLoading === channel.id} className={`p-2 rounded-lg transition-colors border text-[10px] font-bold uppercase tracking-wider ${testLoading === channel.id ? 'bg-slate-100 text-slate-400' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                        {testLoading === channel.id ? `${timeLeft}s` : 'Testar'}
                      </button>
                      <button onClick={() => { setEditId(channel.id); setViewMode('form'); }} className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">Editar</button>
                      <button onClick={() => handleDelete(channel.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">Excluir</button>
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
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="font-bold text-slate-900">Membros da Equipe</h2>
              <p className="text-sm text-slate-500">Gerencie quem tem acesso ao painel deste Tenant.</p>
            </div>
            <button onClick={() => setNewUserOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
              + Adicionar Membro
            </button>
          </div>

          {newUserOpen && (
            <div className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-4 animate-fade-in-down">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Nome" className="p-2 rounded border" value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                <input type="email" placeholder="Email" className="p-2 rounded border" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                <input type="password" placeholder="Senha" className="p-2 rounded border" value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                <select className="p-2 rounded border" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="agent">Agente</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="flex justify-end gap-2">
                <button onClick={() => setNewUserOpen(false)} className="text-slate-500 text-sm">Cancelar</button>
                <button onClick={handleAddUser} className="bg-meta text-white px-4 py-1.5 rounded text-sm font-bold">Salvar</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-slate-100">
              {teamMembers.map(member => (
                <div key={member.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-200 rounded-full flex items-center justify-center text-slate-500 font-bold">{member.name.charAt(0)}</div>
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">{member.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail size={12} /> {member.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${member.role === 'admin' ? 'bg-meta/10 text-meta' : 'bg-slate-100 text-slate-600'}`}>
                      <Shield size={12} /> {member.role}
                    </span>
                    <button onClick={() => handleDeleteUser(member.id)} className="text-slate-400 hover:text-red-600 text-sm font-medium">Remover</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'company' && (
        <div className="max-w-2xl animate-fade-in">
          {!companyData ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-400 mb-4"></div>
              <p>Carregando dados da empresa...</p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="font-bold text-slate-900 mb-6">Dados da Empresa (Tenant)</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nome da Empresa</label>
                  <input disabled={!isEditingCompany} type="text" className={`w-full p-2 border rounded-lg transition-colors ${isEditingCompany ? 'bg-white border-blue-300' : 'bg-slate-50 border-transparent'}`} value={companyData.company_name || ''} onChange={e => setCompanyData({ ...companyData, company_name: e.target.value })} placeholder="Ex: Minha Empresa Ltda" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ</label>
                    <input disabled={!isEditingCompany} type="text" className={`w-full p-2 border rounded-lg transition-colors ${isEditingCompany ? 'bg-white border-blue-300' : 'bg-slate-50 border-transparent'}`} value={companyData.cnpj || ''} onChange={e => setCompanyData({ ...companyData, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Telefone Contato</label>
                    <input disabled={!isEditingCompany} type="text" className={`w-full p-2 border rounded-lg transition-colors ${isEditingCompany ? 'bg-white border-blue-300' : 'bg-slate-50 border-transparent'}`} value={companyData.contact_phone || ''} onChange={e => setCompanyData({ ...companyData, contact_phone: e.target.value })} placeholder="(00) 00000-0000" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Email Contato</label>
                  <input disabled={!isEditingCompany} type="text" className={`w-full p-2 border rounded-lg transition-colors ${isEditingCompany ? 'bg-white border-blue-300' : 'bg-slate-50 border-transparent'}`} value={companyData.contact_email || ''} onChange={e => setCompanyData({ ...companyData, contact_email: e.target.value })} placeholder="contato@empresa.com" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Website</label>
                  <input disabled={!isEditingCompany} type="text" className={`w-full p-2 border rounded-lg transition-colors ${isEditingCompany ? 'bg-white border-blue-300' : 'bg-slate-50 border-transparent'}`} value={companyData.website || ''} onChange={e => setCompanyData({ ...companyData, website: e.target.value })} placeholder="https://..." />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Endereço</label>
                  <textarea disabled={!isEditingCompany} className={`w-full p-2 border rounded-lg transition-colors ${isEditingCompany ? 'bg-white border-blue-300' : 'bg-slate-50 border-transparent'}`} rows={3} value={companyData.address || ''} onChange={e => setCompanyData({ ...companyData, address: e.target.value })} placeholder="Rua..." />
                </div>

                <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                  {!isEditingCompany ? (
                    <button onClick={() => setIsEditingCompany(true)} className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-blue-700 transition shadow-sm flex items-center gap-2">
                      <span className="text-lg">✎</span> Editar Dados
                    </button>
                  ) : (
                    <>
                      <button onClick={() => { setIsEditingCompany(false); fetchCompany(); }} className="text-slate-500 px-4 py-2 rounded-lg font-medium hover:bg-slate-100 transition">Cancelar</button>
                      <button onClick={async () => { await handleSaveCompany(); setIsEditingCompany(false); }} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold hover:bg-green-700 transition shadow-sm">Salvar Alterações</button>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IntegrationScreen;