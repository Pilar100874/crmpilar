import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Camera, CheckCircle, X, Upload, Loader2, AlertTriangle, Sparkles, History, Wifi } from "lucide-react";
import { toast } from "sonner";

export interface PhotoAngle {
  key: string;
  label: string;
  required?: boolean;
  source?: "both" | "device" | "ip_camera";
}


export interface CapturedPhoto {
  angle_key: string;
  angle_label: string;
  photo_url: string;
}

interface AiFinding {
  has_changes: boolean;
  severity: "none" | "low" | "medium" | "high";
  summary: string;
  findings?: string[];
}

interface Props {
  angles: PhotoAngle[];
  stage: "exit" | "entry";
  value: CapturedPhoto[];
  onChange: (photos: CapturedPhoto[]) => void;
  /** Se informado, busca a última foto disponível do veículo por ângulo para conferência. */
  vehicleId?: string;
  /** Habilita comparação por IA entre foto anterior e nova. */
  aiCompare?: boolean;
}

const severityStyle: Record<string, string> = {
  none: "border-success/60 text-success bg-success/10",
  low: "border-warning/40 text-warning bg-warning/10",
  medium: "border-warning/70 text-warning bg-warning/10",
  high: "border-destructive text-destructive bg-destructive/10",
};

export function CVPhotoCapture({ angles, stage, value, onChange, vehicleId, aiCompare = true }: Props) {
  const [uploading, setUploading] = useState<string | null>(null);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [lastPhotos, setLastPhotos] = useState<Record<string, { path: string; url: string; stage: string; when: string } | null>>({});
  const [aiResults, setAiResults] = useState<Record<string, AiFinding | null>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [ipCams, setIpCams] = useState<Record<string, any[]>>({});
  const [capturingCam, setCapturingCam] = useState<string | null>(null);
  const inputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const getUrl = async (path: string) => {
    const { data } = await supabase.storage.from("cv-vehicle-photos").createSignedUrl(path, 3600);
    return data?.signedUrl ?? "";
  };

  // Carrega câmeras IP disponíveis para cada ângulo
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("cv_cameras")
        .select("id, nome, marca, tipo_rede, angulo_key, vehicle_id")
        .eq("ativo", true);
      const byAngle: Record<string, any[]> = {};
      for (const c of data ?? []) {
        if (vehicleId && c.vehicle_id && c.vehicle_id !== vehicleId) continue;
        (byAngle[c.angulo_key] ||= []).push(c);
      }
      setIpCams(byAngle);
    })();
  }, [vehicleId]);

  // Carrega a última foto disponível por ângulo para o veículo (qualquer stage)
  useEffect(() => {
    if (!vehicleId) return;
    (async () => {
      const { data: movs } = await supabase
        .from("cv_vehicle_movements")
        .select("id, created_at")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false })
        .limit(20);
      const ids = (movs ?? []).map((m: any) => m.id);
      if (!ids.length) return;
      const { data: photos } = await supabase
        .from("cv_movement_photos")
        .select("angle_key, photo_url, stage, created_at, movement_id")
        .in("movement_id", ids)
        .order("created_at", { ascending: false });
      const byAngle: Record<string, any> = {};
      for (const p of photos ?? []) {
        if (!byAngle[p.angle_key]) byAngle[p.angle_key] = p;
      }
      const resolved: Record<string, any> = {};
      await Promise.all(
        Object.entries(byAngle).map(async ([k, p]: any) => {
          const url = await getUrl(p.photo_url);
          resolved[k] = { path: p.photo_url, url, stage: p.stage, when: p.created_at };
        })
      );
      setLastPhotos(resolved);
    })();
  }, [vehicleId]);

  const runAiCompare = async (angle: PhotoAngle, newPath: string) => {
    const prev = lastPhotos[angle.key];
    if (!prev || !aiCompare) return;
    setAiLoading((s) => ({ ...s, [angle.key]: true }));
    try {
      const currentUrl = await getUrl(newPath);
      const { data, error } = await supabase.functions.invoke("cv-photo-compare", {
        body: { previous_url: prev.url, current_url: currentUrl, angle_label: angle.label },
      });
      if (error) throw error;
      setAiResults((s) => ({ ...s, [angle.key]: data as AiFinding }));
      if ((data as AiFinding)?.has_changes && (data as AiFinding).severity !== "none") {
        toast.warning(`${angle.label}: ${(data as AiFinding).summary}`);
      }
    } catch (e: any) {
      setAiResults((s) => ({ ...s, [angle.key]: { has_changes: false, severity: "none", summary: "Falha na análise IA" } }));
    } finally {
      setAiLoading((s) => ({ ...s, [angle.key]: false }));
    }
  };

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
    // dispara IA em background
    runAiCompare(angle, path);
  };

  const captureFromIpCamera = async (angle: PhotoAngle, cameraId: string) => {
    setCapturingCam(angle.key);
    try {
      const { data, error } = await supabase.functions.invoke("cv-camera-snapshot", {
        body: { camera_id: cameraId },
      });
      if (error) throw error;
      const path = (data as any)?.photo_path;
      if (!path) throw new Error((data as any)?.error || "Falha ao capturar");
      const url = await getUrl(path);
      setPreviews((p) => ({ ...p, [angle.key]: url }));
      const next = value.filter((p) => p.angle_key !== angle.key);
      next.push({ angle_key: angle.key, angle_label: angle.label, photo_url: path });
      onChange(next);
      toast.success(`${angle.label} capturada da câmera IP`);
      runAiCompare(angle, path);
    } catch (e: any) {
      toast.error(e.message ?? "Falha ao capturar da câmera");
    } finally {
      setCapturingCam(null);
    }
  };

  const remove = (angleKey: string) => {
    onChange(value.filter((p) => p.angle_key !== angleKey));
    setPreviews((p) => {
      const n = { ...p };
      delete n[angleKey];
      return n;
    });
    setAiResults((s) => ({ ...s, [angleKey]: null }));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
      {angles.map((a) => {
        const captured = value.find((p) => p.angle_key === a.key);
        const preview = previews[a.key];
        const prev = lastPhotos[a.key];
        const ai = aiResults[a.key];
        const loadingAi = aiLoading[a.key];
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

              <div className="grid grid-cols-2 gap-2">
                {/* Foto anterior */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <History className="h-3 w-3" /> Última foto
                    {prev && (
                      <span className="ml-auto uppercase">
                        {prev.stage === "exit" ? "saída" : "entrada"}
                      </span>
                    )}
                  </div>
                  {prev ? (
                    <a href={prev.url} target="_blank" rel="noreferrer" className="block">
                      <img src={prev.url} alt="anterior" className="w-full h-32 object-cover rounded border" />
                    </a>
                  ) : (
                    <div className="h-32 border-2 border-dashed rounded flex items-center justify-center bg-muted/20 text-muted-foreground text-[11px]">
                      Sem histórico
                    </div>
                  )}
                </div>

                {/* Foto nova */}
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Camera className="h-3 w-3" /> Nova foto
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
                          <span className="text-[11px]">Sem foto</span>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Resultado IA */}
              {(loadingAi || ai) && (
                <div
                  className={`text-xs rounded border px-2 py-1.5 flex items-start gap-2 ${
                    ai ? severityStyle[ai.severity] ?? "" : "border-muted"
                  }`}
                >
                  {loadingAi ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mt-0.5" />
                      <span>Analisando diferenças com IA…</span>
                    </>
                  ) : ai ? (
                    <>
                      {ai.has_changes ? (
                        <AlertTriangle className="h-3.5 w-3.5 mt-0.5" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <div className="font-medium">
                          {ai.has_changes ? "Mudanças detectadas" : "Sem alterações"}
                        </div>
                        <div>{ai.summary}</div>
                        {ai.findings && ai.findings.length > 0 && (
                          <ul className="list-disc ml-4 mt-1">
                            {ai.findings.map((f, i) => (
                              <li key={i}>{f}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </>
                  ) : null}
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
              <div className="flex gap-2 flex-wrap">
                <Button
                  type="button"
                  variant={captured ? "outline" : "default"}
                  size="sm"
                  className="flex-1"
                  disabled={uploading === a.key || capturingCam === a.key}
                  onClick={() => captureFor(a)}
                >
                  <Camera className="h-4 w-4 mr-2" />
                  {captured ? "Refazer foto" : "Tirar foto"}
                </Button>
                {(ipCams[a.key]?.length ?? 0) > 0 &&
                  ipCams[a.key].map((cam) => (
                    <Button
                      key={cam.id}
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={capturingCam === a.key || uploading === a.key}
                      onClick={() => captureFromIpCamera(a, cam.id)}
                      title={`Capturar da câmera ${cam.nome}`}
                    >
                      {capturingCam === a.key ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Wifi className="h-4 w-4 mr-1" />
                      )}
                      {cam.nome}
                    </Button>
                  ))}
                {captured && prev && aiCompare && (
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={loadingAi}
                    onClick={() => runAiCompare(a, captured.photo_url)}
                  >
                    {loadingAi ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
