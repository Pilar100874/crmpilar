import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Smile, Meh, Frown, TrendingDown, TrendingUp } from "lucide-react";

interface SentimentIndicatorProps {
  messageId: string;
  conversationId: string;
  compact?: boolean;
}

export default function SentimentIndicator({ messageId, conversationId, compact = false }: SentimentIndicatorProps) {
  const [sentiment, setSentiment] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSentiment();
    
    // Realtime subscription
    const channel = supabase
      .channel(`sentiment-${messageId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sentiment_analysis',
          filter: `message_id=eq.${messageId}`
        },
        (payload) => {
          setSentiment(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [messageId]);

  const loadSentiment = async () => {
    const { data, error } = await supabase
      .from('sentiment_analysis')
      .select('*')
      .eq('message_id', messageId)
      .single();

    if (data) {
      setSentiment(data);
    }
    setLoading(false);
  };

  if (loading || !sentiment) return null;

  const getSentimentColor = () => {
    if (sentiment.sentimento === 'positivo') return 'text-green-500 bg-green-500/10 border-green-500/20';
    if (sentiment.sentimento === 'negativo') return 'text-red-500 bg-red-500/10 border-red-500/20';
    return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20';
  };

  const getSentimentIcon = () => {
    if (sentiment.sentimento === 'positivo') return <Smile className="w-3 h-3" />;
    if (sentiment.sentimento === 'negativo') return <Frown className="w-3 h-3" />;
    return <Meh className="w-3 h-3" />;
  };

  const getEmotionEmoji = (emocao: string) => {
    const emojiMap: Record<string, string> = {
      happy: '😊',
      sad: '😢',
      irritated: '😠',
      frustrated: '😤',
      satisfied: '😌',
      neutral: '😐'
    };
    return emojiMap[emocao] || '😐';
  };

  if (compact) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger>
            <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${getSentimentColor()}`}>
              {getSentimentIcon()}
              <span>{Math.round(sentiment.score * 100)}%</span>
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">Sentimento:</span>
                <Badge variant={sentiment.sentimento === 'positivo' ? 'default' : sentiment.sentimento === 'negativo' ? 'destructive' : 'secondary'}>
                  {sentiment.sentimento}
                </Badge>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">Emoção:</span>
                <span className="text-lg">{getEmotionEmoji(sentiment.emocao)} {sentiment.emocao}</span>
              </div>
              <div className="flex items-center justify-between gap-4">
                <span className="font-semibold">Confiança:</span>
                <span>{Math.round(sentiment.confidence * 100)}%</span>
              </div>
              {sentiment.keywords && sentiment.keywords.length > 0 && (
                <div>
                  <span className="font-semibold">Palavras-chave:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {sentiment.keywords.map((keyword: string, idx: number) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm border ${getSentimentColor()}`}>
      {getSentimentIcon()}
      <span className="font-medium capitalize">{sentiment.sentimento}</span>
      <span className="text-lg">{getEmotionEmoji(sentiment.emocao)}</span>
      <Badge variant="outline" className="ml-1">
        {Math.round(sentiment.score * 100)}%
      </Badge>
    </div>
  );
}
