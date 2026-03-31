import { useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Printer, Download } from "lucide-react";
import JsBarcode from "jsbarcode";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pedidoIds: string[];
  estabelecimentoId: string;
}

const allFields: Record<string, string> = {
  numero_pedido: "Nº Pedido",
  nome_cliente: "Cliente",
  telefone_cliente: "Telefone",
  email_cliente: "E-mail",
  documento_cliente: "Documento",
  endereco: "Endereço Completo",
  cidade_estado: "Cidade/Estado",
  cep: "CEP",
  itens: "Lista de Itens",
  volumes: "Volumes",
  peso: "Peso",
  transportadora: "Transportadora",
  codigo_rastreio: "Código de Rastreio",
  codigo_barras: "Código de Barras",
  data_pedido: "Data do Pedido",
  valor_total: "Valor Total",
  origem: "Origem",
  observacoes: "Observações",
};

export function PedidoEtiquetaDialog({ open, onOpenChange, pedidoIds, estabelecimentoId }: Props) {
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedConfig, setSelectedConfig] = useState<string>("default");

  const { data: configs } = useQuery({
    queryKey: ["etiqueta_config", estabelecimentoId],
    queryFn: async () => {
      const { data } = await supabase
        .from("etiqueta_config")
        .select("*")
        .eq("estabelecimento_id", estabelecimentoId)
        .eq("ativo", true);
      return data || [];
    },
  });

  const { data: pedidos } = useQuery({
    queryKey: ["pedidos_print", pedidoIds],
    queryFn: async () => {
      const { data } = await supabase
        .from("pedidos_recebidos")
        .select("*")
        .in("id", pedidoIds);
      return data || [];
    },
    enabled: pedidoIds.length > 0,
  });

  const activeConfig = configs?.find(c => c.id === selectedConfig) || null;
  const camposVisiveis: string[] = activeConfig
    ? (activeConfig.campos_visiveis as string[])
    : ["numero_pedido", "nome_cliente", "endereco", "cidade_estado", "cep", "volumes", "transportadora", "codigo_rastreio", "codigo_barras", "data_pedido"];

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Etiquetas</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 10px; }
        .etiqueta { border: 1px dashed #ccc; padding: 15px; margin-bottom: 10px; page-break-inside: avoid; }
        .etiqueta h3 { margin: 0 0 8px 0; font-size: 16px; }
        .field { margin: 3px 0; font-size: 12px; }
        .field-label { font-weight: bold; }
        .barcode { margin: 8px 0; }
        @media print { .etiqueta { border: 1px solid #000; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Printer className="h-5 w-5" />
            Impressão de Etiquetas ({pedidoIds.length} pedido{pedidoIds.length > 1 ? "s" : ""})
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-3 mb-4">
          <Select value={selectedConfig} onValueChange={setSelectedConfig}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Config. padrão" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Configuração Padrão</SelectItem>
              {configs?.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" /> Imprimir
          </Button>
        </div>

        <Separator />

        <div ref={printRef} className="space-y-4 mt-4">
          {pedidos?.map(pedido => (
            <EtiquetaCard key={pedido.id} pedido={pedido} campos={camposVisiveis} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EtiquetaCard({ pedido, campos }: { pedido: any; campos: string[] }) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && campos.includes("codigo_barras")) {
      try {
        JsBarcode(barcodeRef.current, pedido.numero_pedido || pedido.id.slice(0, 12), {
          format: "CODE128",
          width: 1.5,
          height: 40,
          displayValue: true,
          fontSize: 10,
        });
      } catch (e) { /* ignore */ }
    }
  }, [pedido, campos]);

  const endereco = [pedido.endereco_rua, pedido.endereco_numero].filter(Boolean).join(", ");
  const complemento = pedido.endereco_complemento ? ` - ${pedido.endereco_complemento}` : "";
  const bairro = pedido.endereco_bairro || "";

  return (
    <div className="etiqueta border border-dashed border-border rounded-lg p-4 space-y-2">
      {campos.includes("numero_pedido") && (
        <h3 className="font-bold text-lg">{pedido.numero_pedido}</h3>
      )}
      {campos.includes("nome_cliente") && (
        <div className="field text-sm"><span className="field-label font-semibold">Cliente:</span> {pedido.nome_cliente}</div>
      )}
      {campos.includes("telefone_cliente") && pedido.telefone_cliente && (
        <div className="field text-sm"><span className="field-label font-semibold">Tel:</span> {pedido.telefone_cliente}</div>
      )}
      {campos.includes("email_cliente") && pedido.email_cliente && (
        <div className="field text-sm"><span className="field-label font-semibold">E-mail:</span> {pedido.email_cliente}</div>
      )}
      {campos.includes("documento_cliente") && pedido.documento_cliente && (
        <div className="field text-sm"><span className="field-label font-semibold">Doc:</span> {pedido.documento_cliente}</div>
      )}
      {campos.includes("endereco") && endereco && (
        <div className="field text-sm"><span className="field-label font-semibold">End:</span> {endereco}{complemento} - {bairro}</div>
      )}
      {campos.includes("cidade_estado") && pedido.endereco_cidade && (
        <div className="field text-sm"><span className="field-label font-semibold">Cidade:</span> {pedido.endereco_cidade}/{pedido.endereco_estado}</div>
      )}
      {campos.includes("cep") && pedido.endereco_cep && (
        <div className="field text-sm"><span className="field-label font-semibold">CEP:</span> {pedido.endereco_cep}</div>
      )}
      {campos.includes("volumes") && (
        <div className="field text-sm"><span className="field-label font-semibold">Volumes:</span> {pedido.volumes || 1}</div>
      )}
      {campos.includes("peso") && pedido.peso_total && (
        <div className="field text-sm"><span className="field-label font-semibold">Peso:</span> {pedido.peso_total} kg</div>
      )}
      {campos.includes("transportadora") && pedido.transportadora && (
        <div className="field text-sm"><span className="field-label font-semibold">Transp:</span> {pedido.transportadora}</div>
      )}
      {campos.includes("codigo_rastreio") && pedido.codigo_rastreio && (
        <div className="field text-sm"><span className="field-label font-semibold">Rastreio:</span> {pedido.codigo_rastreio}</div>
      )}
      {campos.includes("data_pedido") && (
        <div className="field text-sm"><span className="field-label font-semibold">Data:</span> {new Date(pedido.data_pedido).toLocaleDateString("pt-BR")}</div>
      )}
      {campos.includes("valor_total") && (
        <div className="field text-sm"><span className="field-label font-semibold">Valor:</span> R$ {Number(pedido.valor_total).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
      )}
      {campos.includes("origem") && (
        <div className="field text-sm"><span className="field-label font-semibold">Origem:</span> {pedido.origem} {pedido.origem_detalhes && `(${pedido.origem_detalhes})`}</div>
      )}
      {campos.includes("observacoes") && pedido.observacoes && (
        <div className="field text-sm"><span className="field-label font-semibold">Obs:</span> {pedido.observacoes}</div>
      )}
      {campos.includes("codigo_barras") && (
        <div className="barcode flex justify-center">
          <svg ref={barcodeRef}></svg>
        </div>
      )}
    </div>
  );
}
