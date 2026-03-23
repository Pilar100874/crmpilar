import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { AGENT_INFO } from '../types';
import { AGENT_CARDS } from '../agent-cards';
import { Plus, Trash2 } from 'lucide-react';

interface Props {
  tipo: string;
  conteudo: any;
  editable?: boolean;
  onChange?: (newConteudo: any) => void;
  agentInfo?: Record<string, { name: string; icon: string; color: string; description: string }>;
}

export function ArtifactRenderer({ tipo, conteudo, editable = false, onChange, agentInfo }: Props) {
  if (!conteudo) return <p className="text-sm text-muted-foreground">Sem conteúdo</p>;

  const resolvedInfo = agentInfo || AGENT_INFO;
  const info = resolvedInfo[tipo];
  const card = AGENT_CARDS[tipo];

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

  return (
    <div className="space-y-5">
      {/* Agent Summary Header */}
      <div className="rounded-xl border p-4 space-y-2" style={{ borderColor: `${info?.color || '#6366F1'}30`, backgroundColor: `${info?.color || '#6366F1'}08` }}>
        <div className="flex items-center gap-2">
          <span className="text-xl">{info?.icon || '📄'}</span>
          <h3 className="font-semibold text-base">{info?.name || tipo}</h3>
        </div>
        {card?.mission && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            <span className="font-medium text-foreground">Missão:</span> {card.mission}
          </p>
        )}
        {card?.role && (
          <p className="text-xs text-muted-foreground leading-relaxed">
            {card.role}
          </p>
        )}
        {!card && info?.description && (
          <p className="text-sm text-muted-foreground">{info.description}</p>
        )}
      </div>

      {/* Standardized Content Sections */}
      {renderStandardized(conteudo, editable, update)}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

function safeString(value: any): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

function formatLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

const SECTION_ICONS: Record<string, string> = {
  dores: '🔴', dores_funcionais: '🔴', dores_emocionais: '💔', dores_sociais: '👥',
  desejos: '💚', desejos_concretos: '💚',
  objecoes: '🟡', objecoes_reais: '🟡',
  frases_literais: '💬',
  padroes_emocionais: '❤️',
  linguagem_recorrente: '🗣️', linguagem_do_nicho: '🗣️',
  promessas_dominantes: '🏆',
  mecanismos_concorrentes: '⚙️',
  angulos_anuncio: '📐', angulos_campanha: '📐',
  padroes_posicionamento: '📍',
  lacunas_estrategicas: '🎯',
  icp: '👤',
  problema_central: '😣',
  resultado_desejado: '🌟',
  mecanismo_unico: '⚡',
  big_idea: '💡',
  estrutura_oferta: '📦',
  diferenciacao: '🏅',
  fontes_trafego: '📡',
  etapas_funil: '📊',
  logica_conversao: '🔄',
  kpis: '📈',
  unit_economics: '💰',
  hook: '🎣', hooks: '🎣',
  problema: '😣', agitacao: '🔥',
  descoberta: '💡', mecanismo: '⚙️',
  prova: '✅', prova_social: '✅',
  oferta: '📦', bonus: '🎁',
  garantia: '🛡️', escassez: '⏳',
  cta: '🚀', cta_final: '🚀',
  sections: '🏗️',
  conceitos_criativos: '🎨',
  ideias_anuncios: '📢',
  sequencias: '📧',
  scripts: '📱',
  calendario_sugerido: '📅',
  cronograma_implantacao: '📅',
  retargeting: '🔁',
  tendencias_mercado: '📈',
  pontos_fracos_concorrentes: '🎯',
  benchmark_precos: '💲',
  meta_title: '🔍', meta_description: '🔍',
  palavras_chave_seo: '🔍',
  loops_abertos: '🔗',
  instrucoes_gravacao: '🎬',
  duracao_total_estimada: '⏱️',
  nivel_consciencia: '🧠',
  gatilhos_decisao: '⚡',
  persona_resumo: '👤',
  segmentos_identificados: '🎯',
  nivel_saturacao: '📊',
  substitutos: '🔄',
};

// ─── Standard Renderer ──────────────────────────────────────────────────

function renderStandardized(data: any, editable: boolean, update: (path: string[], value: any) => void) {
  if (!data || typeof data !== 'object') {
    return <p className="text-sm">{String(data)}</p>;
  }

  return (
    <div className="space-y-4">
      {Object.entries(data).map(([key, value]) => (
        <StandardSection
          key={key}
          sectionKey={key}
          value={value}
          editable={editable}
          update={update}
          basePath={[key]}
        />
      ))}
    </div>
  );
}

function StandardSection({ sectionKey, value, editable, update, basePath }: {
  sectionKey: string;
  value: any;
  editable: boolean;
  update: (path: string[], value: any) => void;
  basePath: string[];
}) {
  if (value === null || value === undefined) return null;

  const icon = SECTION_ICONS[sectionKey] || '📌';
  const label = formatLabel(sectionKey);

  // Primitive value — render as key-value card
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return (
      <div className="rounded-lg border bg-card p-3 space-y-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{icon}</span>
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">{label}</h4>
        </div>
        {editable ? (
          typeof value === 'string' && value.length > 80 ? (
            <Textarea
              value={safeString(value)}
              onChange={e => update(basePath, e.target.value)}
              className="text-sm min-h-[60px] resize-y"
              rows={3}
            />
          ) : (
            <Input
              value={safeString(value)}
              onChange={e => update(basePath, e.target.value)}
              className="text-sm h-auto py-1"
            />
          )
        ) : (
          <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{safeString(value)}</p>
        )}
      </div>
    );
  }

  // Array value
  if (Array.isArray(value)) {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
          <span className="text-sm">{icon}</span>
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">{label}</h4>
          <Badge variant="outline" className="text-[10px] ml-auto">{value.length} itens</Badge>
        </div>
        <div className="p-3 space-y-2">
          {value.map((item, i) => (
            <StandardListItem
              key={i}
              item={item}
              index={i}
              editable={editable}
              update={update}
              basePath={basePath}
              allItems={value}
              icon={icon}
            />
          ))}
          {editable && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs w-full"
              onClick={() => {
                const newItem = typeof value[0] === 'object' && value[0] !== null
                  ? Object.fromEntries(Object.keys(value[0]).map(k => [k, '']))
                  : '';
                update(basePath, [...value, newItem]);
              }}
            >
              <Plus className="h-3 w-3 mr-1" /> Adicionar
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Object value — render as nested card
  if (typeof value === 'object') {
    return (
      <div className="rounded-lg border bg-card overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border-b">
          <span className="text-sm">{icon}</span>
          <h4 className="text-xs font-semibold text-primary uppercase tracking-wide">{label}</h4>
        </div>
        <div className="p-3 space-y-3">
          {Object.entries(value).map(([k, v]) => {
            if (v === null || v === undefined) return null;

            // Nested arrays and objects recurse
            if (Array.isArray(v) || (typeof v === 'object' && v !== null)) {
              return (
                <StandardSection
                  key={k}
                  sectionKey={k}
                  value={v}
                  editable={editable}
                  update={update}
                  basePath={[...basePath, k]}
                />
              );
            }

            // Primitive inside object
            return (
              <div key={k} className="flex items-start gap-2">
                <span className="text-xs font-medium text-muted-foreground capitalize shrink-0 min-w-[100px] pt-1">
                  {formatLabel(k)}:
                </span>
                <div className="flex-1">
                  {editable ? (
                    typeof v === 'string' && String(v).length > 80 ? (
                      <Textarea
                        value={safeString(v)}
                        onChange={e => update([...basePath, k], e.target.value)}
                        className="text-sm min-h-[50px] resize-y"
                        rows={2}
                      />
                    ) : (
                      <Input
                        value={safeString(v)}
                        onChange={e => update([...basePath, k], e.target.value)}
                        className="text-sm h-auto py-1"
                      />
                    )
                  ) : (
                    <span className="text-sm">{safeString(v)}</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return null;
}

function StandardListItem({ item, index, editable, update, basePath, allItems, icon }: {
  item: any;
  index: number;
  editable: boolean;
  update: (path: string[], value: any) => void;
  basePath: string[];
  allItems: any[];
  icon: string;
}) {
  const removeItem = () => {
    update(basePath, allItems.filter((_, i) => i !== index));
  };

  // Primitive item
  if (typeof item !== 'object' || item === null) {
    return (
      <div className="flex items-start gap-2 group">
        <span className="text-muted-foreground shrink-0 mt-1 text-xs">•</span>
        {editable ? (
          <div className="flex-1 flex items-center gap-1">
            <Input
              value={safeString(item)}
              onChange={e => {
                const next = [...allItems];
                next[index] = e.target.value;
                update(basePath, next);
              }}
              className="text-sm h-auto py-1 flex-1"
            />
            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100" onClick={removeItem}>
              <Trash2 className="h-3 w-3 text-destructive" />
            </Button>
          </div>
        ) : (
          <span className="text-sm leading-relaxed">{safeString(item)}</span>
        )}
      </div>
    );
  }

  // Object item — render as mini card
  return (
    <div className="rounded-md border bg-muted/20 p-2.5 space-y-1.5 group relative">
      {editable && (
        <Button
          variant="ghost"
          size="icon"
          className="h-5 w-5 absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100"
          onClick={removeItem}
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </Button>
      )}
      {Object.entries(item).map(([k, v]) => {
        if (v === null || v === undefined) return null;

        // Nested arrays inside list items
        if (Array.isArray(v)) {
          return (
            <div key={k} className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground capitalize">{formatLabel(k)}:</span>
              <ul className="ml-3 space-y-0.5">
                {(v as any[]).map((subItem, si) => (
                  <li key={si} className="text-xs flex items-start gap-1.5">
                    <span className="text-muted-foreground mt-0.5">-</span>
                    {editable ? (
                      <Input
                        value={safeString(subItem)}
                        onChange={e => {
                          const newArr = [...(v as any[])];
                          newArr[si] = e.target.value;
                          const next = [...allItems];
                          next[index] = { ...item, [k]: newArr };
                          update(basePath, next);
                        }}
                        className="text-xs h-auto py-0.5 flex-1"
                      />
                    ) : (
                      <span>{safeString(subItem)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          );
        }

        // Nested object inside list items
        if (typeof v === 'object' && v !== null) {
          return (
            <div key={k} className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground capitalize">{formatLabel(k)}:</span>
              <div className="ml-2 space-y-1">
                {Object.entries(v as Record<string, any>).map(([sk, sv]) => (
                  <div key={sk} className="flex items-start gap-1.5 text-xs">
                    <span className="text-muted-foreground capitalize shrink-0">{formatLabel(sk)}:</span>
                    <span>{safeString(sv)}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        return (
          <div key={k} className="flex items-start gap-1.5">
            <span className="text-xs font-medium text-muted-foreground capitalize shrink-0 min-w-[70px]">
              {formatLabel(k)}:
            </span>
            {editable ? (
              <Input
                value={safeString(v)}
                onChange={e => {
                  const next = [...allItems];
                  next[index] = { ...item, [k]: e.target.value };
                  update(basePath, next);
                }}
                className="text-xs h-auto py-0.5 flex-1"
              />
            ) : (
              <span className="text-sm">{safeString(v)}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
