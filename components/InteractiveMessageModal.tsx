import React, { useState } from 'react';
import { X, Plus, Trash2, List, LayoutTemplate, MessageSquare, Send, ArrowLeft, Globe, FileText, LayoutGrid, ChevronRight, ChevronLeft, AlertCircle } from 'lucide-react';

interface InteractiveMessageModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSend: (data: any) => Promise<boolean>;
    channelId: string | null;
}

type InteractiveType = 'button' | 'list' | 'cta_url' | 'carousel';
type CardActionType = 'cta_url' | 'quick_reply';

interface CarouselCard {
    header: {
        type: 'image' | 'video';
        link: string;
        id?: string;
    };
    body: {
        text: string;
    };
    action: {
        name?: 'cta_url';
        parameters?: {
            display_text: string;
            url: string;
        };
        buttons?: {
            type: 'quick_reply';
            quick_reply: {
                id: string;
                title: string;
            };
        }[];
    };
}

export default function InteractiveMessageModal({ isOpen, onClose, onSend, channelId }: InteractiveMessageModalProps) {
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
    const [headerMediaId, setHeaderMediaId] = useState('');
    const [isUploadingHeader, setIsUploadingHeader] = useState(false);
    const [uploadingCardIndex, setUploadingCardIndex] = useState<number | null>(null);

    // Carousel Specific
    const [carouselActionType, setCarouselActionType] = useState<CardActionType>('cta_url');
    const [carouselCards, setCarouselCards] = useState<CarouselCard[]>([
        {
            header: { type: 'image', link: '' },
            body: { text: '' },
            action: { name: 'cta_url', parameters: { display_text: 'Ver mais', url: '' } }
        },
        {
            header: { type: 'image', link: '' },
            body: { text: '' },
            action: { name: 'cta_url', parameters: { display_text: 'Ver mais', url: '' } }
        }
    ]);
    const [prevActiveCardIndex, setPrevActiveCardIndex] = useState(0);

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

    // Carousel Handlers
    const handleAddCarouselCard = () => {
        if (carouselCards.length >= 10) return;
        const newCard: CarouselCard = {
            header: { type: 'image', link: '' },
            body: { text: '' },
            action: carouselActionType === 'cta_url'
                ? { name: 'cta_url', parameters: { display_text: 'Ver mais', url: '' } }
                : { buttons: [{ type: 'quick_reply', quick_reply: { id: `card_${carouselCards.length}_btn_1`, title: 'Selecionar' } }] }
        };

        // If cards already exist, copy button structure to satisfy Meta requirements
        if (carouselCards.length > 0) {
            const firstCard = carouselCards[0];
            if (carouselActionType === 'cta_url') {
                newCard.action = {
                    name: 'cta_url',
                    parameters: {
                        display_text: firstCard.action.parameters?.display_text || 'Ver mais',
                        url: ''
                    }
                };
            } else {
                newCard.action = {
                    buttons: firstCard.action.buttons?.map((b, i) => ({
                        type: 'quick_reply',
                        quick_reply: { id: `card_${carouselCards.length}_btn_${i + 1}`, title: b.quick_reply.title }
                    }))
                };
            }
        }

        setCarouselCards([...carouselCards, newCard]);
    };

    const handleRemoveCarouselCard = (index: number) => {
        if (carouselCards.length <= 2) return alert('O carrossel deve ter no mínimo 2 cartões.');
        setCarouselCards(carouselCards.filter((_, i) => i !== index));
    };

    const handleUpdateCard = (index: number, updates: Partial<CarouselCard>) => {
        const newCards = [...carouselCards];
        newCards[index] = { ...newCards[index], ...updates };
        setCarouselCards(newCards);
    };

    const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, cardIndex: number | null = null) => {
        const file = event.target.files?.[0];
        if (!file || !channelId) return;

        const isCarousel = cardIndex !== null;
        if (isCarousel) setUploadingCardIndex(cardIndex);
        else setIsUploadingHeader(true);

        const formData = new FormData();
        formData.append('file', file);
        formData.append('channelId', channelId);

        try {
            const response = await fetch(`http://localhost:3001/api/utils/upload-media`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: formData
            });

            const data = await response.json();
            if (data.id) {
                const fullUrl = data.url.startsWith('http') ? data.url : `http://localhost:3001${data.url}`;
                if (isCarousel) {
                    handleUpdateCard(cardIndex, {
                        header: {
                            ...carouselCards[cardIndex].header,
                            link: fullUrl,
                            id: data.id
                        }
                    });
                } else {
                    setHeaderMediaUrl(fullUrl);
                    setHeaderMediaId(data.id);
                }
            } else {
                alert('Erro no upload: ' + (data.error || 'Desconhecido'));
            }
        } catch (err) {
            console.error('Erro ao fazer upload:', err);
            alert('Falha ao conectar com o servidor.');
        } finally {
            if (isCarousel) setUploadingCardIndex(null);
            else setIsUploadingHeader(false);
            // Reset input
            event.target.value = '';
        }
    };

    const handleUpdateCarouselActionType = (type: CardActionType) => {
        setCarouselActionType(type);
        // Reset all cards actions to match new type
        const newCards = carouselCards.map((card, i) => {
            if (type === 'cta_url') {
                return {
                    ...card,
                    action: { name: 'cta_url' as const, parameters: { display_text: 'Ver mais', url: '' } }
                };
            } else {
                return {
                    ...card,
                    action: { buttons: [{ type: 'quick_reply' as const, quick_reply: { id: `card_${i}_btn_1`, title: 'Selecionar' } }] }
                };
            }
        });
        setCarouselCards(newCards);
    };

    const handleSend = async () => {
        if (!bodyText) return alert('O corpo da mensagem é obrigatório.');

        let payload: any = {
            type: 'interactive',
            interactive: {
                type: activeTab,
                body: { text: bodyText },
                header: activeTab !== 'carousel' && headerType === 'text' && headerText ? { type: 'text', text: headerText } : undefined,
                footer: activeTab !== 'carousel' && footerText ? { text: footerText } : undefined,
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

            if (headerType !== 'text') {
                if (headerMediaId) {
                    payload.interactive.header = {
                        type: headerType,
                        [headerType]: { id: headerMediaId }
                    };
                } else if (headerMediaUrl) {
                    payload.interactive.header = {
                        type: headerType,
                        [headerType]: { link: headerMediaUrl }
                    };
                }
            }
        } else if (activeTab === 'carousel') {
            if (carouselCards.length < 2) return alert('Adicione pelo menos 2 cartões.');

            // Validate all cards
            for (let i = 0; i < carouselCards.length; i++) {
                const card = carouselCards[i];
                if (!card.header.link) return alert(`O cartão ${i + 1} precisa de um link de imagem/vídeo.`);

                if (carouselActionType === 'cta_url') {
                    if (!card.action.parameters?.url) return alert(`O cartão ${i + 1} precisa de uma URL de destino.`);
                    if (!card.action.parameters?.display_text) return alert(`O rótulo do botão no cartão ${i + 1} é obrigatório.`);
                } else {
                    if (!card.action.buttons || card.action.buttons.length === 0) return alert(`O cartão ${i + 1} precisa de pelo menos 1 botão de resposta rápida.`);
                }
            }

            payload.interactive.action = {
                cards: carouselCards.map((card, idx) => ({
                    card_index: idx,
                    type: carouselActionType === 'quick_reply' ? 'BUTTON' : 'CTA_URL',
                    header: {
                        type: card.header.type,
                        // Carrosséis da Meta EXIGEM 'link' e não aceitam 'id' atualmente.
                        [card.header.type]: { link: card.header.link }
                    },
                    body: card.body.text ? { text: card.body.text } : undefined,
                    action: carouselActionType === 'cta_url' ? {
                        name: 'cta_url',
                        parameters: card.action.parameters
                    } : {
                        buttons: card.action.buttons
                    }
                }))
            };
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
                            <div className="flex bg-slate-50 p-1.5 rounded-2xl border border-slate-100 overflow-x-auto gap-1">
                                <button
                                    onClick={() => setActiveTab('button')}
                                    className={`whitespace-nowrap flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'button'
                                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                        }`}
                                >
                                    Botões
                                </button>
                                <button
                                    onClick={() => setActiveTab('list')}
                                    className={`whitespace-nowrap flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'list'
                                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                        }`}
                                >
                                    Lista
                                </button>
                                <button
                                    onClick={() => setActiveTab('cta_url')}
                                    className={`whitespace-nowrap flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'cta_url'
                                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                        }`}
                                >
                                    Link
                                </button>
                                <button
                                    onClick={() => setActiveTab('carousel')}
                                    className={`whitespace-nowrap flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all ${activeTab === 'carousel'
                                        ? 'bg-white text-blue-600 shadow-md shadow-blue-500/10 scale-[1.02]'
                                        : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100/50'
                                        }`}
                                >
                                    Carrossel
                                </button>
                            </div>

                            {/* Common Fields */}
                            <div className="space-y-6">
                                {activeTab !== 'carousel' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Cabeçalho</label>
                                        <select
                                            value={headerType}
                                            onChange={(e) => setHeaderType(e.target.value as any)}
                                            className="w-full px-5 py-3 rounded-xl bg-slate-50 border-0 text-slate-700 font-bold outline-none mb-4"
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
                                                className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold outline-none"
                                                placeholder="Ex: Título da Mensagem"
                                                maxLength={60}
                                            />
                                        ) : (
                                            <div className="space-y-3">
                                                <div className="flex gap-2">
                                                    <input
                                                        type="url"
                                                        value={headerMediaUrl}
                                                        onChange={(e) => {
                                                            setHeaderMediaUrl(e.target.value);
                                                            setHeaderMediaId(''); // Clear ID if manually editing URL
                                                        }}
                                                        className="flex-1 px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-700 font-bold outline-none"
                                                        placeholder="URL da Mídia (https://...)"
                                                    />
                                                    <div className="relative">
                                                        <input
                                                            type="file"
                                                            id="header-upload"
                                                            className="hidden"
                                                            onChange={(e) => handleFileUpload(e)}
                                                            accept={headerType === 'image' ? "image/*" : headerType === 'video' ? "video/*" : "*/*"}
                                                        />
                                                        <button
                                                            onClick={() => document.getElementById('header-upload')?.click()}
                                                            disabled={isUploadingHeader || !channelId}
                                                            className={`h-full px-4 rounded-xl font-bold text-xs flex items-center gap-2 transition-all ${isUploadingHeader ? 'bg-slate-100 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
                                                        >
                                                            {isUploadingHeader ? (
                                                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                                            ) : (
                                                                <><Plus size={16} /> Upload</>
                                                            )}
                                                        </button>
                                                    </div>
                                                </div>
                                                {headerMediaId && (
                                                    <div className="px-4 py-2 bg-emerald-50 border border-emerald-100 rounded-lg flex items-center gap-2">
                                                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
                                                        <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider">Mídia Vinculada (Meta ID: {headerMediaId.substring(0, 8)}...)</span>
                                                    </div>
                                                )}
                                                {headerType === 'image' && (
                                                    <p className="text-[10px] text-slate-400 font-bold px-1 uppercase tracking-tight flex items-center gap-1">
                                                        <AlertCircle size={10} className="text-amber-500" /> Formatos aceitos: JPG ou PNG
                                                    </p>
                                                )}
                                                {!channelId && headerType !== 'text' && (
                                                    <p className="text-[10px] text-amber-600 font-medium px-1">Selecione um canal no chat para habilitar o upload direto.</p>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Corpo da Mensagem <span className="text-red-500">*</span></label>
                                    <textarea
                                        value={bodyText}
                                        onChange={(e) => setBodyText(e.target.value)}
                                        rows={3}
                                        className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-600 font-medium transition-all outline-none resize-none leading-relaxed"
                                        placeholder={activeTab === 'carousel' ? "Contexto geral do carrossel..." : "Digite a mensagem principal..."}
                                        maxLength={1024}
                                    />
                                </div>

                                {activeTab !== 'carousel' && (
                                    <div>
                                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">Rodapé (Opcional)</label>
                                        <input
                                            type="text"
                                            value={footerText}
                                            onChange={(e) => setFooterText(e.target.value)}
                                            className="w-full px-5 py-3.5 rounded-xl bg-slate-50 border-0 focus:ring-2 focus:ring-blue-500/20 text-slate-500 font-medium outline-none"
                                            placeholder="Ex: Clique em uma opção"
                                            maxLength={60}
                                        />
                                    </div>
                                )}
                            </div>

                            <hr className="border-slate-100" />

                            {/* Carousel Builder */}
                            {activeTab === 'carousel' && (
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs font-bold text-slate-700 uppercase tracking-widest flex items-center gap-2">
                                            <LayoutGrid size={16} className="text-blue-500" /> Cartões ({carouselCards.length}/10)
                                        </label>
                                        <button onClick={handleAddCarouselCard} className="text-xs flex items-center gap-1.5 text-blue-600 hover:text-blue-700 font-bold uppercase">
                                            <Plus size={14} /> Novo Cartão
                                        </button>
                                    </div>

                                    <div className="flex bg-slate-100 p-1.5 rounded-xl mb-4">
                                        <button
                                            onClick={() => handleUpdateCarouselActionType('cta_url')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${carouselActionType === 'cta_url' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                                        >
                                            Botões de Link
                                        </button>
                                        <button
                                            onClick={() => handleUpdateCarouselActionType('quick_reply')}
                                            className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${carouselActionType === 'quick_reply' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
                                        >
                                            Botões de Resposta
                                        </button>
                                    </div>

                                    <div className="space-y-8">
                                        {carouselCards.map((card, idx) => (
                                            <div key={idx} className="bg-slate-50 rounded-2xl border border-slate-200 overflow-hidden group">
                                                <div className="bg-slate-200/50 px-4 py-2 flex justify-between items-center text-xs font-bold text-slate-500">
                                                    <span>CARTÃO #{idx + 1}</span>
                                                    <button onClick={() => handleRemoveCarouselCard(idx)} className="text-red-400 hover:text-red-600">
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                                <div className="p-4 space-y-4">
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">Mídia</label>
                                                            <select
                                                                value={card.header.type}
                                                                onChange={(e) => handleUpdateCard(idx, { header: { ...card.header, type: e.target.value as any } })}
                                                                className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs outline-none"
                                                            >
                                                                <option value="image">Imagem</option>
                                                                <option value="video">Vídeo</option>
                                                            </select>
                                                        </div>
                                                        <div>
                                                            <label className="text-[10px] font-bold text-slate-400 uppercase">URL ou Upload</label>
                                                            <div className="flex gap-1.5 mt-1">
                                                                <input
                                                                    type="url"
                                                                    value={card.header.link}
                                                                    onChange={(e) => handleUpdateCard(idx, { header: { ...card.header, link: e.target.value, id: undefined } })}
                                                                    className="flex-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs outline-none"
                                                                    placeholder="https://..."
                                                                />
                                                                <input
                                                                    type="file"
                                                                    id={`card-upload-${idx}`}
                                                                    className="hidden"
                                                                    onChange={(e) => handleFileUpload(e, idx)}
                                                                    accept={card.header.type === 'image' ? "image/*" : "video/*"}
                                                                />
                                                                <button
                                                                    onClick={() => document.getElementById(`card-upload-${idx}`)?.click()}
                                                                    disabled={uploadingCardIndex === idx || !channelId}
                                                                    className={`px-2 rounded-lg transition-all ${uploadingCardIndex === idx ? 'bg-slate-100 text-slate-400' : 'bg-slate-200 text-slate-600 hover:bg-slate-300'}`}
                                                                    title="Fazer Upload"
                                                                >
                                                                    {uploadingCardIndex === idx ? (
                                                                        <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                                                    ) : (
                                                                        <Plus size={16} />
                                                                    )}
                                                                </button>
                                                            </div>
                                                            {card.header.id && (
                                                                <div className="mt-1 flex items-center gap-1.5 px-2 py-0.5 bg-emerald-50 rounded border border-emerald-100">
                                                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                                                                    <span className="text-[8px] font-bold text-emerald-700">META ID ATIVO</span>
                                                                </div>
                                                            )}
                                                            {card.header.type === 'image' && (
                                                                <p className="text-[8px] text-slate-400 font-bold mt-1 uppercase tracking-tighter flex items-center gap-1">
                                                                    <AlertCircle size={8} className="text-amber-500" /> Use JPG ou PNG
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div>
                                                        <label className="text-[10px] font-bold text-slate-400 uppercase">Texto do Cartão</label>
                                                        <textarea
                                                            value={card.body.text}
                                                            onChange={(e) => handleUpdateCard(idx, { body: { text: e.target.value } })}
                                                            maxLength={160}
                                                            className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs outline-none resize-none"
                                                            rows={2}
                                                            placeholder="Breve descrição do item..."
                                                        />
                                                    </div>

                                                    {carouselActionType === 'cta_url' ? (
                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Texto do Botão</label>
                                                                <input
                                                                    type="text"
                                                                    value={card.action.parameters?.display_text}
                                                                    onChange={(e) => handleUpdateCard(idx, { action: { ...card.action, parameters: { ...card.action.parameters!, display_text: e.target.value } } })}
                                                                    maxLength={20}
                                                                    className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs outline-none font-bold text-emerald-600"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase">Link (URL)</label>
                                                                <input
                                                                    type="url"
                                                                    value={card.action.parameters?.url}
                                                                    onChange={(e) => handleUpdateCard(idx, { action: { ...card.action, parameters: { ...card.action.parameters!, url: e.target.value } } })}
                                                                    className="w-full mt-1 px-3 py-2 bg-white rounded-lg border border-slate-200 text-xs outline-none"
                                                                    placeholder="https://..."
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="space-y-2">
                                                            <div className="flex justify-between items-center">
                                                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">Botoes de Resposta</label>
                                                                {card.action.buttons!.length < 3 && (
                                                                    <button
                                                                        onClick={() => {
                                                                            const newBtnIdx = card.action.buttons!.length + 1;
                                                                            // Meta requirement: All cards MUST have the same number of buttons.
                                                                            // We add a button to all cards.
                                                                            const newCards = carouselCards.map((c, cidx) => ({
                                                                                ...c,
                                                                                action: {
                                                                                    ...c.action,
                                                                                    buttons: [...c.action.buttons!, { type: 'quick_reply' as const, quick_reply: { id: `card_${cidx}_btn_${newBtnIdx}`, title: 'Selecionar' } }]
                                                                                }
                                                                            }));
                                                                            setCarouselCards(newCards);
                                                                        }}
                                                                        className="text-[10px] text-blue-500 font-bold uppercase"
                                                                    >
                                                                        + Adicionar Botão
                                                                    </button>
                                                                )}
                                                            </div>
                                                            {card.action.buttons?.map((btn, bidx) => (
                                                                <div key={bidx} className="flex gap-2">
                                                                    <input
                                                                        type="text"
                                                                        value={btn.quick_reply.title}
                                                                        onChange={(e) => {
                                                                            const val = e.target.value;
                                                                            // UPDATE ONLY THIS CARD'S BUTTON
                                                                            const newCards = [...carouselCards];
                                                                            const newBtns = [...newCards[idx].action.buttons!];
                                                                            newBtns[bidx] = { ...newBtns[bidx], quick_reply: { ...newBtns[bidx].quick_reply, title: val } };
                                                                            newCards[idx] = { ...newCards[idx], action: { ...newCards[idx].action, buttons: newBtns } };
                                                                            setCarouselCards(newCards);
                                                                        }}
                                                                        maxLength={20}
                                                                        className="flex-1 px-3 py-1.5 bg-white rounded-lg border border-slate-200 text-xs font-bold text-blue-600 outline-none"
                                                                        placeholder="Texto do Botão"
                                                                    />
                                                                    {card.action.buttons!.length > 1 && (
                                                                        <button
                                                                            onClick={() => {
                                                                                // Meta requirement: All cards MUST have the same number of buttons.
                                                                                // We must remove this button index from ALL cards.
                                                                                const newCards = carouselCards.map((c) => ({
                                                                                    ...c,
                                                                                    action: { ...c.action, buttons: c.action.buttons!.filter((_, bi) => bi !== bidx) }
                                                                                }));
                                                                                setCarouselCards(newCards);
                                                                            }}
                                                                            className="p-1 px-2.5 bg-red-50 text-red-500 rounded-lg"
                                                                            title="Remove este botão de todos os cartões"
                                                                        >
                                                                            ×
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Standard Interaction Config */}
                            {activeTab !== 'carousel' && (
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
                                                <p className="text-[10px] text-slate-400 mt-2 italic px-1">Clique em "Prévia" para carregar foto e título automaticamente.</p>
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
                            )}
                        </div>
                    </div>

                    {/* Right Panel - Preview */}
                    <div className="w-1/2 bg-slate-100/50 p-8 flex items-center justify-center relative bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:16px_16px]">
                        <div className="w-[340px] bg-white rounded-[32px] shadow-2xl border-4 border-white overflow-hidden flex flex-col h-[560px]">
                            <div className="bg-[#008069] h-14 flex items-center px-4 shrink-0">
                                <ArrowLeft size={20} className="text-white mr-3" />
                                <div className="w-8 h-8 rounded-full bg-white/20 mr-2"></div>
                                <div className="h-3 w-20 bg-white/40 rounded-full"></div>
                            </div>

                            <div className="bg-[#EFEAE2] flex-1 p-4 flex flex-col justify-end bg-[url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')] bg-repeat overflow-hidden relative">

                                {activeTab === 'carousel' ? (
                                    <div className="flex flex-col gap-3 mb-2">
                                        <div className="bg-white rounded-lg p-2.5 shadow-sm self-start max-w-[85%] rounded-tl-none">
                                            <p className="text-[14px] text-slate-800 leading-snug">{bodyText || "Mensagem do carrossel..."}</p>
                                        </div>

                                        <div className="flex gap-2 overflow-x-auto pb-4 px-1 snap-x no-scrollbar">
                                            {carouselCards.map((card, i) => (
                                                <div key={i} className="min-w-[190px] w-[190px] bg-white rounded-xl shadow-md flex-shrink-0 snap-center overflow-hidden border border-slate-100">
                                                    <div className="h-28 bg-slate-200">
                                                        {card.header.link && <img src={card.header.link} className="w-full h-full object-cover" />}
                                                    </div>
                                                    <div className="p-2 space-y-1">
                                                        <p className="text-[11px] text-slate-800 font-medium line-clamp-2 leading-tight h-8">
                                                            {card.body.text || "Descrição do cartão..."}
                                                        </p>
                                                        <div className="pt-1.5 border-t border-slate-50 flex flex-col gap-1">
                                                            {carouselActionType === 'cta_url' ? (
                                                                <div className="py-1 px-2 bg-emerald-50 text-emerald-600 rounded text-[10px] font-bold text-center flex items-center justify-center gap-1">
                                                                    <Globe size={10} /> {card.action.parameters?.display_text || 'Link'}
                                                                </div>
                                                            ) : (
                                                                card.action.buttons?.map((btn, bi) => (
                                                                    <div key={bi} className="py-1 px-2 bg-blue-50 text-blue-600 rounded text-[10px] font-bold text-center truncate">
                                                                        {btn.quick_reply.title || 'Botão'}
                                                                    </div>
                                                                ))
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            <div className="min-w-[20px] flex-shrink-0"></div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
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
                                    </>
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
