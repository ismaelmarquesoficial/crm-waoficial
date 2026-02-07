import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    isUser: boolean;
}

/**
 * Player de Áudio ULTRA COMPACTO
 * Design minimalista extremo para integração perfeita em balões de chat pequenos.
 */
const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, isUser }) => {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const [playbackRate, setPlaybackRate] = useState(1);
    const [isLoaded, setIsLoaded] = useState(false);
    const audioRef = useRef<HTMLAudioElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Onda visual ultra compacta (apenas 20 barras)
    const waveformBars = useMemo(() => {
        const bars = 20;
        const result = [];
        let seed = src.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);

        for (let i = 0; i < bars; i++) {
            seed = (seed * 9301 + 49297) % 233280;
            const height = 30 + (seed % 60);
            result.push(height);
        }
        return result;
    }, [src]);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        console.log(`[AudioPlayer] 🎵 Tentando carregar: ${src}`);

        const updateProgress = () => setProgress(audio.currentTime);
        const setAudioData = () => {
            console.log(`[AudioPlayer] ✅ Áudio carregado. Duração: ${audio.duration}s`);
            setDuration(audio.duration);
            setIsLoaded(true);
        };
        const onEnded = () => {
            setPlaying(false);
            setProgress(0);
        };
        const onError = (e: any) => {
            console.error(`[AudioPlayer] ❌ Erro ao carregar áudio:`, src, e);
        };

        if (audio.readyState >= 2) {
            setAudioData();
        }

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', setAudioData);
        audio.addEventListener('ended', onEnded);
        audio.addEventListener('error', onError);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', setAudioData);
            audio.removeEventListener('ended', onEnded);
            audio.removeEventListener('error', onError);
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

    const bgColor = isUser
        ? 'bg-gradient-to-r from-blue-600 to-teal-500 rounded-tr-sm'
        : 'bg-slate-100 rounded-tl-sm';

    return (
        <div className={`
            flex items-center gap-2 p-1.5 pr-2 rounded-2xl min-w-[170px] max-w-[200px] 
            transition-all duration-300 shadow-sm
            ${bgColor} ${isUser ? 'text-white' : 'text-slate-800'}
        `}>
            {/* Botão de Play Mini */}
            <button
                onClick={togglePlay}
                disabled={!isLoaded}
                className={`
                    w-7 h-7 rounded-full flex items-center justify-center transition-all flex-shrink-0
                    active:scale-90 hover:opacity-90
                    ${isUser ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}
                    ${!isLoaded && 'opacity-50 cursor-wait'}
                `}
            >
                {playing ? (
                    <Pause size={14} fill="currentColor" />
                ) : (
                    <Play size={14} fill="currentColor" className="ml-0.5" />
                )}
            </button>

            <div className="flex-1 flex flex-col justify-center overflow-hidden">
                {/* Waveform Ultra Compacta */}
                <div
                    ref={progressBarRef}
                    onClick={handleProgressClick}
                    className="h-4 flex items-center gap-[1px] cursor-pointer"
                >
                    {waveformBars.map((height, i) => {
                        const barProgress = (i / waveformBars.length) * duration;
                        const isPlayed = progress >= barProgress;
                        return (
                            <div
                                key={i}
                                className={`flex-1 rounded-full transition-colors duration-200 
                                    ${isPlayed ? (isUser ? 'bg-white' : 'bg-blue-600') : (isUser ? 'bg-white/30' : 'bg-slate-300')}
                                `}
                                style={{ height: `${height}%` }}
                            />
                        );
                    })}
                </div>

                <div className="flex justify-between items-center text-[8px] font-bold opacity-70 leading-none mt-0.5">
                    <span>{formatTime(progress)} / {formatTime(duration)}</span>

                    {/* Velocidade Mini */}
                    <button
                        onClick={(e) => { e.stopPropagation(); toggleSpeed(); }}
                        className={`
                            px-1 rounded-sm bg-black/5 hover:bg-black/10 transition-colors
                            ${isUser ? 'bg-white/10 text-white' : 'text-slate-500'}
                        `}
                    >
                        {playbackRate}x
                    </button>
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
