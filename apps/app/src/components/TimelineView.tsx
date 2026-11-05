import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import {
  useTimelines,
  useTimeline,
  TimelineDetail,
  TimelineEventItem,
} from '../hooks/useTimelines';
import { useFolders } from '../hooks/useSidebarTree';
import { apiFetch } from '../lib/api';
import {
  IconClock,
  IconCalendar,
  IconPlus,
  IconTrash,
  IconFileText,
  IconArrowRight,
  IconX,
  IconRefresh,
  IconFolder,
} from './icons';

export interface TimelineViewProps {
  worldId: string;
  token: string;
  initialTimelineId?: string | null;
  availableCards: Array<{ id: string; title: string; documentId: string }>;
  onNavigateToCard: (cardId: string, documentId: string) => void;
  onTimelineSelect?: (timelineId: string) => void;
}

interface CardLinkDraft {
  cardId: string;
  role: string;
  title: string;
}

const COMMON_ROLES = [
  'Protagonista',
  'Local do Ocorrido',
  'Facção',
  'Artefato',
  'Testemunha',
  'Causa Principal',
];

// ─── Memoized Single Event Card ───────────────────────────────────────────────
interface TimelineEventRowProps {
  event: TimelineEventItem;
  onNavigateToCard: (cardId: string, documentId: string) => void;
  onDeleteEvent: (eventId: string, title: string) => void;
  onOpenQuickLink: (eventId: string) => void;
  onRemoveEventCard: (eventId: string, cardId: string, cardTitle: string) => void;
}

const TimelineEventRow = memo<TimelineEventRowProps>(({
  event,
  onNavigateToCard,
  onDeleteEvent,
  onOpenQuickLink,
  onRemoveEventCard,
}) => {
  const linkedCards = useMemo(() => {
    if (event.eventCards && event.eventCards.length > 0) return event.eventCards;
    if (event.card) {
      return [
        {
          id: `legacy-${event.card.id}`,
          cardId: event.card.id,
          role: null,
          card: event.card,
        },
      ];
    }
    return [];
  }, [event.eventCards, event.card]);

  return (
    <div className="relative group">
      {/* Sleek Timeline Spine Marker */}
      <span
        aria-hidden="true"
        className="absolute -left-[37px] sm:-left-[45px] top-4 w-3.5 h-3.5 rounded-full bg-[#09090b] border-2 border-indigo-400 group-hover:scale-125 group-hover:border-indigo-300 group-hover:shadow-[0_0_12px_rgba(129,140,248,0.5)] transition-all duration-200 z-10"
      />

      {/* Event Container Card */}
      <div className="flex flex-col p-5 rounded-xl bg-zinc-900/30 border border-white/[0.06] hover:border-white/[0.12] hover:bg-zinc-900/50 transition-all duration-150 shadow-[0_2px_12px_rgba(0,0,0,0.3)]">
        {/* Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-col min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-medium uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                {event.dateText}
              </span>
            </div>
            <h4 className="text-base font-semibold text-zinc-100 group-hover:text-white transition-colors tracking-tight font-sans">
              {event.title}
            </h4>
          </div>

          {/* Delete Action */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <button
              type="button"
              title={`Excluir evento "${event.title}"`}
              aria-label={`Excluir evento "${event.title}"`}
              onClick={() => onDeleteEvent(event.id, event.title)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
            >
              <IconTrash size={14} />
            </button>
          </div>
        </div>

        {/* Narrative / Description */}
        {event.description && (
          <p className="text-xs sm:text-sm text-zinc-300 font-serif mt-2.5 leading-relaxed whitespace-pre-wrap">
            {event.description}
          </p>
        )}

        {/* Linked Cards Section */}
        <div className="mt-4 pt-3 border-t border-white/[0.04] flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider mr-1">
            Cards Vinculados:
          </span>

          {linkedCards.map((link) => (
            <div
              key={link.id}
              className="group/badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/[0.02] text-zinc-200 border border-white/[0.06] hover:bg-white/[0.06] hover:border-white/[0.12] transition-all duration-140"
            >
              <button
                type="button"
                onClick={() => onNavigateToCard(link.card.id, link.card.documentId)}
                className="inline-flex items-center gap-1.5 text-xs focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 rounded"
                title={`Navegar para o card "${link.card.title}"`}
              >
                <IconFileText
                  size={12}
                  className="text-zinc-500 group-hover/badge:text-indigo-400 transition-colors"
                />
                {link.role && (
                  <span className="text-[10px] font-mono uppercase text-indigo-300 tracking-wider">
                    [{link.role}]
                  </span>
                )}
                <span className="font-medium font-sans">{link.card.title}</span>
                <IconArrowRight
                  size={10}
                  className="text-zinc-500 group-hover/badge:text-zinc-300 transition-colors opacity-70 group-hover/badge:opacity-100"
                />
              </button>

              {/* Unlink */}
              <button
                type="button"
                onClick={() => onRemoveEventCard(event.id, link.cardId, link.card.title)}
                title={`Desvincular "${link.card.title}"`}
                aria-label={`Desvincular "${link.card.title}" deste evento`}
                className="p-0.5 rounded text-zinc-600 hover:text-rose-400 hover:bg-rose-500/15 transition-colors ml-0.5 opacity-60 group-hover/badge:opacity-100"
              >
                <IconX size={11} />
              </button>
            </div>
          ))}

          {/* Quick Link Button */}
          <button
            type="button"
            onClick={() => onOpenQuickLink(event.id)}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium text-zinc-500 hover:text-zinc-200 bg-white/[0.015] hover:bg-white/[0.05] border border-dashed border-white/[0.08] hover:border-white/[0.15] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconPlus size={11} />
            <span>Vincular Card</span>
          </button>
        </div>
      </div>
    </div>
  );
});
TimelineEventRow.displayName = 'TimelineEventRow';

// ─── Extracted Create Event Modal ─────────────────────────────────────────────
interface CreateEventModalProps {
  timelineName: string;
  availableCards: Array<{ id: string; title: string; documentId: string }>;
  onClose: () => void;
  onSubmit: (data: {
    title: string;
    dateText: string;
    description?: string;
    cards: Array<{ cardId: string; role?: string }>;
  }) => Promise<void>;
}

const CreateEventModal: React.FC<CreateEventModalProps> = ({
  timelineName,
  availableCards,
  onClose,
  onSubmit,
}) => {
  const [eventDateText, setEventDateText] = useState('');
  const [eventTitle, setEventTitle] = useState('');
  const [eventDescription, setEventDescription] = useState('');
  const [cardsToLink, setCardsToLink] = useState<CardLinkDraft[]>([]);
  const [selectedCardId, setSelectedCardId] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [eventError, setEventError] = useState<string | null>(null);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleAddDraftCard = () => {
    if (!selectedCardId) return;
    const foundCard = availableCards.find((c) => c.id === selectedCardId);
    if (!foundCard) return;
    if (cardsToLink.some((c) => c.cardId === selectedCardId)) return;

    setCardsToLink((prev) => [
      ...prev,
      {
        cardId: selectedCardId,
        role: selectedRole.trim(),
        title: foundCard.title,
      },
    ]);
    setSelectedCardId('');
    setSelectedRole('');
  };

  const handleRemoveDraftCard = (cardId: string) => {
    setCardsToLink((prev) => prev.filter((c) => c.cardId !== cardId));
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventTitle.trim() || !eventDateText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setEventError(null);
    try {
      await onSubmit({
        title: eventTitle.trim(),
        dateText: eventDateText.trim(),
        description: eventDescription.trim() || undefined,
        cards: cardsToLink.map((c) => ({
          cardId: c.cardId,
          role: c.role || undefined,
        })),
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao registrar evento histórico';
      setEventError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-xl bg-[#111115] border border-white/10 p-6 shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <IconCalendar size={14} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-100">
                Novo Evento Histórico
              </h3>
              <p className="text-[11px] text-zinc-500 font-mono">
                Linha: {timelineName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconX size={15} />
          </button>
        </div>

        {eventError && (
          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs mb-4">
            {eventError}
          </div>
        )}

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-zinc-400 mb-1 font-medium">
                Data ou Época Histórica *
              </label>
              <input
                type="text"
                required
                autoFocus
                placeholder="ex: Ano 142 da 2ª Era, Inverno de 1054"
                value={eventDateText}
                onChange={(e) => setEventDateText(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-400 mb-1 font-medium">
                Título do Evento *
              </label>
              <input
                type="text"
                required
                placeholder="ex: A Queda de Gondolin, A Batalha das Lágrimas"
                value={eventTitle}
                onChange={(e) => setEventTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1 font-medium">
              Narrativa / Resumo Histórico
            </label>
            <textarea
              rows={4}
              placeholder="Descreva as causas, desenrolar, personagens envolvidos e consequências deste acontecimento…"
              value={eventDescription}
              onChange={(e) => setEventDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50 resize-none font-serif text-sm"
            />
          </div>

          {/* Multi-Card Selection with Roles */}
          <div className="rounded-xl bg-white/[0.02] border border-white/[0.06] p-3.5 flex flex-col gap-3">
            <span className="text-xs font-medium text-zinc-300">
              Vincular Cards Existentes (Personagens, Locais, Facções, Itens)
            </span>

            {cardsToLink.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pb-2 border-b border-white/[0.04]">
                {cardsToLink.map((item) => (
                  <span
                    key={item.cardId}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs bg-white/[0.04] border border-white/[0.08] text-zinc-200"
                  >
                    <IconFileText size={11} className="text-indigo-400" />
                    {item.role && (
                      <span className="text-[10px] font-mono uppercase text-indigo-300">
                        [{item.role}]
                      </span>
                    )}
                    <span>{item.title}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveDraftCard(item.cardId)}
                      aria-label={`Remover ${item.title}`}
                      className="p-0.5 rounded text-zinc-400 hover:text-rose-300 transition-colors ml-0.5"
                    >
                      <IconX size={11} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">
                  Selecionar Card
                </label>
                <select
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 focus:outline-none focus:border-indigo-400/50"
                >
                  <option value="">Escolha um card…</option>
                  {availableCards
                    .filter((c) => !cardsToLink.some((linked) => linked.cardId === c.id))
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.title}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-zinc-500 mb-1">
                  Papel no Evento (opcional)
                </label>
                <input
                  type="text"
                  placeholder="ex: Protagonista, Local, Artefato"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-zinc-500 font-mono">Sugestões:</span>
                {COMMON_ROLES.slice(0, 4).map((role) => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setSelectedRole(role)}
                    className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] border border-white/[0.06] transition-colors"
                  >
                    {role}
                  </button>
                ))}
              </div>

              <button
                type="button"
                disabled={!selectedCardId}
                onClick={handleAddDraftCard}
                className="inline-flex items-center gap-1 px-3 py-1 rounded-md text-xs font-medium bg-white/[0.06] text-zinc-200 border border-white/[0.08] hover:bg-white/[0.1] disabled:opacity-40 transition-colors"
              >
                <IconPlus size={11} />
                <span>Adicionar à lista</span>
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!eventTitle.trim() || !eventDateText.trim() || isSubmitting}
              className="px-4 py-2 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors shadow-[0_0_15px_rgba(99,102,241,0.25)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              {isSubmitting ? 'Registrando…' : 'Registrar Evento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Extracted Quick Link Modal ───────────────────────────────────────────────
interface QuickLinkModalProps {
  availableCards: Array<{ id: string; title: string; documentId: string }>;
  onClose: () => void;
  onSubmit: (cardId: string, role?: string) => Promise<void>;
}

const QuickLinkModal: React.FC<QuickLinkModalProps> = ({
  availableCards,
  onClose,
  onSubmit,
}) => {
  const [quickCardId, setQuickCardId] = useState('');
  const [quickRole, setQuickRole] = useState('');
  const [isLinking, setIsLinking] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickCardId || isLinking) return;

    setIsLinking(true);
    try {
      await onSubmit(quickCardId, quickRole.trim() || undefined);
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsLinking(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-[#111115] border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-3">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <IconFileText size={14} className="text-indigo-400" />
            <span>Vincular Card ao Evento</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-zinc-200"
          >
            <IconX size={14} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Card para Vincular *
            </label>
            <select
              required
              autoFocus
              value={quickCardId}
              onChange={(e) => setQuickCardId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 focus:outline-none focus:border-indigo-400/50"
            >
              <option value="">Selecione um card…</option>
              {availableCards.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">
              Papel no Evento (opcional)
            </label>
            <input
              type="text"
              placeholder="ex: Protagonista, Local do Ocorrido, Facção"
              value={quickRole}
              onChange={(e) => setQuickRole(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50"
            />
          </div>

          <div className="flex flex-wrap gap-1">
            {COMMON_ROLES.map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setQuickRole(role)}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-white/[0.04] text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.08] transition-colors"
              >
                {role}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!quickCardId || isLinking}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors"
            >
              {isLinking ? 'Vinculando…' : 'Vincular Card'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Extracted Create Timeline Modal ──────────────────────────────────────────
interface CreateTimelineModalProps {
  folders?: Array<{ id: string; name: string }>;
  onClose: () => void;
  onSubmit: (name: string, description?: string, folderId?: string) => Promise<void>;
}

const CreateTimelineModal: React.FC<CreateTimelineModalProps> = ({
  folders,
  onClose,
  onSubmit,
}) => {
  const [newTimelineName, setNewTimelineName] = useState('');
  const [newTimelineDescription, setNewTimelineDescription] = useState('');
  const [newTimelineFolderId, setNewTimelineFolderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTimelineName.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await onSubmit(
        newTimelineName.trim(),
        newTimelineDescription.trim() || undefined,
        newTimelineFolderId || undefined,
      );
      onClose();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-[#111115] border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] mb-4">
          <h3 className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
            <IconClock size={15} className="text-amber-400" />
            <span>Nova Linha do Tempo</span>
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconX size={14} />
          </button>
        </div>

        <form onSubmit={handleFormSubmit} className="flex flex-col gap-3">
          <div>
            <label className="block text-xs text-zinc-400 mb-1 font-medium">
              Nome da Linha do Tempo *
            </label>
            <input
              type="text"
              autoFocus
              required
              placeholder="ex: Primeira Era dos Homens, Guerra Civil de Arkhan"
              value={newTimelineName}
              onChange={(e) => setNewTimelineName(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1 font-medium">
              Pasta Arquivística (opcional)
            </label>
            <select
              value={newTimelineFolderId}
              onChange={(e) => setNewTimelineFolderId(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 focus:outline-none focus:border-indigo-400/50"
            >
              <option value="">Raiz do Mundo (sem pasta)</option>
              {folders?.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1 font-medium">
              Descrição (opcional)
            </label>
            <textarea
              rows={3}
              placeholder="Breve resumo da cronologia e contexto histórico…"
              value={newTimelineDescription}
              onChange={(e) => setNewTimelineDescription(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50 resize-none font-serif text-sm"
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-2 pt-3 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!newTimelineName.trim() || isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white disabled:opacity-40 transition-colors shadow-[0_0_12px_rgba(99,102,241,0.2)]"
            >
              {isSubmitting ? 'Criando…' : 'Criar Linha do Tempo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Main TimelineView Component ─────────────────────────────────────────────
export const TimelineView: React.FC<TimelineViewProps> = ({
  worldId,
  token,
  initialTimelineId,
  availableCards,
  onNavigateToCard,
  onTimelineSelect,
}) => {
  // SWR: list of all timelines in this world
  const {
    data: timelinesList,
    mutate: mutateTimelinesList,
    isValidating: isValidatingList,
  } = useTimelines(worldId, token);

  // Active timeline selection
  const [activeId, setActiveId] = useState<string | null>(initialTimelineId ?? null);

  // Sync when initialTimelineId changes from parent
  useEffect(() => {
    if (initialTimelineId) {
      setActiveId(initialTimelineId);
    }
  }, [initialTimelineId]);

  // Auto-select first timeline if none is selected
  useEffect(() => {
    if (!activeId && timelinesList && timelinesList.length > 0) {
      const firstId = timelinesList[0].id;
      setActiveId(firstId);
      onTimelineSelect?.(firstId);
    }
  }, [activeId, timelinesList, onTimelineSelect]);

  // SWR: details for currently selected timeline
  const {
    data: timeline,
    mutate: mutateTimeline,
    isValidating: isValidatingDetail,
  } = useTimeline(worldId, activeId, token);

  // SWR: folders for folder assignment during timeline creation
  const { data: folders } = useFolders(worldId, token);

  // Modal Visibility states
  const [showCreateEventModal, setShowCreateEventModal] = useState(false);
  const [showCreateTimelineModal, setShowCreateTimelineModal] = useState(false);
  const [linkingEventId, setLinkingEventId] = useState<string | null>(null);

  // Change selected timeline
  const handleSelectTimeline = useCallback((id: string) => {
    setActiveId(id);
    onTimelineSelect?.(id);
  }, [onTimelineSelect]);

  // Submit Create Event
  const handleCreateEvent = useCallback(async (data: {
    title: string;
    dateText: string;
    description?: string;
    cards: Array<{ cardId: string; role?: string }>;
  }) => {
    if (!activeId) return;
    await apiFetch<TimelineEventItem>(
      `/worlds/${worldId}/timelines/${activeId}/events`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(data),
      },
    );
    await Promise.all([mutateTimeline(), mutateTimelinesList()]);
  }, [activeId, worldId, token, mutateTimeline, mutateTimelinesList]);

  // Delete event
  const handleDeleteEvent = useCallback(async (eventId: string, title: string) => {
    if (!activeId) return;
    if (!window.confirm(`Excluir o evento "${title}" da linha do tempo?`)) return;

    try {
      await apiFetch(
        `/worlds/${worldId}/timelines/${activeId}/events/${eventId}`,
        token,
        { method: 'DELETE' },
      );
      await Promise.all([mutateTimeline(), mutateTimelinesList()]);
    } catch (err) {
      console.error('Falha ao remover evento:', err);
    }
  }, [activeId, worldId, token, mutateTimeline, mutateTimelinesList]);

  // Add card to existing event
  const handleQuickLinkCard = useCallback(async (cardId: string, role?: string) => {
    if (!activeId || !linkingEventId) return;

    await apiFetch(
      `/worlds/${worldId}/timelines/${activeId}/events/${linkingEventId}/cards`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ cardId, role }),
      },
    );
    await mutateTimeline();
  }, [activeId, linkingEventId, worldId, token, mutateTimeline]);

  // Remove linked card from existing event
  const handleRemoveEventCard = useCallback(async (
    eventId: string,
    cardId: string,
    cardTitle: string,
  ) => {
    if (!activeId) return;
    if (!window.confirm(`Desvincular o card "${cardTitle}" deste evento?`)) return;

    try {
      await apiFetch(
        `/worlds/${worldId}/timelines/${activeId}/events/${eventId}/cards/${cardId}`,
        token,
        { method: 'DELETE' },
      );
      await mutateTimeline();
    } catch (err) {
      console.error('Falha ao desvincular card:', err);
    }
  }, [activeId, worldId, token, mutateTimeline]);

  // Submit Create Timeline
  const handleCreateTimeline = useCallback(async (
    name: string,
    description?: string,
    folderId?: string,
  ) => {
    const created = await apiFetch<TimelineDetail>(
      `/worlds/${worldId}/timelines`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ name, description, folderId }),
      },
    );

    await mutateTimelinesList();
    setActiveId(created.id);
    onTimelineSelect?.(created.id);
  }, [worldId, token, mutateTimelinesList, onTimelineSelect]);

  // Delete timeline
  const handleDeleteTimeline = useCallback(async (timelineId: string, name: string) => {
    if (!window.confirm(`Tem certeza que deseja excluir a linha do tempo "${name}" e todos os seus eventos?`)) {
      return;
    }

    try {
      await apiFetch(`/worlds/${worldId}/timelines/${timelineId}`, token, {
        method: 'DELETE',
      });
      const updated = await mutateTimelinesList();
      if (updated && updated.length > 0) {
        setActiveId(updated[0].id);
        onTimelineSelect?.(updated[0].id);
      } else {
        setActiveId(null);
      }
    } catch (err) {
      console.error('Falha ao excluir linha do tempo:', err);
    }
  }, [worldId, token, mutateTimelinesList, onTimelineSelect]);

  const events = useMemo(() => timeline?.events || [], [timeline?.events]);
  const isRefreshing = isValidatingList || isValidatingDetail;

  return (
    <div className="flex flex-col w-full rounded-xl bg-[#0e0e12] border border-white/[0.06] p-5 sm:p-8 shadow-[0_4px_24px_rgba(0,0,0,0.5)] min-h-[calc(100vh-140px)]">
      {/* ── Top Bar ───────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.05]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
            <IconClock size={16} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-sm sm:text-base font-semibold text-zinc-100 font-sans tracking-tight truncate">
                Linhas do Tempo & Cronologias
              </h2>
              {timeline?.folder && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-zinc-400 bg-white/[0.03] border border-white/[0.06]">
                  <IconFolder size={11} className="text-zinc-500" />
                  <span>{timeline.folder.name}</span>
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-500 font-mono tracking-tight mt-0.5">
              Marcos temporais, eras míticas e acontecimentos históricos do mundo
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <button
            type="button"
            onClick={() => {
              mutateTimelinesList();
              if (activeId) mutateTimeline();
            }}
            title="Atualizar cronologias"
            aria-label="Atualizar cronologias"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconRefresh size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </button>

          <button
            type="button"
            onClick={() => setShowCreateTimelineModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconPlus size={13} />
            <span className="hidden sm:inline">Nova Linha do Tempo</span>
            <span className="sm:hidden">Nova Linha</span>
          </button>

          {activeId && (
            <button
              type="button"
              onClick={() => setShowCreateEventModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-500 text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              <IconPlus size={13} />
              <span>Novo Evento</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Timelines Horizontal Switcher ───────────────────────────────────── */}
      {timelinesList && timelinesList.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto py-3 border-b border-white/[0.04] scrollbar-none">
          {timelinesList.map((tl) => {
            const isSelected = tl.id === activeId;
            return (
              <button
                key={tl.id}
                type="button"
                onClick={() => handleSelectTimeline(tl.id)}
                className={[
                  'group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
                  isSelected
                    ? 'bg-amber-500/15 text-zinc-100 border border-amber-500/30'
                    : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent',
                ].join(' ')}
              >
                <IconClock
                  size={12}
                  className={isSelected ? 'text-amber-400' : 'text-zinc-500 group-hover:text-zinc-400'}
                />
                <span className="font-sans">{tl.name}</span>
                {tl._count?.events !== undefined && (
                  <span
                    className={[
                      'text-[10px] font-mono px-1.5 py-0.2 rounded',
                      isSelected
                        ? 'bg-amber-500/25 text-amber-200 font-semibold'
                        : 'bg-white/[0.04] text-zinc-500',
                    ].join(' ')}
                  >
                    {tl._count.events}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Empty State: Zero Timelines in World ────────────────────────────── */}
      {(!timelinesList || timelinesList.length === 0) && !isValidatingList && (
        <div className="py-20 text-center flex flex-col items-center justify-center my-auto">
          <div className="w-11 h-11 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-zinc-500 mb-3.5">
            <IconCalendar size={22} />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            Nenhuma linha do tempo registrada
          </h3>
          <p className="text-xs text-zinc-400 mt-1 max-w-md leading-relaxed font-serif">
            Estruture a história do seu mundo criando cronologias para grandes eras, dinastias,
            guerras ou marcos épicos.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateTimelineModal(true)}
            className="mt-4 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-white/[0.06] hover:bg-white/[0.1] text-zinc-200 border border-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconPlus size={13} />
            <span>Criar Primeira Linha do Tempo</span>
          </button>
        </div>
      )}

      {/* ── Active Timeline Header & Feed ──────────────────────────────────── */}
      {timeline && (
        <div className="flex flex-col mt-4">
          {/* Timeline Details Bar */}
          <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-white/[0.015] border border-white/[0.04] mb-6">
            <div className="flex flex-col min-w-0 pr-4">
              <h3 className="text-sm sm:text-base font-semibold text-zinc-100 truncate font-sans">
                {timeline.name}
              </h3>
              {timeline.description && (
                <p className="text-xs sm:text-sm text-zinc-300 font-serif mt-1 leading-relaxed max-w-2xl">
                  {timeline.description}
                </p>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setShowCreateEventModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-zinc-200 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                <IconPlus size={12} />
                <span>Adicionar Evento</span>
              </button>
              <button
                type="button"
                title="Excluir esta linha do tempo"
                aria-label="Excluir esta linha do tempo"
                onClick={() => handleDeleteTimeline(timeline.id, timeline.name)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
              >
                <IconTrash size={14} />
              </button>
            </div>
          </div>

          {/* Timeline Events Feed */}
          {events.length === 0 ? (
            <div className="py-16 text-center flex flex-col items-center justify-center border border-dashed border-white/[0.08] rounded-xl bg-white/[0.01]">
              <div className="w-9 h-9 rounded-xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-zinc-500 mb-2">
                <IconClock size={18} />
              </div>
              <p className="text-xs font-medium text-zinc-300">
                Esta linha do tempo ainda não possui eventos registrados.
              </p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Comece definindo o primeiro acontecimento cronológico.
              </p>
              <button
                type="button"
                onClick={() => setShowCreateEventModal(true)}
                className="mt-3.5 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-zinc-200 border border-white/[0.08] hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                <IconPlus size={13} />
                <span>Registrar Primeiro Evento</span>
              </button>
            </div>
          ) : (
            <div className="relative pl-8 sm:pl-10 border-l border-white/[0.08] ml-4 sm:ml-6 flex flex-col gap-6 my-2">
              {events.map((event) => (
                <TimelineEventRow
                  key={event.id}
                  event={event}
                  onNavigateToCard={onNavigateToCard}
                  onDeleteEvent={handleDeleteEvent}
                  onOpenQuickLink={(id) => setLinkingEventId(id)}
                  onRemoveEventCard={handleRemoveEventCard}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Modal: Novo Evento ─────────────────────────────────────────────── */}
      {showCreateEventModal && timeline && (
        <CreateEventModal
          timelineName={timeline.name}
          availableCards={availableCards}
          onClose={() => setShowCreateEventModal(false)}
          onSubmit={handleCreateEvent}
        />
      )}

      {/* ── Modal: Vincular Card Rápido ────────────────────────────────────── */}
      {linkingEventId && (
        <QuickLinkModal
          availableCards={availableCards}
          onClose={() => setLinkingEventId(null)}
          onSubmit={handleQuickLinkCard}
        />
      )}

      {/* ── Modal: Nova Linha do Tempo ──────────────────────────────────────── */}
      {showCreateTimelineModal && (
        <CreateTimelineModal
          folders={folders}
          onClose={() => setShowCreateTimelineModal(false)}
          onSubmit={handleCreateTimeline}
        />
      )}
    </div>
  );
};
