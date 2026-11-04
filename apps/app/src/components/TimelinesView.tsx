import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  IconClock,
  IconPlus,
  IconCalendar,
  IconFileText,
  IconTrash,
  IconX,
  IconRefresh,
  IconArrowRight,
} from './icons';

export interface TimelineEventItem {
  id: string;
  title: string;
  description: string | null;
  dateText: string;
  sortOrder: number;
  cardId: string | null;
  card?: {
    id: string;
    title: string;
    slug: string;
    icon?: string | null;
    documentId: string;
    cardType?: { id: string; name: string; color?: string | null } | null;
  } | null;
  createdAt: string;
}

export interface TimelineItem {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sortOrder: number;
  _count?: { events: number };
  events?: TimelineEventItem[];
}

interface TimelinesViewProps {
  worldId: string;
  token: string;
  availableCards: Array<{ id: string; title: string; documentId: string }>;
  onNavigateToCard: (cardId: string, documentId: string) => void;
}

export const TimelinesView: React.FC<TimelinesViewProps> = ({
  worldId,
  token,
  availableCards,
  onNavigateToCard,
}) => {
  const [timelines, setTimelines] = useState<TimelineItem[]>([]);
  const [selectedTimelineId, setSelectedTimelineId] = useState<string | null>(null);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineItem | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [showCreateTimelineModal, setShowCreateTimelineModal] = useState(false);
  const [timelineName, setTimelineName] = useState('');
  const [timelineDescription, setTimelineDescription] = useState('');

  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [eventTitle, setEventTitle] = useState('');
  const [eventDateText, setEventDateText] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [eventCardId, setEventCardId] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Fetch all timelines in this world
  const fetchTimelines = async (autoSelectFirst = false) => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiFetch<TimelineItem[]>(`/worlds/${worldId}/timelines`, token);
      setTimelines(list);
      if (list.length > 0) {
        if (!selectedTimelineId || autoSelectFirst) {
          setSelectedTimelineId(list[0].id);
        }
      } else {
        setSelectedTimelineId(null);
        setSelectedTimeline(null);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao buscar linhas do tempo';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  // Fetch specific timeline with its events
  const fetchTimelineDetails = async (id: string) => {
    try {
      const details = await apiFetch<TimelineItem>(
        `/worlds/${worldId}/timelines/${id}`,
        token,
      );
      setSelectedTimeline(details);
    } catch (err: unknown) {
      console.error('Falha ao buscar detalhes da linha do tempo:', err);
    }
  };

  useEffect(() => {
    if (worldId && token) {
      fetchTimelines(true);
    }
  }, [worldId, token]);

  useEffect(() => {
    if (selectedTimelineId && worldId && token) {
      fetchTimelineDetails(selectedTimelineId);
    }
  }, [selectedTimelineId]);

  // Create timeline
  const handleCreateTimeline = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timelineName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const created = await apiFetch<TimelineItem>(`/worlds/${worldId}/timelines`, token, {
        method: 'POST',
        body: JSON.stringify({
          name: timelineName.trim(),
          description: timelineDescription.trim() || undefined,
        }),
      });
      setShowCreateTimelineModal(false);
      setTimelineName('');
      setTimelineDescription('');
      await fetchTimelines();
      setSelectedTimelineId(created.id);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete timeline
  const handleDeleteTimeline = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta linha do tempo e seus eventos?')) {
      return;
    }
    try {
      await apiFetch(`/worlds/${worldId}/timelines/${id}`, token, {
        method: 'DELETE',
      });
      await fetchTimelines(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Create event
  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTimelineId || !eventTitle.trim() || !eventDateText.trim() || isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    try {
      await apiFetch(
        `/worlds/${worldId}/timelines/${selectedTimelineId}/events`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({
            title: eventTitle.trim(),
            dateText: eventDateText.trim(),
            description: eventDescription.trim() || undefined,
            cardId: eventCardId || undefined,
          }),
        },
      );
      setShowCreateEventModal(false);
      setEventTitle('');
      setEventDateText('');
      setEventDescription('');
      setEventCardId('');
      await fetchTimelineDetails(selectedTimelineId);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete event
  const handleDeleteEvent = async (eventId: string) => {
    if (!selectedTimelineId) return;
    if (!window.confirm('Excluir este evento histórico da cronologia?')) return;

    try {
      await apiFetch(
        `/worlds/${worldId}/timelines/${selectedTimelineId}/events/${eventId}`,
        token,
        { method: 'DELETE' },
      );
      await fetchTimelineDetails(selectedTimelineId);
    } catch (err) {
      console.error(err);
    }
  };

  const events = selectedTimeline?.events || [];

  return (
    <div className="flex flex-col w-full rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] p-6 shadow-2xl">
      {/* ── Top Bar & Timeline Selector ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.06] mb-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <IconClock size={17} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
              Linhas do Tempo e Cronologias
            </h2>
            <p className="text-[11px] text-zinc-500">
              Acompanhe eras, eras históricas, batalhas e marcos temporais do seu mundo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => fetchTimelines()}
            title="Atualizar cronologias"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateTimelineModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-200 border border-amber-500/30 hover:bg-amber-500/25 transition-colors"
          >
            <IconPlus size={13} />
            <span>Nova Linha do Tempo</span>
          </button>
        </div>
      </div>

      {/* ── Timelines Tabs ─────────────────────────────────────────────────── */}
      {timelines.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 border-b border-white/[0.04]">
          {timelines.map((tl) => {
            const isSelected = tl.id === selectedTimelineId;
            return (
              <button
                key={tl.id}
                type="button"
                onClick={() => setSelectedTimelineId(tl.id)}
                className={[
                  'flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all select-none shrink-0',
                  isSelected
                    ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent',
                ].join(' ')}
              >
                <span>{tl.name}</span>
                {tl._count?.events !== undefined && (
                  <span className="text-[10px] font-mono px-1 rounded bg-black/30 text-zinc-400">
                    {tl._count.events}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty State: No Timelines ───────────────────────────────────────── */}
      {!loading && timelines.length === 0 && (
        <div className="py-16 text-center flex flex-col items-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-3">
            <IconCalendar size={22} />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            Nenhuma linha do tempo criada
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Estruture a história do seu mundo criando uma linha do tempo para registrar eras, dinastias e grandes acontecimentos.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateTimelineModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-500/20 text-amber-200 border border-amber-500/30 hover:bg-amber-500/30 transition-colors"
          >
            <IconPlus size={13} />
            <span>Criar Primeira Linha do Tempo</span>
          </button>
        </div>
      )}

      {/* ── Active Timeline Header & Events Stream ─────────────────────────── */}
      {selectedTimeline && (
        <div className="flex flex-col">
          <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] mb-6">
            <div className="flex flex-col">
              <h3 className="text-base font-semibold text-zinc-100">
                {selectedTimeline.name}
              </h3>
              {selectedTimeline.description && (
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedTimeline.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowCreateEventModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
              >
                <IconPlus size={13} />
                <span>Adicionar Evento</span>
              </button>
              <button
                type="button"
                title="Excluir esta linha do tempo"
                onClick={() => handleDeleteTimeline(selectedTimeline.id)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <IconTrash size={14} />
              </button>
            </div>
          </div>

          {/* Timeline Events Stream */}
          {events.length === 0 ? (
            <div className="py-12 text-center flex flex-col items-center border border-dashed border-white/10 rounded-xl">
              <p className="text-xs text-zinc-400">Esta linha do tempo ainda não possui eventos.</p>
              <button
                type="button"
                onClick={() => setShowCreateEventModal(true)}
                className="mt-3 text-xs text-amber-300 hover:underline"
              >
                + Registrar o primeiro evento histórico
              </button>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-amber-500/40 before:via-indigo-500/40 before:to-zinc-800 flex flex-col gap-6">
              {events.map((event) => (
                <div key={event.id} className="relative group">
                  {/* Timeline Node Orb */}
                  <span className="absolute -left-6 sm:-left-8 top-1.5 w-3 h-3 rounded-full bg-zinc-950 border-2 border-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.5)] group-hover:scale-125 transition-transform" />

                  {/* Event Card */}
                  <div className="flex flex-col p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex flex-col min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono tracking-wider font-semibold uppercase bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            {event.dateText}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-zinc-100 group-hover:text-amber-200 transition-colors">
                          {event.title}
                        </h4>
                      </div>

                      <button
                        type="button"
                        title="Excluir evento"
                        onClick={() => handleDeleteEvent(event.id)}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded text-zinc-500 hover:text-rose-400 transition-opacity"
                      >
                        <IconTrash size={13} />
                      </button>
                    </div>

                    {event.description && (
                      <p className="text-xs text-zinc-300 mt-2 leading-relaxed whitespace-pre-wrap font-serif">
                        {event.description}
                      </p>
                    )}

                    {/* Linked Card Badge */}
                    {event.card && (
                      <div className="mt-3 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                        <span className="text-[10px] font-mono uppercase text-zinc-500">
                          Lore Vinculada:
                        </span>
                        <button
                          type="button"
                          onClick={() => onNavigateToCard(event.card!.id, event.card!.documentId)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 hover:bg-indigo-500/20 text-xs font-medium transition-colors"
                        >
                          <IconFileText size={12} />
                          <span>{event.card.title}</span>
                          <IconArrowRight size={11} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Criar Linha do Tempo ────────────────────────────────────── */}
      {showCreateTimelineModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCreateTimelineModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-5 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">
                Nova Linha do Tempo
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateTimelineModal(false)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <IconX size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateTimeline} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  Nome da Linha do Tempo
                </label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="ex: História Antiga de Valíria, A Grande Cruzada"
                  value={timelineName}
                  onChange={(e) => setTimelineName(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  Descrição (opcional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Breve resumo da cronologia e contexto desta era…"
                  value={timelineDescription}
                  onChange={(e) => setTimelineDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateTimelineModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!timelineName.trim() || isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-amber-500 text-zinc-950 hover:bg-amber-400 font-semibold disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? 'Criando…' : 'Criar Linha do Tempo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Adicionar Evento ────────────────────────────────────────── */}
      {showCreateEventModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCreateEventModal(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-white/10 p-5 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">
                Novo Evento Histórico
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateEventModal(false)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <IconX size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateEvent} className="flex flex-col gap-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Data ou Época
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ex: Ano 142 da 2ª Era, Inverno de 1054"
                    value={eventDateText}
                    onChange={(e) => setEventDateText(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
                  />
                </div>

                <div>
                  <label className="block text-xs text-zinc-400 mb-1 font-medium">
                    Card Vinculado (opcional)
                  </label>
                  <select
                    value={eventCardId}
                    onChange={(e) => setEventCardId(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-white/10 text-zinc-200 focus:outline-none focus:border-amber-400/50"
                  >
                    <option value="">Nenhum card vinculado</option>
                    {availableCards.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  Título do Evento
                </label>
                <input
                  type="text"
                  required
                  placeholder="ex: A Batalha das Lágrimas, Coroação do Rei Elian"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50"
                />
              </div>

              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  Narrativa / Detalhes do Evento
                </label>
                <textarea
                  rows={4}
                  placeholder="Descreva as causas, desenrolar e consequências históricas deste marco…"
                  value={eventDescription}
                  onChange={(e) => setEventDescription(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-amber-400/50 resize-none font-serif text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateEventModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!eventTitle.trim() || !eventDateText.trim() || isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? 'Salvando…' : 'Registrar Evento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

