import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AGENT_INFO } from '../types';

interface Props {
  tipo: string;
  conteudo: any;
}

export function ArtifactRenderer({ tipo, conteudo }: Props) {
  if (!conteudo) return <p className="text-sm text-muted-foreground">Sem conteúdo</p>;

  switch (tipo) {
    case 'vox': return <VoxRenderer data={conteudo} />;
    case 'cipher': return <CipherRenderer data={conteudo} />;
    case 'positioning': return <PositioningRenderer data={conteudo} />;
    case 'funnel': return <FunnelRenderer data={conteudo} />;
    case 'vsl': return <VSLRenderer data={conteudo} />;
    case 'landing_page': return <LandingPageRenderer data={conteudo} />;
    case 'creative': return <CreativeRenderer data={conteudo} />;
    case 'email': return <EmailRenderer data={conteudo} />;
    case 'reel': return <ReelRenderer data={conteudo} />;
    default: return <pre className="text-xs whitespace-pre-wrap">{JSON.stringify(conteudo, null, 2)}</pre>;
  }
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="font-semibold text-sm text-primary mb-2 mt-4 first:mt-0">{children}</h4>;
}

function ListItems({ items, icon }: { items: string[]; icon?: string }) {
  if (!Array.isArray(items)) return null;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="text-sm flex items-start gap-2">
          <span className="text-muted-foreground shrink-0">{icon || '•'}</span>
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function VoxRenderer({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <SectionTitle>😣 Dores do Público</SectionTitle>
      <ListItems items={data.dores} icon="🔴" />
      <SectionTitle>✨ Desejos</SectionTitle>
      <ListItems items={data.desejos} icon="💚" />
      <SectionTitle>🛡️ Objeções</SectionTitle>
      <ListItems items={data.objecoes} icon="🟡" />
      <SectionTitle>💬 Frases Literais</SectionTitle>
      <ListItems items={data.frases_literais} icon="💬" />
      <SectionTitle>❤️ Padrões Emocionais</SectionTitle>
      <ListItems items={data.padroes_emocionais} icon="❤️" />
      <SectionTitle>🗣️ Linguagem Recorrente</SectionTitle>
      <ListItems items={data.linguagem_recorrente} icon="🗣️" />
    </div>
  );
}

function CipherRenderer({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      <SectionTitle>🏆 Promessas Dominantes</SectionTitle>
      <ListItems items={data.promessas_dominantes} />
      <SectionTitle>⚙️ Mecanismos dos Concorrentes</SectionTitle>
      <ListItems items={data.mecanismos_concorrentes} />
      <SectionTitle>📐 Ângulos de Anúncio</SectionTitle>
      <ListItems items={data.angulos_anuncio} />
      <SectionTitle>📍 Padrões de Posicionamento</SectionTitle>
      <ListItems items={data.padroes_posicionamento} />
      <SectionTitle>🔓 Lacunas Estratégicas</SectionTitle>
      <ListItems items={data.lacunas_estrategicas} icon="🎯" />
    </div>
  );
}

function PositioningRenderer({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.icp && (
        <>
          <SectionTitle>👤 ICP - Perfil Ideal de Cliente</SectionTitle>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            {typeof data.icp === 'object' ? Object.entries(data.icp).map(([k, v]) => (
              <p key={k}><span className="font-medium capitalize">{k.replace(/_/g, ' ')}:</span> {String(v)}</p>
            )) : <p>{String(data.icp)}</p>}
          </div>
        </>
      )}
      <SectionTitle>🎯 Problema Central</SectionTitle>
      <p className="text-sm bg-destructive/5 border border-destructive/20 rounded-lg p-3">{data.problema_central}</p>
      <SectionTitle>🌟 Resultado Desejado</SectionTitle>
      <p className="text-sm bg-primary/5 border border-primary/20 rounded-lg p-3">{data.resultado_desejado}</p>
      <SectionTitle>⚡ Mecanismo Único</SectionTitle>
      <p className="text-sm font-medium">{data.mecanismo_unico}</p>
      <SectionTitle>💡 Big Idea</SectionTitle>
      <p className="text-sm bg-accent/50 rounded-lg p-3 font-semibold">{data.big_idea}</p>
      {data.estrutura_oferta && (
        <>
          <SectionTitle>📦 Estrutura da Oferta</SectionTitle>
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <p><span className="font-medium">Principal:</span> {data.estrutura_oferta.principal}</p>
            {data.estrutura_oferta.bonus && (
              <div>
                <span className="font-medium">Bônus:</span>
                <ListItems items={data.estrutura_oferta.bonus} icon="🎁" />
              </div>
            )}
            <p><span className="font-medium">Garantia:</span> {data.estrutura_oferta.garantia}</p>
          </div>
        </>
      )}
      <SectionTitle>🏅 Diferenciação</SectionTitle>
      <p className="text-sm">{data.diferenciacao}</p>
    </div>
  );
}

function FunnelRenderer({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.fontes_trafego && (
        <>
          <SectionTitle>📡 Fontes de Tráfego</SectionTitle>
          <div className="grid gap-2">
            {data.fontes_trafego.map((fonte: any, i: number) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">{fonte.canal}</p>
                <p className="text-muted-foreground">{fonte.estrategia}</p>
                {fonte.investimento_sugerido && <Badge variant="outline" className="mt-1 text-xs">{fonte.investimento_sugerido}</Badge>}
              </div>
            ))}
          </div>
        </>
      )}
      {data.etapas_funil && (
        <>
          <SectionTitle>📊 Etapas do Funil</SectionTitle>
          <div className="space-y-2">
            {data.etapas_funil.map((etapa: any, i: number) => (
              <div key={i} className="border rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className="text-xs">{i + 1}</Badge>
                  <span className="font-medium">{etapa.nome}</span>
                </div>
                <p className="text-muted-foreground text-xs">{etapa.objetivo}</p>
                {etapa.ativos && <div className="flex flex-wrap gap-1 mt-1">{etapa.ativos.map((a: string, j: number) => <Badge key={j} variant="secondary" className="text-xs">{a}</Badge>)}</div>}
              </div>
            ))}
          </div>
        </>
      )}
      {data.logica_conversao && (
        <>
          <SectionTitle>🔄 Lógica de Conversão</SectionTitle>
          <p className="text-sm">{data.logica_conversao}</p>
        </>
      )}
      {data.kpis && (
        <>
          <SectionTitle>📈 KPIs</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {data.kpis.map((kpi: any, i: number) => (
              <div key={i} className="bg-muted/50 rounded-lg p-2 text-sm text-center">
                <p className="font-medium">{kpi.metrica}</p>
                <p className="text-primary text-xs">{kpi.meta}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VSLRenderer({ data }: { data: any }) {
  const sections = ['hook', 'problema', 'descoberta', 'mecanismo', 'prova', 'oferta', 'cta'];
  const sectionLabels: Record<string, string> = {
    hook: '🎣 Hook', problema: '😣 Problema', descoberta: '💡 Descoberta',
    mecanismo: '⚙️ Mecanismo', prova: '✅ Prova', oferta: '📦 Oferta', cta: '🚀 CTA'
  };

  return (
    <div className="space-y-3">
      {data.duracao_total_estimada && (
        <Badge variant="outline" className="text-xs">Duração total: {data.duracao_total_estimada}</Badge>
      )}
      {sections.map(section => {
        const content = data[section];
        if (!content) return null;
        return (
          <div key={section}>
            <SectionTitle>{sectionLabels[section]}</SectionTitle>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="whitespace-pre-wrap">{typeof content === 'object' ? content.texto : content}</p>
              {content.duracao_estimada && <Badge variant="secondary" className="mt-2 text-xs">⏱ {content.duracao_estimada}</Badge>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LandingPageRenderer({ data }: { data: any }) {
  const sections = data.sections || [];
  const sectionIcons: Record<string, string> = {
    hero: '🏠', problema: '😣', solucao: '💡', mecanismo: '⚙️',
    prova: '✅', depoimentos: '💬', oferta: '📦', faq: '❓', cta_final: '🚀'
  };

  return (
    <div className="space-y-3">
      {sections.map((section: any, i: number) => (
        <Card key={i} className="overflow-hidden">
          <CardHeader className="py-2 px-3 bg-muted/30">
            <CardTitle className="text-xs flex items-center gap-2">
              <span>{sectionIcons[section.tipo] || '📄'}</span>
              {section.tipo?.toUpperCase()}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-sm space-y-1">
            {section.headline && <p className="font-bold text-base">{section.headline}</p>}
            {section.subheadline && <p className="text-muted-foreground">{section.subheadline}</p>}
            {section.titulo && <p className="font-semibold">{section.titulo}</p>}
            {section.conteudo && <p>{section.conteudo}</p>}
            {section.cta_text && <Badge className="text-xs">{section.cta_text}</Badge>}
            {section.items && <ListItems items={section.items} icon="✓" />}
            {section.depoimentos?.map((d: any, j: number) => (
              <div key={j} className="bg-muted/30 rounded p-2 text-xs italic">"{d.texto}" — <span className="font-medium">{d.nome}</span></div>
            ))}
            {section.perguntas?.map((q: any, j: number) => (
              <div key={j} className="text-xs"><p className="font-medium">P: {q.pergunta}</p><p className="text-muted-foreground">R: {q.resposta}</p></div>
            ))}
            {section.preco && <p className="text-lg font-bold text-primary">{section.preco}</p>}
            {section.garantia && <p className="text-xs">🛡️ {section.garantia}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreativeRenderer({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {data.hooks && (
        <>
          <SectionTitle>🎣 Hooks</SectionTitle>
          <div className="space-y-2">
            {data.hooks.map((hook: any, i: number) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm">
                <p className="font-medium">"{hook.texto}"</p>
                <div className="flex gap-1 mt-1">
                  {hook.tipo && <Badge variant="secondary" className="text-xs">{hook.tipo}</Badge>}
                  {hook.plataforma && <Badge variant="outline" className="text-xs">{hook.plataforma}</Badge>}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
      {data.conceitos_criativos && (
        <>
          <SectionTitle>🎨 Conceitos Criativos</SectionTitle>
          {data.conceitos_criativos.map((c: any, i: number) => (
            <Card key={i}>
              <CardContent className="p-3 text-sm">
                <p className="font-medium">{c.nome}</p>
                <Badge variant="outline" className="text-xs my-1">{c.formato}</Badge>
                <p className="text-muted-foreground text-xs">{c.descricao}</p>
                {c.roteiro && <p className="mt-1 bg-muted/50 rounded p-2 text-xs">{c.roteiro}</p>}
              </CardContent>
            </Card>
          ))}
        </>
      )}
      {data.ideias_anuncios && (
        <>
          <SectionTitle>📢 Ideias de Anúncios</SectionTitle>
          {data.ideias_anuncios.map((ad: any, i: number) => (
            <div key={i} className="border rounded-lg p-3 text-sm">
              <p className="font-medium">{ad.titulo}</p>
              <Badge variant="secondary" className="text-xs my-1">{ad.formato}</Badge>
              <p className="text-xs">{ad.copy}</p>
              {ad.cta && <Badge className="mt-1 text-xs">{ad.cta}</Badge>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function EmailRenderer({ data }: { data: any }) {
  const typeLabels: Record<string, string> = {
    boas_vindas: '👋 Boas-vindas', nutricao: '📚 Nutrição',
    quebra_objecoes: '🛡️ Quebra de Objeções', conversao: '🔥 Conversão'
  };

  return (
    <div className="space-y-4">
      {(data.sequencias || []).map((seq: any, i: number) => (
        <div key={i}>
          <SectionTitle>{typeLabels[seq.tipo] || seq.tipo}</SectionTitle>
          <div className="space-y-2">
            {(seq.emails || []).map((email: any, j: number) => (
              <Card key={j}>
                <CardContent className="p-3 text-sm">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium">📧 {email.assunto}</p>
                    <Badge variant="outline" className="text-xs">Dia {email.delay_dias}</Badge>
                  </div>
                  {email.preview && <p className="text-xs text-muted-foreground italic mb-1">{email.preview}</p>}
                  <p className="text-xs whitespace-pre-wrap">{email.corpo}</p>
                  {email.cta && <Badge className="mt-2 text-xs">{email.cta}</Badge>}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReelRenderer({ data }: { data: any }) {
  return (
    <div className="space-y-3">
      {(data.scripts || []).map((script: any, i: number) => (
        <Card key={i}>
          <CardHeader className="py-2 px-3 bg-muted/30">
            <CardTitle className="text-xs flex items-center justify-between">
              <span>📱 {script.titulo}</span>
              {script.duracao && <Badge variant="outline" className="text-xs">⏱ {script.duracao}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-sm space-y-2">
            {script.hook && (
              <div>
                <p className="text-xs font-semibold text-primary">🎣 HOOK</p>
                <p className="text-xs">{typeof script.hook === 'object' ? script.hook.texto : script.hook}</p>
              </div>
            )}
            {script.desenvolvimento && (
              <div>
                <p className="text-xs font-semibold text-primary">📖 DESENVOLVIMENTO</p>
                <p className="text-xs">{typeof script.desenvolvimento === 'object' ? script.desenvolvimento.texto : script.desenvolvimento}</p>
              </div>
            )}
            {script.cta && (
              <div>
                <p className="text-xs font-semibold text-primary">🚀 CTA</p>
                <p className="text-xs">{typeof script.cta === 'object' ? script.cta.texto : script.cta}</p>
              </div>
            )}
            {script.instrucoes_visuais && <p className="text-xs text-muted-foreground">🎥 {script.instrucoes_visuais}</p>}
            {script.musica_sugerida && <p className="text-xs text-muted-foreground">🎵 {script.musica_sugerida}</p>}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
