import { useState, useEffect, useRef } from "react";
import Layout from "@/components/Layout";
import { SubMenuHeader } from "@/components/SubMenuHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Video, 
  VideoOff, 
  Mic, 
  MicOff, 
  Phone, 
  PhoneOff, 
  Users,
  Monitor,
  MonitorOff
} from "lucide-react";
import { useVideoCall } from "@/hooks/useVideoCall";

export default function VideoCall() {
  const { toast } = useToast();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  
  const { 
    connect, 
    disconnect, 
    dial, 
    hangup, 
    toggleVideo,
    toggleAudio,
    startScreenShare,
    stopScreenShare,
    joinConference,
    isRegistered, 
    isConnecting, 
    activeCalls,
    localStream,
    remoteStream,
    conferenceRoomNumber
  } = useVideoCall();

  useEffect(() => {
    // Conectar automaticamente ao carregar
    connect();
  }, []);

  useEffect(() => {
    // Atualizar vídeo local
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream]);

  useEffect(() => {
    // Atualizar vídeo remoto
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [remoteStream]);

  const handleDial = async () => {
    if (!phoneNumber.trim()) {
      toast({
        title: "Erro",
        description: "Digite um número de ramal",
        variant: "destructive",
      });
      return;
    }

    await dial(phoneNumber);
  };

  const handleToggleVideo = async () => {
    await toggleVideo();
    setIsVideoEnabled(!isVideoEnabled);
  };

  const handleToggleAudio = async () => {
    await toggleAudio();
    setIsAudioEnabled(!isAudioEnabled);
  };

  const handleScreenShare = async () => {
    if (isScreenSharing) {
      await stopScreenShare();
      setIsScreenSharing(false);
    } else {
      await startScreenShare();
      setIsScreenSharing(true);
    }
  };

  const handleJoinConference = async () => {
    if (!conferenceRoomNumber) {
      toast({
        title: "Erro",
        description: "Sala de conferência não configurada",
        variant: "destructive",
      });
      return;
    }
    await joinConference();
  };

  const getConnectionStatus = () => {
    if (isConnecting) {
      return <Badge variant="secondary">Conectando...</Badge>;
    }
    if (isRegistered) {
      return <Badge className="bg-green-500">Conectado</Badge>;
    }
    return <Badge variant="destructive">Desconectado</Badge>;
  };

  return (
    <Layout>
      <SubMenuHeader title="Videochamada" onOpenSubmenu={() => {}} />
      <div className="container mx-auto p-4 space-y-6">
        
        {/* Status de Conexão */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Status da Conexão</CardTitle>
              {getConnectionStatus()}
            </div>
          </CardHeader>
        </Card>

        {/* Vídeos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Vídeo Local */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Você</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!isVideoEnabled && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <VideoOff className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Vídeo Remoto */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                {activeCalls.length > 0 ? activeCalls[0].phoneNumber : "Aguardando..."}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                {activeCalls.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-800">
                    <Video className="w-16 h-16 text-gray-400" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controles */}
        <Card>
          <CardHeader>
            <CardTitle>Controles</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            
            {/* Fazer Chamada 1-a-1 */}
            <div className="flex gap-2">
              <Input
                placeholder="Digite o número do ramal"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleDial()}
                disabled={!isRegistered || activeCalls.length > 0}
              />
              <Button
                onClick={handleDial}
                disabled={!isRegistered || activeCalls.length > 0}
                className="bg-primary hover:bg-primary/90"
              >
                <Phone className="w-4 h-4 mr-2" />
                Ligar
              </Button>
            </div>

            {/* Botão de Conferência */}
            {conferenceRoomNumber && (
              <Button
                onClick={handleJoinConference}
                disabled={!isRegistered || activeCalls.length > 0}
                variant="secondary"
                className="w-full"
              >
                <Users className="w-4 h-4 mr-2" />
                Entrar em Conferência (Sala {conferenceRoomNumber})
              </Button>
            )}

            {/* Controles de Mídia */}
            <div className="flex gap-2 justify-center">
              <Button
                onClick={handleToggleVideo}
                variant={isVideoEnabled ? "default" : "destructive"}
                size="lg"
                disabled={activeCalls.length === 0}
              >
                {isVideoEnabled ? <Video className="w-5 h-5" /> : <VideoOff className="w-5 h-5" />}
              </Button>

              <Button
                onClick={handleToggleAudio}
                variant={isAudioEnabled ? "default" : "destructive"}
                size="lg"
                disabled={activeCalls.length === 0}
              >
                {isAudioEnabled ? <Mic className="w-5 h-5" /> : <MicOff className="w-5 h-5" />}
              </Button>

              <Button
                onClick={handleScreenShare}
                variant={isScreenSharing ? "default" : "secondary"}
                size="lg"
                disabled={activeCalls.length === 0}
              >
                {isScreenSharing ? <Monitor className="w-5 h-5" /> : <MonitorOff className="w-5 h-5" />}
              </Button>

              {activeCalls.length > 0 && (
                <Button
                  onClick={() => hangup(activeCalls[0].id)}
                  variant="destructive"
                  size="lg"
                >
                  <PhoneOff className="w-5 h-5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Lista de Chamadas Ativas */}
        {activeCalls.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Chamadas Ativas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activeCalls.map((call) => (
                  <div
                    key={call.id}
                    className="flex items-center justify-between p-3 bg-secondary rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{call.phoneNumber}</p>
                      <p className="text-sm text-muted-foreground">
                        {call.state}
                      </p>
                    </div>
                    <Button
                      onClick={() => hangup(call.id)}
                      variant="destructive"
                      size="sm"
                    >
                      <PhoneOff className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
