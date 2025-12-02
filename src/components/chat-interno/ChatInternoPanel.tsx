import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  Plus, 
  Users, 
  Search,
  ArrowLeft,
  User,
  Check
} from 'lucide-react';
import { useChatInterno } from '@/hooks/useChatInterno';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { supabase } from '@/integrations/supabase/client';

interface ChatInternoPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export function ChatInternoPanel({ isOpen, onClose }: ChatInternoPanelProps) {
  const {
    conversas,
    conversaAtual,
    setConversaAtual,
    mensagens,
    loading,
    usuarioAtualId,
    carregarMensagens,
    enviarMensagem,
    criarConversa,
  } = useChatInterno();

  const [mensagemInput, setMensagemInput] = useState('');
  const [busca, setBusca] = useState('');
  const [showNovaConversa, setShowNovaConversa] = useState(false);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [usuariosSelecionados, setUsuariosSelecionados] = useState<string[]>([]);
  const [tituloNovaConversa, setTituloNovaConversa] = useState('');
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (conversaAtual) {
      carregarMensagens(conversaAtual.id);
    }
  }, [conversaAtual, carregarMensagens]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [mensagens]);

  useEffect(() => {
    if (showNovaConversa) {
      fetchUsuarios();
    }
  }, [showNovaConversa]);

  const fetchUsuarios = async () => {
    setLoadingUsuarios(true);
    const estabelecimentoId = localStorage.getItem('estabelecimentoId');
    if (!estabelecimentoId) {
      setLoadingUsuarios(false);
      return;
    }

    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nome, email')
      .eq('estabelecimento_id', estabelecimentoId)
      .order('nome');

    if (!error && data) {
      // Filtrar o usuário atual
      setUsuarios(data.filter(u => u.id !== usuarioAtualId));
    }
    setLoadingUsuarios(false);
  };

  const handleEnviar = async () => {
    if (!mensagemInput.trim() || !conversaAtual) return;
    
    await enviarMensagem(conversaAtual.id, mensagemInput.trim());
    setMensagemInput('');
  };

  const handleCriarConversa = async () => {
    if (usuariosSelecionados.length === 0) return;

    const novaConversa = await criarConversa(
      usuariosSelecionados, 
      usuariosSelecionados.length > 1 ? tituloNovaConversa : undefined
    );

    if (novaConversa) {
      setShowNovaConversa(false);
      setUsuariosSelecionados([]);
      setTituloNovaConversa('');
      setConversaAtual({
        ...novaConversa,
        tipo: novaConversa.tipo as 'direto' | 'grupo'
      });
    }
  };

  const toggleUsuario = (userId: string) => {
    if (usuariosSelecionados.includes(userId)) {
      setUsuariosSelecionados(usuariosSelecionados.filter(id => id !== userId));
    } else {
      setUsuariosSelecionados([...usuariosSelecionados, userId]);
    }
  };

  const conversasFiltradas = conversas.filter(c => 
    !busca || c.titulo?.toLowerCase().includes(busca.toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-20 right-4 w-96 h-[500px] bg-background border rounded-lg shadow-xl flex flex-col z-50">
      {/* Header */}
      <div className="p-4 border-b bg-primary/5 rounded-t-lg">
        <div className="flex items-center justify-between">
          {conversaAtual ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setConversaAtual(null)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold flex-1 text-center">
                {conversaAtual.titulo || 'Conversa'}
              </span>
            </>
          ) : showNovaConversa ? (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setShowNovaConversa(false);
                  setUsuariosSelecionados([]);
                }}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <span className="font-semibold flex-1 text-center">
                Nova Conversa
              </span>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5 text-primary" />
                <span className="font-semibold">Chat Interno</span>
              </div>
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setShowNovaConversa(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </div>

      {conversaAtual ? (
        // Área de mensagens
        <>
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="space-y-4">
              {mensagens.map((msg) => {
                const isOwn = msg.remetente_id === usuarioAtualId;
                return (
                  <div
                    key={msg.id}
                    className={cn(
                      'flex',
                      isOwn ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        'max-w-[80%] rounded-lg px-3 py-2',
                        isOwn
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      )}
                    >
                      {!isOwn && msg.remetente && (
                        <p className="text-xs font-medium mb-1">
                          {msg.remetente.nome}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{msg.conteudo}</p>
                      <p className={cn(
                        'text-xs mt-1',
                        isOwn ? 'text-primary-foreground/70' : 'text-muted-foreground'
                      )}>
                        {format(new Date(msg.created_at), 'HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>

          {/* Input de mensagem */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Digite sua mensagem..."
                value={mensagemInput}
                onChange={(e) => setMensagemInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleEnviar()}
              />
              <Button size="icon" onClick={handleEnviar}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </>
      ) : showNovaConversa ? (
        // Seleção de usuários para nova conversa
        <>
          <div className="p-3 border-b space-y-2">
            <p className="text-sm text-muted-foreground">
              Selecione os participantes:
            </p>
            {usuariosSelecionados.length > 1 && (
              <Input
                placeholder="Título do grupo (opcional)"
                value={tituloNovaConversa}
                onChange={(e) => setTituloNovaConversa(e.target.value)}
              />
            )}
          </div>

          <ScrollArea className="flex-1">
            {loadingUsuarios ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : usuarios.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                Nenhum usuário encontrado
              </div>
            ) : (
              <div className="divide-y">
                {usuarios.map((usuario) => {
                  const isSelected = usuariosSelecionados.includes(usuario.id);
                  return (
                    <button
                      key={usuario.id}
                      onClick={() => toggleUsuario(usuario.id)}
                      className={cn(
                        "w-full p-3 hover:bg-muted/50 transition-colors flex items-center gap-3 text-left",
                        isSelected && "bg-primary/10"
                      )}
                    >
                      <Avatar>
                        <AvatarFallback>
                          <User className="h-4 w-4" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{usuario.nome}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {usuario.email}
                        </p>
                      </div>
                      {isSelected && (
                        <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                          <Check className="h-3 w-3 text-primary-foreground" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Botão de criar conversa */}
          <div className="p-4 border-t">
            <Button 
              className="w-full" 
              onClick={handleCriarConversa}
              disabled={usuariosSelecionados.length === 0}
            >
              {usuariosSelecionados.length === 0 
                ? 'Selecione participantes' 
                : usuariosSelecionados.length === 1
                  ? 'Iniciar Conversa'
                  : `Criar Grupo (${usuariosSelecionados.length})`
              }
            </Button>
          </div>
        </>
      ) : (
        // Lista de conversas
        <>
          <div className="p-2 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {loading ? (
              <div className="p-4 text-center text-muted-foreground">
                Carregando...
              </div>
            ) : conversasFiltradas.length === 0 ? (
              <div className="p-8 text-center">
                <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                <p className="text-muted-foreground text-sm">
                  Nenhuma conversa encontrada
                </p>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3"
                  onClick={() => setShowNovaConversa(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Nova Conversa
                </Button>
              </div>
            ) : (
              <div className="divide-y">
                {conversasFiltradas.map((conversa) => (
                  <button
                    key={conversa.id}
                    onClick={() => setConversaAtual(conversa)}
                    className="w-full p-3 hover:bg-muted/50 transition-colors flex items-center gap-3 text-left"
                  >
                    <Avatar>
                      <AvatarFallback>
                        {conversa.tipo === 'grupo' ? (
                          <Users className="h-4 w-4" />
                        ) : (
                          conversa.titulo?.[0]?.toUpperCase() || 'C'
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {conversa.titulo || 'Conversa'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {format(new Date(conversa.updated_at), 'dd/MM HH:mm', { locale: ptBR })}
                      </p>
                    </div>
                    {conversa.tipo === 'grupo' && (
                      <Badge variant="secondary" className="text-xs">
                        Grupo
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </>
      )}
    </div>
  );
}
