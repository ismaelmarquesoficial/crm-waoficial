import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, Plus, LayoutTemplate, FileSpreadsheet, Calendar as CalendarIcon, X, Check, CheckCheck, ChevronRight, RefreshCw, Trash2, User, Phone, CheckCircle, AlertTriangle, Copy, Map as MapIcon } from 'lucide-react';
import { Campaign, Template } from '../types';
import Papa from 'papaparse';
import { io } from 'socket.io-client';

const socket = io('http://localhost:3001', { autoConnect: false });

const sanitizePhone = (raw: string) => {
  let num = raw.replace(/\D/g, '');
  if (!num) return '';
  if (num.startsWith('0')) num = num.substring(1);
  if (num.length >= 10 && num.length <= 11) num = '55' + num;
  if (num.startsWith('55') && num.length === 13 && num[4] === '9') {
    num = num.substring(0, 4) + num.substring(5);
  }
  return num;
};

// --- COMPONENTES AUXILIARES ---

const CountdownDisplay = ({ targetDate }: { targetDate: string }) => {
  const [timeLeft, setTimeLeft] = useState<string>('');

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(targetDate).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft('Iniciando...');
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeLeft(`${days > 0 ? `${days}d ` : ''}${hours}h ${minutes}m ${seconds}s`);
    };

    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  return (
    <div className="flex items-center gap-1.5 text-xs font-mono font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded border border-blue-100">
      <Clock size={12} className="animate-pulse" />
      {timeLeft}
    </div>
  );
};

const SuccessPopup = ({ message, onClose }: { message: string, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center transform transition-all scale-100 border border-white/20">
        <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
          <CheckCircle size={40} strokeWidth={1.5} />
        </div>
        <h3 className="text-2xl font-bold text-slate-900 mb-3 tracking-tight">Sucesso!</h3>
        <p className="text-slate-500 mb-8 whitespace-pre-line leading-relaxed">{message}</p>
        <button onClick={onClose} className="w-full bg-slate-900 text-white py-3.5 rounded-2xl font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
          Continuar
        </button>
      </div>
    </div>
  );
};

const RescheduleModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: (date: string | null) => void }) => {
  const [date, setDate] = useState('');
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
        <div className="bg-white p-6 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-lg font-bold text-slate-900">Reagendar Campanha</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors"><X size={16} /></button>
        </div>
        <div className="p-8">
          <div className="flex items-start gap-4 mb-8 bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
            <div className="p-2 bg-amber-100 text-amber-600 rounded-lg shrink-0"><AlertTriangle size={20} /></div>
            <div>
              <p className="text-slate-700 text-sm font-medium mb-1">Atenção Necessária</p>
              <p className="text-slate-500 text-xs leading-relaxed">Isso reprocessará mensagens falhas ou pendentes. Mensagens já enviadas não serão duplicadas.</p>
            </div>
          </div>
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nova Data (Opcional)</label>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-8 hover:border-blue-400 transition-colors focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400">
            <CalendarIcon className="text-slate-400" size={20} />
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none outline-none text-slate-900 font-medium w-full text-sm placeholder:text-slate-400" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={() => onConfirm(date || null)} className="flex-1 py-3.5 bg-slate-900 text-white rounded-xl font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center gap-2">
              {date ? 'Confirmar Agendamento' : 'Enviar Agora'}
              {date ? <Clock size={16} /> : <Send size={16} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... TemplatePreviewModal ...
const TemplatePreviewModal = ({ template, onClose }: { template: any, onClose: () => void }) => {
  if (!template) return null;
  let components = template.components;
  if (typeof components === 'string') { try { components = JSON.parse(components); } catch (e) { components = []; } }
  const header = components.find((c: any) => c.type === 'HEADER');
  const body = components.find((c: any) => c.type === 'BODY');
  const footer = components.find((c: any) => c.type === 'FOOTER');
  const buttons = components.find((c: any) => c.type === 'BUTTONS')?.buttons || [];
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white w-full max-w-4xl h-[85vh] rounded-2xl shadow-2xl flex overflow-hidden">
        <div className="w-1/2 p-8 border-r border-slate-100 overflow-y-auto hidden md:block">
          <h2 className="text-2xl font-bold text-slate-800 mb-1">{template.name}</h2>
          <div className="flex gap-2 mb-6"> <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${template.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{template.status}</span><span className="px-2 py-0.5 rounded text-xs font-bold uppercase bg-slate-100 text-slate-600">{template.language}</span></div>
          <div className="space-y-4"><div><h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-1">ID (WABA)</h3><p className="text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded border break-all">{template.meta_id || template.id}</p></div></div>
        </div>
        <div className="flex-1 bg-[#E5DDD5] p-8 flex items-center justify-center relative bg-opacity-80">
          <button onClick={onClose} className="absolute top-4 right-4 bg-white p-2 rounded-full hover:bg-slate-100 shadow-lg text-slate-600 z-10 transition-transform hover:scale-110"><X size={20} /></button>
          <div className="w-[340px] h-[600px] bg-white rounded-[3rem] shadow-2xl border-8 border-slate-800 overflow-hidden flex flex-col relative">
            <div className="bg-[#075E54] h-16 flex items-center px-4 gap-3 text-white shadow-md z-10"> <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs">WA</div><div className="flex-1 text-sm font-medium">Business</div></div>
            <div className="flex-1 bg-[#E5DDD5] p-3 overflow-y-auto flex flex-col gap-2 relative">
              <div className="bg-white p-1 rounded-lg rounded-tl-none shadow-sm self-start max-w-[90%] relative">
                <div className="p-2 space-y-1">{header && (<div className="mb-2 font-bold text-slate-800">{header.format === 'TEXT' ? header.text : <div className="h-32 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-xs w-full uppercase">{header.format}</div>}</div>)}<div className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">{body ? body.text : ''}</div>{footer && <div className="mt-1 text-[11px] text-slate-400 font-normal">{footer.text}</div>}</div><div className="flex justify-end px-2 pb-1 text-[10px] text-slate-400">14:30</div></div>{buttons.length > 0 && buttons.map((btn: any, idx: number) => (<div key={idx} className="bg-white text-[#00A5F4] text-center py-2.5 text-sm font-medium rounded shadow-sm flex items-center justify-center gap-2">{btn.type === 'PHONE_NUMBER' && '📞'} {btn.type === 'URL' && '🔗'} {btn.text}</div>))}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... Wizard ...
// NOVO WIZARD COM MAPEADOR DE VARIÁVEIS E MANUAL POWER
const CreateCampaignWizard = ({ onClose, channels, templates, onSuccess, onShowSuccess, initialData }: { onClose: () => void, channels: any[], templates: any[], onSuccess: () => void, onShowSuccess: (msg: string) => void, initialData?: any }) => {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialData?.name || '');
  const [selectedChannel, setSelectedChannel] = useState<string>(initialData?.channelId ? String(initialData.channelId) : '');
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

  useEffect(() => {
    if (initialData?.templateId && templates.length > 0 && !selectedTemplate) {
      const t = templates.find(t => t.id === initialData.templateId);
      if (t) setSelectedTemplate(t);
    }
  }, [templates, initialData]);

  // CSV & Data States
  const [inputMode, setInputMode] = useState<'csv' | 'manual'>('csv');
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [rawCsvData, setRawCsvData] = useState<any[]>([]);
  const [csvPhoneColumn, setCsvPhoneColumn] = useState('');

  const [recipientsData, setRecipientsData] = useState<any[]>(initialData?.recipients || []);
  const [manualName, setManualName] = useState('');
  const [manualPhone, setManualPhone] = useState('');
  const [manualVarsInput, setManualVarsInput] = useState('');

  // Mapping States
  const [templateVars, setTemplateVars] = useState<string[]>([]);
  const [varMapping, setVarMapping] = useState<Record<string, { type: 'column' | 'custom', value: string }>>({});

  // CRM States
  const [pipelines, setPipelines] = useState<any[]>([]);
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  const [selectedStageId, setSelectedStageId] = useState<string>('');
  const [crmTriggerRule, setCrmTriggerRule] = useState<'none' | 'on_sent' | 'on_reply'>('none');

  // New Pipeline Creation State
  const [showNewPipelineInput, setShowNewPipelineInput] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  const [scheduledAt, setScheduledAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    try {
      const res = await fetch('http://localhost:3001/api/crm/pipelines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ name: newPipelineName })
      });
      if (res.ok) {
        const newPipe = await res.json();
        setPipelines([...pipelines, newPipe]);
        setSelectedPipelineId(String(newPipe.id));
        if (newPipe.stages && newPipe.stages.length > 0) {
          setSelectedStageId(String(newPipe.stages[0].id)); // Seleciona estágio padrão (Disparado)
        }
        setShowNewPipelineInput(false);
        setNewPipelineName('');
      }
    } catch (e) { alert('Erro ao criar pipeline.'); }
  };

  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) setSelectedChannel(channels[0].id.toString());

    // Fetch Pipelines
    fetch('http://localhost:3001/api/crm/pipelines', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(setPipelines).catch(() => { });
  }, [channels]);

  // ... (Efeito de Template Vars mantido igual) ...
  useEffect(() => {
    if (!selectedTemplate) {
      setTemplateVars([]);
      return;
    }
    let foundVars = new Set<string>();
    let comps = selectedTemplate.components;
    if (typeof comps === 'string') { try { comps = JSON.parse(comps); } catch (e) { comps = []; } }

    if (Array.isArray(comps)) {
      comps.forEach((c: any) => {
        if ((c.type === 'BODY' || c.type === 'HEADER') && c.text) {
          const matches = c.text.match(/\{\{(.*?)\}\}/g);
          if (matches) {
            matches.forEach((m: string) => foundVars.add(m.replace(/[\{\}]/g, '').trim()));
          }
        }
      });
    }
    const vars = Array.from(foundVars).sort((a, b) => {
      const numA = parseInt(a);
      const numB = parseInt(b);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });

    setTemplateVars(vars);

    const initialMap: any = {};
    vars.forEach(v => {
      initialMap[v] = { type: 'custom', value: '' };
    });
    setVarMapping(initialMap);
  }, [selectedTemplate]);

  // Aplica o mapeamento aos dados brutos E aos dados manuais
  useEffect(() => {
    // Apenas se tivermos template e variáveis mapeáveis
    if (templateVars.length === 0) return;

    if (inputMode === 'csv' && rawCsvData.length > 0 && csvPhoneColumn) {
      const processed = rawCsvData.map(row => {
        const rawPhone = row[csvPhoneColumn];
        if (!rawPhone) return null;
        const safePhone = sanitizePhone(rawPhone);

        const finalVars = templateVars.map(v => {
          const map = varMapping[v];
          if (!map) return '';
          if (map.type === 'column') return row[map.value] || '';
          if (map.type === 'custom') return map.value;
          return '';
        });

        return {
          phone: safePhone,
          variables: finalVars,
          name: row['name'] || row['nome'] || safePhone,
          source: 'csv'
        };
      }).filter(r => r && r.phone.length >= 10);
      setRecipientsData(processed as any[]);
    } else {
      // Modo Manual
      setRecipientsData(prev => prev.map(r => {
        if (r.source === 'csv') return r;
        const finalVars = templateVars.map((v, idx) => {
          const map = varMapping[v];
          if (map?.type === 'custom' && map.value) return map.value;
          if (r.manualVars && r.manualVars[idx]) return r.manualVars[idx];
          return '';
        });
        return { ...r, variables: finalVars };
      }));
    }

  }, [varMapping, rawCsvData, csvPhoneColumn, templateVars, inputMode]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    Papa.parse(file, {
      header: true, skipEmptyLines: true, complete: (results) => {
        const rows = results.data as any[];
        if (rows.length === 0) return;
        const cols = Object.keys(rows[0]);
        setCsvColumns(cols);
        const phoneKey = cols.find(k => k.toLowerCase().match(/(phone|tel|cel|whatsapp)/)) || cols[0];
        setCsvPhoneColumn(phoneKey);
        setRawCsvData(rows);
      }
    });
  };

  const handleAddManualContact = () => {
    if (!manualPhone) return;
    const safe = sanitizePhone(manualPhone);
    if (safe.length < 10) { alert('Inválido'); return; }

    const manualVarsArray = manualVarsInput ? manualVarsInput.split(';').map(s => s.trim()) : [];

    setRecipientsData([{
      phone: safe,
      variables: manualVarsArray,
      manualVars: manualVarsArray,
      name: manualName || 'S/ Nome',
      source: 'manual'
    }, ...recipientsData]);

    setManualName(''); setManualPhone(''); setManualVarsInput('');
  };

  const handleSubmit = async () => {
    if (!selectedTemplate || !selectedChannel || recipientsData.length === 0) return;
    setIsSubmitting(true);
    const finalScheduledAt = scheduledAt ? new Date(scheduledAt).toISOString() : null;

    try {
      const res = await fetch('http://localhost:3001/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({
          name: name || `Campanha ${new Date().toLocaleDateString()}`,
          channelId: selectedChannel,
          templateId: selectedTemplate.id,
          scheduledAt: finalScheduledAt,
          recipients: recipientsData,
          crmPipelineId: selectedPipelineId || null,
          crmStageId: selectedStageId || null,
          crmTriggerRule: crmTriggerRule
        })
      });
      if (res.ok) { const d = await res.json(); onSuccess(); onShowSuccess(`Campanha ${d.status === 'scheduled' ? 'agendada' : 'criada'}!\n${d.total_recipients} contatos.`); onClose(); }
      else { const err = await res.json(); alert(err.error); }
    } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const availableTemplates = templates.filter(t => t.account_id?.toString() === selectedChannel && t.status === 'APPROVED');

  const selectedPipelineObj = pipelines.find(p => String(p.id) === selectedPipelineId);

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 text-slate-800">
      <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border border-white/20">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white/50 backdrop-blur-md rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Nova Campanha - Passo {step}</h2>
            <div className="flex items-center gap-2 mt-1">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1.5 w-8 rounded-full ${step >= i ? 'bg-indigo-600' : 'bg-slate-200'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all"><X size={18} /></button>
        </div>
        <div className="p-8 flex-1 overflow-y-auto">
          {step === 1 && (<div className="space-y-6 animate-fade-in">
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Nome da Campanha</label><input value={name} onChange={e => setName(e.target.value)} className="w-full border p-3 rounded-lg block" placeholder="Ex: Promoção Janeiro" /></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Canal</label><select value={selectedChannel} onChange={e => setSelectedChannel(e.target.value)} className="w-full border p-3 rounded-lg bg-white block"><option value="">Selecione...</option>{channels.map(ch => <option key={ch.id} value={ch.id}>{ch.instance_name} ({ch.display_phone_number})</option>)}</select></div>
            <div><label className="block text-sm font-medium text-slate-700 mb-2">Destinatários</label>
              <div className="flex gap-4 mb-4 bg-slate-50 p-1 rounded-lg w-max"><button onClick={() => setInputMode('csv')} className={`px-4 py-1.5 rounded-md text-sm ${inputMode === 'csv' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>CSV / Planilha</button><button onClick={() => setInputMode('manual')} className={`px-4 py-1.5 rounded-md text-sm ${inputMode === 'manual' ? 'bg-white shadow-sm' : 'text-slate-500'}`}>Manual</button></div>

              {inputMode === 'csv' && (
                <div className="space-y-4">
                  <div onClick={() => fileInputRef.current?.click()} className="border-2 border-dashed p-8 text-center cursor-pointer hover:bg-slate-50 rounded-xl transition-colors"><input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" /><div className="bg-meta/10 w-12 h-12 rounded-full flex items-center justify-center mx-auto text-meta mb-2"><FileSpreadsheet /></div><p className="text-sm text-slate-600">{csvFile ? csvFile.name : 'Clique para enviar CSV'}</p></div>
                  {csvColumns.length > 0 && (
                    <div className="flex items-center gap-2 text-sm bg-blue-50 text-blue-800 p-2 rounded">
                      <Phone size={14} /> Selecione a Coluna do Telefone:
                      <select value={csvPhoneColumn} onChange={e => setCsvPhoneColumn(e.target.value)} className="bg-white border text-sm p-1 rounded font-bold"><option value="">Selecione...</option>{csvColumns.map(c => <option key={c} value={c}>{c}</option>)}</select>
                    </div>
                  )}
                </div>
              )}

              {inputMode === 'manual' && (
                <div className="flex gap-2 items-end">
                  <div className="w-1/4">
                    <label className="text-xs text-slate-500 font-medium">Nome</label>
                    <input value={manualName} onChange={e => setManualName(e.target.value)} className="w-full border p-2 rounded-lg text-sm block" placeholder="João" />
                  </div>
                  <div className="w-1/4">
                    <label className="text-xs text-slate-500 font-medium">WhatsApp</label>
                    <input value={manualPhone} onChange={e => setManualPhone(e.target.value)} className="w-full border p-2 rounded-lg text-sm block" placeholder="1199..." />
                  </div>
                  <div className="flex-1">
                    <label className="text-xs text-slate-500 font-medium">Vars. (sep. ;)</label>
                    <input value={manualVarsInput} onChange={e => setManualVarsInput(e.target.value)} className="w-full border p-2 rounded-lg text-sm block" placeholder="Ex: 10/10; R$50" />
                  </div>
                  <button onClick={handleAddManualContact} className="bg-slate-900 text-white p-2 text-sm font-medium rounded-lg h-[38px] px-4 hover:bg-slate-800 transition-colors">Add</button>
                </div>
              )}

              {/* LISTA GERENCIÁVEL DE CONTATOS */}
              {recipientsData.length > 0 && (
                <div className="mt-4 border rounded-lg bg-slate-50 overflow-hidden">
                  <div className="flex justify-between items-center p-3 border-b border-slate-200 bg-slate-100">
                    <span className="text-sm font-medium text-slate-700">{recipientsData.length} contatos</span>
                    <button onClick={() => setRecipientsData([])} className="text-xs text-red-500 font-medium hover:text-red-700 uppercase tracking-wide">Limpar Tudo</button>
                  </div>
                  <div className="max-h-60 overflow-y-auto divide-y divide-slate-200 bg-white">
                    {recipientsData.map((r, idx) => (
                      <div key={idx} className="flex justify-between items-center p-3 text-sm hover:bg-slate-50 text-slate-600 transition-colors group">
                        <div className="flex gap-3 items-center">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 text-xs font-bold">{r.name ? r.name.charAt(0).toUpperCase() : '#'}</div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-slate-900">{r.name || 'Sem Nome'}</span>
                            <span className="font-mono text-xs text-slate-400">{r.phone}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setRecipientsData(recipientsData.filter((_, i) => i !== idx))}
                          className="text-slate-300 hover:text-red-500 p-2 rounded-lg hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                          title="Remover Contato"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div></div>)}

          {/* STEP 2: TEMPLATES + MAPPING */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 max-h-[300px] overflow-y-auto">{availableTemplates.length === 0 ? <p className="text-sm text-slate-500 col-span-2">Nenhum template aprovado neste canal.</p> : availableTemplates.map(t => (<div key={t.id} onClick={() => setSelectedTemplate(t)} className={`border p-4 rounded-xl cursor-pointer text-sm transition-all ${selectedTemplate?.id === t.id ? 'border-meta bg-meta/5 ring-1 ring-meta' : 'hover:border-slate-300'}`}><div className="font-semibold mb-1">{t.name}</div><div className="text-xs text-slate-500 truncate">{t.language}</div></div>))}</div>

              {/* MAPA DE VARIÁVEIS */}
              {selectedTemplate && templateVars.length > 0 && (
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 animate-fade-in shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2"><MapIcon size={16} /> Mapeamento de Variáveis</h3>
                  <div className="space-y-3">
                    {templateVars.map(v => (
                      <div key={v} className="grid grid-cols-12 gap-2 items-center">
                        <div className="col-span-2 text-xs font-mono bg-white border px-2 py-1 rounded text-center text-slate-500 font-bold text-meta bg-meta/10 border-meta/20">{`{{${v}}}`}</div>
                        <div className="col-span-4">
                          <select
                            value={varMapping[v]?.type || 'custom'}
                            onChange={e => setVarMapping({ ...varMapping, [v]: { type: e.target.value as any, value: '' } })}
                            className="w-full text-xs p-2 rounded border focus:ring-meta bg-white shadow-sm block"
                          >
                            <option value="custom">Texto Fixo (Todos)</option>
                            <option value="column">Do CSV / Manual</option>
                          </select>
                        </div>
                        <div className="col-span-6">
                          {varMapping[v]?.type === 'column' ? (
                            csvColumns.length > 0 ? (
                              <select
                                value={varMapping[v]?.value}
                                onChange={e => setVarMapping({ ...varMapping, [v]: { ...varMapping[v], value: e.target.value } })}
                                className="w-full text-xs p-2 rounded border bg-white focus:ring-meta shadow-sm block"
                              >
                                <option value="">(Manual ou Nenhuma)</option>
                                {csvColumns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            ) : <div className="text-xs text-slate-400 italic p-2 border rounded bg-slate-50">Usando valor manual</div>
                          ) : (
                            <input
                              placeholder="Valor fixo (ex: Empresa X)"
                              value={varMapping[v]?.value}
                              onChange={e => setVarMapping({ ...varMapping, [v]: { ...varMapping[v], value: e.target.value } })}
                              className="w-full text-xs p-2 rounded border focus:ring-meta shadow-sm block"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 3: CRM & AUTOMATION (NEW) */}
          {step === 3 && (
            <div className="space-y-6 animate-fade-in">
              <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 mb-6">
                <div className="flex gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <LayoutTemplate size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Automação de Pipeline</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">Defina o que acontece no CRM com os contatos desta campanha.</p>
                  </div>
                </div>
              </div>

              {/* Trigger Rule Selection */}
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-3 uppercase tracking-wide text-[10px]">Regra de Gatilho</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => setCrmTriggerRule('none')}
                    className={`p-4 rounded-xl border text-left transition-all ${crmTriggerRule === 'none' ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <div className="font-bold mb-1 text-sm">Apenas Aviso</div>
                    <div className={`text-[10px] ${crmTriggerRule === 'none' ? 'text-slate-300' : 'text-slate-400'}`}>Não gera cards no CRM. Ideal para comunicados.</div>
                  </button>

                  <button
                    onClick={() => setCrmTriggerRule('on_sent')}
                    className={`p-4 rounded-xl border text-left transition-all ${crmTriggerRule === 'on_sent' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <div className="font-bold mb-1 text-sm flex items-center gap-1"><Send size={12} /> Ao Enviar</div>
                    <div className={`text-[10px] ${crmTriggerRule === 'on_sent' ? 'text-blue-100' : 'text-slate-400'}`}>Gera cards para todos assim que dispara.</div>
                  </button>

                  <button
                    onClick={() => setCrmTriggerRule('on_reply')}
                    className={`p-4 rounded-xl border text-left transition-all ${crmTriggerRule === 'on_reply' ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <div className="font-bold mb-1 text-sm flex items-center gap-1"><CheckCheck size={12} /> Ao Responder</div>
                    <div className={`text-[10px] ${crmTriggerRule === 'on_reply' ? 'text-amber-100' : 'text-slate-400'}`}>Gera cards apenas para leads quentes (ex: "Tenho interesse").</div>
                  </button>
                </div>
              </div>

              {/* Pipeline Selection (Only if Rule != none) */}
              {crmTriggerRule !== 'none' && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-bold text-slate-700">Funil de Destino</label>
                      {!showNewPipelineInput && (
                        <button
                          onClick={() => setShowNewPipelineInput(true)}
                          className="text-[10px] font-bold uppercase tracking-wider text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1 group"
                        >
                          <Plus size={10} className="group-hover:rotate-90 transition-transform" /> Novo
                        </button>
                      )}
                    </div>

                    {showNewPipelineInput ? (
                      <div className="relative animate-fade-in-up">
                        <input
                          autoFocus
                          className="w-full border border-blue-400 bg-blue-50/20 p-3 pr-20 rounded-xl text-sm outline-none ring-4 ring-blue-500/10 transition-all placeholder:text-blue-300 text-slate-800 font-bold"
                          placeholder="Nome (Ex: Black Friday)"
                          value={newPipelineName}
                          onChange={e => setNewPipelineName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreatePipeline(); }}
                        />
                        <div className="absolute right-1 top-1 bottom-1 flex gap-1 p-0.5">
                          <button onClick={handleCreatePipeline} className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95"><Check size={16} /></button>
                          <button onClick={() => { setShowNewPipelineInput(false); }} className="bg-white text-slate-400 border border-slate-200 px-2 rounded-lg hover:text-red-500 hover:border-red-200 transition-colors"><X size={16} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        {pipelines.length === 0 && <div className="absolute inset-x-0 -bottom-6 text-[10px] text-red-400 flex items-center gap-1"><AlertTriangle size={10} /> Crie um funil para continuar</div>}
                        <select
                          value={selectedPipelineId}
                          onChange={e => { setSelectedPipelineId(e.target.value); setSelectedStageId(''); }}
                          className={`w-full border p-3 rounded-xl bg-white block text-sm focus:ring-2 focus:ring-slate-200 outline-none transition-shadow ${!selectedPipelineId && pipelines.length === 0 ? 'border-red-200 bg-red-50/30 text-red-400' : 'border-slate-200'}`}
                          disabled={pipelines.length === 0}
                        >
                          <option value="">Selecione um Funil...</option>
                          {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">Etapa (Coluna)</label>
                    <div className="relative">
                      <select
                        value={selectedStageId}
                        onChange={e => setSelectedStageId(e.target.value)}
                        className="w-full border p-3 rounded-xl bg-white block text-sm focus:ring-2 focus:ring-slate-200 outline-none border-slate-200 disabled:bg-slate-50 disabled:text-slate-400"
                        disabled={!selectedPipelineId || showNewPipelineInput}
                      >
                        <option value="">Selecione a Etapa...</option>
                        {selectedPipelineId && selectedPipelineObj?.stages?.map((s: any) => (
                          <option key={s.id} value={s.id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 4 && (<div className="space-y-6">
            <div className="text-center space-y-2"><div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600 mb-4"><Check size={32} /></div><h3 className="text-lg font-bold">Tudo Pronto!</h3><p className="text-slate-600">Sua campanha será enviada para <b>{recipientsData.length}</b> contatos.</p></div>

            {/* LISTA FINAL DE REVISÃO */}
            {recipientsData.length > 0 && <div className="border rounded-lg overflow-hidden"><div className="bg-slate-50 p-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b">Amostra (Variáveis Processadas)</div>{recipientsData.slice(0, 5).map((r, i) => (<div key={i} className="p-2 border-b last:border-0 text-xs flex justify-between items-center"><span>{r.phone}</span><div className="flex gap-1">{r.variables && r.variables.length > 0 ? r.variables.map((v: string, idx: number) => <span key={idx} className="bg-slate-100 px-1 rounded border border-slate-200 font-mono text-slate-600">{v}</span>) : <span className="text-slate-300 italic">Sem vars</span>}</div></div>))}</div>}

            <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 flex items-center gap-4 hover:border-blue-300 transition-colors group/cal">
              <div className="w-12 h-12 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 group-hover/cal:text-blue-500 group-hover/cal:border-blue-200 transition-colors shadow-sm">
                <CalendarIcon size={24} />
              </div>
              <div className="flex-1">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Agendar para (Opcional)</label>
                <input type="datetime-local" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} className="bg-transparent w-full outline-none text-slate-900 font-bold text-lg placeholder:text-slate-300" />
              </div>
            </div>

            {/* CRM Summary Review */}
            {crmTriggerRule !== 'none' && selectedPipelineObj && (
              <div className="mt-4 p-4 bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-600" />
                <span>Automação ativa: <b>{crmTriggerRule === 'on_sent' ? 'Ao Enviar' : 'Ao Responder'}</b> mover para <b>{selectedPipelineObj.name}</b> ➔ <b>{selectedPipelineObj.stages?.find((s: any) => String(s.id) === selectedStageId)?.name}</b></span>
              </div>
            )}
          </div>)}
        </div>
        <div className="p-6 border-t border-slate-100 flex justify-between bg-slate-50/50 rounded-b-3xl">
          {step > 1 ? <button onClick={() => setStep(step - 1)} className="px-6 py-2.5 text-slate-500 font-bold hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors">Voltar</button> : <div />}
          {step < 4 ?
            <button onClick={() => setStep(step + 1)} disabled={step === 1 && recipientsData.length === 0} className="bg-slate-900 text-white px-8 py-2.5 rounded-xl font-bold hover:bg-slate-800 hover:scale-[1.02] shadow-lg shadow-slate-900/20 disabled:opacity-50 disabled:shadow-none transition-all">Próximo</button> :
            <button onClick={handleSubmit} disabled={isSubmitting} className="bg-indigo-600 text-white px-8 py-2.5 rounded-xl flex items-center gap-2 font-bold hover:bg-indigo-700 hover:scale-[1.02] shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-70 disabled:grayscale">
              {isSubmitting ? <RefreshCw className="animate-spin" /> : <Send size={18} />}
              {scheduledAt ? 'Agendar Disparo' : 'Disparar Agora'}
            </button>
          }
        </div>
      </div>
    </div>
  );
};

// ... COMPONENTE PRINCIPAL MANTIDO ...
const Campaigns: React.FC = () => {
  // ... Copy of the Campaign Component (To be safe, I'm including the full correct version) ...
  const [activeTab, setActiveTab] = useState<'overview' | 'templates'>('overview');
  const [showWizard, setShowWizard] = useState(false);
  const [wizardInitialData, setWizardInitialData] = useState<any>(null); // Dados para duplicação
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Reschedule States
  const [showReschedule, setShowReschedule] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<number | null>(null);

  const [previewTemplate, setPreviewTemplate] = useState<any>(null);
  const [channels, setChannels] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);

  // LOGS VISUAIS
  const [socketStatus, setSocketStatus] = useState<string>('disconnected');
  const [tenantIdDebug, setTenantIdDebug] = useState<string>('');
  const [socketEventsCount, setSocketEventsCount] = useState(0); // Contador de eventos

  // Error notifications
  const [errorNotifications, setErrorNotifications] = useState<any[]>([]);

  // DEBUG SOCKET
  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) {
      try {
        const tenantId = JSON.parse(u).tenant_id;
        setTenantIdDebug(String(tenantId));
        console.log('🔌 [FRONT] Init Socket for Tenant:', tenantId);

        if (!socket.connected) {
          // console.log('🔌 [FRONT] Connecting...');
          socket.connect();
        }

        socket.emit('join_tenant', tenantId);
        // console.log('🔌 [FRONT] Emit join_tenant');

        // 🟢 Real-Time Updates
        socket.on('campaign_progress', (data: any) => {
          setSocketEventsCount(p => p + 1); // Incrementa
          console.log('⚡ [FRONT] Received Progress:', data);
          setCampaigns(prev => prev.map(c => {
            // Correção de Comparação ID
            if (String(c.id) === String(data.campaign_id)) {
              const isSent = data.status === 'sent';
              if (isSent) {
                // Force increment
                const oldSent = parseInt(c.sent as any) || 0;
                const newSent = oldSent + 1;
                return { ...c, sent: newSent };
              }
            }
            return c;
          }));
        });

        socket.on('campaign_completed', (data: any) => {
          setSocketEventsCount(p => p + 1);
          console.log('🏁 [FRONT] Campaign Completed:', data);
          setCampaigns(prev => prev.map(c => {
            if (String(c.id) === String(data.campaign_id)) {
              return { ...c, status: data.status || 'completed' };
            }
            return c;
          }));
          fetchCampaigns();
        });

        // Listen for campaign errors
        socket.on('campaign_error', (data: any) => {
          console.log('❌ [FRONT] Campaign Error:', data);
          const errorId = Date.now();
          setErrorNotifications(prev => [...prev, { ...data, id: errorId }]);

          // Auto-remove after 10 seconds
          setTimeout(() => {
            setErrorNotifications(prev => prev.filter(n => n.id !== errorId));
          }, 10000);
        });

        socket.on('connect', () => { console.log('✅ [FRONT] Socket Connected!'); setSocketStatus('connected'); });
        socket.on('disconnect', () => { console.log('❌ [FRONT] Socket Disconnected'); setSocketStatus('disconnected'); });
        socket.on('connect_error', (err) => { console.error('❌ [FRONT] Connection Error:', err); setSocketStatus('error: ' + err.message); });

      } catch (e) { console.error('Socket Error:', e); }
    }
    return () => {
      socket.off('campaign_progress');
      socket.off('campaign_completed');
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      // socket.disconnect();  // Optional
    };
  }, []);

  const fetchCampaigns = async () => { try { const res = await fetch('http://localhost:3001/api/campaigns', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); if (res.ok) setCampaigns(await res.json()); } catch (e) { } };
  const fetchData = async () => { try { const t = localStorage.getItem('token'); const [c, tp] = await Promise.all([fetch('http://localhost:3001/api/channels', { headers: { Authorization: `Bearer ${t}` } }), fetch('http://localhost:3001/api/channels/templates/all', { headers: { Authorization: `Bearer ${t}` } })]); setChannels(await c.json()); if (tp.ok) setTemplates(await tp.json()); fetchCampaigns(); } catch (e) { } };
  useEffect(() => { fetchData(); }, [activeTab]);
  const handleSyncTemplates = async () => { setIsSyncing(true); try { const r = await fetch('http://localhost:3001/api/channels/sync-all-templates', { method: 'POST', headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }); const d = await r.json(); if (r.ok) { alert(`✅ ${d.message}`); await fetchData(); } else alert(d.message); } catch (e) { alert('Erro ao sincronizar.'); } finally { setIsSyncing(false); } };

  const triggerReschedule = (id: number) => {
    setRescheduleId(id);
    setShowReschedule(true);
  };

  const confirmReschedule = async (date: string | null) => {
    if (!rescheduleId) return;
    try {
      const res = await fetch(`http://localhost:3001/api/campaigns/${rescheduleId}/reschedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ scheduledAt: date })
      });
      if (res.ok) {
        const data = await res.json();
        setShowReschedule(false);
        setSuccessMessage(`✅ ${data.message}\n${data.requeued_count} contatos recolocados na fila.`);
        setShowSuccessPopup(true);
        fetchData();
      } else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e) { alert('Erro de conexão.'); }
  };

  // ...

  const handleDuplicate = async (c: any) => {
    try {
      const res = await fetch(`http://localhost:3001/api/campaigns/${c.id}/recipients`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const recipients = await res.json();

        // CORREÇÃO CRÍTICA: Enriquecer dados para resistir ao reprocessamento do Wizard
        const enrichedRecipients = recipients.map((r: any) => ({
          ...r,
          source: 'manual', // Marca como manual para entrar na lógica de preservação
          manualVars: r.variables || [] // Copia vars atuais para manualVars (usado pelo re-map)
        }));

        setWizardInitialData({
          name: `Cópia de ${c.name}`,
          recipients: enrichedRecipients,
          channelId: c.whatsapp_account_id,
          templateId: c.template_id
        });
        setShowWizard(true);
      } else {
        alert('Não foi possível carregar os dados da campanha.');
      }
    } catch (e) { alert('Erro ao duplicar.'); }
  };

  return (
    <div className="p-8 h-full overflow-y-auto">
      <header className="flex justify-between items-end mb-10">
        <div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 flex items-center gap-3">
            Campanhas
            <span className={`text-[10px] px-2 py-0.5 rounded-full border font-bold tracking-wider uppercase ${socketStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              Socket: {socketStatus}
            </span>
          </h1>
          <div className="flex gap-1 mt-6 bg-slate-100/50 p-1 rounded-xl w-max border border-slate-200/50">
            <button onClick={() => setActiveTab('overview')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>Visão Geral</button>
            <button onClick={() => setActiveTab('templates')} className={`px-5 py-2 text-sm font-bold rounded-lg transition-all ${activeTab === 'templates' ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700'}`}>Templates</button>
          </div>
        </div>
        <button onClick={() => { setWizardInitialData(null); setShowWizard(true); }} className="bg-slate-900 hover:bg-slate-800 text-white px-6 py-3 rounded-xl text-sm font-bold flex items-center gap-2 shadow-xl shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all group">
          <div className="bg-white/20 p-1 rounded-lg group-hover:rotate-90 transition-transform"><Plus size={16} /></div>
          Nova Campanha
        </button>
      </header>
      {activeTab === 'overview' && (
        <div className="animate-fade-in">
          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-soft">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-widest">
                <tr>
                  <th className="px-8 py-5">Nome</th>
                  <th className="px-8 py-5">Agendamento</th>
                  <th className="px-8 py-5">Status</th>
                  <th className="px-8 py-5">Progresso</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">{campaigns.map((c: any) => (
                <tr key={c.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-8 py-5 font-bold text-slate-900">{c.name}</td>
                  <td className="px-8 py-5">
                    {c.status === 'scheduled' && c.scheduled_at ? (
                      <div className="flex flex-col gap-1.5 items-start">
                        <span className="text-xs font-semibold text-slate-500">{new Date(c.scheduled_at).toLocaleString()}</span>
                        <CountdownDisplay targetDate={c.scheduled_at} />
                      </div>
                    ) : (
                      <span className="text-xs font-medium text-slate-400">{new Date(c.created_at).toLocaleDateString()}</span>
                    )}
                  </td>
                  <td className="px-8 py-5">
                    <span className={`px-3 py-1.5 rounded-full text-[10px] uppercase font-extrabold tracking-widest border ${c.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : c.status === 'processing' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' : c.status === 'scheduled' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className={`h-2 rounded-full transition-all duration-1000 ${c.status === 'completed' ? 'bg-emerald-500' : 'bg-blue-600'}`} style={{ width: `${(Math.min(c.sent, c.total) / c.total) * 100}%` }}></div>
                      </div>
                      <span className="text-xs font-bold text-slate-500">{c.sent}/{c.total}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button title="Duplicar" onClick={() => handleDuplicate(c)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-blue-600 transition-colors"><Copy size={16} /></button>
                      <button title="Reagendar" onClick={() => triggerReschedule(c.id)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-emerald-600 transition-colors"><RefreshCw size={16} /></button>
                    </div>
                  </td></tr>))}{campaigns.length === 0 && <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-300"><Send size={24} /></div>
                    <p>Nenhuma campanha criada ainda.</p>
                  </td></tr>}</tbody></table></div></div>
      )}
      {activeTab === 'templates' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="col-span-full flex justify-end">
            <button onClick={handleSyncTemplates} disabled={isSyncing} className="text-slate-500 hover:text-slate-900 px-4 py-2 hover:bg-slate-100 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
              {isSyncing ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />} Sincronizar da Meta
            </button>
          </div>
          {templates.map(t => (
            <div key={t.id} onClick={() => setPreviewTemplate(t)} className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-xl hover:shadow-slate-900/5 hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <LayoutTemplate size={20} />
                </div>
                <span className={`text-[10px] font-extrabold uppercase rounded-full px-3 py-1 tracking-wider ${t.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{t.status}</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-1 truncate text-lg group-hover:text-blue-700 transition-colors">{t.name}</h3>
              <p className="text-xs text-slate-400 uppercase font-bold tracking-wider">{t.language}</p>
            </div>
          ))}
        </div>
      )}
      {showWizard && <CreateCampaignWizard onClose={() => { setShowWizard(false); setWizardInitialData(null); }} channels={channels} templates={templates} onSuccess={fetchData} onShowSuccess={(msg) => { setSuccessMessage(msg); setShowSuccessPopup(true); }} initialData={wizardInitialData} />}
      {showSuccessPopup && <SuccessPopup message={successMessage} onClose={() => setShowSuccessPopup(false)} />}
      {showReschedule && <RescheduleModal onClose={() => setShowReschedule(false)} onConfirm={confirmReschedule} />}
      {previewTemplate && <TemplatePreviewModal template={previewTemplate} onClose={() => setPreviewTemplate(null)} />}

      {/* Error Notifications */}
      <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
        {errorNotifications.map((error) => (
          <div
            key={error.id}
            className="bg-red-50 border-l-4 border-red-500 p-4 rounded-lg shadow-lg animate-slide-in-right"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-red-900 text-sm mb-1">
                  Erro na Campanha: {error.campaign_name}
                </h4>
                <p className="text-xs text-red-700 mb-2">
                  <strong>Template:</strong> {error.template_name}
                </p>
                <p className="text-xs text-red-600 break-words">
                  {error.error_message}
                </p>
                {error.phone && (
                  <p className="text-xs text-red-500 mt-1">
                    <Phone size={10} className="inline mr-1" />
                    {error.phone}
                  </p>
                )}
              </div>
              <button
                onClick={() => setErrorNotifications(prev => prev.filter(n => n.id !== error.id))}
                className="text-red-400 hover:text-red-600 transition-colors flex-shrink-0"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
export default Campaigns;