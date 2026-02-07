import { useState, useRef, useEffect } from 'react';
import { chatService } from '../services/chatService';

interface UseAudioRecorderProps {
    contactId?: string;
    channelId?: string;
    onAudioSent?: (data: any) => void;
    onRecordingComplete?: (data: any) => void;
}

/**
 * Hook customizado para gerenciar a gravação e envio de áudio.
 */
export const useAudioRecorder = (props: UseAudioRecorderProps = {}) => {
    const { contactId, channelId, onAudioSent, onRecordingComplete } = props;

    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const [isSending, setIsSending] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    // Refs para capturar os IDs no momento do stop, caso venham por parâmetro
    const activeContactIdRef = useRef<string | undefined>(contactId);
    const activeChannelIdRef = useRef<string | undefined>(channelId);

    const formatDuration = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const startRecording = async () => {
        try {
            console.log('[useAudioRecorder] 🎤 Solicitando permissão de microfone...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) chunksRef.current.push(e.data);
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                console.log('[useAudioRecorder] ⏹️ Gravação finalizada, processando blob...');

                const targetContactId = activeContactIdRef.current;
                const targetChannelId = activeChannelIdRef.current;

                if (targetContactId && targetChannelId) {
                    await sendAudio(audioBlob, targetContactId, targetChannelId);
                } else {
                    console.error('[useAudioRecorder] ❌ Erro: IDs de contato ou canal não definidos.');
                }

                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            console.log('[useAudioRecorder] ⏺️ Gravação iniciada.');

            timerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (error) {
            console.error('[useAudioRecorder] ❌ Erro ao iniciar gravação:', error);
            alert('Não foi possível acessar o microfone.');
        }
    };

    /**
     * Finaliza a gravação e inicia o processo de envio.
     * Aceita IDs por parâmetro para garantir sincronia com o estado do componente pai.
     */
    const finishRecording = (id?: string, chanId?: string) => {
        if (id) activeContactIdRef.current = id;
        if (chanId) activeChannelIdRef.current = chanId;

        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.onstop = null; // Evita envio
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            if (timerRef.current) clearInterval(timerRef.current);
            console.log('[useAudioRecorder] 🚫 Gravação cancelada pelo usuário.');
        }
    };

    const sendAudio = async (blob: Blob, cId: string, chId: string) => {
        setIsSending(true);
        try {
            const result = await chatService.sendMedia(
                cId,
                chId,
                blob,
                'audio'
            );
            console.log('[useAudioRecorder] ✅ Sucesso no envio:', result);
            onAudioSent?.(result);
            onRecordingComplete?.(result);
        } catch (error) {
            console.error('[useAudioRecorder] ❌ Erro ao enviar para o serviço:', error);
        } finally {
            setIsSending(false);
        }
    };

    useEffect(() => {
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    return {
        isRecording,
        recordingDuration,
        formatDuration: () => formatDuration(recordingDuration),
        isSending,
        startRecording,
        finishRecording, // Renomeado para match com ChatInterface.tsx
        cancelRecording
    };
};
