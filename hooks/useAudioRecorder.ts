import { useState, useRef } from 'react';
import { chatService } from '../services/chatService';

interface UseAudioRecorderProps {
    onRecordingComplete?: () => void;
}

export const useAudioRecorder = ({ onRecordingComplete }: UseAudioRecorderProps = {}) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.start();
            setIsRecording(true);
            setRecordingDuration(0);

            recordingTimerRef.current = setInterval(() => {
                setRecordingDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('Erro ao acessar microfone. Verifique as permissões.');
        }
    };

    const cancelRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        setRecordingDuration(0);
        audioChunksRef.current = [];
    };

    const finishRecording = async (
        contactId: string,
        channelId: string | null,
        onSuccess?: () => void
    ) => {
        if (!mediaRecorderRef.current || !isRecording) return;

        mediaRecorderRef.current.onstop = async () => {
            const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });

            // Send to Backend
            if (!contactId) return;

            const formData = new FormData();
            formData.append('file', audioBlob, 'voice_note.webm');
            formData.append('type', 'audio');
            if (channelId) formData.append('channelId', channelId);

            try {
                await chatService.sendMedia(contactId, formData);

                if (onSuccess) onSuccess();
                if (onRecordingComplete) onRecordingComplete();
            } catch (err: any) {
                console.error('Error uploading audio:', err);
                alert(`Erro ao enviar áudio: ${err.message}`);
            }
        };

        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

        if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
        setIsRecording(false);
        setRecordingDuration(0);
    };

    const formatDuration = (seconds: number) => {
        const min = Math.floor(seconds / 60);
        const sec = seconds % 60;
        return `${min}:${sec.toString().padStart(2, '0')}`;
    };

    return {
        isRecording,
        recordingDuration,
        startRecording,
        cancelRecording,
        finishRecording,
        formatDuration
    };
};
