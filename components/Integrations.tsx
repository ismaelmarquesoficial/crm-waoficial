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
  const tenantVerifyToken = user.tenantId ? `talke_tenant_${user.tenantId}` : 'talke_ia_master_secure_2024';

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
  const [activeTab, setActiveTab] = useState<'integrations' | 'team'>('integrations');
  const [channels, setChannels] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'form'>('list');
  const [editId, setEditId] = useState<number | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  const [testLoading, setTestLoading] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);

  const handleTestConnection = async (id: number) => {
    setTestLoading(id);
    setTimeLeft(30); // Inicia contagem de 30s

    // Aviso ao usuário
    alert('⏳ MODO DE TESTE ATIVADO:\n\nEnvie uma mensagem do SEU celular para o número conectado AGORA.\n\nVocê tem 30 segundos!');
  };

  // Ref para acessar o estado dentro do listener do socket sem recriar o listener
  const testLoadingRef = React.useRef<number | null>(null);
  useEffect(() => { testLoadingRef.current = testLoading; }, [testLoading]);

  // Efeito do Cronômetro
  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (testLoading && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (testLoading && timeLeft === 0) {
      // TEMPO ESGOTADO = FALHA
      handleTestFailure(testLoading);
    }

    return () => clearInterval(interval);
  }, [testLoading, timeLeft]);

  const handleTestFailure = async (id: number) => {
    // 1. Feedback Visual Imediato (Optimistic Update)
    setChannels(prev => prev.map(ch =>
      ch.id === id ? { ...ch, status: 'PENDING' } : ch
    ));
    setTestLoading(null);

    // 2. Atualizar no Banco (Background)
    const token = localStorage.getItem('token');
    try {
      await fetch(`http://localhost:3001/api/channels/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'PENDING' })
      });
    } catch (e) {
      console.error(e);
    }

    // 3. Avisar o usuário (Só depois de mudar a cor visualmente)
    // Um pequeno timeout para garantir que o React renderizou o estado 'PENDING' antes de travar no alert
    setTimeout(() => {
      alert('⚠️ FALHA: Nenhuma mensagem recebida em 30s.\n\nO status da conexão foi alterado para PENDIENTE (Amarelo). Verifique seu Webhook e tente novamente.');
      fetchChannels(); // Garante sincronia final
    }, 100);
  };

  useEffect(() => {
    const socket = io('http://localhost:3001');
    const userString = localStorage.getItem('user');

    socket.on('connect', () => {
      console.log('🟢 Socket Conectado!', socket.id);
      setSocketConnected(true);
      if (userString) {
        try {
          const user = JSON.parse(userString);
          if (user.tenantId) {
            socket.emit('join_tenant', user.tenantId);
            console.log('🗣️ Entrando na sala: tenant_' + user.tenantId);
          }
        } catch (e) { console.error(e); }
      }
    });

    socket.on('disconnect', () => {
      console.log('🔴 Socket Desconectado');
      setSocketConnected(false);
    });

    socket.on('channel_status_update', (data: { id: number, status: string }) => {
      console.log('⚡ ATUALIZAÇÃO RECEBIDA:', data);
      setChannels(prev => prev.map(ch =>
        ch.id === data.id ? { ...ch, status: data.status } : ch
      ));
      fetchChannels();
    });

    // SUCESSO DO TESTE (Passivo)
    socket.on('new_message', (data) => {
      // Se estamos em modo de teste, qualquer mensagem nova conta como sucesso
      if (testLoadingRef.current) {
        alert('✅ SUCESSO! Mensagem recebida.\n\nA conexão foi confirmada e o status atualizado para CONECTADO (Verde).');
        setTestLoading(null);
        setTimeLeft(0);
        fetchChannels();
      }
    });

    // Listener legado (caso o backend envie)
    socket.on('connection_test_success', (data: { channelId: number }) => {
      if (testLoadingRef.current) {
        setTestLoading(null); // Só para garantir, mas o new_message deve pegar
        setTimeLeft(0);
      }
    });

    if (activeTab === 'integrations' && viewMode === 'list') {
      fetchChannels();
    }

    return () => {
      socket.disconnect();
    };
  }, [activeTab, viewMode]);

  const fetchChannels = async () => {
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('http://localhost:3001/api/channels', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setChannels(data);
    } catch (error) {
      console.error(error);
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

  return (
    <div className="p-8 bg-white h-full overflow-y-auto animate-fade-in">
      <header className="mb-8 border-b border-slate-100 pb-2">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-light tracking-tight text-slate-900">Configurações</h1>
          <div title={socketConnected ? "Tempo Real Ativo" : "Desconectado do Servidor"} className={`w-2 h-2 rounded-full ${socketConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-red-400'}`}></div>
        </div>
        <div className="flex gap-6 mt-6">
          <button
            onClick={() => setActiveTab('integrations')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'integrations' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Integrações
          </button>
          <button
            onClick={() => setActiveTab('team')}
            className={`pb-2 text-sm font-medium transition-colors border-b-2 ${activeTab === 'team' ? 'border-meta text-meta' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            Gestão de Equipe
          </button>
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
                <button
                  onClick={() => { setEditId(null); setViewMode('form'); }}
                  className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm flex items-center gap-2"
                >
                  + Nova Conexão
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {channels.length === 0 && <div className="text-slate-400 text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum canal conectado.</div>}

                {channels.map(channel => (
                  <div key={channel.id} className="p-4 border border-slate-200 rounded-xl flex items-center justify-between bg-white shadow-sm hover:border-meta/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-meta/10 rounded-full flex items-center justify-center text-meta">
                        <ShieldCheck size={24} />
                      </div>
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
                      {channel.status === 'CONNECTED' || channel.status === 'connected' ? (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">Conectado</span>
                      ) : (channel.status === 'VERIFIED') ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded-full uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Assinado
                        </span>
                      ) : (channel.status === 'PENDING' || channel.status === 'validating') ? (
                        <span className="px-2 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span> Aguardando
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full uppercase">{channel.status || 'Desconectado'}</span>
                      )}
                      <button
                        onClick={() => handleTestConnection(channel.id)}
                        disabled={testLoading === channel.id}
                        className={`p-2 rounded-lg transition-colors border text-[10px] font-bold uppercase tracking-wider ${testLoading === channel.id ? 'bg-slate-100 text-slate-400 border-slate-200' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900'}`}
                      >
                        {testLoading === channel.id ? `Aguardando (${timeLeft}s)...` : 'Testar'}
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
            <WhatsAppOfficialForm
              editId={editId}
              onCancel={() => setViewMode('list')}
              onSuccess={() => {
                setViewMode('list');
                fetchChannels();
              }}
            />
          )}
        </div>
      )}

      {activeTab === 'team' && (
        <div className="max-w-4xl animate-fade-in">
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h2 className="font-medium text-slate-900">Membros da Equipe</h2>
                <p className="text-sm text-slate-400">Gerencie o acesso ao seu tenant.</p>
              </div>
              <button className="bg-white border border-slate-200 text-slate-700 hover:border-meta/30 hover:text-meta px-4 py-2 rounded-lg text-sm font-medium transition-all shadow-sm">
                Convidar Membro
              </button>
            </div>
            <div className="divide-y divide-slate-100">
              {MOCK_USERS.map(user => (
                <div key={user.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-4">
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full" />
                    <div>
                      <h3 className="text-sm font-medium text-slate-900">{user.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <Mail size={12} /> {user.email}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase tracking-wider flex items-center gap-1 ${user.role === 'admin' ? 'bg-meta/10 text-meta' : 'bg-slate-100 text-slate-600'
                      }`}>
                      <Shield size={12} />
                      {user.role}
                    </span>
                    <button className="text-slate-400 hover:text-slate-600 text-sm font-medium">Editar</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IntegrationScreen;