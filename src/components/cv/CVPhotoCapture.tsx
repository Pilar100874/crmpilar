import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, X, Upload, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface PhotoAngle {
  key: string;
  label: string;
  required?: boolean;
}

export interface CapturedPhoto {
  angle_key: string;
  angle_label: string;
  photo_url: string; // storage path
}

interface Props {
  angles: PhotoAngle[];
  stage: "exit" | "entry";
  value: CapturedPhoto[];
  onChange: (photos: CapturedPhoto[]) => void;
}

export function CVPhotoCapture({ angles, stage, value, onChange }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getUrl = async (path: string) => {
    const { data } = await supabase.storage.from("cv-vehicle-photos").createSignedUrl(path, 3600);
    return data?.signedUrl ?? "";
  };

  const [previews, setPreviews] = useState<Record<string, string>>({});

  const captureFor = (angle: PhotoAngle) => inputRefs.current[angle.key]?.click();

  const handleFile = async (angle: PhotoAngle, file: File | undefined) => {
    if (!file) return;
    setUploading(angle.key);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${stage}/${Date.now()}-${angle.key}.${ext}`;
    const { error } = await supabase.storage.from("cv-vehicle-photos").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    if (error) {
      toast.error(`Falha ao enviar ${angle.label}: ${error.message}`);
      setUploading(null);
      return;
    }
    const url = await getUrl(path);
    setPreviews((p) => ({ ...p, [angle.key]: url }));
    const next = value.filter((p) => p.angle_key !== angle.key);
    next.push({ angle_key: angle.key, angle_label: angle.label, photo_url: path });
    onChange(next);
    setUploading(null);
  };

  const remove = (angleKey: string) => {
    onChange(value.filter((p) => p.angle_key !== angleKey));
    setPreviews((p) => {
      const n = { ...p };
      delete n[angleKey];
      return n;
    });
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {angles.map((a) => {
        const captured = value.find((p) => p.angle_key === a.key);
        const preview = previews[a.key];
        return (
          <Card
            key={a.key}
            className={`overflow-hidden transition-all ${
              captured ? "border-success/60 bg-success/5" : a.required ? "border-warning/40" : ""
            }`}
          >
            <CardContent className="p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">{a.label}</span>
                  {a.required && (
                    <Badge variant="outline" className="text-[10px] border-warning/60 text-warning">
                      Obrigatória
                    </Badge>
                  )}
                </div>
                {captured && <CheckCircle className="h-4 w-4 text-success" />}
              </div>

              {preview ? (
                <div className="relative">
                  <img src={preview} alt={a.label} className="w-full h-32 object-cover rounded border" />
                  <Button
                    type="button"
                    size="icon"
                    variant="destructive"
                    className="absolute top-1 right-1 h-6 w-6"
                    onClick={() => remove(a.key)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="h-32 border-2 border-dashed rounded flex flex-col items-center justify-center bg-muted/30 text-muted-foreground">
                  {uploading === a.key ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    <>
                      <Upload className="h-6 w-6 mb-1" />
                      <span className="text-xs">Sem foto</span>
                    </>
                  )}
                </div>
              )}

              <input
                ref={(el) => (inputRefs.current[a.key] = el)}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => handleFile(a, e.target.files?.[0])}
              />
              <Button
                type="button"
                variant={captured ? "outline" : "default"}
                size="sm"
                className="w-full"
                disabled={uploading === a.key}
                onClick={() => captureFor(a)}
              >
                <Camera className="h-4 w-4 mr-2" />
                {captured ? "Refazer foto" : "Tirar foto"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
