import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AGENT_INFO } from '../types';
import { Pencil, Plus, Trash2 } from 'lucide-react';

interface Props {
  tipo: string;
  conteudo: any;
  editable?: boolean;
  onChange?: (newConteudo: any) => void;
}

export function ArtifactRenderer({ tipo, conteudo, editable = false, onChange }: Props) {
  if (!conteudo) return <p className="text-sm text-muted-foreground">Sem conteúdo</p>;

  const update = (path: string[], value: any) => {
    if (!onChange) return;
    const next = JSON.parse(JSON.stringify(conteudo));
    let ref = next;
    for (let i = 0; i < path.length - 1; i++) {
      ref = ref[path[i]];
    }
    ref[path[path.length - 1]] = value;
    onChange(next);
  };

  const props = { data: conteudo, editable, update };

  switch (tipo) {
    case 'vox': return <VoxRenderer {...props} />;
    case 'cipher': return <CipherRenderer {...props} />;
    case 'positioning': return <PositioningRenderer {...props} />;
    case 'funnel': return <FunnelRenderer {...props} />;
    case 'vsl': return <VSLRenderer {...props} />;
    case 'landing_page': return <LandingPageRenderer {...props} />;
    case 'creative': return <CreativeRenderer {...props} />;
    case 'email': return <EmailRenderer {...props} />;
    case 'reel': return <ReelRenderer {...props} />;
    default: return <GenericRenderer {...props} />;
  }
}

// ─── Shared editable components ─────────────────────────────────────────

interface RendererProps {
  data: any;
  editable: boolean;
  update: (path: string[], value: any) => void;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h4 className="font-semibold text-sm text-primary mb-2 mt-4 first:mt-0">{children}</h4>;
}

function EditableText({ value, path, update, editable, className = 'text-sm', multiline = false }: {
  value: string;
  path: string[];
  update: (path: string[], value: any) => void;
  editable: boolean;
  className?: string;
  multiline?: boolean;
}) {
  const safe = safeString(value);
  if (!editable) return <span className={className}>{safe}</span>;

  if (multiline) {
    return (
      <Textarea
        value={safe}
        onChange={e => update(path, e.target.value)}
        className={`${className} min-h-[60px] resize-y`}
        rows={3}
      />
    );
  }

  return (
    <Input
      value={safe}
      onChange={e => update(path, e.target.value)}
      className={`${className} h-auto py-1`}
    />
  );
}

function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

// Smart renderer that handles strings, arrays, and nested objects automatically
function SmartField({ value, basePath, update, editable }: {
  value: any;
  basePath: string[];
  update: (path: string[], value: any) => void;
  editable: boolean;
}) {
  if (value === null || value === undefined) return null;

  // Primitive: render as editable text
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return <EditableText value={safeString(value)} path={basePath} update={update} editable={editable} multiline={editable} className="text-sm" />;
  }

  // Array: render as list
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1.5 ml-1">
        {value.map((item, i) => (
          <li key={i} className="text-sm flex items-start gap-2">
            <span className="text-muted-foreground shrink-0 mt-0.5">•</span>
            <div className="flex-1">
              {typeof item === 'object' && item !== null ? (
                <SmartField value={item} basePath={[...basePath, String(i)]} update={update} editable={editable} />
              ) : editable ? (
                <Input
                  value={safeString(item)}
                  onChange={e => {
                    const next = [...value];
                    next[i] = e.target.value;
                    update(basePath, next);
                  }}
                  className="text-sm h-auto py-1"
                />
              ) : (
                <span>{safeString(item)}</span>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  // Object: render each key/value pair
  if (typeof value === 'object') {
    return (
      <div className="space-y-2 text-sm">
        {Object.entries(value).map(([k, v]) => (
          <div key={k}>
            <p className="font-medium capitalize text-xs text-muted-foreground mb-0.5">{k.replace(/_/g, ' ')}</p>
            <div className="ml-2">
              <SmartField value={v} basePath={[...basePath, k]} update={update} editable={editable} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return <span className="text-sm">{safeString(value)}</span>;
}


function EditableList({ items, fieldPath, update, editable, icon }: {
  items: any[];
  fieldPath: string;
  update: (path: string[], value: any) => void;
  editable: boolean;
  icon?: string;
}) {
  if (!Array.isArray(items)) return null;

  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    update([fieldPath], next);
  };
  const removeItem = (index: number) => {
    update([fieldPath], items.filter((_, i) => i !== index));
  };
  const addItem = () => {
    update([fieldPath], [...items, '']);
  };

  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => {
        const isObject = typeof item === 'object' && item !== null;
        const displayValue = isObject
          ? Object.entries(item).map(([k, v]) => `${k}: ${safeString(v)}`).join(' | ')
          : safeString(item);

        return (
          <li key={i} className="text-sm flex items-start gap-2">
            <span className="text-muted-foreground shrink-0 mt-1">{icon || '•'}</span>
            {editable ? (
              <div className="flex-1 flex items-center gap-1">
                {isObject ? (
                  <div className="flex-1 space-y-1">
                    {Object.entries(item).map(([k, v]) => (
                      <div key={k} className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground capitalize shrink-0 w-24">{k.replace(/_/g, ' ')}:</span>
                        <Input
                          value={safeString(v)}
                          onChange={e => {
                            const next = [...items];
                            next[i] = { ...item, [k]: e.target.value };
                            update([fieldPath], next);
                          }}
                          className="text-sm h-auto py-1 flex-1"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <Input
                    value={displayValue}
                    onChange={e => updateItem(i, e.target.value)}
                    className="text-sm h-auto py-1 flex-1"
                  />
                )}
                <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={() => removeItem(i)}>
                  <Trash2 className="h-3 w-3 text-destructive" />
                </Button>
              </div>
            ) : (
              <span>{displayValue}</span>
            )}
          </li>
        );
      })}
      {editable && (
        <Button variant="outline" size="sm" className="h-6 text-[10px] ml-6" onClick={addItem}>
          <Plus className="h-3 w-3 mr-1" /> Adicionar
        </Button>
      )}
    </ul>
  );
}

// ─── Renderers ──────────────────────────────────────────────────────────

function VoxRenderer({ data, editable, update }: RendererProps) {
  return (
    <div className="space-y-3">
      <SectionTitle>😣 Dores do Público</SectionTitle>
      <EditableList items={data.dores} fieldPath="dores" update={update} editable={editable} icon="🔴" />
      <SectionTitle>✨ Desejos</SectionTitle>
      <EditableList items={data.desejos} fieldPath="desejos" update={update} editable={editable} icon="💚" />
      <SectionTitle>🛡️ Objeções</SectionTitle>
      <EditableList items={data.objecoes} fieldPath="objecoes" update={update} editable={editable} icon="🟡" />
      <SectionTitle>💬 Frases Literais</SectionTitle>
      <EditableList items={data.frases_literais} fieldPath="frases_literais" update={update} editable={editable} icon="💬" />
      <SectionTitle>❤️ Padrões Emocionais</SectionTitle>
      <EditableList items={data.padroes_emocionais} fieldPath="padroes_emocionais" update={update} editable={editable} icon="❤️" />
      <SectionTitle>🗣️ Linguagem Recorrente</SectionTitle>
      <EditableList items={data.linguagem_recorrente} fieldPath="linguagem_recorrente" update={update} editable={editable} icon="🗣️" />
    </div>
  );
}

function CipherRenderer({ data, editable, update }: RendererProps) {
  return (
    <div className="space-y-3">
      <SectionTitle>🏆 Promessas Dominantes</SectionTitle>
      <EditableList items={data.promessas_dominantes} fieldPath="promessas_dominantes" update={update} editable={editable} />
      <SectionTitle>⚙️ Mecanismos dos Concorrentes</SectionTitle>
      <EditableList items={data.mecanismos_concorrentes} fieldPath="mecanismos_concorrentes" update={update} editable={editable} />
      <SectionTitle>📐 Ângulos de Anúncio</SectionTitle>
      <EditableList items={data.angulos_anuncio} fieldPath="angulos_anuncio" update={update} editable={editable} />
      <SectionTitle>📍 Padrões de Posicionamento</SectionTitle>
      <EditableList items={data.padroes_posicionamento} fieldPath="padroes_posicionamento" update={update} editable={editable} />
      <SectionTitle>🔓 Lacunas Estratégicas</SectionTitle>
      <EditableList items={data.lacunas_estrategicas} fieldPath="lacunas_estrategicas" update={update} editable={editable} icon="🎯" />
    </div>
  );
}

function PositioningRenderer({ data, editable, update }: RendererProps) {
  return (
    <div className="space-y-3">
      {data.icp && (
        <>
          <SectionTitle>👤 ICP - Perfil Ideal de Cliente</SectionTitle>
          <div className="bg-muted/50 rounded-lg p-3 space-y-1.5 text-sm">
            {typeof data.icp === 'object' && !Array.isArray(data.icp) ? Object.entries(data.icp).map(([k, v]) => (
              <div key={k} className="flex items-start gap-2">
                <span className="font-medium capitalize shrink-0">{k.replace(/_/g, ' ')}:</span>
                {editable ? (
                  <Input value={safeString(v)} onChange={e => update(['icp', k], e.target.value)} className="text-sm h-auto py-1" />
                ) : (
                  <span>{safeString(v)}</span>
                )}
              </div>
            )) : editable ? (
              <Input value={safeString(data.icp)} onChange={e => update(['icp'], e.target.value)} className="text-sm h-auto py-1" />
            ) : (
              <p>{safeString(data.icp)}</p>
            )}
          </div>
        </>
      )}
      <SectionTitle>🎯 Problema Central</SectionTitle>
      <div className="bg-destructive/5 border border-destructive/20 rounded-lg p-3">
        <SmartField value={data.problema_central} basePath={['problema_central']} update={update} editable={editable} />
      </div>
      <SectionTitle>🌟 Resultado Desejado</SectionTitle>
      <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
        <SmartField value={data.resultado_desejado} basePath={['resultado_desejado']} update={update} editable={editable} />
      </div>
      <SectionTitle>⚡ Mecanismo Único</SectionTitle>
      <div className="bg-muted/50 rounded-lg p-3">
        <SmartField value={data.mecanismo_unico} basePath={['mecanismo_unico']} update={update} editable={editable} />
      </div>
      <SectionTitle>💡 Big Idea</SectionTitle>
      <div className="bg-accent/50 rounded-lg p-3">
        <SmartField value={data.big_idea} basePath={['big_idea']} update={update} editable={editable} />
      </div>
      {data.estrutura_oferta && (
        <>
          <SectionTitle>📦 Estrutura da Oferta</SectionTitle>
          <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
            <SmartField value={data.estrutura_oferta} basePath={['estrutura_oferta']} update={update} editable={editable} />
          </div>
        </>
      )}
      <SectionTitle>🏅 Diferenciação</SectionTitle>
      <SmartField value={data.diferenciacao} basePath={['diferenciacao']} update={update} editable={editable} />
    </div>
  );
}

function FunnelRenderer({ data, editable, update }: RendererProps) {
  return (
    <div className="space-y-3">
      {data.fontes_trafego && (
        <>
          <SectionTitle>📡 Fontes de Tráfego</SectionTitle>
          <div className="grid gap-2">
            {data.fontes_trafego.map((fonte: any, i: number) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <EditableText value={fonte.canal} path={['fontes_trafego', String(i), 'canal']} update={update} editable={editable} className="text-sm font-medium" />
                <EditableText value={fonte.estrategia} path={['fontes_trafego', String(i), 'estrategia']} update={update} editable={editable} className="text-sm text-muted-foreground" multiline={editable} />
                {fonte.investimento_sugerido && (
                  editable ? (
                    <Input value={fonte.investimento_sugerido} onChange={e => update(['fontes_trafego', String(i), 'investimento_sugerido'], e.target.value)} className="text-xs h-auto py-1 w-40" />
                  ) : (
                    <Badge variant="outline" className="mt-1 text-xs">{fonte.investimento_sugerido}</Badge>
                  )
                )}
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
                  <EditableText value={etapa.nome} path={['etapas_funil', String(i), 'nome']} update={update} editable={editable} className="text-sm font-medium" />
                </div>
                <EditableText value={etapa.objetivo} path={['etapas_funil', String(i), 'objetivo']} update={update} editable={editable} className="text-xs text-muted-foreground" multiline={editable} />
                {etapa.ativos && !editable && <div className="flex flex-wrap gap-1 mt-1">{etapa.ativos.map((a: string, j: number) => <Badge key={j} variant="secondary" className="text-xs">{a}</Badge>)}</div>}
              </div>
            ))}
          </div>
        </>
      )}
      {data.logica_conversao && (
        <>
          <SectionTitle>🔄 Lógica de Conversão</SectionTitle>
          <EditableText value={data.logica_conversao} path={['logica_conversao']} update={update} editable={editable} multiline={editable} />
        </>
      )}
      {data.kpis && (
        <>
          <SectionTitle>📈 KPIs</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {data.kpis.map((kpi: any, i: number) => (
              <div key={i} className="bg-muted/50 rounded-lg p-2 text-sm text-center space-y-1">
                <EditableText value={kpi.metrica} path={['kpis', String(i), 'metrica']} update={update} editable={editable} className="text-sm font-medium" />
                <EditableText value={kpi.meta} path={['kpis', String(i), 'meta']} update={update} editable={editable} className="text-xs text-primary" />
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function VSLRenderer({ data, editable, update }: RendererProps) {
  const sections = ['hook', 'problema', 'descoberta', 'mecanismo', 'prova', 'oferta', 'cta'];
  const sectionLabels: Record<string, string> = {
    hook: '🎣 Hook', problema: '😣 Problema', descoberta: '💡 Descoberta',
    mecanismo: '⚙️ Mecanismo', prova: '✅ Prova', oferta: '📦 Oferta', cta: '🚀 CTA'
  };

  return (
    <div className="space-y-3">
      {data.duracao_total_estimada && (
        editable ? (
          <Input value={data.duracao_total_estimada} onChange={e => update(['duracao_total_estimada'], e.target.value)} className="text-xs h-auto py-1 w-48" />
        ) : (
          <Badge variant="outline" className="text-xs">Duração total: {data.duracao_total_estimada}</Badge>
        )
      )}
      {sections.map(section => {
        const content = data[section];
        if (!content) return null;
        const isObj = typeof content === 'object';
        const texto = isObj ? content.texto : content;
        return (
          <div key={section}>
            <SectionTitle>{sectionLabels[section]}</SectionTitle>
            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <EditableText
                value={texto}
                path={isObj ? [section, 'texto'] : [section]}
                update={update}
                editable={editable}
                multiline
                className="text-sm whitespace-pre-wrap"
              />
              {isObj && content.duracao_estimada && (
                editable ? (
                  <Input value={content.duracao_estimada} onChange={e => update([section, 'duracao_estimada'], e.target.value)} className="text-xs h-auto py-1 w-32 mt-2" />
                ) : (
                  <Badge variant="secondary" className="mt-2 text-xs">⏱ {content.duracao_estimada}</Badge>
                )
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LandingPageRenderer({ data, editable, update }: RendererProps) {
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
            {section.headline !== undefined && (
              <EditableText value={section.headline} path={['sections', String(i), 'headline']} update={update} editable={editable} className="text-base font-bold" />
            )}
            {section.subheadline !== undefined && (
              <EditableText value={section.subheadline} path={['sections', String(i), 'subheadline']} update={update} editable={editable} className="text-sm text-muted-foreground" />
            )}
            {section.titulo !== undefined && (
              <EditableText value={section.titulo} path={['sections', String(i), 'titulo']} update={update} editable={editable} className="text-sm font-semibold" />
            )}
            {section.conteudo !== undefined && (
              <EditableText value={section.conteudo} path={['sections', String(i), 'conteudo']} update={update} editable={editable} multiline={editable} />
            )}
            {section.cta_text !== undefined && (
              editable ? (
                <Input value={section.cta_text} onChange={e => update(['sections', String(i), 'cta_text'], e.target.value)} className="text-xs h-auto py-1 w-48" />
              ) : (
                <Badge className="text-xs">{section.cta_text}</Badge>
              )
            )}
            {section.items && <EditableList items={section.items} fieldPath={`sections.${i}.items`} update={(_, v) => update(['sections', String(i), 'items'], v)} editable={editable} icon="✓" />}
            {!editable && section.depoimentos?.map((d: any, j: number) => (
              <div key={j} className="bg-muted/30 rounded p-2 text-xs italic">"{d.texto}" — <span className="font-medium">{d.nome}</span></div>
            ))}
            {!editable && section.perguntas?.map((q: any, j: number) => (
              <div key={j} className="text-xs"><p className="font-medium">P: {q.pergunta}</p><p className="text-muted-foreground">R: {q.resposta}</p></div>
            ))}
            {section.preco !== undefined && (
              <EditableText value={section.preco} path={['sections', String(i), 'preco']} update={update} editable={editable} className="text-lg font-bold text-primary" />
            )}
            {section.garantia !== undefined && (
              editable ? (
                <Input value={section.garantia} onChange={e => update(['sections', String(i), 'garantia'], e.target.value)} className="text-xs h-auto py-1" />
              ) : (
                <p className="text-xs">🛡️ {section.garantia}</p>
              )
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CreativeRenderer({ data, editable, update }: RendererProps) {
  return (
    <div className="space-y-3">
      {data.hooks && (
        <>
          <SectionTitle>🎣 Hooks</SectionTitle>
          <div className="space-y-2">
            {data.hooks.map((hook: any, i: number) => (
              <div key={i} className="bg-muted/50 rounded-lg p-3 text-sm">
                <EditableText value={hook.texto} path={['hooks', String(i), 'texto']} update={update} editable={editable} className="text-sm font-medium" />
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
              <CardContent className="p-3 text-sm space-y-1">
                <EditableText value={c.nome} path={['conceitos_criativos', String(i), 'nome']} update={update} editable={editable} className="text-sm font-medium" />
                <Badge variant="outline" className="text-xs my-1">{c.formato}</Badge>
                <EditableText value={c.descricao} path={['conceitos_criativos', String(i), 'descricao']} update={update} editable={editable} className="text-xs text-muted-foreground" multiline={editable} />
                {c.roteiro !== undefined && (
                  <div className="mt-1 bg-muted/50 rounded p-2">
                    <EditableText value={c.roteiro} path={['conceitos_criativos', String(i), 'roteiro']} update={update} editable={editable} className="text-xs" multiline />
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </>
      )}
      {data.ideias_anuncios && (
        <>
          <SectionTitle>📢 Ideias de Anúncios</SectionTitle>
          {data.ideias_anuncios.map((ad: any, i: number) => (
            <div key={i} className="border rounded-lg p-3 text-sm space-y-1">
              <EditableText value={ad.titulo} path={['ideias_anuncios', String(i), 'titulo']} update={update} editable={editable} className="text-sm font-medium" />
              <Badge variant="secondary" className="text-xs my-1">{ad.formato}</Badge>
              <EditableText value={ad.copy} path={['ideias_anuncios', String(i), 'copy']} update={update} editable={editable} className="text-xs" multiline={editable} />
              {ad.cta && <Badge className="mt-1 text-xs">{ad.cta}</Badge>}
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function EmailRenderer({ data, editable, update }: RendererProps) {
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
                <CardContent className="p-3 text-sm space-y-1">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1 flex-1">
                      <span>📧</span>
                      <EditableText value={email.assunto} path={['sequencias', String(i), 'emails', String(j), 'assunto']} update={update} editable={editable} className="text-sm font-medium" />
                    </div>
                    <Badge variant="outline" className="text-xs shrink-0">Dia {email.delay_dias}</Badge>
                  </div>
                  {email.preview && (
                    <EditableText value={email.preview} path={['sequencias', String(i), 'emails', String(j), 'preview']} update={update} editable={editable} className="text-xs text-muted-foreground italic" />
                  )}
                  <EditableText value={email.corpo} path={['sequencias', String(i), 'emails', String(j), 'corpo']} update={update} editable={editable} className="text-xs whitespace-pre-wrap" multiline />
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

function ReelRenderer({ data, editable, update }: RendererProps) {
  return (
    <div className="space-y-3">
      {(data.scripts || []).map((script: any, i: number) => (
        <Card key={i}>
          <CardHeader className="py-2 px-3 bg-muted/30">
            <CardTitle className="text-xs flex items-center justify-between">
              <div className="flex items-center gap-1">
                <span>📱</span>
                <EditableText value={script.titulo} path={['scripts', String(i), 'titulo']} update={update} editable={editable} className="text-xs font-medium" />
              </div>
              {script.duracao && <Badge variant="outline" className="text-xs">⏱ {script.duracao}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 text-sm space-y-2">
            {script.hook && (
              <div>
                <p className="text-xs font-semibold text-primary">🎣 HOOK</p>
                <EditableText
                  value={typeof script.hook === 'object' ? script.hook.texto : script.hook}
                  path={typeof script.hook === 'object' ? ['scripts', String(i), 'hook', 'texto'] : ['scripts', String(i), 'hook']}
                  update={update} editable={editable} className="text-xs" multiline={editable}
                />
              </div>
            )}
            {script.desenvolvimento && (
              <div>
                <p className="text-xs font-semibold text-primary">📖 DESENVOLVIMENTO</p>
                <EditableText
                  value={typeof script.desenvolvimento === 'object' ? script.desenvolvimento.texto : script.desenvolvimento}
                  path={typeof script.desenvolvimento === 'object' ? ['scripts', String(i), 'desenvolvimento', 'texto'] : ['scripts', String(i), 'desenvolvimento']}
                  update={update} editable={editable} className="text-xs" multiline={editable}
                />
              </div>
            )}
            {script.cta && (
              <div>
                <p className="text-xs font-semibold text-primary">🚀 CTA</p>
                <EditableText
                  value={typeof script.cta === 'object' ? script.cta.texto : script.cta}
                  path={typeof script.cta === 'object' ? ['scripts', String(i), 'cta', 'texto'] : ['scripts', String(i), 'cta']}
                  update={update} editable={editable} className="text-xs" multiline={editable}
                />
              </div>
            )}
            {script.instrucoes_visuais && (
              <EditableText value={script.instrucoes_visuais} path={['scripts', String(i), 'instrucoes_visuais']} update={update} editable={editable} className="text-xs text-muted-foreground" />
            )}
            {script.musica_sugerida && (
              <EditableText value={script.musica_sugerida} path={['scripts', String(i), 'musica_sugerida']} update={update} editable={editable} className="text-xs text-muted-foreground" />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ─── Generic Renderer for custom agents ─────────────────────────────────
function GenericRenderer({ data, editable, update }: RendererProps) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm">{String(data)}</p>;
  }

  const renderValue = (key: string, value: any, basePath: string[]): React.ReactNode => {
    if (value === null || value === undefined) return null;

    if (typeof value === 'string') {
      return (
        <div key={key} className="space-y-1">
          <span className="text-xs font-semibold text-primary capitalize">{key.replace(/_/g, ' ')}</span>
          <EditableText value={value} path={basePath} update={update} editable={editable} className="text-sm block" multiline={value.length > 80} />
        </div>
      );
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return (
        <div key={key} className="space-y-1">
          <span className="text-xs font-semibold text-primary capitalize">{key.replace(/_/g, ' ')}</span>
          <span className="text-sm block">{String(value)}</span>
        </div>
      );
    }

    if (Array.isArray(value)) {
      return (
        <div key={key} className="space-y-1">
          <span className="text-xs font-semibold text-primary capitalize">{key.replace(/_/g, ' ')}</span>
          <div className="space-y-1 ml-2">
            {value.map((item, i) => {
              if (typeof item === 'object' && item !== null) {
                return (
                  <Card key={i} className="p-2">
                    <div className="space-y-2">
                      {Object.entries(item).map(([k, v]) => renderValue(k, v, [...basePath, String(i), k]))}
                    </div>
                  </Card>
                );
              }
              return (
                <div key={i} className="flex items-start gap-2">
                  <Badge variant="outline" className="text-[10px] shrink-0 mt-0.5">{i + 1}</Badge>
                  <EditableText value={String(item)} path={[...basePath, String(i)]} update={update} editable={editable} className="text-sm" />
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    if (typeof value === 'object') {
      return (
        <div key={key} className="space-y-2">
          <SectionTitle>{key.replace(/_/g, ' ')}</SectionTitle>
          <div className="space-y-2 ml-2 border-l-2 border-muted pl-3">
            {Object.entries(value).map(([k, v]) => renderValue(k, v, [...basePath, k]))}
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => renderValue(key, value, [key]))}
    </div>
  );
}
