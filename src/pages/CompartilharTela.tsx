import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useScreenShare } from '@/hooks/useScreenShare';
import { Monitor, Eye, Copy, X, Users } from 'lucide-react';
import { toast } from 'sonner';

const CompartilharTela = () => {
  const [joinCode, setJoinCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const {
    isSharing,
    isViewing,
    sessionCode,
    remoteStream,
    hostName,
    guestName,
    startSharing,
    joinSession,
    stopSharing,
    leaveSession
  } = useScreenShare();

  // Set remote stream to video element
  useEffect(() => {
    if (videoRef.current && remoteStream) {
      videoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleCopyCode = () => {
    if (sessionCode) {
      navigator.clipboard.writeText(sessionCode);
      toast.success('Código copiado!');
    }
  };

  const handleJoinSession = async () => {
    if (!joinCode.trim()) {
      toast.error('Digite o código da sessão');
      return;
    }
    await joinSession(joinCode.trim());
  };

  // View when sharing screen
  if (isSharing) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Compartilhando Tela</h1>
          <p className="text-muted-foreground">Você está compartilhando sua tela com outros usuários</p>
        </div>

        <div className="max-w-2xl mx-auto mt-8">
          <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/30">
            <CardHeader className="text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                <Monitor className="w-8 h-8 text-green-500 animate-pulse" />
              </div>
              <CardTitle className="text-green-600">Tela Sendo Compartilhada</CardTitle>
              <CardDescription>
                Compartilhe o código abaixo com quem deseja visualizar sua tela
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center">
                <Label className="text-sm text-muted-foreground">Código da Sessão</Label>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <div className="text-4xl font-mono font-bold tracking-widest bg-muted px-6 py-3 rounded-lg">
                    {sessionCode}
                  </div>
                  <Button size="icon" variant="outline" onClick={handleCopyCode}>
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {guestName && (
                <div className="flex items-center justify-center gap-2 text-green-600">
                  <Users className="w-5 h-5" />
                  <span className="font-medium">{guestName} está visualizando</span>
                </div>
              )}

              <Button 
                variant="destructive" 
                className="w-full"
                onClick={stopSharing}
              >
                <X className="w-4 h-4 mr-2" />
                Parar Compartilhamento
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // View when watching someone's screen
  if (isViewing) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Eye className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-xl font-semibold">Visualizando Tela</h1>
              <p className="text-sm text-muted-foreground">
                {hostName ? `Tela de ${hostName}` : 'Aguardando transmissão...'}
              </p>
            </div>
          </div>
          <Button variant="destructive" onClick={leaveSession}>
            <X className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>

        <div className="relative bg-black rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
          {remoteStream ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="w-full h-full object-contain"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white/60">
                <Monitor className="w-16 h-16 mx-auto mb-4 animate-pulse" />
                <p>Aguardando transmissão...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Default view - options to share or join
  return (
    <div className="min-h-screen bg-background p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Compartilhar Tela</h1>
        <p className="text-muted-foreground">Compartilhe sua tela para treinamento ou suporte</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto mt-8">
        {/* Share Screen Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Monitor className="w-8 h-8 text-primary" />
            </div>
            <CardTitle>Compartilhar Minha Tela</CardTitle>
            <CardDescription>
              Inicie uma sessão para que outros possam ver sua tela e ajudá-lo
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              size="lg"
              onClick={startSharing}
            >
              <Monitor className="w-5 h-5 mr-2" />
              Iniciar Compartilhamento
            </Button>
          </CardContent>
        </Card>

        {/* Join Session Card */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <Eye className="w-8 h-8 text-secondary-foreground" />
            </div>
            <CardTitle>Ver Tela de Outro Usuário</CardTitle>
            <CardDescription>
              Digite o código para visualizar a tela de outra pessoa
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sessionCode">Código da Sessão</Label>
              <Input
                id="sessionCode"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                placeholder="Ex: ABC123"
                className="text-center font-mono text-lg uppercase tracking-widest"
                maxLength={6}
              />
            </div>
            <Button 
              className="w-full" 
              size="lg"
              variant="secondary"
              onClick={handleJoinSession}
              disabled={!joinCode.trim()}
            >
              <Eye className="w-5 h-5 mr-2" />
              Visualizar Tela
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <div className="max-w-4xl mx-auto mt-8">
        <Card className="bg-muted/30">
          <CardContent className="pt-6">
            <h3 className="font-semibold mb-3">Como funciona?</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <p className="font-medium text-foreground mb-1">Para compartilhar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Clique em "Iniciar Compartilhamento"</li>
                  <li>Selecione a tela ou janela que deseja compartilhar</li>
                  <li>Envie o código gerado para quem irá visualizar</li>
                </ol>
              </div>
              <div>
                <p className="font-medium text-foreground mb-1">Para visualizar:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Peça o código de sessão para quem está compartilhando</li>
                  <li>Digite o código no campo acima</li>
                  <li>Clique em "Visualizar Tela"</li>
                </ol>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompartilharTela;
