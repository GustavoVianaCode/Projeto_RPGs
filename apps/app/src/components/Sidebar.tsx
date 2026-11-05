import React, { useState, useCallback, memo } from 'react';
import {
  useSidebarTree,
  FolderNode,
  CardItem,
  TimelineSummary,
} from '../hooks/useSidebarTree';
import { apiFetch } from '../lib/api';
import {
  IconFolder,
  IconFolderOpen,
  IconFolderPlus,
  IconFileText,
  IconFilePlus,
  IconChevronRight,
  IconPlus,
  IconX,
  IconClock,
} from './icons';

interface SidebarProps {
  worldId: string | null;
  token: string | null;
  activeCardId?: string | null;
  activeTimelineId?: string | null;
  onCardSelect: (cardId: string, documentId: string) => void;
  onTimelineSelect?: (timelineId: string) => void;
}

// ─── Memoized Timeline Row ───────────────────────────────────────────────────
const TimelineRow = memo<{
  timeline: TimelineSummary;
  level: number;
  activeTimelineId?: string | null;
  onSelect?: (timelineId: string) => void;
}>(({ timeline, level, activeTimelineId, onSelect }) => {
  const isActive = activeTimelineId === timeline.id;

  return (
    <div
      className={[
        'group relative flex items-center justify-between gap-1.5 w-full rounded-md text-xs transition-colors duration-150 py-1.5 pr-2',
        isActive
          ? 'bg-amber-500/10 text-zinc-100 font-medium border-l-2 border-amber-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.03)]'
          : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]',
      ].join(' ')}
      style={{ paddingLeft: `calc(0.5rem + 0.85rem * ${level})` }}
    >
      <button
        type="button"
        onClick={() => onSelect?.(timeline.id)}
        className="flex items-center gap-2 flex-1 min-w-0 text-left outline-none focus-visible:ring-1 focus-visible:ring-amber-400/50 rounded py-0.5"
      >
        <span className="shrink-0 text-amber-400/80 group-hover:text-amber-300 transition-colors">
          <IconClock size={13} className={isActive ? 'text-amber-300' : ''} />
        </span>
        <span className="truncate tracking-tight font-sans">{timeline.name}</span>
      </button>

      {timeline._count?.events !== undefined && timeline._count.events > 0 && (
        <span className="text-[10px] font-mono text-zinc-500 px-1.5 py-0.2 rounded bg-white/[0.04] border border-white/[0.05]">
          {timeline._count.events}
        </span>
      )}
    </div>
  );
});
TimelineRow.displayName = 'TimelineRow';

// ─── Memoized Card Row (supports recursive subcards) ─────────────────────────
const CardRow = memo<{
  card: CardItem;
  level: number;
  activeCardId?: string | null;
  onSelect: (cardId: string, documentId: string) => void;
}>(({ card, level, activeCardId, onSelect }) => {
  const [openChildren, setOpenChildren] = useState(true);
  const isActive = activeCardId === card.id;
  const hasChildren = Boolean(card.children && card.children.length > 0);

  return (
    <div className="flex flex-col">
      <div
        className={[
          'group relative flex items-center gap-1.5 w-full rounded-md text-xs transition-colors duration-150 py-1.5 pr-2',
          isActive
            ? 'bg-white/[0.08] text-zinc-100 font-medium border-l-2 border-indigo-400 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]'
            : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04]',
        ].join(' ')}
        style={{ paddingLeft: `calc(0.5rem + 0.85rem * ${level})` }}
      >
        {hasChildren ? (
          <button
            type="button"
            aria-label={openChildren ? 'Recolher subcards' : 'Expandir subcards'}
            onClick={(e) => {
              e.stopPropagation();
              setOpenChildren((prev) => !prev);
            }}
            className="p-0.5 rounded text-zinc-500 hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/50"
          >
            <IconChevronRight
              size={12}
              className={`transition-transform duration-150 ${openChildren ? 'rotate-90 text-zinc-400' : ''}`}
            />
          </button>
        ) : (
          <span className="w-3 shrink-0" />
        )}

        <button
          type="button"
          onClick={() => onSelect(card.id, card.documentId)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/50 rounded py-0.5"
        >
          <span className="shrink-0 text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <IconFileText size={13} className={isActive ? 'text-indigo-400' : ''} />
          </span>
          <span className="truncate tracking-tight font-sans">{card.title}</span>
        </button>

        {card.cardType && (
          <span className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity text-[9px] uppercase font-mono tracking-wider text-zinc-500 px-1.5 py-0.5 rounded bg-white/[0.04] border border-white/[0.05]">
            {card.cardType.name}
          </span>
        )}
      </div>

      {hasChildren && openChildren && (
        <div className="flex flex-col border-l border-white/[0.06] ml-3.5 my-0.5">
          {card.children?.map((child) => (
            <CardRow
              key={child.id}
              card={child}
              level={level + 1}
              activeCardId={activeCardId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});
CardRow.displayName = 'CardRow';

// ─── Memoized Folder Row (recursive) ─────────────────────────────────────────
const FolderRow = memo<{
  node: FolderNode;
  level: number;
  activeCardId?: string | null;
  activeTimelineId?: string | null;
  onSelect: (cardId: string, documentId: string) => void;
  onTimelineSelect?: (timelineId: string) => void;
  onAddCardToFolder: (folderId: string) => void;
  onAddTimelineToFolder: (folderId: string) => void;
}>(({
  node,
  level,
  activeCardId,
  activeTimelineId,
  onSelect,
  onTimelineSelect,
  onAddCardToFolder,
  onAddTimelineToFolder,
}) => {
  const [open, setOpen] = useState(true);
  const totalItems =
    node.children.length + node.cards.length + (node.timelines?.length || 0);

  return (
    <div className="flex flex-col">
      <div
        className="group relative flex items-center justify-between gap-1 w-full rounded-md text-xs py-1.5 pr-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] transition-colors duration-150"
        style={{ paddingLeft: `calc(0.5rem + 0.85rem * ${level})` }}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          className="flex items-center gap-1.5 flex-1 min-w-0 text-left outline-none focus-visible:ring-1 focus-visible:ring-indigo-400/50 rounded py-0.5"
          aria-expanded={open}
        >
          <span className="p-0.5 text-zinc-500 group-hover:text-zinc-300 transition-colors">
            <IconChevronRight
              size={12}
              className={`transition-transform duration-150 ${open ? 'rotate-90 text-zinc-400' : ''}`}
            />
          </span>
          <span className="shrink-0 text-zinc-400 group-hover:text-zinc-200 transition-colors">
            {open ? <IconFolderOpen size={14} className="text-zinc-300" /> : <IconFolder size={14} />}
          </span>
          <span className="truncate font-medium text-zinc-300 group-hover:text-zinc-100 font-sans">
            {node.name}
          </span>
        </button>

        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            title={`Nova Linha do Tempo em ${node.name}`}
            aria-label={`Adicionar nova linha do tempo na pasta ${node.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddTimelineToFolder(node.id);
            }}
            className="p-1 rounded text-zinc-400 hover:text-amber-300 hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
          >
            <IconClock size={12} />
          </button>
          <button
            type="button"
            title={`Novo card em ${node.name}`}
            aria-label={`Adicionar novo card na pasta ${node.name}`}
            onClick={(e) => {
              e.stopPropagation();
              onAddCardToFolder(node.id);
            }}
            className="p-1 rounded text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconFilePlus size={13} />
          </button>
        </div>

        {totalItems > 0 && (
          <span className="group-hover:hidden group-focus-within:hidden text-[10px] font-mono text-zinc-500 px-1">
            {totalItems}
          </span>
        )}
      </div>

      {open && (
        <div className="flex flex-col border-l border-white/[0.06] ml-3.5 my-0.5">
          {node.children.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              level={level + 1}
              activeCardId={activeCardId}
              activeTimelineId={activeTimelineId}
              onSelect={onSelect}
              onTimelineSelect={onTimelineSelect}
              onAddCardToFolder={onAddCardToFolder}
              onAddTimelineToFolder={onAddTimelineToFolder}
            />
          ))}
          {node.timelines?.map((timeline) => (
            <TimelineRow
              key={timeline.id}
              timeline={timeline}
              level={level + 1}
              activeTimelineId={activeTimelineId}
              onSelect={onTimelineSelect}
            />
          ))}
          {node.cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              level={level + 1}
              activeCardId={activeCardId}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
});
FolderRow.displayName = 'FolderRow';

// ─── Extracted Modal (prevents form input keystrokes from re-rendering tree) ───
interface SidebarModalProps {
  mode: 'folder' | 'card' | 'timeline';
  targetFolderId: string | null;
  worldId: string;
  token: string;
  onClose: () => void;
  onSuccess: (type: 'folder' | 'card' | 'timeline', id?: string, docId?: string) => void;
}

const SidebarCreationModal: React.FC<SidebarModalProps> = ({
  mode,
  targetFolderId,
  worldId,
  token,
  onClose,
  onSuccess,
}) => {
  const [formInput, setFormInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close on Escape
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = formInput.trim();
    if (!value || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (mode === 'folder') {
        await apiFetch(`/worlds/${worldId}/folders`, token, {
          method: 'POST',
          body: JSON.stringify({ name: value }),
        });
        onSuccess('folder');
      } else if (mode === 'timeline') {
        const payload: { name: string; folderId?: string } = { name: value };
        if (targetFolderId) payload.folderId = targetFolderId;

        const newTimeline = await apiFetch<{ id: string }>(
          `/worlds/${worldId}/timelines`,
          token,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
        );
        onSuccess('timeline', newTimeline?.id);
      } else if (mode === 'card') {
        const types = await apiFetch<Array<{ id: string }>>(
          `/worlds/${worldId}/card-types`,
          token,
        );
        const cardTypeId = types[0]?.id;
        if (!cardTypeId) {
          window.alert('Nenhum tipo de card encontrado neste mundo.');
          return;
        }

        const payload: { title: string; cardTypeId: string; folderId?: string } = {
          title: value,
          cardTypeId,
        };
        if (targetFolderId) payload.folderId = targetFolderId;

        const newCard = await apiFetch<{ id: string; documentId: string }>(
          `/worlds/${worldId}/cards`,
          token,
          {
            method: 'POST',
            body: JSON.stringify(payload),
          },
        );
        onSuccess('card', newCard?.id, newCard?.documentId);
      }
    } catch (err) {
      console.error('Falha na operação:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sidebar-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl bg-[#111115] border border-white/10 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 id="sidebar-modal-title" className="text-sm font-semibold text-zinc-100">
            {mode === 'folder'
              ? 'Criar Nova Pasta'
              : mode === 'timeline'
                ? 'Criar Nova Linha do Tempo'
                : 'Criar Novo Card'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar modal"
            className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconX size={14} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="sidebar-creation-input"
              className="block text-xs text-zinc-400 mb-1.5 font-medium"
            >
              {mode === 'folder'
                ? 'Nome da Pasta'
                : mode === 'timeline'
                  ? 'Nome da Linha do Tempo'
                  : 'Título do Card'}
            </label>
            <input
              id="sidebar-creation-input"
              type="text"
              autoFocus
              required
              value={formInput}
              onChange={(e) => setFormInput(e.target.value)}
              placeholder={
                mode === 'folder'
                  ? 'ex: Facções, Geografia, Magia…'
                  : mode === 'timeline'
                    ? 'ex: História Antiga, Guerra dos Cem Anos…'
                    : 'ex: A Ordem dos Nove, Cidade de Arkhan…'
              }
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/60 focus:ring-1 focus:ring-indigo-400/40"
            />
          </div>

          <div className="flex items-center justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!formInput.trim() || isSubmitting}
              className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              {isSubmitting ? 'Criando…' : 'Criar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Sidebar Component ───────────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({
  worldId,
  token,
  activeCardId,
  activeTimelineId,
  onCardSelect,
  onTimelineSelect,
}) => {
  const { tree, rootCards, rootTimelines, isLoading, mutate } = useSidebarTree(
    worldId,
    token,
  );
  const [modalMode, setModalMode] = useState<'folder' | 'card' | 'timeline' | null>(null);
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);

  const handleOpenFolderModal = useCallback(() => {
    setTargetFolderId(null);
    setModalMode('folder');
  }, []);

  const handleOpenCardModal = useCallback((folderId?: string) => {
    setTargetFolderId(folderId ?? null);
    setModalMode('card');
  }, []);

  const handleOpenTimelineModal = useCallback((folderId?: string) => {
    setTargetFolderId(folderId ?? null);
    setModalMode('timeline');
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalMode(null);
    setTargetFolderId(null);
  }, []);

  const handleModalSuccess = useCallback(
    (type: 'folder' | 'card' | 'timeline', id?: string, docId?: string) => {
      mutate();
      setModalMode(null);
      setTargetFolderId(null);

      if (type === 'timeline' && id && onTimelineSelect) {
        onTimelineSelect(id);
      } else if (type === 'card' && id && docId) {
        onCardSelect(id, docId);
      }
    },
    [mutate, onTimelineSelect, onCardSelect],
  );

  const isEmpty =
    !isLoading &&
    tree.length === 0 &&
    rootCards.length === 0 &&
    rootTimelines.length === 0;

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tree Section Header */}
      <div className="flex items-center justify-between px-2 py-1.5 mb-1.5 border-b border-white/[0.04]">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-500 font-mono">
          Arquivo
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Nova pasta"
            aria-label="Criar nova pasta no arquivo"
            onClick={handleOpenFolderModal}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconFolderPlus size={14} />
          </button>
          <button
            type="button"
            title="Nova linha do tempo"
            aria-label="Criar nova linha do tempo"
            onClick={() => handleOpenTimelineModal()}
            className="p-1 rounded-md text-zinc-400 hover:text-amber-300 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-amber-400"
          >
            <IconClock size={13} />
          </button>
          <button
            type="button"
            title="Novo card"
            aria-label="Criar novo card no arquivo"
            onClick={() => handleOpenCardModal()}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
          >
            <IconFilePlus size={14} />
          </button>
        </div>
      </div>

      {/* Tree Items List */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 px-0.5 focus:outline-none">
        {isLoading && (
          <div className="px-3 py-8 flex items-center justify-center gap-2.5 text-xs text-zinc-500">
            <div className="w-3.5 h-3.5 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" />
            <span>Indexando arquivo…</span>
          </div>
        )}

        {isEmpty && (
          <div className="px-4 py-10 text-center flex flex-col items-center">
            <div className="w-9 h-9 rounded-lg bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-zinc-500 mb-2.5">
              <IconFileText size={16} />
            </div>
            <p className="text-xs text-zinc-300 font-medium">Arquivo vazio</p>
            <p className="text-[11px] text-zinc-500 mt-1 max-w-[170px] leading-relaxed">
              Crie uma pasta, card ou linha do tempo para iniciar seu mundo.
            </p>
            <button
              type="button"
              onClick={() => handleOpenCardModal()}
              className="mt-3.5 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-white/[0.04] text-zinc-200 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white text-xs transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              <IconPlus size={12} />
              <span>Criar Primeiro Card</span>
            </button>
          </div>
        )}

        {tree.map((folder) => (
          <FolderRow
            key={folder.id}
            node={folder}
            level={0}
            activeCardId={activeCardId}
            activeTimelineId={activeTimelineId}
            onSelect={onCardSelect}
            onTimelineSelect={onTimelineSelect}
            onAddCardToFolder={handleOpenCardModal}
            onAddTimelineToFolder={handleOpenTimelineModal}
          />
        ))}

        {rootTimelines.map((timeline) => (
          <TimelineRow
            key={timeline.id}
            timeline={timeline}
            level={0}
            activeTimelineId={activeTimelineId}
            onSelect={onTimelineSelect}
          />
        ))}

        {rootCards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            level={0}
            activeCardId={activeCardId}
            onSelect={onCardSelect}
          />
        ))}
      </div>

      {/* Creation Modal rendered conditionally */}
      {modalMode && worldId && token && (
        <SidebarCreationModal
          mode={modalMode}
          targetFolderId={targetFolderId}
          worldId={worldId}
          token={token}
          onClose={handleCloseModal}
          onSuccess={handleModalSuccess}
        />
      )}
    </div>
  );
};
