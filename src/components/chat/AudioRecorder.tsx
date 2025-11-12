import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square } from "lucide-react";
import { toast } from "@/lib/toast-config";

interface AudioRecorderProps {
  onAudioRecorded: (audioBlob: Blob, audioUrl: string) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onAudioRecorded, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        const audioUrl = URL.createObjectURL(audioBlob);
        onAudioRecorded(audioBlob, audioUrl);
        
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Gravação iniciada");
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast.error("Erro ao acessar o microfone");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      toast.success("Gravação finalizada");
    }
  };

  return (
    <Button
      variant={isRecording ? "destructive" : "outline"}
      size="icon"
      onClick={isRecording ? stopRecording : startRecording}
      disabled={disabled}
      title={isRecording ? "Parar gravação" : "Gravar áudio"}
      className="rounded-full"
    >
      {isRecording ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
    </Button>
  );
}
