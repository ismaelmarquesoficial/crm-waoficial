import React, { useState } from 'react';
import { X, Plus, Trash2, List, LayoutTemplate, MessageSquare, Send, ArrowLeft, Globe, FileText } from 'lucide-react';

interface InteractiveMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: any) => Promise<boolean>;
}

type InteractiveType = 'button' | 'list' | 'cta_url';

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

    // CTA URL Specific
    const [ctaButtonText, setCtaButtonText] = useState('Ver Site');
    const [ctaUrl, setCtaUrl] = useState('');
    const [headerType, setHeaderType] = useState<'text' | 'image' | 'video' | 'document'>('text');
    const [headerMediaUrl, setHeaderMediaUrl] = useState('');

    const [isSending, setIsSending] = useState(false);
    const [isFetchingMetadata, setIsFetchingMetadata] = useState(false);

    const handleFetchMetadata = async () => {
        if (!ctaUrl) return;
        setIsFetchingMetadata(true);
        try {
            const response = await fetch(`http://localhost:3001/api/utils/metadata?url=${encodeURIComponent(ctaUrl)}`, {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            const data = await response.json();
            if (data && !data.error) {
                if (data.image) {
                    setHeaderType('image');
                    setHeaderMediaUrl(data.image);
                }
                if (data.title) {
                    setHeaderText(data.title.substring(0, 60));
                }
                if (data.description) {
                    setBodyText(data.description.substring(0, 1024));
                }
            }
        } catch (err) {
            console.error('Erro ao buscar metadados:', err);
        } finally {
            setIsFetchingMetadata(false);
        }
    };

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
        if (sections[sectionIndex].rows.length >= 10) return;
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
                header: headerType === 'text' && headerText ? { type: 'text', text: headerText } : undefined,
                footer: footerText ? { text: footerText } : undefined,
                action: {}
            }
        };

        if (activeTab === 'button') {
            if (buttons.length === 0) return alert('Adicione pelo menos 1 botão.');
            if (buttons.some(b => !b.title.trim())) return alert('Todos os botões devem ter um texto.');

            payload.interactive.action.buttons = buttons.map(b => ({
                type: 'reply',
                reply: { id: b.id, title: b.title }
            }));
        } else if (activeTab === 'list') {
            if (!listButtonText) return alert('O texto do botão do menu é obrigatório.');
            if (sections.length === 0) return alert('Adicione pelo menos uma seção.');

            payload.interactive.action.button = listButtonText;
            payload.interactive.action.sections = sections;
        } else if (activeTab === 'cta_url') {
            if (!ctaButtonText) return alert('O rótulo do botão é obrigatório.');
            if (!ctaUrl) return alert('A URL do botão é obrigatória.');

            payload.interactive.type = 'cta_url';
            payload.interactive.action = {
                name: 'cta_url',
                parameters: {
                    display_text: ctaButtonText,
                    url: ctaUrl
                }
            };

            if (headerType !== 'text' && headerMediaUrl) {
                payload.interactive.header = {
                    type: headerType,
                    [headerType]: { link: headerMediaUrl }
                };
            }
        }

        setIsSending(true);
        try {
            const success = await onSend(payload);
            if (success) {
                onClose();
            }
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
                                    Botões
                                </button>
                                <button
                                    onClick={() => setActiveTab('list')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'list'
                                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                        }`}
                                >
                                    Lista
                                </button>
                                <button
                                    onClick={() => setActiveTab('cta_url')}
                                    className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'cta_url'
                                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                        }`}
                                >
                                    Botão com Link
                                </button>
                            </div>

                            {/* Common Fields */}
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Tipo de Cabeçalho</label>
                                    <select
                                        value={headerType}
                                        onChange={(e) => setHeaderType(e.target.value as any)}
                                        className="w-full px-5 py-3 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold outline-none mb-4"
                                    >
                                        <option value="text">Texto</option>
                                        <option value="image">Imagem</option>
                                        <option value="video">Vídeo</option>
                                        <option value="document">Documento</option>
                                    </select>

                                    {headerType === 'text' ? (
                                        <input
                                            type="text"
                                            value={headerText}
                                            onChange={(e) => setHeaderText(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold placeholder:text-slate-300 transition-all outline-none"
                                            placeholder="Ex: Confirmação de Agendamento"
                                        />
                                    ) : (
                                        <input
                                            type="url"
                                            value={headerMediaUrl}
                                            onChange={(e) => setHeaderMediaUrl(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold placeholder:text-slate-300 transition-all outline-none"
                                            placeholder="URL da Mídia (https://...)"
                                        />
                                    )}
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Corpo da Mensagem <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={bodyText}
                                        onChange={(e) => setBodyText(e.target.value)}
                                        rows={4}
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-600 font-medium placeholder:text-slate-300 transition-all outline-none resize-none leading-relaxed"
                                        placeholder="Digite a mensagem principal..."
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

                            {/* Dynamic Config */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                        {activeTab === 'button' ? <MessageSquare size={16} className="text-blue-500" /> : activeTab === 'list' ? <List size={16} className="text-blue-500" /> : <Globe size={16} className="text-blue-500" />}
                                        {activeTab === 'button' ? 'Configurar Botões' : activeTab === 'list' ? 'Configurar Lista' : 'Configurar Link'}
                                    </label>

                                    {activeTab === 'button' && buttons.length < 3 && (
                                        <button onClick={handleAddButton} className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wide">
                                            <Plus size={14} /> Adicionar
                                        </button>
                                    )}
                                    {activeTab === 'list' && (
                                        <button onClick={handleAddSection} className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors font-bold uppercase tracking-wide">
                                            <Plus size={14} /> Seção
                                        </button>
                                    )}
                                </div>

                                {activeTab === 'cta_url' && (
                                    <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100/50 space-y-4">
                                        <div className="relative">
                                            <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Rótulo do Botão <span className="text-red-500">*</span></label>
                                            <input
                                                type="text"
                                                value={ctaButtonText}
                                                onChange={(e) => setCtaButtonText(e.target.value)}
                                                maxLength={20}
                                                className="w-full px-4 py-3 rounded-xl bg-white border border-blue-100 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold outline-none"
                                                placeholder="Ex: Ver Site"
                                            />
                                            <p className="text-[9px] text-slate-400 mt-1 uppercase font-bold tracking-tight px-1">MÁX. 20 CARACTERES</p>
                                        </div>
                                        <div className="relative">
                                            <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">URL de Destino <span className="text-red-500">*</span></label>
                                            <div className="flex gap-2">
                                                <input
                                                    type="url"
                                                    value={ctaUrl}
                                                    onChange={(e) => setCtaUrl(e.target.value)}
                                                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-blue-100 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold outline-none"
                                                    placeholder="https://exemplo.com"
                                                />
                                                <button
                                                    onClick={handleFetchMetadata}
                                                    disabled={isFetchingMetadata || !ctaUrl}
                                                    className={`px-4 rounded-xl font-bold text-xs uppercase transition-all flex items-center gap-2 ${isFetchingMetadata ? 'bg-slate-100 text-slate-400' : 'bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-500/20'}`}
                                                >
                                                    {isFetchingMetadata ? '...' : <><LayoutTemplate size={14} /> Prévia</>}
                                                </button>
                                            </div>
                                            <p className="text-[10px] text-slate-400 mt-2 italic px-1">Clique em "Prévia" para tentar carregar foto e título do site automaticamente.</p>
                                        </div>
                                    </div>
                                )}

                                {activeTab === 'list' && (
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100/50 mb-4">
                                        <label className="block text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Texto do Botão (Menu) <span className="text-red-500">*</span></label>
                                        <input
                                            type="text"
                                            value={listButtonText}
                                            onChange={(e) => setListButtonText(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl bg-white border border-blue-100 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold outline-none"
                                        />
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {activeTab === 'button' && buttons.map((btn, index) => (
                                        <div key={index} className="flex gap-3 items-start bg-slate-50 p-3 rounded-2xl border border-slate-100 group transition-all">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 text-slate-500 flex items-center justify-center font-bold text-xs shrink-0 mt-1.5">{index + 1}</div>
                                            <div className="flex-1 space-y-2">
                                                <input
                                                    type="text"
                                                    value={btn.title}
                                                    onChange={(e) => handleUpdateButton(index, 'title', e.target.value)}
                                                    maxLength={20}
                                                    className="w-full bg-transparent border-b-2 border-transparent focus:border-blue-500 font-bold text-slate-700 outline-none"
                                                    placeholder="Texto do Botão"
                                                />
                                            </div>
                                            <button onClick={() => handleRemoveButton(index)} className="p-2 text-slate-300 hover:text-red-500 rounded-xl"><Trash2 size={16} /></button>
                                        </div>
                                    ))}

                                    {activeTab === 'list' && sections.map((section, sIndex) => (
                                        <div key={sIndex} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-4">
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="text"
                                                    value={section.title}
                                                    onChange={(e) => handleUpdateSection(sIndex, e.target.value)}
                                                    className="flex-1 px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm font-bold outline-none"
                                                    placeholder="Título da Seção"
                                                />
                                                <button onClick={() => handleRemoveSection(sIndex)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18} /></button>
                                            </div>
                                            <div className="space-y-2 pl-4 border-l-2 border-slate-200 ml-1">
                                                {section.rows.map((row, rIndex) => (
                                                    <div key={rIndex} className="flex gap-3 items-start group relative">
                                                        <div className="flex-1 bg-white p-3 rounded-xl border border-slate-100">
                                                            <input
                                                                type="text"
                                                                value={row.title}
                                                                onChange={(e) => handleUpdateRow(sIndex, rIndex, 'title', e.target.value)}
                                                                className="w-full text-sm font-bold text-slate-700 outline-none"
                                                                placeholder="Opção"
                                                            />
                                                            <input
                                                                type="text"
                                                                value={row.description}
                                                                onChange={(e) => handleUpdateRow(sIndex, rIndex, 'description', e.target.value)}
                                                                className="w-full text-xs text-slate-500 outline-none"
                                                                placeholder="Descrição"
                                                            />
                                                        </div>
                                                        <button onClick={() => handleRemoveRow(sIndex, rIndex)} className="p-1 px-2 text-red-500 hover:bg-red-50 rounded">×</button>
                                                    </div>
                                                ))}
                                                <button onClick={() => handleAddRow(sIndex)} className="text-xs text-blue-600 font-bold">+ Adicionar Opção</button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="w-1/2 bg-slate-100/50 p-8 flex items-center justify-center relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
                        <div className="w-[340px] bg-white rounded-[32px] shadow-2xl border-4 border-white overflow-hidden flex flex-col h-[560px]">
                            <div className="bg-[#008069] h-14 flex items-center px-4">
                                <ArrowLeft size={20} className="text-white mr-3" />
                                <div className="w-8 h-8 rounded-full bg-white/20 mr-2"></div>
                                <div className="h-3 w-20 bg-white/40 rounded-full"></div>
                            </div>

                            <div className="bg-[#EFEAE2] flex-1 p-4 flex flex-col justify-end bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat">
                                <div className="bg-white rounded-lg p-1 shadow-sm max-w-[90%] self-start relative z-10 rounded-tl-none">
                                    {headerType === 'text' ? (
                                        headerText && <div className="px-3 pt-2 text-sm font-bold text-slate-800 mb-1">{headerText}</div>
                                    ) : (
                                        headerMediaUrl && (
                                            <div className="w-full aspect-video bg-slate-100 rounded-t-lg overflow-hidden flex items-center justify-center mb-1">
                                                {headerType === 'image' && <img src={headerMediaUrl} className="w-full h-full object-cover" />}
                                                {headerType === 'video' && <Send size={24} className="text-slate-400 rotate-90" />}
                                                {headerType === 'document' && <FileText size={24} className="text-slate-400" />}
                                            </div>
                                        )
                                    )}

                                    <div className="px-3 pb-2 text-[15px] pt-1 text-slate-800 whitespace-pre-wrap leading-snug">
                                        {bodyText || <span className="text-slate-300 italic">Sua mensagem aqui...</span>}
                                    </div>

                                    {footerText && <div className="px-3 pb-2 text-[11px] text-slate-400 pt-1 border-t border-slate-50">{footerText}</div>}

                                    {activeTab === 'button' && buttons.map((btn, i) => (
                                        <div key={i} className="py-2.5 px-4 text-center text-[#00A884] font-medium text-[15px] border-t border-slate-100 cursor-pointer">
                                            {btn.title || 'Botão'}
                                        </div>
                                    ))}
                                </div>

                                {activeTab === 'list' && (
                                    <div className="mt-2 bg-white py-2.5 px-4 rounded-lg shadow-sm text-[#00A884] text-[15px] flex items-center gap-3 border-l-4 border-[#25D366] font-medium cursor-pointer">
                                        <List size={18} /> {listButtonText}
                                    </div>
                                )}

                                {activeTab === 'cta_url' && (
                                    <div className="mt-2 bg-white py-2.5 px-4 rounded-lg shadow-sm text-[#00A884] text-[15px] flex items-center gap-3 justify-center border border-slate-200 font-bold uppercase text-xs tracking-wider cursor-pointer">
                                        <Globe size={16} /> {ctaButtonText || 'Ver Link'}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-slate-100 flex justify-end gap-3 bg-white z-20">
                    <button onClick={onClose} className="px-6 py-3 rounded-xl text-slate-500 font-bold hover:bg-slate-50">Cancelar</button>
                    <button
                        onClick={handleSend}
                        disabled={isSending}
                        className={`px-8 py-3 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 text-white font-bold shadow-lg transition-all flex items-center gap-2 ${isSending ? 'opacity-70' : 'hover:scale-[1.02]'}`}
                    >
                        {isSending ? 'Enviando...' : <><Send size={18} /> Enviar Mensagem</>}
                    </button>
                </div>
            </div>
        </div>
    );
}
