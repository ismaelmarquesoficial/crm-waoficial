import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
    src: string;
    isUser: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ src, isUser }) => {
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [duration, setDuration] = useState(0);
    const audioRef = useRef<HTMLAudioElement>(null);

    useEffect(() => {
        const audio = audioRef.current;
        if (!audio) return;

        const updateProgress = () => setProgress(audio.currentTime);
        const setAudioDuration = () => setDuration(audio.duration);
        const onEnded = () => setPlaying(false);

        audio.addEventListener('timeupdate', updateProgress);
        audio.addEventListener('loadedmetadata', setAudioDuration);
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('timeupdate', updateProgress);
            audio.removeEventListener('loadedmetadata', setAudioDuration);
            audio.removeEventListener('ended', onEnded);
        };
    }, []);

    const togglePlay = () => {
        if (playing) {
            audioRef.current?.pause();
        } else {
            audioRef.current?.play();
        }
        setPlaying(!playing);
    };

    const formatTime = (time: number) => {
        const min = Math.floor(time / 60);
        const sec = Math.floor(time % 60);
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className={`flex items-center gap-3 p-2 rounded-2xl min-w-[200px] ${isUser ? 'bg-blue-500/20' : 'bg-slate-100'}`}>
            <button
                onClick={togglePlay}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isUser ? 'bg-white text-blue-600' : 'bg-blue-600 text-white'}`}
            >
                {playing ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1" />}
            </button>

            <div className="flex-1 flex flex-col gap-1">
                <div className={`h-1.5 rounded-full relative overflow-hidden ${isUser ? 'bg-white/20' : 'bg-slate-200'}`}>
                    <div
                        className={`h-full transition-all duration-100 ${isUser ? 'bg-white' : 'bg-blue-600'}`}
                        style={{ width: `${(progress / duration) * 100 || 0}%` }}
                    />
                </div>
                <div className={`flex justify-between text-[10px] font-medium ${isUser ? 'text-white/70' : 'text-slate-500'}`}>
                    <span>{formatTime(progress)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
            <audio ref={audioRef} src={src} hidden />
        </div>
    );
};

export default AudioPlayer;
