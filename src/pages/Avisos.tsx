import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { 
  Bell, 
  Plus, 
  CheckCircle2, 
  Circle, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Users,
  User,
} from 'lucide-react';
import { useAvisosSistema } from '@/hooks/useAvisosSistema';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export default function Avisos() {
  const { avisos, loading, avisosPendentes, marcarResolvido, criarAviso } = useAvisosSistema();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filtroResolvido, setFiltroResolvido] = useState<'todos' | 'pendentes' | 'resolvidos'>('pendentes');
  
  const [titulo, setTitulo] = useState('');
  const [mensagem, setMensagem] = useState('');
  const [tipo, setTipo] = useState('info');
  const [destinatariosTipo, setDestinatariosTipo] = useState<'todos' | 'usuarios_especificos'>('todos');
  const [usuarioSelecionado, setUsuarioSelecionado] = useState<string>('');
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  // Carregar usuários quando abrir o dialog
  useEffect(() => {
    if (dialogOpen && usuarios.length === 0) {
      carregarUsuarios();
    }
  }, [dialogOpen]);

  const carregarUsuarios = async () => {
    setLoadingUsuarios(true);
    try {
      const estabelecimentoId = localStorage.getItem('estabelecimentoId');
      const { data, error } = await supabase
        .from('usuarios')
        .select('id, nome, email')
        .eq('estabelecimento_id', estabelecimentoId)
        .order('nome');
      
      if (error) throw error;
      setUsuarios(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoadingUsuarios(false);
    }
  };

  const handleSubmit = async () => {
    const estabelecimentoId = localStorage.getItem('estabelecimentoId');
    const userId = localStorage.getItem('userId');
    
    await criarAviso({
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      tipo: tipo as any,
      destinatarios_tipo: destinatariosTipo,
      destinatarios_ids: destinatariosTipo === 'usuarios_especificos' && usuarioSelecionado ? [usuarioSelecionado] : null,
      destinatarios_roles: null,
      expira_em: null,
      estabelecimento_id: estabelecimentoId,
      criado_por: userId,
      ativo: true,
    } as any);

    setTitulo('');
    setMensagem('');
    setTipo('info');
    setDestinatariosTipo('todos');
    setUsuarioSelecionado('');
    setDialogOpen(false);
  };

  const isFormValid = () => {
    if (!titulo.trim() || !mensagem.trim()) return false;
    if (destinatariosTipo === 'usuarios_especificos' && !usuarioSelecionado) return false;
    return true;
  };

  const getTipoIcon = (t: string) => {
    switch (t) {
      case 'alerta': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'erro':
      case 'urgente': return <AlertCircle className="h-5 w-5 text-destructive" />;
      case 'sucesso': return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const avisosFiltrados = avisos.filter(a => {
    if (filtroResolvido === 'pendentes') return !a.resolvido;
    if (filtroResolvido === 'resolvidos') return a.resolvido;
    return true;
  });

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Bell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Avisos do Sistema</h1>
          {avisosPendentes > 0 && (
            <Badge variant="destructive">{avisosPendentes} pendente{avisosPendentes > 1 ? 's' : ''}</Badge>
          )}
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" />Novo Aviso</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>Criar Novo Aviso</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Título" />
              <Textarea value={mensagem} onChange={(e) => setMensagem(e.target.value)} placeholder="Mensagem" rows={3} />
              
              <div className="space-y-2">
                <Label className="text-sm font-medium">Tipo</Label>
                <Select value={tipo} onValueChange={setTipo}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="info">Informação</SelectItem>
                    <SelectItem value="alerta">Alerta</SelectItem>
                    <SelectItem value="erro">Erro</SelectItem>
                    <SelectItem value="sucesso">Sucesso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">Destinatários</Label>
                <RadioGroup 
                  value={destinatariosTipo} 
                  onValueChange={(v) => {
                    setDestinatariosTipo(v as 'todos' | 'usuarios_especificos');
                    if (v === 'todos') setUsuarioSelecionado('');
                  }}
                  className="flex flex-col gap-2"
                >
                  <div className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="todos" id="todos" />
                    <Label htmlFor="todos" className="flex items-center gap-2 cursor-pointer flex-1">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Todos os usuários
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 p-2 rounded-lg border hover:bg-muted/50 cursor-pointer">
                    <RadioGroupItem value="usuarios_especificos" id="especifico" />
                    <Label htmlFor="especifico" className="flex items-center gap-2 cursor-pointer flex-1">
                      <User className="h-4 w-4 text-muted-foreground" />
                      Usuário específico
                    </Label>
                  </div>
                </RadioGroup>

                {destinatariosTipo === 'usuarios_especificos' && (
                  <Select value={usuarioSelecionado} onValueChange={setUsuarioSelecionado}>
                    <SelectTrigger>
                      <SelectValue placeholder={loadingUsuarios ? "Carregando..." : "Selecione um usuário"} />
                    </SelectTrigger>
                    <SelectContent>
                      {usuarios.map((usuario) => (
                        <SelectItem key={usuario.id} value={usuario.id}>
                          {usuario.nome} ({usuario.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <Button onClick={handleSubmit} className="w-full" disabled={!isFormValid()}>Criar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Select value={filtroResolvido} onValueChange={(v: any) => setFiltroResolvido(v)}>
        <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="pendentes">Pendentes</SelectItem>
          <SelectItem value="resolvidos">Resolvidos</SelectItem>
          <SelectItem value="todos">Todos</SelectItem>
        </SelectContent>
      </Select>

      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Carregando...</div>
      ) : avisosFiltrados.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum aviso</CardContent></Card>
      ) : (
        <div className="space-y-3">
          {avisosFiltrados.map((aviso) => (
            <Card key={aviso.id} className={cn(aviso.resolvido && "opacity-60")}>
              <CardContent className="p-4 flex items-start gap-4">
                <button onClick={() => marcarResolvido(aviso.id, !aviso.resolvido)}>
                  {aviso.resolvido ? <CheckCircle2 className="h-6 w-6 text-green-500" /> : <Circle className="h-6 w-6 text-muted-foreground hover:text-primary" />}
                </button>
                {getTipoIcon(aviso.tipo)}
                <div className="flex-1">
                  <h3 className={cn("font-semibold", aviso.resolvido && "line-through text-muted-foreground")}>{aviso.titulo}</h3>
                  <p className={cn("text-sm text-muted-foreground", aviso.resolvido && "line-through")}>{aviso.mensagem}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(aviso.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                    {aviso.resolvido && ' • Resolvido'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
