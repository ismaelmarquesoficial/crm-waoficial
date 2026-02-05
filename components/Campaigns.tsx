import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Send, Clock, Plus, LayoutTemplate, FileSpreadsheet, Calendar as CalendarIcon, X, Check, CheckCheck, ChevronRight, RefreshCw, Trash2, User, Phone, CheckCircle, AlertTriangle, Copy, Map as MapIcon, Pause, Play, Edit2, MessageCircle } from 'lucide-react';
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
  const [timeLeft, setTimeLeft] = useState<{ str: string, urgent: boolean } | null>(null);

  useEffect(() => {
    const calculateTime = () => {
      const diff = new Date(targetDate).getTime() - new Date().getTime();
      if (diff <= 0) {
        setTimeLeft(null);
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      const str = `${days > 0 ? `${days}d ` : ''}${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setTimeLeft({ str, urgent: diff < 1000 * 60 * 60 }); // Urgent if less than 1 hour
    };
    calculateTime();
    const timer = setInterval(calculateTime, 1000);
    return () => clearInterval(timer);
  }, [targetDate]);

  if (!timeLeft) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-600 text-[10px] font-bold uppercase tracking-wider border border-emerald-100/50 animate-pulse">
        <Play size={10} fill="currentColor" /> Iniciando
      </span>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all ${timeLeft.urgent ? 'bg-amber-50 text-amber-600 border-amber-100 animate-pulse' : 'bg-slate-50 text-slate-600 border-slate-100'}`}>
      <Clock size={12} className={timeLeft.urgent ? 'text-amber-500' : 'text-slate-400'} strokeWidth={2.5} />
      <span className="font-mono tracking-tight">{timeLeft.str}</span>
    </div>
  );
};

const SuccessPopup = ({ message, onClose }: { message: string, onClose: () => void }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[20px] shadow-[0_10px_40px_-5px_rgba(6,104,225,0.05)] p-5 max-w-[280px] w-full text-center transform transition-all scale-100 border-t-4 border-t-transparent relative overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(90deg,#0668E1_0%,#25D366_100%)] z-10" />
        <div className="w-12 h-12 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
          <CheckCircle size={24} strokeWidth={1.5} />
        </div>
        <h3 className="text-base font-bold text-slate-900 mb-1.5 tracking-tight">Sucesso!</h3>
        <p className="text-[11px] text-slate-500 mb-4 whitespace-pre-line leading-relaxed">{message}</p>
        <button onClick={onClose} className="w-full bg-slate-900 text-white py-2 rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all">
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
      <div className="bg-white rounded-[20px] shadow-[0_10px_40px_-5px_rgba(6,104,225,0.05)] w-full max-w-xs overflow-hidden border-t-4 border-t-transparent relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(90deg,#0668E1_0%,#25D366_100%)] z-10" />
        <div className="bg-white px-5 py-4 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900">Reagendar Campanha</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"><X size={14} /></button>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-2.5 mb-4 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">
            <div className="p-1 bg-amber-100 text-amber-600 rounded-md shrink-0"><AlertTriangle size={14} /></div>
            <div>
              <p className="text-slate-700 text-[10px] font-bold mb-0.5">Atenção Necessária</p>
              <p className="text-slate-500 text-[9px] leading-relaxed">Isso reprocessará mensagens falhas ou pendentes.</p>
            </div>
          </div>
          <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Nova Data (Opcional)</label>
          <div className="flex items-center gap-2 bg-[#F8FAFC] rounded-xl p-3 mb-5 hover:shadow-sm transition-all focus-within:ring-2 focus-within:ring-blue-100/50 group">
            <CalendarIcon className="text-slate-400 group-focus-within:text-blue-500 transition-colors" size={16} />
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="bg-transparent border-none outline-none text-slate-900 font-bold w-full text-xs placeholder:text-slate-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={() => onConfirm(date || null)} className="flex-1 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold shadow-lg shadow-slate-900/10 hover:shadow-slate-900/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex justify-center items-center gap-1.5">
              {date ? 'Agendar' : 'Enviar Agora'}
              {date ? <Clock size={12} /> : <Send size={12} />}
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
      <div className="bg-white w-full max-w-3xl h-[75vh] rounded-[24px] shadow-[0_10px_40px_-5px_rgba(6,104,225,0.05)] flex overflow-hidden border-t-4 border-t-transparent relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(90deg,#0668E1_0%,#25D366_100%)] z-10" />
        <div className="w-2/5 p-6 border-r border-slate-100 overflow-y-auto hidden md:block pt-6">
          <h2 className="text-lg font-bold text-slate-800 mb-1">{template.name}</h2>
          <div className="flex gap-2 mb-4"> <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${template.status === 'APPROVED' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-amber-50 text-amber-600 border border-amber-100'}`}>{template.status}</span><span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase bg-slate-50 text-slate-500 border border-slate-100">{template.language}</span></div>
          <div className="space-y-4"><div><h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">ID (WABA)</h3><p className="text-[10px] text-slate-500 font-mono bg-[#F8FAFC] p-2 rounded-lg border border-slate-100 break-all">{template.meta_id || template.id}</p></div></div>
        </div>
        <div className="flex-1 bg-[#E5DDD5] p-4 flex items-center justify-center relative bg-opacity-80">
          <button onClick={onClose} className="absolute top-4 right-4 bg-white p-2 rounded-full hover:bg-slate-100 shadow-md text-slate-600 z-10 transition-transform hover:scale-110"><X size={16} /></button>
          <div className="w-[260px] h-[460px] bg-white rounded-[2rem] shadow-2xl border-[5px] border-slate-800 overflow-hidden flex flex-col relative">
            <div className="bg-[#075E54] h-12 flex items-center px-3 gap-2 text-white shadow-md z-10"> <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[9px]">WA</div><div className="flex-1 text-[11px] font-medium">Business</div></div>
            <div className="flex-1 bg-[#E5DDD5] p-2.5 overflow-y-auto flex flex-col gap-2 relative">
              <div className="bg-white p-1 rounded-lg rounded-tl-none shadow-sm self-start max-w-[90%] relative">
                <div className="p-2 space-y-1">{header && (<div className="mb-2 font-bold text-slate-800 text-xs">{header.format === 'TEXT' ? header.text : <div className="h-24 bg-slate-200 rounded flex items-center justify-center text-slate-400 text-[9px] w-full uppercase">{header.format}</div>}</div>)}<div className="text-xs text-slate-900 whitespace-pre-wrap leading-relaxed">{body ? body.text : ''}</div>{footer && <div className="mt-1 text-[9px] text-slate-400 font-normal">{footer.text}</div>}</div><div className="flex justify-end px-2 pb-1 text-[8px] text-slate-400">14:30</div></div>{buttons.length > 0 && buttons.map((btn: any, idx: number) => (<div key={idx} className="bg-white text-[#00A5F4] text-center py-2 text-[10px] font-medium rounded shadow-sm flex items-center justify-center gap-2">{btn.type === 'PHONE_NUMBER' && '📞'} {btn.type === 'URL' && '🔗'} {btn.text}</div>))}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ... Wizard ...

const DeleteConfirmationModal = ({ onClose, onConfirm }: { onClose: () => void, onConfirm: () => void }) => {
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-[20px] shadow-[0_10px_40px_-5px_rgba(239,68,68,0.1)] w-full max-w-xs overflow-hidden border-t-4 border-t-transparent relative">
        <div className="absolute top-0 inset-x-0 h-1 bg-red-500 z-10" />
        <div className="bg-white px-5 py-4 border-b border-slate-50 flex justify-between items-center">
          <h3 className="text-sm font-bold text-slate-900">Excluir Campanha</h3>
          <button onClick={onClose} className="w-6 h-6 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-slate-600 flex items-center justify-center transition-colors"><X size={14} /></button>
        </div>
        <div className="p-5 text-center">
          <div className="w-12 h-12 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-red-100">
            <Trash2 size={24} strokeWidth={1.5} />
          </div>
          <h4 className="text-sm font-bold text-slate-800 mb-1">Tem certeza?</h4>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-6">
            Você está prestes a excluir esta campanha.
            <br />
            <span className="font-bold text-red-500">Esta ação não pode ser desfeita.</span>
          </p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
            <button onClick={onConfirm} className="flex-1 py-2.5 bg-red-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-red-500/20 hover:shadow-red-500/30 hover:bg-red-600 active:scale-95 transition-all">Excluir</button>
          </div>
        </div>
      </div>
    </div>
  );
};
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
    console.log('🚀 [Wizard] Iniciando envio da campanha...', {
      hasTemplate: !!selectedTemplate,
      hasChannel: !!selectedChannel,
      recipientsCount: recipientsData.length
    });

    if (!selectedTemplate || !selectedChannel || recipientsData.length === 0) {
      console.warn('⚠️ [Wizard] Submit bloqueado: dados incompletos.');
      return;
    }

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

    console.log('📦 [Wizard] Body da requisição:', body);

    try {
      const isEditing = initialData?.id && !initialData.name.startsWith('Cópia de');
      const url = isEditing
        ? `http://localhost:3001/api/campaigns/${initialData.id}`
        : 'http://localhost:3001/api/campaigns';
      const method = isEditing ? 'PATCH' : 'POST';

      console.log(`🌐 [Wizard] Enviando ${method} para ${url}`);

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(body)
      });

      console.log('✅ [Wizard] Resposta status:', res.status);

      if (res.ok) {
        const d = await res.json();
        console.log('🎉 [Wizard] Sucesso:', d);
        onSuccess();
        onShowSuccess(`Campanha ${isEditing ? 'atualizada' : (d.status === 'scheduled' ? 'agendada' : 'criada')}!`);
        onClose();
      }
      else {
        const err = await res.json();
        console.error('❌ [Wizard] Erro da API:', err);
        alert(err.error || 'Erro desconhecido ao salvar campanha');
      }
    } catch (e: any) {
      console.error('🔥 [Wizard] Exceção:', e);
      alert(e.message);
    } finally {
      setIsSubmitting(false);
    }
  };
  const availableTemplates = useMemo(() => {
    if (!selectedChannel) return [];

    // Converte para string para garantir comparação segura
    const selectedIdStr = String(selectedChannel);
    const channel = channels.find(c => String(c.id) === selectedIdStr);

    if (!channel) return [];

    return templates.filter(t => {
      // 1. Verificar Status
      const isApproved = t.status?.toUpperCase() === 'APPROVED';
      if (!isApproved) return false;

      // 2. Tentar match pelo account_id do canal (WABA ID)
      // Cenário ideal: template.account_id == channel.account_id
      if (t.account_id && channel.account_id && String(t.account_id) === String(channel.account_id)) {
        return true;
      }

      // 3. Fallback: Match de channel_id explícito
      if (t.channel_id && String(t.channel_id) === selectedIdStr) {
        return true;
      }

      // 4. Fallback Crítico (Descoberto via Debug):
      // O template.account_id está guardando o channel.id interno
      if (t.account_id && String(t.account_id) === selectedIdStr) {
        return true;
      }

      return false;
    });
  }, [templates, selectedChannel, channels]);

  const selectedPipelineObj = pipelines.find(p => String(p.id) === selectedPipelineId);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4 text-slate-800">
      <div className="bg-white w-full max-w-2xl rounded-[20px] shadow-[0_10px_40px_-5px_rgba(6,104,225,0.05)] flex flex-col max-h-[90vh] border-t-4 border-t-transparent relative overflow-hidden">
        {/* Top Gradient Decorator */}
        <div className="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(90deg,#0668E1_0%,#25D366_100%)] z-20" />

        <div className="px-6 py-5 border-b border-slate-50 flex justify-between items-center bg-white/90 backdrop-blur-xl z-10">
          <div>
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-base font-bold tracking-tight text-slate-800">Nova Campanha</h2>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">Passo {step} de 4</span>
            </div>
            <div className="h-1.5 w-full max-w-[200px] bg-slate-100 rounded-full overflow-hidden relative">
              <div className="absolute inset-0 bg-slate-100" />
              <div className="relative h-full bg-indigo-600 transition-all duration-500 ease-out rounded-full shadow-[0_0_10px_rgba(79,70,229,0.3)]" style={{ width: `${(step / 4) * 100}%` }} />
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-50 text-slate-400 hover:text-slate-600 transition-all">
            <X size={16} strokeWidth={2} />
          </button>
        </div>
        <div className="p-6 flex-1 overflow-y-auto space-y-5 bg-white relative z-0">
          {step === 1 && (<div className="space-y-5 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Nome da Campanha</label>
                <div className="relative group">
                  <div className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                    <LayoutTemplate size={18} strokeWidth={2} />
                  </div>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    className="w-full bg-[#F8FAFC] border-none focus:bg-white focus:ring-0 pl-11 pr-4 py-3.5 rounded-xl text-sm font-bold text-slate-700 transition-all outline-none placeholder:text-slate-300 shadow-sm focus:shadow-md group-hover:bg-white"
                    placeholder="Ex: Promoção de Verão"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest pl-1 mb-2">Canal de Disparo</label>
                <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1 custom-scrollbar">
                  {channels.map(ch => (
                    <div
                      key={ch.id}
                      onClick={() => setSelectedChannel(ch.id)}
                      className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all group relative overflow-hidden ${selectedChannel === ch.id ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-[#F8FAFC] border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-white'}`}
                    >
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors ${selectedChannel === ch.id ? 'bg-white/20 text-white' : 'bg-white text-indigo-500 shadow-sm group-hover:bg-indigo-50'}`}>
                        <MessageCircle size={16} strokeWidth={2.5} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold truncate ${selectedChannel === ch.id ? 'text-white' : 'text-slate-700'}`}>{ch.instance_name}</div>
                        <div className={`text-[10px] font-mono truncate ${selectedChannel === ch.id ? 'text-indigo-100' : 'text-slate-400'}`}>{ch.display_phone_number}</div>
                      </div>
                      {selectedChannel === ch.id && <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />}
                    </div>
                  ))}
                  {channels.length === 0 && <div className="text-center p-4 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">Nenhum canal conectado</div>}
                </div>
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
                <div className="bg-[#F8FAFC] p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row gap-3 items-end animate-fade-in group hover:border-indigo-100 hover:shadow-md transition-all">
                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Nome</label>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-slate-300">
                        <User size={14} />
                      </div>
                      <input
                        value={manualName}
                        onChange={e => setManualName(e.target.value)}
                        className="w-full bg-white border-slate-100 focus:border-indigo-300 pl-9 p-2.5 rounded-xl text-xs font-bold outline-none transition-all shadow-sm focus:ring-0"
                        placeholder="Nome do Cliente"
                      />
                    </div>
                  </div>

                  <div className="flex-1 space-y-1.5 w-full">
                    <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">WhatsApp</label>
                    <div className="relative">
                      <div className="absolute left-3 top-2.5 text-slate-300">
                        <Phone size={14} />
                      </div>
                      <input
                        value={manualPhone}
                        onChange={e => setManualPhone(e.target.value)}
                        className="w-full bg-white border-slate-100 focus:border-indigo-300 pl-9 p-2.5 rounded-xl text-xs font-bold outline-none transition-all shadow-sm focus:ring-0"
                        placeholder="5511999999999"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddManualContact}
                    disabled={!manualPhone}
                    className="bg-slate-900 hover:bg-indigo-600 disabled:opacity-50 disabled:bg-slate-300 text-white h-[38px] w-[38px] rounded-xl transition-all duration-300 shadow-lg shadow-slate-900/10 active:scale-95 flex items-center justify-center shrink-0"
                  >
                    <Plus size={18} strokeWidth={3} />
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
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">Selecione o Template</label>
                <div className="grid grid-cols-2 gap-3 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
                  {availableTemplates.length === 0 ? (
                    <div className="col-span-2 py-8 text-center bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                      <p className="text-xs text-slate-400 font-medium">Nenhum template aprovado neste canal.</p>
                    </div>
                  ) : (
                    availableTemplates.map(t => (
                      <div
                        key={t.id}
                        onClick={() => setSelectedTemplate(t)}
                        className={`p-4 rounded-2xl cursor-pointer text-sm transition-all relative overflow-hidden group ${selectedTemplate?.id === t.id ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-[#F8FAFC] text-slate-600 hover:bg-slate-100'}`}
                      >
                        <div className="font-bold mb-1 truncate relative z-10">{t.name}</div>
                        <div className={`text-[10px] truncate relative z-10 ${selectedTemplate?.id === t.id ? 'text-indigo-200' : 'text-slate-400'}`}>{t.language} • {t.category}</div>
                        {selectedTemplate?.id === t.id && <div className="absolute top-0 right-0 p-2 text-white/20"><CheckCircle size={32} /></div>}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* MAPA DE VARIÁVEIS */}
              {selectedTemplate && templateVars.length > 0 && (
                <div className="space-y-3 animate-fade-in-up">
                  <div className="flex items-center gap-2 mb-1 pl-1">
                    <div className="p-1 bg-indigo-50 text-indigo-500 rounded flex items-center justify-center"><MapIcon size={12} /></div>
                    <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Mapeamento de Variáveis</h3>
                  </div>
                  <div className="bg-[#F8FAFC] p-1 rounded-2xl border border-slate-100 space-y-1 max-h-[200px] overflow-y-auto custom-scrollbar">
                    {templateVars.map(v => (
                      <div key={v} className="bg-white p-3 rounded-xl shadow-sm border border-slate-50 flex flex-col md:flex-row gap-3 items-center group hover:border-indigo-100 transition-colors">
                        <div className="w-full md:w-auto min-w-[80px] text-center">
                          <span className="text-[10px] font-mono font-bold text-indigo-500 bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100 block truncate" title={v}>
                            {`{{${v}}}`}
                          </span>
                        </div>
                        <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-2">
                          <select
                            value={varMapping[v]?.type || 'custom'}
                            onChange={e => setVarMapping({ ...varMapping, [v]: { type: e.target.value as any, value: '' } })}
                            className="bg-slate-50 border-none text-[11px] font-bold text-slate-600 p-2 rounded-lg focus:ring-0 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                          >
                            <option value="custom">Texto Fixo</option>
                            <option value="column">Coluna CSV</option>
                            <option value="contact_name">Nome do Contato</option>
                          </select>

                          <div className="relative">
                            {varMapping[v]?.type === 'column' ? (
                              csvColumns.length > 0 ? (
                                <select
                                  value={varMapping[v]?.value}
                                  onChange={e => setVarMapping({ ...varMapping, [v]: { ...varMapping[v], value: e.target.value } })}
                                  className="w-full bg-slate-50 border-none text-[11px] text-slate-700 p-2 rounded-lg focus:ring-0 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
                                >
                                  <option value="">Selecione Coluna...</option>
                                  {csvColumns.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                              ) : <div className="text-[10px] text-red-400 italic p-2 bg-red-50 rounded-lg">Sem CSV carregado</div>
                            ) : varMapping[v]?.type === 'contact_name' ? (
                              <div className="text-[10px] text-slate-400 italic p-2 bg-slate-50 rounded-lg flex items-center gap-1"><User size={10} /> Nome do Contato</div>
                            ) : (
                              <input
                                placeholder="Digite o valor..."
                                value={varMapping[v]?.value}
                                onChange={e => setVarMapping({ ...varMapping, [v]: { ...varMapping[v], value: e.target.value } })}
                                className="w-full bg-slate-50 border-none text-[11px] text-slate-700 p-2 rounded-lg focus:ring-0 outline-none hover:bg-slate-100 transition-colors placeholder:text-slate-300"
                              />
                            )}
                          </div>
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
            <div className="space-y-5 animate-fade-in relative">
              {/* No Gradient here, sub-container logic */}
              <div className="bg-blue-50/50 p-6 rounded-[24px] border border-blue-100 mb-4 relative overflow-hidden">
                {/* Optional: Add gradient to sub-cards if ultra-premium desired, but let's keep it clean for sub-cards */}
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
              {/* Trigger Rule Selection */}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 mb-2 uppercase tracking-wide pl-1">Regra de Gatilho</label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <button
                    onClick={() => setCrmTriggerRule('none')}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${crmTriggerRule === 'none' ? 'bg-slate-800 text-white border-slate-800 shadow-lg shadow-slate-900/10' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-200 hover:bg-slate-50'}`}
                  >
                    <div className="font-bold mb-1 text-sm relative z-10">Apenas Aviso</div>
                    <div className={`text-[10px] leading-tight relative z-10 ${crmTriggerRule === 'none' ? 'text-slate-300' : 'text-slate-400'}`}>Não gera cards no CRM.</div>
                    {crmTriggerRule === 'none' && <div className="absolute -bottom-2 -right-2 text-white/5"><AlertTriangle size={48} /></div>}
                  </button>

                  <button
                    onClick={() => setCrmTriggerRule('on_sent')}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${crmTriggerRule === 'on_sent' ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-600/20' : 'bg-white border-slate-100 text-slate-500 hover:border-indigo-200 hover:bg-slate-50'}`}
                  >
                    <div className="font-bold mb-1 text-sm flex items-center gap-1 relative z-10"><Send size={12} /> Ao Enviar</div>
                    <div className={`text-[10px] leading-tight relative z-10 ${crmTriggerRule === 'on_sent' ? 'text-indigo-100' : 'text-slate-400'}`}>Card para todos os contatos.</div>
                    {crmTriggerRule === 'on_sent' && <div className="absolute -bottom-2 -right-2 text-white/10"><Send size={48} /></div>}
                  </button>

                  <button
                    onClick={() => setCrmTriggerRule('on_reply')}
                    className={`p-4 rounded-2xl border text-left transition-all relative overflow-hidden group ${crmTriggerRule === 'on_reply' ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20' : 'bg-white border-slate-100 text-slate-500 hover:border-amber-200 hover:bg-slate-50'}`}
                  >
                    <div className="font-bold mb-1 text-sm flex items-center gap-1 relative z-10"><CheckCheck size={12} /> Ao Responder</div>
                    <div className={`text-[10px] leading-tight relative z-10 ${crmTriggerRule === 'on_reply' ? 'text-amber-100' : 'text-slate-400'}`}>Apenas se o lead responder.</div>
                    {crmTriggerRule === 'on_reply' && <div className="absolute -bottom-2 -right-2 text-white/10"><CheckCheck size={48} /></div>}
                  </button>
                </div>
              </div>

              {/* Pipeline Selection (Only if Rule != none) */}
              {crmTriggerRule !== 'none' && (
                <div className="grid grid-cols-2 gap-4 animate-fade-in-up">
                  <div>
                    <div className="flex justify-between items-center mb-1.5 px-1">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Funil de Destino</label>
                      {!showNewPipelineInput && (
                        <button
                          onClick={() => setShowNewPipelineInput(true)}
                          className="text-[9px] font-bold uppercase tracking-wider text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-2 py-0.5 rounded transition-colors flex items-center gap-1 group"
                        >
                          <Plus size={10} className="group-hover:rotate-90 transition-transform" /> Novo
                        </button>
                      )}
                    </div>

                    {showNewPipelineInput ? (
                      <div className="relative animate-fade-in-up">
                        <input
                          autoFocus
                          className="w-full bg-[#F8FAFC] border-none focus:bg-white p-3 pr-20 rounded-xl text-sm font-medium outline-none transition-all placeholder:text-slate-300 shadow-sm focus:shadow-md focus:ring-2 focus:ring-indigo-100"
                          placeholder="Nome (Ex: Black Friday)"
                          value={newPipelineName}
                          onChange={e => setNewPipelineName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleCreatePipeline(); }}
                        />
                        <div className="absolute right-1 top-1 bottom-1 flex gap-1 p-0.5">
                          <button onClick={handleCreatePipeline} className="bg-indigo-600 text-white px-3 rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"><Check size={14} /></button>
                          <button onClick={() => { setShowNewPipelineInput(false); }} className="bg-white text-slate-400 border border-slate-100 px-2 rounded-lg hover:text-red-500 hover:bg-red-50 transition-colors shadow-sm"><X size={14} /></button>
                        </div>
                      </div>
                    ) : (
                      <div className="relative">
                        {pipelines.length === 0 && <div className="absolute inset-x-0 -bottom-5 text-[9px] text-red-400 flex items-center gap-1 font-bold pl-1"><AlertTriangle size={10} /> Crie um funil para continuar</div>}
                        <select
                          value={selectedPipelineId}
                          onChange={e => { setSelectedPipelineId(e.target.value); setSelectedStageId(''); }}
                          className={`w-full bg-[#F8FAFC] border-none text-slate-700 font-medium p-3 rounded-xl block text-sm focus:bg-white outline-none transition-all shadow-sm focus:shadow-md cursor-pointer ${!selectedPipelineId && pipelines.length === 0 ? 'bg-red-50 text-red-400' : ''}`}
                          disabled={pipelines.length === 0}
                        >
                          <option value="">Selecione um Funil...</option>
                          {pipelines.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 px-1">Etapa (Coluna)</label>
                    <div className="relative">
                      <select
                        value={selectedStageId}
                        onChange={e => setSelectedStageId(e.target.value)}
                        className="w-full bg-[#F8FAFC] border-none text-slate-700 font-medium p-3 rounded-xl block text-sm focus:bg-white outline-none transition-all shadow-sm focus:shadow-md cursor-pointer disabled:opacity-50"
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

          {step === 4 && (<div className="space-y-4 animate-fade-in text-slate-800">
            <div className="text-center space-y-1 py-1">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto mb-1 ring-2 ring-white shadow-sm">
                <CheckCircle size={18} strokeWidth={2.5} />
              </div>
              <h3 className="text-sm font-bold text-slate-800">Pronto para Enviar!</h3>
              <p className="text-slate-400 text-[10px]">Total: <b className="text-slate-700">{recipientsData.length}</b> contatos.</p>
            </div>

            {/* LISTA FINAL DE REVISÃO */}
            {/* LISTA FINAL DE REVISÃO */}
            {/* COMPACTED PREVIEW LIST */}
            {recipientsData.length > 0 && (
              <div className="bg-slate-50/50 rounded-xl border border-slate-100 overflow-hidden">
                <div className="px-4 py-2 flex justify-between items-center border-b border-slate-100">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Amostra</span>
                  <span className="text-[10px] text-slate-400">{recipientsData.length} contatos</span>
                </div>
                <div className="max-h-[100px] overflow-y-auto">
                  {recipientsData.slice(0, 3).map((r, i) => (
                    <div key={i} className="px-4 py-2 flex justify-between items-center text-[10px] border-b border-slate-50 last:border-0 hover:bg-white transition-colors">
                      <span className="font-bold text-slate-600 font-mono">{r.phone}</span>
                      <div className="flex gap-1 overflow-x-auto max-w-[150px] no-scrollbar">
                        {r.variables?.slice(0, 2).map((v, idx) => (
                          <span key={idx} className="bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-400 whitespace-nowrap">{v}</span>
                        ))}
                        {r.variables && r.variables.length > 2 && <span className="text-slate-300">...</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-white p-1 rounded-xl border border-slate-100 shadow-sm mb-4">
              <div className="grid grid-cols-2 gap-1 p-1 bg-slate-50 rounded-lg mb-3">
                <button
                  onClick={() => setScheduledAt('')}
                  className={`text-[10px] font-bold uppercase py-2 rounded-md transition-all flex items-center justify-center gap-2 ${!scheduledAt ? 'bg-white text-emerald-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <Send size={12} strokeWidth={2.5} /> Enviar Agora
                </button>
                <button
                  onClick={() => {
                    if (!scheduledAt) {
                      const now = new Date();
                      now.setMinutes(now.getMinutes() + 10); // Default to 10 min from now
                      now.setSeconds(0);
                      now.setMilliseconds(0);
                      // Format to YYYY-MM-DDTHH:mm
                      const tzOffset = now.getTimezoneOffset() * 60000;
                      const localISOTime = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
                      setScheduledAt(localISOTime);
                    }
                  }}
                  className={`text-[10px] font-bold uppercase py-2 rounded-md transition-all flex items-center justify-center gap-2 ${scheduledAt ? 'bg-white text-indigo-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <CalendarIcon size={12} strokeWidth={2.5} /> Agendar
                </button>
              </div>

              {scheduledAt && (
                <div className="grid grid-cols-2 gap-3 px-2 pb-2 animate-fade-in">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Data</label>
                    <div className="relative group">
                      <input
                        type="date"
                        value={scheduledAt.split('T')[0]}
                        onChange={e => {
                          const time = scheduledAt.split('T')[1] || '10:00';
                          setScheduledAt(`${e.target.value}T${time}`);
                        }}
                        className="w-full bg-[#F8FAFC] border-none text-slate-700 font-bold text-xs p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer hover:bg-slate-100"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Horário</label>
                    <div className="relative group">
                      <input
                        type="time"
                        value={scheduledAt.split('T')[1]}
                        onChange={e => {
                          const date = scheduledAt.split('T')[0];
                          setScheduledAt(`${date}T${e.target.value}`);
                        }}
                        className="w-full bg-[#F8FAFC] border-none text-slate-700 font-bold text-xs p-2.5 rounded-lg outline-none focus:ring-2 focus:ring-indigo-100 transition-all cursor-pointer hover:bg-slate-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {!scheduledAt && (
                <div className="px-4 py-3 text-center animate-fade-in">
                  <p className="text-[10px] text-slate-400 font-medium">Sua campanha será enviada <b className="text-emerald-500">imediatamente</b> após a finalização.</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">Recorrência</label>
              <div className="flex bg-slate-50 p-1 rounded-lg">
                {(['none', 'daily', 'weekly', 'monthly'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setRecurrenceType(type)}
                    className={`flex-1 py-1.5 rounded-md text-[9px] font-bold uppercase transition-all ${recurrenceType === type ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {type === 'none' ? 'Único' : type === 'daily' ? 'Diário' : type === 'weekly' ? 'Semanal' : 'Mensal'}
                  </button>
                ))}
              </div>

              {recurrenceType !== 'none' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Intervalo</label>
                    <div className="flex items-center gap-1 bg-white p-1.5 rounded-lg border border-slate-200">
                      <input
                        type="number"
                        min="1"
                        value={recurrenceInterval}
                        onChange={e => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                        className="w-full text-xs font-bold text-slate-700 outline-none p-0 border-none h-4"
                      />
                      <span className="text-[8px] text-slate-400 uppercase">{recurrenceType === 'daily' ? 'dias' : 'sem'}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Horário</label>
                    <input
                      type="time"
                      value={recurrenceTime}
                      onChange={e => setRecurrenceTime(e.target.value)}
                      className="w-full bg-white p-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-700 outline-none h-[28px]"
                      required={recurrenceType !== 'none'}
                    />
                  </div>
                  {(recurrenceType === 'weekly' || recurrenceType === 'monthly') && (
                    <div>
                      <label className="text-[8px] font-bold text-slate-400 uppercase block mb-1">Dia</label>
                      <select
                        value={recurrenceDay}
                        onChange={e => setRecurrenceDay(e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full bg-white p-1.5 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-700 outline-none h-[28px]"
                      >
                        <option value="">{recurrenceType === 'weekly' ? 'Segunda' : 'Dia 1'}</option>
                        {/* Simplified options for compactness */}
                        <option value="1">Opção 1</option>
                        <option value="2">Opção 2</option>
                      </select>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* CRM Summary Review */}
            {crmTriggerRule !== 'none' && selectedPipelineId && (
              <div className="mt-4 p-4 bg-emerald-50/50 rounded-2xl border border-emerald-100 text-[10px] text-emerald-800 flex items-start gap-2 animate-fade-in-up">
                <div className="w-6 h-6 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
                  <CheckCircle size={14} strokeWidth={2.5} />
                </div>
                <div>
                  <h4 className="font-bold text-emerald-900 uppercase tracking-widest mb-0.5">Automação</h4>
                  <p className="font-medium leading-relaxed">
                    Mover para <b>{pipelines.find(p => p.id === selectedPipelineId)?.name}</b> na etapa <b>{pipelines.find(p => p.id === selectedPipelineId)?.stages?.find((s: any) => String(s.id) === selectedStageId)?.name || '...'}</b> quando <b>{crmTriggerRule === 'on_sent' ? 'enviar' : 'responder'}</b>.
                  </p>
                </div>
              </div>
            )}
          </div >)}
        </div >
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
      </div >
    </div >
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

  // Delete Confirmation State
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<number | null>(null);

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
          console.log('🔌 [SOCKET DEBUG] Iniciando conexão...');
          socket.connect();
        }

        console.log(`🔌 [SOCKET DEBUG] Emitindo join_tenant para ID: ${tenantId}`);
        socket.emit('join_tenant', tenantId);

        // 🟢 Real-Time Updates
        socket.on('campaign_progress', (data: any) => {
          setSocketEventsCount(p => p + 1);
          console.log('⚡ [SOCKET DEBUG] Progresso Recebido:', data);

          setCampaigns(prev => prev.map(c => {
            // Correção de Comparação ID
            if (String(c.id) === String(data.campaign_id)) {
              const isSent = data.status === 'sent';
              if (isSent) {
                const oldSent = parseInt(c.sent as any) || 0;
                return { ...c, sent: oldSent + 1 };
              }
            }
            return c;
          }));
        });

        socket.on('connect', () => {
          console.log('✅ [SOCKET DEBUG] Conectado! ID:', socket.id);
          setSocketStatus('connected');
          // Re-emit join em reconexão
          socket.emit('join_tenant', tenantId);
        });

        socket.on('disconnect', (reason) => {
          console.warn('❌ [SOCKET DEBUG] Desconectado:', reason);
          setSocketStatus('disconnected');
        });

        socket.on('connect_error', (err) => {
          console.error('🔥 [SOCKET DEBUG] Erro de Conexão:', err.message);
          setSocketStatus('error: ' + err.message);
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

  const handleDeleteCampaign = (id: number) => {
    setCampaignToDelete(id);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!campaignToDelete) return;
    try {
      const res = await fetch(`http://localhost:3001/api/campaigns/${campaignToDelete}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (res.ok) {
        setCampaigns(prev => prev.filter(c => c.id !== campaignToDelete));
        setSuccessMessage('Campanha excluída com sucesso.');
        setShowSuccessPopup(true);
      } else {
        const data = await res.json();
        alert(data.error || 'Erro ao excluir campanha.');
      }
    } catch (e) { alert('Erro de conexão ao excluir.'); } finally {
      setShowDeleteConfirm(false);
      setCampaignToDelete(null);
    }
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
    <div className="p-5 h-full overflow-y-auto bg-slate-50/50">
      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-[-0.02em] text-slate-900 flex items-center gap-2.5">
            Campanhas
            <span className={`text-[9px] px-2.5 py-0.5 rounded-full border font-bold tracking-widest uppercase shadow-sm ${socketStatus === 'connected' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'}`}>
              Socket: {socketStatus}
            </span>
          </h1>
          <div className="flex gap-2 mt-4 bg-slate-200/50 p-1 rounded-2xl w-max border border-slate-200/30">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 ${activeTab === 'overview' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setActiveTab('templates')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-xl transition-all duration-300 ${activeTab === 'templates' ? 'bg-white text-slate-900 shadow-md ring-1 ring-slate-100' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
            >
              Templates
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchData}
            className="w-10 h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 hover:text-indigo-600 rounded-full flex items-center justify-center transition-all shadow-sm hover:shadow-md active:scale-95 group"
            title="Recarregar Campanhas"
          >
            <RefreshCw size={18} strokeWidth={2} className="group-hover:rotate-180 transition-transform duration-500" />
          </button>
          <button
            onClick={() => { setWizardInitialData(null); setShowWizard(true); }}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-full text-xs font-semibold flex items-center gap-2.5 shadow-xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-[0.98] transition-all group"
          >
            <div className="bg-white/20 p-1 rounded-full group-hover:rotate-90 transition-transform">
              <Plus size={16} strokeWidth={2.5} />
            </div>
            Nova Campanha
          </button>
        </div>
      </header>
      {activeTab === 'overview' && (
        <div className="animate-fade-in space-y-6">

          <div className="bg-white border-none rounded-[24px] overflow-hidden shadow-[0_10px_40px_-5px_rgba(6,104,225,0.05)] relative">
            {/* Top Gradient Line Decorator */}
            <div className="absolute top-0 inset-x-0 h-1 bg-[linear-gradient(90deg,#0668E1_0%,#25D366_100%)] z-10" />

            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
              <div className="flex gap-8">
                <button
                  onClick={() => setOverviewSubTab('unique')}
                  className={`text-sm font-bold transition-all duration-300 relative pb-3 ${overviewSubTab === 'unique' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Envios Únicos
                  {overviewSubTab === 'unique' && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />}
                </button>
                <button
                  onClick={() => setOverviewSubTab('recurring')}
                  className={`text-sm font-bold transition-all duration-300 relative pb-3 ${overviewSubTab === 'recurring' ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Recorrentes
                  {overviewSubTab === 'recurring' && <span className="absolute bottom-0 left-0 w-full h-[3px] bg-blue-600 rounded-t-full" />}
                </button>
              </div>
            </div>

            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-[#F8FAFC] border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400 tracking-wider sticky top-0 z-10">
                <tr>
                  <th className="px-6 py-4 font-bold text-slate-500">Campanha</th>
                  <th className="px-6 py-4 font-bold text-slate-500">{overviewSubTab === 'recurring' ? 'Frequência' : 'Agendamento'}</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-center">Status</th>
                  <th className="px-6 py-4 font-bold text-slate-500">Progresso</th>
                  <th className="px-6 py-4 font-bold text-slate-500 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {campaigns
                  .filter((c: any) => overviewSubTab === 'unique' ? (!c.recurrence_type || c.recurrence_type === 'none') : (c.recurrence_type && c.recurrence_type !== 'none'))
                  .map((c: any) => (
                    <tr key={c.id} className="hover:bg-[#F8FAFC] transition-all group border-b border-slate-50 last:border-0">
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-bold text-slate-900 text-sm tracking-tight group-hover:text-blue-600 transition-colors">{c.name}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded uppercase tracking-wider">{c.channel_name || 'WhatsApp Oficial'}</span>
                            <span className="text-[9px] font-bold text-indigo-400 bg-indigo-50 px-1.5 py-0.5 rounded uppercase tracking-wider">{c.template_name}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {overviewSubTab === 'recurring' ? (
                          <div className="flex flex-col gap-1 items-start">
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-100/50">
                              {c.recurrence_type === 'daily' ? `A cada ${c.recurrence_interval} dia(s)` :
                                c.recurrence_type === 'weekly' ? `${c.recurrence_interval}x por semana` :
                                  `Mensal (Dia ${c.recurrence_day})`}
                            </span>
                            <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest pl-1">
                              <Clock size={10} strokeWidth={2.5} /> {c.recurrence_time?.substring(0, 5) || '--:--'}
                              {c.recurrence_type === 'weekly' && c.recurrence_day !== null && (
                                <span className="ml-1 border-l border-slate-200 pl-2">
                                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'][c.recurrence_day]}
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          c.status === 'scheduled' && c.scheduled_at ? (
                            <div className="flex flex-col gap-1 items-start">
                              <span className="text-xs font-bold text-slate-700">{new Date(c.scheduled_at).toLocaleString()}</span>
                              <CountdownDisplay targetDate={c.scheduled_at} />
                            </div>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">{new Date(c.created_at).toLocaleDateString()}</span>
                          )
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-lg text-[9px] uppercase font-bold tracking-[0.1em] border inline-block shadow-sm ${c.status === 'completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : c.status === 'processing' ? 'bg-blue-50 text-blue-600 border-blue-100 animate-pulse' : c.status === 'scheduled' ? 'bg-amber-50 text-amber-600 border-amber-100' : c.status === 'paused' ? 'bg-slate-900 text-slate-100 border-slate-800' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                          {c.status}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex justify-between items-end mb-0.5">
                            <span className="text-[10px] font-bold text-slate-500">{c.sent}/{c.total}</span>
                            <span className="text-[9px] font-bold text-slate-400">{Math.round((Math.min(c.sent, c.total) / c.total) * 100)}%</span>
                          </div>
                          <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden shadow-inner">
                            <div className={`h-full rounded-full transition-all duration-1000 shadow-sm ${c.status === 'completed' ? 'bg-emerald-500' : 'bg-indigo-600'}`} style={{ width: `${(Math.min(c.sent, c.total) / c.total) * 100}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-4 group-hover:translate-x-0">
                          {overviewSubTab === 'recurring' && (
                            <button
                              onClick={() => handleToggleStatus(c)}
                              title={c.status === 'paused' ? 'Retomar' : 'Pausar'}
                              className={`w-8 h-8 flex items-center justify-center rounded-lg border shadow-sm transition-all hover:scale-110 active:scale-95 ${c.status === 'paused' ? 'bg-emerald-50 border-emerald-100 text-emerald-600' : 'bg-amber-50 border-amber-100 text-amber-600'}`}
                            >
                              {c.status === 'paused' ? <Play size={14} strokeWidth={2} /> : <Pause size={14} strokeWidth={2} />}
                            </button>
                          )}
                          <button onClick={() => handleEdit(c)} title="Editar" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm hover:border-indigo-300 text-slate-400 hover:text-indigo-600 transition-all hover:scale-110 active:scale-95">
                            <Edit2 size={14} strokeWidth={2} />
                          </button>
                          <button onClick={() => handleDuplicate(c)} title="Duplicar" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm hover:border-blue-300 text-slate-400 hover:text-blue-600 transition-all hover:scale-110 active:scale-95">
                            <Copy size={14} strokeWidth={2} />
                          </button>
                          <button onClick={() => handleDeleteCampaign(c.id)} title="Excluir" className="w-8 h-8 flex items-center justify-center rounded-lg bg-white border border-slate-200 shadow-sm hover:border-red-300 text-slate-400 hover:text-red-600 transition-all hover:scale-110 active:scale-95">
                            <Trash2 size={14} strokeWidth={2} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                {campaigns.filter((c: any) => overviewSubTab === 'unique' ? (!c.recurrence_type || c.recurrence_type === 'none') : (c.recurrence_type && c.recurrence_type !== 'none')).length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center">
                      <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                        <Send size={24} strokeWidth={1} />
                      </div>
                      <p className="text-slate-400 font-bold uppercase tracking-[0.12em] text-[10px]">Nenhuma campanha {overviewSubTab === 'unique' ? 'única' : 'recorrente'} encontrada</p>
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
      {showDeleteConfirm && <DeleteConfirmationModal onClose={() => setShowDeleteConfirm(false)} onConfirm={confirmDelete} />}
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