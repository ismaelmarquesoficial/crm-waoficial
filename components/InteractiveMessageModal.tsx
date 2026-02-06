import React, { useState } from 'react';
import { X, Plus, Trash2, List, LayoutTemplate, MessageSquare, Check, ChevronRight, Send, ArrowLeft } from 'lucide-react';

interface InteractiveMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: any) => void;
}

type InteractiveType = 'button' | 'list';

export default function InteractiveMessageModal({ isOpen, onClose, onSend }: InteractiveMessageModalProps) {
    const [activeTab, setActiveTab] = useState<InteractiveType>('button');

    // Common Fields
    const [bodyText, setBodyText] = useState('');
    const [headerText, setHeaderText] = useState('');
    const [footerText, setFooterText] = useState('');

    // Button Specific
    const [buttons, setButtons] = useState<{ id: string; title: string }[]>([
        { id: 'btn_1', title: 'Sim' },
        { id: 'btn_2', title: 'Não' }
    ]);

    // List Specific
    const [listButtonText, setListButtonText] = useState('Abrir Menu');
    const [sections, setSections] = useState<{ title: string; rows: { id: string; title: string; description: string }[] }[]>([
        {
            title: 'Seção Principal',
            rows: [
                { id: 'opt_1', title: 'Opção 1', description: 'Descrição da opção 1' }
            ]
        }
    ]);

    const [isSending, setIsSending] = useState(false);

    if (!isOpen) return null;

    const handleAddButton = () => {
        if (buttons.length >= 3) return;
        setButtons([...buttons, { id: `btn_${buttons.length + 1}`, title: '' }]);
    };

    const handleRemoveButton = (index: number) => {
        setButtons(buttons.filter((_, i) => i !== index));
    };

    const handleUpdateButton = (index: number, field: 'id' | 'title', value: string) => {
        const newButtons = [...buttons];
        newButtons[index][field] = value;
        setButtons(newButtons);
    };

    const handleAddSection = () => {
        setSections([...sections, { title: '', rows: [{ id: `row_${Date.now()}`, title: '', description: '' }] }]);
    };

    const handleAddRow = (sectionIndex: number) => {
        if (sections[sectionIndex].rows.length >= 10) return; // Limit rows per section if needed, total limit is 10
        const newSections = [...sections];
        newSections[sectionIndex].rows.push({ id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`, title: '', description: '' });
        setSections(newSections);
    };

    const handleUpdateSection = (index: number, value: string) => {
        const newSections = [...sections];
        newSections[index].title = value;
        setSections(newSections);
    };

    const handleUpdateRow = (sectionIndex: number, rowIndex: number, field: 'id' | 'title' | 'description', value: string) => {
        const newSections = [...sections];
        newSections[sectionIndex].rows[rowIndex][field] = value;
        setSections(newSections);
    };

    const handleRemoveSection = (index: number) => {
        setSections(sections.filter((_, i) => i !== index));
    };

    const handleRemoveRow = (sectionIndex: number, rowIndex: number) => {
        const newSections = [...sections];
        newSections[sectionIndex].rows = newSections[sectionIndex].rows.filter((_, i) => i !== rowIndex);
        setSections(newSections);
    };



    const handleSend = async () => {
        if (!bodyText) return alert('O corpo da mensagem é obrigatório.');

        let payload: any = {
            type: 'interactive',
            interactive: {
                type: activeTab,
                body: { text: bodyText },
                header: headerText ? { type: 'text', text: headerText } : undefined,
                footer: footerText ? { text: footerText } : undefined,
                action: {}
            }
        };

        if (activeTab === 'button') {
            if (buttons.length === 0) return alert('Adicione pelo menos 1 botão.');
            // Validate buttons have titles
            if (buttons.some(b => !b.title.trim())) return alert('Todos os botões devem ter um texto.');

            payload.interactive.action.buttons = buttons.map(b => ({
                type: 'reply',
                reply: { id: b.id, title: b.title }
            }));
        } else {
            if (!listButtonText) return alert('O texto do botão do menu é obrigatório.');
            if (sections.length === 0) return alert('Adicione pelo menos uma seção.');

            payload.interactive.action.button = listButtonText;
            payload.interactive.action.sections = sections;
        }

        setIsSending(true);
        try {
            await onSend(payload);
            onClose();
        } catch (error) {
            console.error("Erro ao enviar no modal:", error);
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white rounded-3xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-slide-up border border-white/20">

                {/* Header with Gradient */}
                <div className="p-5 border-b border-white/10 flex justify-between items-center bg-gradient-to-r from-blue-600 to-emerald-500 sticky top-0 z-10 text-white shadow-lg">
                    <h2 className="text-xl font-bold flex items-center gap-3 tracking-tight">
                        <div className="bg-white/20 p-2 rounded-lg backdrop-blur-md">
                            <LayoutTemplate size={22} className="text-white" />
                        </div>
                        Criar Mensagem Interativa
                    </h2>
                    <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors text-white/90 hover:text-white">
                        <X size={22} />
                    </button>
                </div>

                <div className="flex flex-1 overflow-hidden">

                    {/* Left Panel - Editor */}
                    <div className="w-1/2 overflow-y-auto border-r border-slate-100 bg-white">
                        <div className="p-8 space-y-8">

                            {/* Tabs */}
                            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100">
                                <button
                                    onClick={() => setActiveTab('button')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'button'
                                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                        }`}
                                >
                                    Botões (Quick Reply)
                                </button>
                                <button
                                    onClick={() => setActiveTab('list')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'list'
                                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                        }`}
                                >
                                    Lista de Opções
                                </button>
                            </div>

                            {/* Common Fields */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Cabeçalho (Opcional)</label>
                                    <input
                                        type="text"
                                        value={headerText}
                                        onChange={(e) => setHeaderText(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold placeholder:text-slate-300 transition-all outline-none"
                                        placeholder="Ex: Confirmação de Agendamento"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Corpo da Mensagem <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={bodyText}
                                        onChange={(e) => setBodyText(e.target.value)}
                                        rows={4}
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-600 font-medium placeholder:text-slate-300 transition-all outline-none resize-none leading-relaxed"
                                        placeholder="Digite a mensagem principal que o cliente verá..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Rodapé (Opcional)</label>
                                    <input
                                        type="text"
                                        value={footerText}
                                        onChange={(e) => setFooterText(e.target.value)}
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-500 font-medium placeholder:text-slate-300 transition-all outline-none"
                                        placeholder="Ex: Selecione uma opção abaixo"
                                    />
                                </div>
                            </div>

                            <hr className="border-slate-100" />

                            {/* Interactive Builder */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        {activeTab === 'button' ? <MessageSquare size={16} className="text-blue-500" /> : <List size={16} className="text-blue-500" />}
                                        {activeTab === 'button' ? 'Configurar Botões' : 'Configurar Lista'}
                                    </label>

                                    {activeTab === 'button' && buttons.length < 3 && (
                                        <button onClick={handleAddButton} className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wide">
                                            <Plus size={14} strokeWidth={2.5} /> Adicionar
                                        </button>
                                    )}
                                    {activeTab === 'list' && (
                                        <button onClick={handleAddSection} className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wide">
                                            <Plus size={14} strokeWidth={2.5} /> Seção
                                        </button>
                                    )}
                                </div>

                                {activeTab === 'list' && (
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50">
                                        <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Texto do Botão (Menu) <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={listButtonText}
                                            onChange={(e) => setListButtonText(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-blue-100 focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold outline-none"
                                            placeholder="Ex: Ver Opções"
                                        />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {activeTab === 'button' ? (
                                        buttons.map((btn, index) => (
                                            <div key={index} className="flex gap-3 items-start bg-slate-50 p-3 rounded-2xl border border-slate-100 group hover:border-blue-200 hover:bg-white hover:shadow-sm transition-all">
                                                <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 mt-1.5">
                                                    {index + 1}
                                                </div>
                                                <div className="flex-1 space-y-2">
                                                    <input
                                                        type="text"
                                                        value={btn.title}
                                                        onChange={(e) => handleUpdateButton(index, 'title', e.target.value)}
                                                        placeholder="Texto do Botão (Ex: Sim, confirmar)"
                                                        className="w-full px-0 py-1 bg-transparent border-b-2 border-transparent focus:border-blue-500 font-bold text-slate-700 placeholder:text-slate-300 outline-none transition-colors"
                                                    />
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] uppercase font-bold text-slate-400">ID:</span>
                                                        <input
                                                            type="text"
                                                            value={btn.id}
                                                            onChange={(e) => handleUpdateButton(index, 'id', e.target.value)}
                                                            placeholder="btn_id"
                                                            className="flex-1 bg-transparent text-xs text-slate-500 font-mono focus:text-blue-600 outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <button onClick={() => handleRemoveButton(index)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-0 group-hover:opacity-100">
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))
                                    ) : (
                                        sections.map((section, sIndex) => (
                                            <div key={sIndex} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4 group/section transition-all hover:border-blue-200 hover:shadow-sm">
                                                <div className="flex items-center gap-2">
                                                    <input
                                                        type="text"
                                                        value={section.title}
                                                        onChange={(e) => handleUpdateSection(sIndex, e.target.value)}
                                                        placeholder="Título da Seção (Ex: Roupas)"
                                                        className="flex-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 outline-none text-slate-800"
                                                    />
                                                    <button
                                                        onClick={() => handleRemoveSection(sIndex)}
                                                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                                        title="Remover Seção"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>

                                                <div className="space-y-2 pl-4 border-l-2 border-slate-200 ml-1">
                                                    {section.rows.map((row, rIndex) => (
                                                        <div key={rIndex} className="flex gap-3 items-start group relative">
                                                            <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100 hover:border-blue-200 transition-colors shadow-sm">
                                                                <input
                                                                    type="text"
                                                                    value={row.title}
                                                                    onChange={(e) => handleUpdateRow(sIndex, rIndex, 'title', e.target.value)}
                                                                    placeholder="Nome da Opção"
                                                                    className="w-full text-sm font-bold text-slate-700 outline-none mb-1 placeholder:text-slate-300"
                                                                />
                                                                <input
                                                                    type="text"
                                                                    value={row.description}
                                                                    onChange={(e) => handleUpdateRow(sIndex, rIndex, 'description', e.target.value)}
                                                                    placeholder="Descrição curta (opcional)"
                                                                    className="w-full text-xs text-slate-500 outline-none placeholder:text-slate-300"
                                                                />
                                                            </div>
                                                            <button
                                                                onClick={() => handleRemoveRow(sIndex, rIndex)}
                                                                className="absolute -right-2 -top-2 p-1.5 bg-white text-slate-400 hover:text-red-500 shadow-sm border border-slate-100 rounded-full opacity-100 transition-all hover:scale-110 hover:shadow-md z-10"
                                                                title="Remover Opção"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                    <button onClick={() => handleAddRow(sIndex)} className="text-xs text-blue-600 hover:text-blue-700 hover:underline mt-2 flex items-center gap-1 font-bold px-2 py-1 rounded hover:bg-blue-50 w-fit transition-colors">
                                                        <Plus size={12} strokeWidth={3} /> Adicionar Opção
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                        </div>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="w-1/2 bg-slate-100/50 p-8 flex items-center justify-center relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">

                        <div className="text-center absolute top-6 left-0 right-0">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Preview em Tempo Real</h3>
                            <p className="text-[10px] text-slate-400">Simulação de visualização no WhatsApp</p>
                        </div>

                        {/* Mock Phone */}
                        <div className="w-[340px] bg-white rounded-[32px] shadow-[0_20px_50px_-12px_rgba(0,0,0,0.15)] overflow-hidden relative z-10 border-4 border-white ring-1 ring-slate-200/50">
                            <div className="bg-[#008069] h-14 flex items-center px-4 shadow-sm relative z-20">
                                <div className="flex items-center gap-3">
                                    <ArrowLeft size={20} className="text-white" />
                                    <div className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm"></div>
                                    <div className="space-y-1">
                                        <div className="h-2.5 w-20 bg-white/40 rounded-full"></div>
                                        <div className="h-2 w-12 bg-white/20 rounded-full"></div>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-[#EFEAE2] h-[500px] p-4 flex flex-col justify-end bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] relative">
                                <div className="absolute inset-0 bg-[#EFEAE2]/90 mix-blend-overlay pointer-events-none"></div>

                                {/* Message Bubble */}
                                <div className="bg-white rounded-lg p-1 shadow-[0_1px_0.5px_rgba(0,0,0,0.13)] max-w-[90%] self-start relative z-10 rounded-tl-none">
                                    {headerText && <div className="px-3 pt-2 text-sm font-bold text-slate-800 mb-1">{headerText}</div>}

                                    <div className="px-3 pb-2 text-[15px] pt-1 text-slate-800 whitespace-pre-wrap leading-snug">
                                        {bodyText || <span className="text-slate-300 italic">Sua mensagem aparecerá aqui...</span>}
                                    </div>

                                    {footerText && <div className="px-3 pb-2 text-[11px] text-slate-400 pt-1 mt-1">{footerText}</div>}

                                    {/* Buttons Preview inside Bubble */}
                                    {activeTab === 'button' && buttons.length > 0 && (
                                        <div className="mt-1 border-t border-slate-100 flex flex-col">
                                            {buttons.map((btn, i) => (
                                                <div key={i} className="py-2.5 px-4 text-center text-[#00A884] font-medium text-[15px] cursor-pointer hover:bg-slate-50 border-b border-slate-100 last:border-0 transition-colors flex items-center justify-center gap-2">
                                                    {i === 0 && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 opacity-50"></span>}
                                                    {btn.title || 'Botão'}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* List Menu Button Preview */}
                                {activeTab === 'list' && (
                                    <div className="mt-2 relative z-10 self-start w-[90%]">
                                        <div className="bg-white py-2.5 px-4 rounded-lg shadow-sm text-[#00A884] text-[15px] flex items-center gap-3 cursor-pointer justify-between border-l-4 border-[#25D366] hover:bg-slate-50 transition-colors">
                                            <div className="flex items-center gap-2 font-medium">
                                                <List size={18} />
                                                {listButtonText}
                                            </div>
                                            <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                                        </div>
                                    </div>
                                )}

                                <div className="mt-2 text-[10px] text-slate-400 text-center uppercase tracking-widest opacity-60">
                                    Mensagem Segura
                                </div>
                            </div>
                        </div>
                    </div>

                </div>

                {/* Footer Actions */}
                <div className="p-5 border-t border-slate-100 flex justify-end items-center gap-3 bg-white z-20">
                    <button
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-50 transition-colors text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className={`px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold shadow-lg shadow-blue-500/25 transition-all flex items-center gap-2 text-sm tracking-wide ${isSending ? 'opacity-70 cursor-not-allowed' : 'hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0'}`}
                    >
                        {isSending ? (
                            <>Sending...</>
                        ) : (
                            <>
                                <Send size={18} />
                                Enviar Mensagem
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}
