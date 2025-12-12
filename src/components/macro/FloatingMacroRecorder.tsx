import React from "react";
import { useNavigate } from "react-router-dom";
import { useMacroRecorder } from "@/hooks/useMacroRecorder";
import { Button } from "@/components/ui/button";
import { Circle, Square, List } from "lucide-react";

export function FloatingMacroRecorder() {
  const navigate = useNavigate();
  const {
    isRecording,
    recordingSteps,
    startRecording,
    stopRecording,
    clearRecordingSteps,
  } = useMacroRecorder();

  const hasSteps = recordingSteps.length > 0;

  if (!isRecording && !hasSteps) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded-full border bg-card px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <div className={isRecording ? "animate-pulse text-destructive" : "text-primary"}>
          <Circle className="h-4 w-4" />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-medium">
            {isRecording ? "Gravando macro..." : "Macro gravada"}
          </span>
          {hasSteps && (
            <span className="text-[10px] text-muted-foreground">
              {recordingSteps.length} passo{recordingSteps.length === 1 ? "" : "s"} registrados
            </span>
          )}
        </div>
      </div>

      {isRecording ? (
        <Button size="sm" variant="destructive" onClick={stopRecording} className="h-7 px-2 text-[11px]">
          <Square className="mr-1 h-3 w-3" />
          Parar
        </Button>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            onClick={() => navigate("/macros?tab=recorder")}
            className="h-7 px-2 text-[11px]"
          >
            <List className="mr-1 h-3 w-3" />
            Ver passos
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={clearRecordingSteps}
            className="h-7 px-2 text-[11px] text-muted-foreground"
          >
            Descartar
          </Button>
        </>
      )}
    </div>
  );
}
