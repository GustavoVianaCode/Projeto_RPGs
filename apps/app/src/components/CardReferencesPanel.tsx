import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  IconLink,
  IconFileText,
  IconAlertTriangle,
  IconRefresh,
  IconArrowRight,
} from './icons';

export interface CardReferenceItem {
  id: string;
  title: string;
  slug: string;
  icon?: string | null;
  documentId: string;
  cardType?: { id: string; name: string; color?: string | null; icon?: string | null };
  folder?: { id: string; name: string } | null;
}

export interface MentionRef {
  mentionId: string;
  createdAt: string;
  contextText?: string | null;
  isBroken: boolean;
  card: CardReferenceItem | null;
}

export interface PropertyRef {
  propertyId: string;
  propertyName: string;
  propertySlug: string;
  sourceCard: CardReferenceItem;
}

export interface ReferencesResponse {
  card: { id: string; title: string; slug: string };
  incoming: MentionRef[];
  outgoing: MentionRef[];
  referencedByProperties: PropertyRef[];
}

interface CardReferencesPanelProps {
  worldId: string;
  cardId: string;
  token: string;
  onNavigateToCard: (cardId: string, documentId: string) => void;
}

export const CardReferencesPanel: React.FC<CardReferencesPanelProps> = ({
  worldId,
  cardId,
  token,
  onNavigateToCard,
}) => {
  const [data, setData] = useState<ReferencesResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReferences = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch<ReferencesResponse>(
        `/worlds/${worldId}/cards/${cardId}/references`,
        token,
      );
      setData(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao carregar referências';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (worldId && cardId && token) {
      fetchReferences();
    }
  }, [worldId, cardId, token]);

  const incomingTotal = data?.incoming.length ?? 0;
  const outgoingTotal = data?.outgoing.length ?? 0;
  const propsTotal = data?.referencedByProperties.length ?? 0;

  return (
    <div className="flex flex-col w-full rounded-xl bg-[#0e0e12] border border-white/[0.06] p-6 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.05] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-300">
            <IconLink size={16} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Referências Cruzadas
            </h2>
            <p className="text-[11px] text-zinc-500 font-mono">
              Rede de vínculos e menções bidirecionais deste card
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchReferences}
          title="Recarregar referências"
          aria-label="Atualizar referências do card"
          className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
        >
          <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs font-mono">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
          <span>Mapeando referências cruzadas…</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          {error}
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Incoming Mentions ("Citado por") */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
                Citado por ({incomingTotal})
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Backlinks</span>
            </div>

            {incomingTotal === 0 ? (
              <div className="p-4 rounded-lg border border-white/[0.04] bg-white/[0.01] text-center text-xs text-zinc-500">
                Nenhum outro card cita este documento ainda.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.incoming.map((m) => {
                  if (m.isBroken || !m.card) {
                    return (
                      <div
                        key={m.mentionId}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.03] text-xs"
                      >
                        <div className="flex items-center gap-2 text-rose-300">
                          <IconAlertTriangle size={13} className="shrink-0" />
                          <span className="line-through text-zinc-400">Card de origem excluído</span>
                        </div>
                        <span className="text-[10px] font-mono text-rose-400/80">quebrado</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={m.mentionId}
                      type="button"
                      onClick={() => onNavigateToCard(m.card!.id, m.card!.documentId)}
                      className="group flex items-center justify-between p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <IconFileText size={14} className="text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                            {m.card.title}
                          </span>
                          {m.card.folder && (
                            <span className="text-[10px] text-zinc-500 truncate font-mono">
                              Pasta: {m.card.folder.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {m.card.cardType && (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-zinc-500 border border-white/5">
                            {m.card.cardType.name}
                          </span>
                        )}
                        <IconArrowRight
                          size={12}
                          className="text-zinc-500 group-hover:text-zinc-300 transition-colors"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Referenced by Properties */}
            {propsTotal > 0 && (
              <div className="mt-4 flex flex-col gap-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 font-mono">
                  Propriedades de Relacionamento ({propsTotal})
                </span>
                {data.referencedByProperties.map((p) => (
                  <button
                    key={`${p.sourceCard.id}:${p.propertyId}`}
                    type="button"
                    onClick={() => onNavigateToCard(p.sourceCard.id, p.sourceCard.documentId)}
                    className="group flex items-center justify-between p-2 rounded-lg border border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] text-left text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                  >
                    <span className="text-zinc-300 group-hover:text-white truncate">
                      {p.sourceCard.title}
                    </span>
                    <span className="text-[10px] font-mono text-zinc-500 bg-white/[0.03] px-1.5 py-0.5 rounded">
                      via {p.propertyName}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Outgoing Mentions ("Citações feitas neste card") */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5 font-mono">
                Citações deste Card ({outgoingTotal})
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Links Diretos</span>
            </div>

            {outgoingTotal === 0 ? (
              <div className="p-4 rounded-lg border border-white/[0.04] bg-white/[0.01] text-center text-xs text-zinc-500">
                Você ainda não mencionou nenhum outro card no texto. Use @ no editor para citar personagens, locais ou eventos.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {data.outgoing.map((m) => {
                  if (m.isBroken || !m.card) {
                    return (
                      <div
                        key={m.mentionId}
                        className="flex items-center justify-between p-2.5 rounded-lg border border-rose-500/20 bg-rose-500/[0.03] text-xs"
                      >
                        <div className="flex items-center gap-2 text-rose-300">
                          <IconAlertTriangle size={13} className="shrink-0" />
                          <span className="line-through text-zinc-400">Card de destino removido</span>
                        </div>
                        <span className="text-[10px] font-mono text-rose-400/80">link quebrado</span>
                      </div>
                    );
                  }

                  return (
                    <button
                      key={m.mentionId}
                      type="button"
                      onClick={() => onNavigateToCard(m.card!.id, m.card!.documentId)}
                      className="group flex items-center justify-between p-2.5 rounded-lg border border-white/[0.05] bg-white/[0.015] hover:bg-white/[0.04] hover:border-white/[0.08] transition-colors text-left focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <IconFileText size={14} className="text-zinc-500 group-hover:text-zinc-300 shrink-0" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-medium text-zinc-200 group-hover:text-white truncate">
                            {m.card.title}
                          </span>
                          {m.card.folder && (
                            <span className="text-[10px] text-zinc-500 truncate font-mono">
                              Pasta: {m.card.folder.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {m.card.cardType && (
                          <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-white/[0.03] text-zinc-500 border border-white/5">
                            {m.card.cardType.name}
                          </span>
                        )}
                        <IconArrowRight
                          size={12}
                          className="text-zinc-500 group-hover:text-zinc-300 transition-colors"
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
