import { useState, useEffect } from "react";
import { MessageCircle, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEcommerceBranding } from "@/hooks/useEcommerceBranding";
import { motion, AnimatePresence } from "framer-motion";

interface BotFlow {
  id: string;
  name: string;
  description: string | null;
  canais: string[] | null;
}

export default function EcommerceFloatingChat() {
  const { branding, loading: brandingLoading } = useEcommerceBranding();
  const [showSelector, setShowSelector] = useState(false);
  const [bots, setBots] = useState<BotFlow[]>([]);
  const [selectedChannel, setSelectedChannel] = useState<"webchat" | "whatsapp" | null>(null);

  const showWebchat = branding.feat_webchat;
  const showWhatsapp = branding.feat_whatsapp;

  useEffect(() => {
    if (!showWebchat && !showWhatsapp) return;
    const loadBots = async () => {
      const estId = localStorage.getItem("estabelecimentoId");
      if (!estId) return;
      const { data } = await supabase
        .from("bot_flows")
        .select("id, name, description, canais")
        .eq("estabelecimento_id", estId)
        .eq("active", true);
      if (data) setBots(data);
    };
    loadBots();
  }, [showWebchat, showWhatsapp]);

  if (brandingLoading || (!showWebchat && !showWhatsapp)) return null;

  const handleChannelClick = (channel: "webchat" | "whatsapp") => {
    const channelBots = bots.filter(b => !b.canais || b.canais.length === 0 || b.canais.includes(channel));
    if (channelBots.length === 1) {
      startChat(channel, channelBots[0]);
    } else {
      setSelectedChannel(channel);
      setShowSelector(true);
    }
  };

  const startChat = (channel: "webchat" | "whatsapp", bot: BotFlow) => {
    setShowSelector(false);
    setSelectedChannel(null);
    if (channel === "whatsapp") {
      // Open WhatsApp with bot context - placeholder number
      window.open(`https://wa.me/?text=${encodeURIComponent(`Olá! Gostaria de falar com ${bot.name}`)}`, "_blank");
    } else {
      // Webchat - dispatch custom event for webchat widget
      window.dispatchEvent(new CustomEvent("ecommerce-webchat-open", { detail: { botId: bot.id, botName: bot.name } }));
    }
  };

  const filteredBots = selectedChannel
    ? bots.filter(b => !b.canais || b.canais.length === 0 || b.canais.includes(selectedChannel))
    : bots;

  return (
    <>
      {/* Floating icons */}
      <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3">
        {showWhatsapp && (
          <button
            onClick={() => handleChannelClick("whatsapp")}
            className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center transition-all hover:scale-110"
            title="WhatsApp Business"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
          </button>
        )}
        {showWebchat && (
          <button
            onClick={() => handleChannelClick("webchat")}
            className="w-14 h-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg flex items-center justify-center transition-all hover:scale-110"
            title="Chat ao vivo"
          >
            <MessageCircle className="w-7 h-7" />
          </button>
        )}
      </div>

      {/* Bot selector modal */}
      <AnimatePresence>
        {showSelector && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/40 flex items-end sm:items-center justify-center p-4"
            onClick={() => { setShowSelector(false); setSelectedChannel(null); }}
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="bg-card rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold">
                  {selectedChannel === "whatsapp" ? "WhatsApp Business" : "Chat ao Vivo"}
                </h3>
                <button onClick={() => { setShowSelector(false); setSelectedChannel(null); }} className="p-1 rounded-full hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Selecione o assistente com quem deseja conversar:</p>
              <div className="space-y-2">
                {filteredBots.length > 0 ? filteredBots.map(bot => (
                  <button
                    key={bot.id}
                    onClick={() => startChat(selectedChannel!, bot)}
                    className="w-full text-left p-4 rounded-xl border hover:border-primary/50 hover:bg-primary/5 transition-all"
                  >
                    <p className="font-semibold text-sm">{bot.name}</p>
                    {bot.description && <p className="text-xs text-muted-foreground mt-0.5">{bot.description}</p>}
                  </button>
                )) : (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhum bot disponível neste canal.</p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
