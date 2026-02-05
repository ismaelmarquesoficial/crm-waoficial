import React, { useState, useEffect, useRef } from 'react';
import { Send, Clock, Plus, LayoutTemplate, FileSpreadsheet, Calendar as CalendarIcon, X, Check, CheckCheck, ChevronRight, RefreshCw, Trash2, User, Phone, CheckCircle, AlertTriangle, Copy, Map as MapIcon, Pause, Play, Edit2 } from 'lucide-react';
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
      <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-[320px] w-full text-center transform transition-all scale-100 border border-white/20">
        <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm">
          <CheckCircle size={32} strokeWidth={1.5} />
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">Sucesso!</h3>
        <p className="text-xs text-slate-500 mb-6 whitespace-pre-line leading-relaxed">{message}</p>
        <button onClick={onClose} className="w-full bg-slate-900 text-white py-3 rounded-2xl text-sm font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
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
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-100">
        <div className="bg-white p-5 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-base font-bold text-slate-900">Reagendar Campanha</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full bg-slate-50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors"><X size={14} /></button>
        </div>
        <div className="p-7">
          <div className="flex items-start gap-3 mb-6 bg-amber-50/50 p-3.5 rounded-2xl border border-amber-100">
            <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg shrink-0"><AlertTriangle size={18} /></div>
            <div>
              <p className="text-slate-700 text-xs font-bold mb-0.5">Atenção Necessária</p>
              <p className="text-slate-500 text-[10px] leading-relaxed">Isso reprocessará mensagens falhas ou pendentes. Mensagens já enviadas não serão duplicadas.</p>
            </div>
          </div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">Nova Data (Opcional)</label>
          <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-2xl p-3.5 mb-6 hover:border-blue-400 transition-colors focus-within:ring-2 focus-within:ring-blue-100 focus-within:border-blue-400">
            <CalendarIcon className="text-slate-400" size={18} />
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none outline-none text-slate-900 font-bold w-full text-sm placeholder:text-slate-400" />
          </div>
          <div className="flex gap-3">
            <button onClick={onClose} className="flex-1 py-3 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={() => onConfirm(date || null)} className="flex-1 py-3 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center gap-2">
              {date ? 'Agendar' : 'Enviar Agora'}
              {date ? <Clock size={14} /> : <Send size={14} />}
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
      <div className="bg-white w-full max-w-3xl h-[80vh] rounded-2xl shadow-2xl flex overflow-hidden">
        <div className="w-2/5 p-6 border-r border-slate-100 overflow-y-auto hidden md:block">
          <h2 className="text-xl font-bold text-slate-800 mb-1">{template.name}</h2>
          <div className="flex gap-2 mb-5"> <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${template.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>{template.status}</span><span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-600">{template.language}</span></div>
          <div className="space-y-4"><div><h3 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-1">ID (WABA)</h3><p className="text-[10px] text-slate-500 font-mono bg-slate-50 p-2 rounded border break-all">{template.meta_id || template.id}</p></div></div>
        </div>
        <div className="flex-1 bg-[#E5DDD5] p-6 flex items-center justify-center relative bg-opacity-80">
          <button onClick={onClose} className="absolute top-4 right-4 bg-white p-2 rounded-full hover:bg-slate-100 shadow-lg text-slate-600 z-10 transition-transform hover:scale-110"><X size={18} /></button>
          <div className="w-[290px] h-[510px] bg-white rounded-3xl shadow-2xl border-[6px] border-slate-800 overflow-hidden flex flex-col relative">
            <div className="bg-[#075E54] h-14 flex items-center px-4 gap-3 text-white shadow-md z-10"> <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-[10px]">WA</div><div className="flex-1 text-xs font-medium">Business</div></div>
            <div className="flex-1 bg-[#E5DDD5] p-3 overflow-y-auto flex flex-col gap-2 relative">
              <div className="bg-white p-1 rounded-lg rounded-tl-none shadow-sm self-start max-w-[90%] relative">
                <div className="p-2 space-y-1">{header && (<div className="mb-2 font-bold text-slate-800 text-[13px]">{header.format === 'TEXT' ? header.text : <div className="h-28 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-[10px] w-full uppercase">{header.format}</div>}</div>)}<div className="text-[13px] text-slate-900 whitespace-pre-wrap leading-relaxed">{body ? body.text : ''}</div>{footer && <div className="mt-1 text-[10px] text-slate-400 font-normal">{footer.text}</div>}</div><div className="flex justify-end px-2 pb-1 text-[9px] text-slate-400">14:30</div></div>{buttons.length > 0 && buttons.map((btn: any, idx: number) => (<div key={idx} className="bg-white text-[#00A5F4] text-center py-2 text-xs font-medium rounded shadow-sm flex items-center justify-center gap-2">{btn.type === 'PHONE_NUMBER' && '📞'} {btn.type === 'URL' && '🔗'} {btn.text}</div>))}</div>
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
  const [recurrenceType, setRecurrenceType] = useState<'none' | 'daily' | 'weekly' | 'monthly'>('none');
  const [recurrenceInterval, setRecurrenceInterval] = useState(1);
  const [recurrenceDay, setRecurrenceDay] = useState<number | ''>('');
  const [recurrenceTime, setRecurrenceTime] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Effects ---

  useEffect(() => {
    if (initialData?.templateId && templates.length > 0 && !selectedTemplate) {
      const t = templates.find(t => t.id === initialData.templateId);
      if (t) setSelectedTemplate(t);
    }
  }, [templates, initialData, selectedTemplate]);

  // populando estados iniciais complexos
  useEffect(() => {
    if (initialData) {
      if (initialData.scheduledAt) setScheduledAt(new Date(initialData.scheduledAt).toISOString().slice(0, 16));
      if (initialData.recurrenceType) setRecurrenceType(initialData.recurrenceType);
      if (initialData.recurrenceInterval) setRecurrenceInterval(initialData.recurrenceInterval);
      if (initialData.recurrenceDay !== undefined) setRecurrenceDay(initialData.recurrenceDay || '');
      if (initialData.recurrenceTime) setRecurrenceTime(initialData.recurrenceTime);
      if (initialData.crmTriggerRule) setCrmTriggerRule(initialData.crmTriggerRule);
    }
  }, [initialData]);

  useEffect(() => {
    if (initialData && pipelines.length > 0) {
      if (initialData.crmPipelineId) setSelectedPipelineId(String(initialData.crmPipelineId));
      if (initialData.crmStageId) setSelectedStageId(String(initialData.crmStageId));
    }
  }, [initialData, pipelines]);

  useEffect(() => {
    if (channels.length > 0 && !selectedChannel) setSelectedChannel(channels[0].id.toString());
    fetch('http://localhost:3001/api/crm/pipelines', {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    }).then(r => r.json()).then(setPipelines).catch(() => { });
  }, [channels, selectedChannel]);

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
          setSelectedStageId(String(newPipe.stages[0].id));
        }
        setShowNewPipelineInput(false);
        setNewPipelineName('');
      }
    } catch (e) { alert('Erro ao criar pipeline.'); }
  };

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
      const vLower = v.toLowerCase();
      if (v === '1' || vLower === 'name' || vLower === 'nome') {
        initialMap[v] = { type: 'contact_name', value: '' };
      } else {
        initialMap[v] = { type: 'custom', value: '' };
      }
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
          if (map.type === 'contact_name') return row['name'] || row['nome'] || '';
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
          if (map?.type === 'contact_name') return r.name || '';
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

    const body = {
      name: name || `Campanha ${new Date().toLocaleDateString()}`,
      channelId: selectedChannel,
      templateId: selectedTemplate.id,
      scheduledAt: finalScheduledAt,
      recipients: recipientsData,
      crmPipelineId: selectedPipelineId || null,
      crmStageId: selectedStageId || null,
      crmTriggerRule: crmTriggerRule,
      recurrenceType,
      recurrenceInterval: recurrenceType !== 'none' ? recurrenceInterval : null,
      recurrenceDay: (recurrenceType === 'weekly' || recurrenceType === 'monthly') ? recurrenceDay : null,
      recurrenceTime: recurrenceType !== 'none' ? recurrenceTime : null
    };

    try {
      const isEditing = initialData?.id && !initialData.name.startsWith('Cópia de');
      const url = isEditing
        ? `http://localhost:3001/api/campaigns/${initialData.id}`
        : 'http://localhost:3001/api/campaigns';
      const method = isEditing ? 'PATCH' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body)
      });

      if (res.ok) {
        const d = await res.json();
        onSuccess();
        onShowSuccess(`Campanha ${isEditing ? 'atualizada' : (d.status === 'scheduled' ? 'agendada' : 'criada')}!`);
        onClose();
      }
      else {
        const err = await res.json();
        alert(err.error);
      }
    } catch (e: any) { alert(e.message); } finally { setIsSubmitting(false); }
  };
  const availableTemplates = templates.filter(t => t.account_id?.toString() === selectedChannel && t.status === 'APPROVED');

  const selectedPipelineObj = pipelines.find(p => String(p.id) === selectedPipelineId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800">
      <div className="bg-white w-full max-w-2xl rounded-[2rem] shadow-[0_30px_100px_rgba(0,0,0,0.15)] flex flex-col max-h-[95vh] border border-white/20 relative overflow-hidden">
        {/* Top Gradient Decorator */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

        <div className="p-6 border-b border-slate-50 flex justify-between items-center bg-white/80 backdrop-blur-xl">
          <div>
            <h2 className="text-xl font-bold tracking-[-0.02em] text-slate-900">Nova Campanha</h2>
            <p className="text-[11px] font-medium text-slate-400 mt-0.5 uppercase tracking-wider">Passo {step} de 4</p>
            <div className="flex items-center gap-1.5 mt-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-1 w-8 rounded-full transition-all duration-500 ${step >= i ? 'bg-indigo-600' : 'bg-slate-100'}`} />
              ))}
            </div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all duration-300">
            <X size={18} strokeWidth={2} />
          </button>
        </div>
        <div className="p-7 flex-1 overflow-y-auto space-y-6 bg-slate-50/30">
          {step === 1 && (<div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Nome da Campanha</label>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-slate-100/50 border-transparent focus:border-indigo-500/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 p-3 rounded-xl text-sm font-semibold transition-all outline-none placeholder:text-slate-300"
                  placeholder="Ex: Promoção Janeiro"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest pl-1">Canal de Disparo</label>
                <select
                  value={selectedChannel}
                  onChange={e => setSelectedChannel(e.target.value)}
                  className="w-full bg-slate-100/50 border-transparent focus:border-indigo-500/30 focus:bg-white focus:ring-4 focus:ring-indigo-500/5 p-3 rounded-xl text-sm font-semibold transition-all outline-none"
                >
                  <option value="">Selecione um canal...</option>
                  {channels.map(ch => <option key={ch.id} value={ch.id}>{ch.instance_name} ({ch.display_phone_number})</option>)}
                </select>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end mb-2">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1">Destinatários</label>
                <div className="flex gap-1.5 bg-slate-200/40 p-1 rounded-xl w-max border border-slate-200/20">
                  <button onClick={() => setInputMode('csv')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${inputMode === 'csv' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>CSV</button>
                  <button onClick={() => setInputMode('manual')} className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${inputMode === 'manual' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>Manual</button>
                </div>
              </div>

              {inputMode === 'csv' && (
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="group border-2 border-dashed border-slate-200 p-8 text-center cursor-pointer hover:bg-white hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-500/5 rounded-[1.5rem] transition-all duration-500 relative overflow-hidden"
                  >
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    <div className="bg-indigo-50 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto text-indigo-600 mb-3 group-hover:scale-110 transition-transform duration-500">
                      <FileSpreadsheet size={24} strokeWidth={1.5} />
                    </div>
                    <p className="text-sm font-bold text-slate-700">{csvFile ? csvFile.name : 'Clique ou arraste sua planilha CSV'}</p>
                    <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">Suporta .csv e .xlsx</p>
                  </div>
                  {csvColumns.length > 0 && (
                    <div className="flex items-center gap-4 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 animate-fade-in">
                      <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                        <Phone size={18} strokeWidth={2} />
                      </div>
                      <div className="flex-1">
                        <label className="block text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Coluna do Telefone</label>
                        <select
                          value={csvPhoneColumn}
                          onChange={e => setCsvPhoneColumn(e.target.value)}
                          className="bg-transparent border-none text-sm font-bold p-0 focus:ring-0 w-full cursor-pointer text-indigo-900"
                        >
                          <option value="">Selecione a coluna...</option>
                          {csvColumns.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {inputMode === 'manual' && (
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xl shadow-slate-900/5 flex gap-3 items-end animate-fade-in">
                  <div className="flex-1 space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome</label>
                    <input value={manualName} onChange={e => setManualName(e.target.value)} className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/30 p-2.5 rounded-xl text-sm font-semibold outline-none transition-all" placeholder="Sr. João" />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">WhatsApp</label>
                    <input value={manualPhone} onChange={e => setManualPhone(e.target.value)} className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/30 p-2.5 rounded-xl text-sm font-semibold outline-none transition-all" placeholder="55119..." />
                  </div>
                  <div className="flex-[1.5] space-y-1.5">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Variáveis (sep. por ;)</label>
                    <input value={manualVarsInput} onChange={e => setManualVarsInput(e.target.value)} className="w-full bg-slate-50 border-transparent focus:bg-white focus:border-indigo-500/30 p-2.5 rounded-xl text-sm font-semibold outline-none transition-all" placeholder="Var1; Var2..." />
                  </div>
                  <button onClick={handleAddManualContact} className="bg-slate-900 hover:bg-indigo-600 text-white p-2.5 rounded-xl transition-all duration-300 shadow-lg shadow-slate-900/10 active:scale-95">
                    <Plus size={18} strokeWidth={2.5} />
                  </button>
                </div>
              )}

              {/* LISTA GERENCIÁVEL DE CONTATOS */}
              {recipientsData.length > 0 && (
                <div className="mt-6 bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden animate-fade-in relative">
                  <div className="flex justify-between items-center px-6 py-4 border-b border-slate-50 bg-slate-50/50">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{recipientsData.length} contatos adicionados</span>
                    <button onClick={() => setRecipientsData([])} className="text-[10px] text-red-500 font-bold hover:text-red-700 uppercase tracking-widest transition-colors">Limpar Tudo</button>
                  </div>
                  <div className="max-h-52 overflow-y-auto divide-y divide-slate-50 custom-scrollbar">
                    {recipientsData.map((r, idx) => (
                      <div key={idx} className="flex justify-between items-center px-6 py-3.5 text-xs hover:bg-slate-50/50 text-slate-600 transition-all group">
                        <div className="flex gap-3 items-center">
                          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-500 flex items-center justify-center font-bold uppercase ring-4 ring-white shadow-sm">
                            {r.name ? r.name.charAt(0) : '#'}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-900 tracking-tight text-sm">{r.name || 'Sem Nome'}</span>
                            <span className="font-mono text-[9px] text-slate-400 font-semibold uppercase tracking-wider">{r.phone}</span>
                          </div>
                        </div>
                        <button
                          onClick={() => setRecipientsData(recipientsData.filter((_, i) => i !== idx))}
                          className="text-slate-200 hover:text-red-500 p-2 rounded-xl hover:bg-red-50 transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={16} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div></div>)}

          {/* STEP 2: TEMPLATES + MAPPING */}
          {step === 2 && (
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-3 max-h-[250px] overflow-y-auto">{availableTemplates.length === 0 ? <p className="text-xs text-slate-500 col-span-2">Nenhum template aprovado neste canal.</p> : availableTemplates.map(t => (<div key={t.id} onClick={() => setSelectedTemplate(t)} className={`border p-3 rounded-xl cursor-pointer text-[13px] transition-all ${selectedTemplate?.id === t.id ? 'border-meta bg-meta/5 ring-1 ring-meta' : 'hover:border-slate-300'}`}><div className="font-semibold mb-1">{t.name}</div><div className="text-[11px] text-slate-500 truncate">{t.language}</div></div>))}</div>

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
                            <option value="contact_name">Nome do Contato</option>
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
            <div className="space-y-5 animate-fade-in">
              <div className="bg-blue-50/50 p-3 rounded-2xl border border-blue-100 mb-4">
                <div className="flex gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                    <LayoutTemplate size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">Automação de Pipeline</h3>
                    <p className="text-[11px] text-slate-500 leading-relaxed mt-0.5">Defina o que acontece no CRM com os contatos desta campanha.</p>
                  </div>
                </div>
              </div>

              {/* Trigger Rule Selection */}
              <div>
                <label className="block text-[9px] font-bold text-slate-700 mb-2 uppercase tracking-wide">Regra de Gatilho</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setCrmTriggerRule('none')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${crmTriggerRule === 'none' ? 'bg-slate-800 text-white border-slate-800 shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <div className="font-bold mb-0.5 text-sm">Apenas Aviso</div>
                    <div className={`text-[9px] leading-tight ${crmTriggerRule === 'none' ? 'text-slate-300' : 'text-slate-400'}`}>Não gera cards no CRM. Ideal para comunicados.</div>
                  </button>

                  <button
                    onClick={() => setCrmTriggerRule('on_sent')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${crmTriggerRule === 'on_sent' ? 'bg-blue-600 text-white border-blue-600 shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <div className="font-bold mb-0.5 text-sm flex items-center gap-1"><Send size={11} /> Ao Enviar</div>
                    <div className={`text-[9px] leading-tight ${crmTriggerRule === 'on_sent' ? 'text-blue-100' : 'text-slate-400'}`}>Gera cards para todos assim que dispara.</div>
                  </button>

                  <button
                    onClick={() => setCrmTriggerRule('on_reply')}
                    className={`p-3.5 rounded-xl border text-left transition-all ${crmTriggerRule === 'on_reply' ? 'bg-amber-500 text-white border-amber-500 shadow-lg' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'}`}
                  >
                    <div className="font-bold mb-0.5 text-sm flex items-center gap-1"><CheckCheck size={11} /> Ao Responder</div>
                    <div className={`text-[9px] leading-tight ${crmTriggerRule === 'on_reply' ? 'text-amber-100' : 'text-slate-400'}`}>Gera cards apenas para leads quentes.</div>
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

          {step === 4 && (<div className="space-y-6 animate-fade-in text-slate-800">
            <div className="text-center space-y-3">
              <div className="w-20 h-20 bg-emerald-50 text-emerald-500 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl shadow-emerald-500/10 mb-5">
                <CheckCircle size={40} strokeWidth={1} />
              </div>
              <h3 className="text-2xl font-bold tracking-tight text-slate-900">Tudo Pronto!</h3>
              <p className="text-slate-500 text-base">Sua campanha será enviada para <b className="text-slate-900">{recipientsData.length}</b> contatos.</p>
            </div>

            {/* LISTA FINAL DE REVISÃO */}
            {recipientsData.length > 0 && (
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-900/5 overflow-hidden">
                <div className="bg-slate-50/80 px-6 py-3 text-[10px] font-bold text-slate-400 uppercase tracking-[0.15em] border-b border-slate-50">
                  Amostra dos Dados
                </div>
                {recipientsData.slice(0, 3).map((r, i) => (
                  <div key={i} className="px-6 py-4 border-b border-slate-50 last:border-0 text-xs flex justify-between items-center bg-white/50">
                    <span className="font-bold text-slate-900 text-sm tracking-tight">{r.phone}</span>
                    <div className="flex gap-2">
                      {r.variables && r.variables.length > 0 ? (
                        r.variables.map((v: string, idx: number) => (
                          <span key={idx} className="bg-indigo-50 text-indigo-600 px-3 py-1 rounded-xl border border-indigo-100 font-mono font-bold text-[10px] uppercase">{v}</span>
                        ))
                      ) : (
                        <span className="text-slate-300 italic font-medium uppercase tracking-widest text-[9px]">Sem variáveis</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-2xl shadow-indigo-900/5 space-y-8">
              <div className="flex items-center gap-5 group/cal transition-all cursor-pointer p-3 hover:bg-indigo-50/30 rounded-3xl">
                <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-500 group-hover/cal:scale-110 transition-all duration-500 shadow-sm">
                  <CalendarIcon size={28} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Quando disparar?</label>
                  <input
                    type="datetime-local"
                    value={scheduledAt}
                    onChange={e => setScheduledAt(e.target.value)}
                    className="bg-transparent w-full outline-none text-slate-900 font-bold text-xl tracking-tight placeholder:text-slate-200"
                  />
                </div>
              </div>

              {/* Opções de Recorrência */}
              <div className="pt-8 border-t border-slate-50">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4 block pl-1">Configurações de Recorrência</label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
                  {(['none', 'daily', 'weekly', 'monthly'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setRecurrenceType(type)}
                      className={`px-5 py-4 rounded-[1.5rem] text-[10px] font-bold uppercase tracking-widest border transition-all duration-300 ${recurrenceType === type ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-600/20' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-300'}`}
                    >
                      {type === 'none' ? 'Único' : type === 'daily' ? 'Diário' : type === 'weekly' ? 'Semanal' : 'Mensal'}
                    </button>
                  ))}
                </div>

                {recurrenceType !== 'none' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up bg-slate-50/50 p-6 rounded-[1.5rem] border border-slate-100">
                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase tracking-[0.12em] pl-1">Repetir a cada...</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={recurrenceInterval}
                          onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                          className="w-16 bg-white border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm"
                        />
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                          {recurrenceType === 'daily' ? 'dias' : recurrenceType === 'weekly' ? 'semanas' : 'meses'}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase tracking-[0.12em] pl-1">Exatamente às</label>
                      <input
                        type="time"
                        value={recurrenceTime}
                        onChange={e => setRecurrenceTime(e.target.value)}
                        className="w-full bg-white border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm cursor-pointer"
                        required={recurrenceType !== 'none'}
                      />
                    </div>

                    {(recurrenceType === 'weekly' || recurrenceType === 'monthly') && (
                      <div className="space-y-3">
                        <label className="text-[9px] font-bold text-slate-500 mb-1 block uppercase tracking-[0.12em] pl-1">
                          {recurrenceType === 'weekly' ? 'No dia da semana' : 'No dia do mês'}
                        </label>
                        <select
                          value={recurrenceDay}
                          onChange={e => setRecurrenceDay(e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="w-full bg-white border border-slate-100 p-3 rounded-xl text-sm font-bold text-slate-900 outline-none focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm cursor-pointer"
                        >
                          <option value="">Do agendamento</option>
                          {recurrenceType === 'weekly' ? (
                            <>
                              <option value="1">Segunda-feira</option>
                              <option value="2">Terça-feira</option>
                              <option value="3">Quarta-feira</option>
                              <option value="4">Quinta-feira</option>
                              <option value="5">Sexta-feira</option>
                              <option value="6">Sábado</option>
                              <option value="0">Domingo</option>
                            </>
                          ) : (
                            Array.from({ length: 31 }, (_, i) => (
                              <option key={i + 1} value={i + 1}>Dia {i + 1}</option>
                            ))
                          )}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* CRM Summary Review */}
            {crmTriggerRule !== 'none' && selectedPipelineObj && (
              <div className="mt-8 p-6 bg-emerald-50/50 rounded-[2rem] border border-emerald-100 text-xs text-emerald-800 flex items-start gap-3 animate-fade-in-up">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600 mt-0.5">
                  <CheckCircle size={18} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 uppercase tracking-widest text-[9px] mb-1">Automação de Pipeline</h4>
                  <p className="font-medium">Vou mover os contatos para o funil <b>{selectedPipelineObj.name}</b> na etapa <b>{selectedPipelineObj.stages?.find((s: any) => String(s.id) === selectedStageId)?.name || '...'}</b> quando a regra <b>{crmTriggerRule === 'on_sent' ? 'Ao Enviar' : 'Ao Responder'}</b> for atendida.</p>
                </div>
              </div>
            )}
          </div>)}
        </div>
        <div className="p-6 border-t border-slate-50 bg-white/80 backdrop-blur-xl flex justify-between items-center">
          <button
            onClick={() => setStep(step - 1)}
            disabled={step === 1}
            className="px-6 py-2.5 rounded-full text-xs font-bold text-slate-400 hover:text-slate-900 disabled:opacity-0 transition-all uppercase tracking-widest"
          >
            Voltar
          </button>
          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && (!name || !selectedChannel || recipientsData.length === 0)) || (step === 2 && !selectedTemplate) || (step === 3 && crmTriggerRule !== 'none' && (!selectedPipelineId || !selectedStageId))}
              className="bg-slate-900 hover:bg-indigo-600 text-white px-8 py-3.5 rounded-full text-xs font-bold flex items-center gap-2.5 shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all group disabled:opacity-50 disabled:scale-100 disabled:bg-slate-200 disabled:shadow-none"
            >
              Próximo Passo <ChevronRight size={16} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-10 py-4 rounded-full text-sm font-bold flex items-center gap-2.5 shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all group disabled:opacity-50"
            >
              {isSubmitting ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} strokeWidth={3} />}
              Finalizar e {scheduledAt ? 'Agendar' : 'Iniciar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// ... COMPONENTE PRINCIPAL MANTIDO ...
const Campaigns: React.FC = () => {
  // ... Copy of the Campaign Component (To be safe, I'm including the full correct version) ...
  const [activeTab, setActiveTab] = useState<'overview' | 'templates'>('overview');
  const [overviewSubTab, setOverviewSubTab] = useState<'unique' | 'recurring'>('unique');
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
          templateId: c.template_id,
          recurrenceType: c.recurrence_type,
          recurrenceInterval: c.recurrence_interval,
          recurrenceDay: c.recurrence_day,
          recurrenceTime: c.recurrence_time
        });
        setShowWizard(true);
      } else {
        alert('Não foi possível carregar os dados da campanha.');
      }
    } catch (e) { alert('Erro ao duplicar.'); }
  };

  const handleEdit = async (c: any) => {
    try {
      const res = await fetch(`http://localhost:3001/api/campaigns/${c.id}/recipients`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        const recipients = await res.json();
        const enrichedRecipients = recipients.map((r: any) => ({
          ...r,
          source: 'manual',
          manualVars: r.variables || []
        }));

        setWizardInitialData({
          id: c.id,
          name: c.name,
          recipients: enrichedRecipients,
          channelId: c.whatsapp_account_id,
          templateId: c.template_id,
          scheduledAt: c.scheduled_at,
          recurrenceType: c.recurrence_type,
          recurrenceInterval: c.recurrence_interval,
          recurrenceDay: c.recurrence_day,
          recurrenceTime: c.recurrence_time,
          isEditing: true
        });
        setShowWizard(true);
      }
    } catch (e) { alert('Erro ao carregar dados para edição.'); }
  };

  const handleDeleteCampaign = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir esta campanha? Esta ação não pode ser desfeita.')) return;
    try {
      const res = await fetch(`http://localhost:3001/api/campaigns/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== id));
        setSuccessMessage('Campanha excluída com sucesso.');
        setShowSuccessPopup(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir campanha.');
      }
    } catch (e) { alert('Erro de conexão ao excluir.'); }
  };

  const handleToggleStatus = async (c: any) => {
    const newStatus = (c.status === 'paused') ? (c.scheduled_at && new Date(c.scheduled_at) > new Date() ? 'scheduled' : 'processing') : 'paused';
    try {
      const res = await fetch(`http://localhost:3001/api/campaigns/${c.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        setCampaigns(prev => prev.map(item => item.id === c.id ? { ...item, status: newStatus } : item));
      }
    } catch (e) { alert('Erro ao alterar status.'); }
  };

  return (
    <div className="p-6 h-full overflow-y-auto bg-slate-50/50">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-[-0.02em] text-slate-900 flex items-center gap-3">
            Campanhas
            <span className={`text-[10px] px-3 py-1 rounded-full border font-bold tracking-widest uppercase shadow-sm ${socketStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              Socket: {socketStatus}
            </span>
          </h1>
          <div className="flex gap-2 mt-6 bg-slate-200/50 p-1 rounded-2xl w-max border border-slate-200/30">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-5 py-2 text-sm font-semibold rounded-xl transition-all duration-300 ${activeTab === 'templates' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              Templates
            </button>
          </div>
        </div>
        <button
          onClick={() => { setWizardInitialData(null); setShowWizard(true); }}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-full text-sm font-semibold flex items-center gap-3 shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
        >
          <div className="bg-white/20 p-1.5 rounded-full group-hover:rotate-90 transition-transform">
            <Plus size={20} strokeWidth={2.5} />
          </div>
          Nova Campanha
        </button>
      </header>
      {activeTab === 'overview' && (
        <div className="animate-fade-in space-y-6">
          <div className="flex gap-2 bg-slate-200/40 p-1 rounded-[1.25rem] w-max border border-slate-200/20">
            <button
              onClick={() => setOverviewSubTab('unique')}
              className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all duration-300 ${overviewSubTab === 'unique' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Envios Únicos
            </button>
            <button
              onClick={() => setOverviewSubTab('recurring')}
              className={`px-4 py-2 text-[11px] font-bold rounded-xl transition-all duration-300 ${overviewSubTab === 'recurring' ? 'bg-white text-slate-900 shadow-sm border border-slate-100' : 'text-slate-500 hover:text-slate-700'}`}
            >
              Recorrentes
            </button>
          </div>

          <div className="bg-white border border-slate-100 rounded-[2rem] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.05)] relative">
            {/* Top Gradient Line Decorator */}
            <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500" />

            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-[0.12em]">
                <tr>
                  <th className="px-8 py-5">Nome</th>
                  <th className="px-8 py-5">{overviewSubTab === 'recurring' ? 'Frequência' : 'Agendamento'}</th>
                  <th className="px-8 py-5 text-center">Status</th>
                  <th className="px-8 py-5">Progresso</th>
                  <th className="px-8 py-5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {campaigns
                  .filter((c: any) => overviewSubTab === 'unique' ? (!c.recurrence_type || c.recurrence_type === 'none') : (c.recurrence_type && c.recurrence_type !== 'none'))
                  .map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-all group border-b border-slate-50 last:border-0">
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900 text-base tracking-tight">{c.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded uppercase tracking-wider">{c.channel_name || 'Instagram'}</span>
                            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-50 px-2 py-0.5 rounded uppercase tracking-wider">{c.template_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        {overviewSubTab === 'recurring' ? (
                          <div className="flex flex-col gap-1.5 items-start">
                            <span className="text-xs font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-xl border border-indigo-100">
                              {c.recurrence_type === 'daily' ? `A cada ${c.recurrence_interval} dia(s)` :
                                c.recurrence_type === 'weekly' ? `${c.recurrence_interval}x por semana` :
                                  `Mensal (Dia ${c.recurrence_day})`}
                            </span>
                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                              <Clock size={12} strokeWidth={2.5} /> {c.recurrence_time?.substring(0, 5) || '--:--'}
                              {c.recurrence_type === 'weekly' && c.recurrence_day !== null && (
                                <span className="ml-1 border-l border-slate-200 pl-2">
                                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][c.recurrence_day]}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          c.status === 'scheduled' && c.scheduled_at ? (
                            <div className="flex flex-col gap-2 items-start">
                              <span className="text-xs font-bold text-slate-700">{new Date(c.scheduled_at).toLocaleString()}</span>
                              <CountdownDisplay targetDate={c.scheduled_at} />
                            </div>
                          ) : (
                            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{new Date(c.created_at).toLocaleDateString()}</span>
                          )
                        )}
                      </td>
                      <td className="px-8 py-6 text-center">
                        <span className={`px-3 py-1.5 rounded-2xl text-[10px] uppercase font-bold tracking-[0.15em] border inline-block shadow-sm ${c.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : c.status === 'processing' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' : c.status === 'scheduled' ? 'bg-amber-50 text-amber-600 border-amber-100' : c.status === 'paused' ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex flex-col gap-2">
                          <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-bold text-slate-500">{c.sent}/{c.total}</span>
                            <span className="text-[10px] font-bold text-slate-400">{Math.round((Math.min(c.sent, c.total) / c.total) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-1000 shadow-sm ${c.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${(Math.min(c.sent, c.total) / c.total) * 100}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                          {overviewSubTab === 'recurring' && (
                            <button
                              onClick={() => handleToggleStatus(c)}
                              title={c.status === 'paused' ? 'Retomar' : 'Pausar'}
                              className={`w-9 h-9 flex items-center justify-center rounded-xl border shadow-sm transition-all hover:scale-110 active:scale-95 ${c.status === 'paused' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}
                            >
                              {c.status === 'paused' ? <Play size={16} strokeWidth={2} /> : <Pause size={16} strokeWidth={2} />}
                            </button>
                          )}
                          <button onClick={() => handleEdit(c)} title="Editar" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm hover:border-indigo-200 text-slate-400 hover:text-indigo-600 transition-all hover:scale-110 active:scale-95">
                            <Edit2 size={16} strokeWidth={2} />
                          </button>
                          <button onClick={() => handleDuplicate(c)} title="Duplicar" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm hover:border-blue-200 text-slate-400 hover:text-blue-600 transition-all hover:scale-110 active:scale-95">
                            <Copy size={16} strokeWidth={2} />
                          </button>
                          <button onClick={() => handleDeleteCampaign(c.id)} title="Excluir" className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-100 shadow-sm hover:border-red-200 text-slate-400 hover:text-red-600 transition-all hover:scale-110 active:scale-95">
                            <Trash2 size={16} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {campaigns.filter((c: any) => overviewSubTab === 'unique' ? (!c.recurrence_type || c.recurrence_type === 'none') : (c.recurrence_type && c.recurrence_type !== 'none')).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-8 py-16 text-center">
                      <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-200">
                        <Send size={28} strokeWidth={1} />
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-[0.15em] text-[10px]">Nenhuma campanha {overviewSubTab === 'unique' ? 'única' : 'recorrente'} encontrada</p>
                    </td>
                  </tr>
                )}
              </tbody></table></div></div>
      )}
      {activeTab === 'templates' && (
        <div className="animate-fade-in grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div className="col-span-full flex justify-end">
            <button onClick={handleSyncTemplates} disabled={isSyncing} className="text-slate-500 hover:text-slate-900 px-4 py-2 hover:bg-slate-100 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
              {isSyncing ? <RefreshCw className="animate-spin" size={14} /> : <RefreshCw size={14} />} Sincronizar da Meta
            </button>
          </div>
          {templates.map(t => (
            <div key={t.id} onClick={() => setPreviewTemplate(t)} className="bg-white border border-slate-200 rounded-2xl p-5 hover:shadow-xl hover:shadow-slate-900/5 hover:border-blue-200 transition-all cursor-pointer group relative overflow-hidden">
              <div className="absolute top-0 left-0 w-1 h-full bg-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex justify-between items-start mb-4">
                <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                  <LayoutTemplate size={18} />
                </div>
                <span className={`text-[10px] font-extrabold uppercase rounded-full px-3 py-1 tracking-wider ${t.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{t.status}</span>
              </div>
              <h3 className="font-bold text-slate-900 mb-1 truncate text-base group-hover:text-blue-700 transition-colors">{t.name}</h3>
              <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">{t.language}</p>
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