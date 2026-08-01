import ReactMarkdown from "react-markdown";
import { segmentarLinha } from "@/lib/notas/wikilinks";
import { cn } from "@/lib/utils";

interface NotaMarkdownProps {
  conteudo: string;
  onAbrirLink?: (titulo: string) => void;
  linkExiste?: (titulo: string) => boolean;
  className?: string;
}

/** Renderiza markdown convertendo [[wiki links]] em botões clicáveis. */
export function NotaMarkdown({ conteudo, onAbrirLink, linkExiste, className }: NotaMarkdownProps) {
  const renderTexto = (children: React.ReactNode): React.ReactNode => {
    if (typeof children === "string") {
      const segmentos = segmentarLinha(children);
      if (segmentos.length === 1 && segmentos[0].tipo === "texto") return children;
      return segmentos.map((seg, i) =>
        seg.tipo === "texto" ? (
          <span key={i}>{seg.valor}</span>
        ) : (
          <button
            key={i}
            type="button"
            onClick={() => onAbrirLink?.(seg.alvo)}
            className={cn(
              "mx-0.5 rounded px-1 underline underline-offset-2 transition-colors",
              linkExiste?.(seg.alvo) === false
                ? "text-muted-foreground decoration-dashed hover:text-foreground"
                : "text-primary hover:bg-primary/10"
            )}
          >
            {seg.rotulo}
          </button>
        )
      );
    }
    if (Array.isArray(children)) return children.map((c, i) => <span key={i}>{renderTexto(c)}</span>);
    return children;
  };

  return (
    <div className={cn("prose prose-sm max-w-none dark:prose-invert text-foreground", className)}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="mb-3 leading-relaxed">{renderTexto(children)}</p>,
          li: ({ children }) => <li className="mb-1">{renderTexto(children)}</li>,
          h1: ({ children }) => <h1 className="mb-3 text-2xl font-bold">{renderTexto(children)}</h1>,
          h2: ({ children }) => <h2 className="mb-2 text-xl font-semibold">{renderTexto(children)}</h2>,
          h3: ({ children }) => <h3 className="mb-2 text-lg font-semibold">{renderTexto(children)}</h3>,
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-primary/50 pl-3 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noreferrer" className="text-primary underline">
              {children}
            </a>
          ),
        }}
      >
        {conteudo || "_Nota vazia_"}
      </ReactMarkdown>
    </div>
  );
}
