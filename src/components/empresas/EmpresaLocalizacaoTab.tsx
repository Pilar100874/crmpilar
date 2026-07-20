import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, ExternalLink, Camera } from "lucide-react";
import { useMemo } from "react";

interface EmpresaLocalizacaoTabProps {
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  estado?: string | null;
  cep?: string | null;
  nome?: string | null;
}

export function EmpresaLocalizacaoTab({
  endereco,
  numero,
  bairro,
  cidade,
  estado,
  cep,
  nome,
}: EmpresaLocalizacaoTabProps) {
  const enderecoCompleto = useMemo(() => {
    const partes = [
      endereco,
      numero,
      bairro,
      cidade,
      estado,
      cep,
      "Brasil",
    ]
      .filter((p) => p && String(p).trim())
      .join(", ");
    return partes;
  }, [endereco, numero, bairro, cidade, estado, cep]);

  if (!enderecoCompleto || !cidade) {
    return (
      <Card className="p-8 text-center">
        <MapPin className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-semibold mb-1">Endereço não informado</h3>
        <p className="text-sm text-muted-foreground">
          Preencha endereço, cidade e UF na aba "Dados" para ver o mapa e a foto do local.
        </p>
      </Card>
    );
  }

  const q = encodeURIComponent(enderecoCompleto);
  const mapEmbedUrl = `https://maps.google.com/maps?q=${q}&t=&z=17&ie=UTF8&iwloc=&output=embed`;
  const streetViewEmbedUrl = `https://maps.google.com/maps?q=${q}&layer=c&cbll=&cbp=11,0,0,0,0&output=svembed`;
  const mapOpenUrl = `https://www.google.com/maps/search/?api=1&query=${q}`;
  const streetViewOpenUrl = `https://www.google.com/maps?q=&layer=c&cbll=&cbp=&q=${q}`;

  return (
    <div className="space-y-6">
      <Card className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <MapPin className="w-5 h-5 text-primary mt-0.5" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold truncate">{nome || "Endereço"}</h3>
            <p className="text-sm text-muted-foreground">{enderecoCompleto}</p>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={mapOpenUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" /> Abrir no Maps
            </a>
          </Button>
        </div>
        <div className="rounded-lg overflow-hidden border">
          <iframe
            title="Mapa do endereço"
            src={mapEmbedUrl}
            width="100%"
            height="380"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Foto do local (Street View)</h3>
          </div>
          <Button variant="outline" size="sm" asChild>
            <a href={streetViewOpenUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-4 h-4 mr-1" /> Abrir Street View
            </a>
          </Button>
        </div>
        <div className="rounded-lg overflow-hidden border">
          <iframe
            title="Street View do endereço"
            src={streetViewEmbedUrl}
            width="100%"
            height="380"
            style={{ border: 0 }}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          A imagem depende da cobertura do Google Street View no endereço. Caso não apareça, use "Abrir Street View".
        </p>
      </Card>
    </div>
  );
}
