import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { RefreshCw, Trash2, Download, ExternalLink, Search, Bot } from 'lucide-react';
import { DeleteConfirmDialog } from '@/components/ui/delete-confirm-dialog';

interface ProspeccaoRow {
  id: string;
  nome: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  email: string | null;
  telefone: string | null;
  whatsapp: string | null;
  site: string | null;
  cidade: string | null;
  estado: string | null;
  bairro: string | null;
  cep: string | null;
  endereco: string | null;
  cnae_principal: string | null;
  cnae_descricao: string | null;
  segmento_nome: string | null;
  descricao: string | null;
  redes_sociais: any;
  fontes: any;
  origem: string | null;
  status: string;
  empresa_id: string | null;
  importado_em: string | null;
  created_at: string;
}

export default function ProspeccaoEmpresas() {
  const [rows, setRows] = useState<ProspeccaoRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [busca, setBusca] = useState('');
  const [selecionadas, setSelecionadas] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [importando, setImportando] = useState(false);

  const carregar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('prospeccao_empresas')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Erro ao carregar: ' + error.message);
    else setRows((data ?? []) as ProspeccaoRow[]);
    setLoading(false);
  };

  useEffect(() => {
    carregar();
  }, []);

  const filtradas = rows.filter((r) => {
    if (!busca.trim()) return true;
    const q = busca.toLowerCase();
    return (
      r.nome?.toLowerCase().includes(q) ||
      r.nome_fantasia?.toLowerCase().includes(q) ||
      r.cnpj?.toLowerCase().includes(q) ||
      r.cidade?.toLowerCase().includes(q) ||
      r.estado?.toLowerCase().includes(q) ||
      r.segmento_nome?.toLowerCase().includes(q)
    );
  });

  const toggle = (id: string) => {
    const n = new Set(selecionadas);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    setSelecionadas(n);
  };

  const toggleAll = () => {
    if (selecionadas.size === filtradas.length) setSelecionadas(new Set());
    else setSelecionadas(new Set(filtradas.map((r) => r.id)));
  };

  const excluir = async (id: string) => {
    const { error } = await supabase.from('prospeccao_empresas').delete().eq('id', id);
    if (error) return toast.error('Erro ao excluir: ' + error.message);
    toast.success('Excluída');
    setRows((prev) => prev.filter((r) => r.id !== id));
    setConfirmDelete(null);
  };

  const importarSelecionadas = async () => {
    if (selecionadas.size === 0) return toast.info('Selecione ao menos uma empresa');
    setImportando(true);
    let ok = 0, fail = 0;
    for (const id of selecionadas) {
      const r = rows.find((x) => x.id === id);
      if (!r || r.empresa_id) continue;
      const { data: emp, error } = await supabase
        .from('empresas')
        .insert({
          nome: r.nome,
          nome_fantasia: r.nome_fantasia,
          cnpj: r.cnpj,
          email: r.email,
          telefone: r.whatsapp || r.telefone,
          endereco: r.endereco,
          bairro: r.bairro,
          cidade: r.cidade,
          estado: r.estado,
          cep: r.cep,
          cnae_principal: r.cnae_principal,
          cnae_descricao: r.cnae_descricao,
          custom_fields: {
            site: r.site,
            descricao: r.descricao,
            redes_sociais: r.redes_sociais,
            fontes: r.fontes,
            origem_prospeccao: r.origem,
          },
        })
        .select('id')
        .single();
      if (error || !emp) {
        fail++;
        continue;
      }
      await supabase
        .from('prospeccao_empresas')
        .update({ empresa_id: emp.id, status: 'importado', importado_em: new Date().toISOString() })
        .eq('id', r.id);
      ok++;
    }
    setImportando(false);
    setSelecionadas(new Set());
    toast.success(`${ok} importadas${fail ? `, ${fail} com erro` : ''}`);
    carregar();
  };

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              Prospecção Empresas
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Empresas trazidas via Claude Code / ChatGPT (MCP). Revise e importe para o cadastro definitivo.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={carregar} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              size="sm"
              onClick={importarSelecionadas}
              disabled={importando || selecionadas.size === 0}
            >
              <Download className="h-4 w-4 mr-2" />
              Importar selecionadas ({selecionadas.size})
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-3">
            <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ, cidade, UF, segmento..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="pl-9"
            />
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={filtradas.length > 0 && selecionadas.size === filtradas.length}
                      onCheckedChange={toggleAll}
                    />
                  </TableHead>
                  <TableHead>Nome</TableHead>
                  <TableHead>CNPJ</TableHead>
                  <TableHead>Cidade/UF</TableHead>
                  <TableHead>WhatsApp</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Site</TableHead>
                  <TableHead>Segmento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-16"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtradas.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                      Nenhuma prospecção ainda. Peça ao Claude Code / ChatGPT para pesquisar empresas na web e trazer para cá.
                    </TableCell>
                  </TableRow>
                )}
                {filtradas.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <Checkbox
                        checked={selecionadas.has(r.id)}
                        onCheckedChange={() => toggle(r.id)}
                        disabled={!!r.empresa_id}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.nome}</div>
                      {r.nome_fantasia && (
                        <div className="text-xs text-muted-foreground">{r.nome_fantasia}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.cnpj || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {[r.cidade, r.estado].filter(Boolean).join(' / ') || '-'}
                    </TableCell>
                    <TableCell className="text-sm">{r.whatsapp || r.telefone || '-'}</TableCell>
                    <TableCell className="text-sm">{r.email || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {r.site ? (
                        <a
                          href={r.site.startsWith('http') ? r.site : `https://${r.site}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-primary inline-flex items-center gap-1 hover:underline"
                        >
                          Abrir <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{r.segmento_nome || '-'}</TableCell>
                    <TableCell>
                      {r.empresa_id ? (
                        <Badge variant="default">Importado</Badge>
                      ) : (
                        <Badge variant="secondary">Novo</Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setConfirmDelete(r.id)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <DeleteConfirmDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
        onConfirm={() => confirmDelete && excluir(confirmDelete)}
        title="Excluir prospecção"
        description="Tem certeza que deseja excluir esta empresa da prospecção?"
      />
    </div>
  );
}
