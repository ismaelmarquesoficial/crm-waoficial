import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause, Mic } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    isUser: boolean;
    timestamp?: string;
}

/**
 * Player de Áudio ULTRA PREMIUM & COMPACTO
 * Estética de vidro, animações suaves e inteligência visual.
 */
const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, isUser, timestamp }) => {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLoaded, setIsLoaded] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Onda visual inteligente (determinística com base na URL)
    const waveformBars = useMemo(() => {
        const bars = 30; // Aumentado para preencher a largura maior
        const result = [];
        let seed = src.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        for (let i = 0; i < bars; i++) {
            seed = (seed * 9301 + 49297) % 233280;
            const height = 25 + (seed % 65);
            result.push(height);
        }
        return result;
    }, [src]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => setProgress(audio.currentTime);
        const setAudioData = () => {
            setDuration(audio.duration);
            setIsLoaded(true);
        };
        const onEnded = () => {
            setPlaying(false);
            setProgress(0);
        };

        if (audio.readyState >= 2) setAudioData();

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('ended', onEnded);
        };
    }, [src]);

    const togglePlay = () => {
        if (playing) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setPlaying(!playing);
    };

    const toggleSpeed = () => {
        const rates = [1, 1.5, 2];
        const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
        setPlaybackRate(nextRate);
        if (audioRef.current) audioRef.current.playbackRate = nextRate;
    };

    const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !audioRef.current || !duration) return;
        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const clickedValue = (x / rect.width) * duration;
        audioRef.current.currentTime = clickedValue;
        setProgress(clickedValue);
    };

    const formatTime = (time: number) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    // Estilo Outbound (Enviado) vs Inbound (Recebido)
    const containerClasses = isUser
        ? 'bg-gradient-to-r from-blue-600 to-teal-500 text-white rounded-tr-sm shadow-lg shadow-blue-500/20'
        : 'bg-white text-slate-800 rounded-tl-sm border border-slate-100 shadow-sm';

    return (
        <div className={`
            flex items-center gap-2.5 p-2 pr-3 rounded-2xl min-w-[260px] max-w-[320px] 
            transition-all duration-300 relative overflow-hidden group
            ${containerClasses}
        `}>
            {/* Brilho de Vidro Interno (Apenas Outbound) */}
            {isUser && <div className="absolute inset-0 bg-white/5 pointer-events-none"></div>}

            {/* Ícone de Microfone Mini (Inteligência Visual) */}
            <div className={`relative flex-shrink-0 ${playing ? 'scale-110' : 'scale-100'} transition-transform duration-500`}>
                <div className={`
                    w-8 h-8 rounded-full flex items-center justify-center transition-all
                    ${isUser ? 'bg-white/20 backdrop-blur-md' : 'bg-blue-50'}
                `}>
                    <button
                        onClick={togglePlay}
                        disabled={!isLoaded}
                        className={`
                            w-6 h-6 rounded-full flex items-center justify-center transition-all
                            active:scale-90 hover:scale-105
                            ${isUser ? 'bg-white text-blue-600 shadow-sm' : 'bg-blue-600 text-white shadow-md shadow-blue-200'}
                            ${!isLoaded && 'opacity-50 cursor-wait'}
                        `}
                    >
                        {playing ? (
                            <Pause size={12} fill="currentColor" />
                        ) : (
                            <Play size={12} fill="currentColor" className="ml-0.5" />
                        )}
                    </button>
                </div>
                {playing && (
                    <span className={`absolute -right-0.5 -bottom-0.5 w-3 h-3 rounded-full flex items-center justify-center animate-pulse border-2 ${isUser ? 'bg-teal-400 border-blue-600' : 'bg-blue-600 border-white'}`}>
                        <Mic size={6} className="text-white" />
                    </span>
                )}
            </div>

            <div className="flex-1 flex flex-col justify-center min-w-0">
                {/* Waveform Polida */}
                <div
                    ref={progressBarRef}
                    onClick={handleProgressClick}
                    className="h-5 flex items-center gap-[1.5px] cursor-pointer"
                >
                    {waveformBars.map((height, i) => {
                        const barProgress = (i / waveformBars.length) * duration;
                        const isPlayed = progress >= barProgress;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-all duration-300 
                                    ${isPlayed
                                        ? (isUser ? 'bg-white h-full' : 'bg-blue-600 h-full')
                                        : (isUser ? 'bg-white/30 h-1/2' : 'bg-slate-200 h-1/2')}
                                `}
                                style={{ height: isPlayed ? `${height}%` : `${height / 2}%` }}
                            />
                        );
                    })}
                </div>

                <div className="flex justify-between items-center text-[10px] font-medium mt-1 select-none">
                    <span className="opacity-90">{formatTime(progress)}</span>

                    <div className="flex items-center gap-2">
                        {/* Indicador de Velocidade Premium */}
                        <button
                            onClick={(e) => { e.stopPropagation(); toggleSpeed(); }}
                            className={`
                                px-1.5 py-0.5 rounded-full text-[9px] font-bold transition-all
                                ${isUser
                                    ? 'bg-white/20 hover:bg-white/30 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500'}
                            `}
                        >
                            {playbackRate}x
                        </button>
                        <span className="opacity-70">{formatTime(duration)}</span>
                    </div>
                </div>
            </div>

            <audio
                ref={audioRef}
                src={src}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                hidden
            />
        </div>
    );
};

export default AudioPlayer;
