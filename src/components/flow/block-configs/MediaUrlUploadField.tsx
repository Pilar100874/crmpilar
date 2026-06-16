import { useRef, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Upload, Loader2, X, Download } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast-config";

interface MediaUrlUploadFieldProps {
  label?: string;
  value: string;
  onChange: (url: string) => void;
  accept?: string;
  placeholder?: string;
  bucket?: string;
  helperText?: string;
  showPreview?: boolean;
  compact?: boolean;
}

/**
 * Reusable field: URL input + "Fazer upload" button.
 * Uploads to Supabase Storage bucket (default: bot-media) and writes the
 * resulting public URL back via onChange.
 */
export const MediaUrlUploadField = ({
  label = "Imagem / Mídia",
  value,
  onChange,
  accept = "image/*",
  placeholder = "https://...imagem.jpg",
  bucket = "bot-media",
  helperText,
  showPreview = true,
  compact = false,
}: MediaUrlUploadFieldProps) => {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      const ext = file.name.split(".").pop() || "bin";
      const path = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { cacheControl: "3600", upsert: false });
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(data.path);
      onChange(publicUrl);
      toast.success("Arquivo enviado com sucesso!");
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error(err?.message || "Erro ao enviar arquivo.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const isImage = value && /\.(png|jpe?g|gif|webp|svg|avif)$/i.test(value);

  return (
    <div className="space-y-2 min-w-0">
      {label && <Label className="text-xs">{label}</Label>}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full"
      />
      <div className="flex gap-2">
        <input
          ref={fileRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleUpload}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="flex-1"
        >
          {uploading ? (
            <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Enviando...</>
          ) : (
            <><Upload className="w-3.5 h-3.5 mr-2" /> Upload</>
          )}
        </Button>
        {value && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={async () => {
              try {
                const res = await fetch(value);
                const blob = await res.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = (value.split("/").pop() || "arquivo").split("?")[0];
                document.body.appendChild(a);
                a.click();
                a.remove();
                URL.revokeObjectURL(url);
              } catch {
                window.open(value, "_blank", "noopener,noreferrer");
              }
            }}
            title="Baixar arquivo anexado"
          >
            <Download className="w-3.5 h-3.5" />
          </Button>
        )}
        {value && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange("")}
            title="Limpar"
          >
            <X className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
      {helperText && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}
      {showPreview && isImage && !compact && (
        <img
          src={value}
          alt="preview"
          className="mt-1 rounded border max-h-32 object-contain bg-muted/30"
          onError={(e) => ((e.currentTarget.style.display = "none"))}
        />
      )}
    </div>
  );
};

export default MediaUrlUploadField;
