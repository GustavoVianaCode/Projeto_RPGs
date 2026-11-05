import React, { useEffect, useMemo, useState, useRef, memo, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Mention, Spoiler, HiddenBlock } from '../extensions';
import {
  IconBold,
  IconItalic,
  IconHeading2,
  IconHeading3,
  IconList,
  IconListOrdered,
  IconQuote,
  IconMinus,
  IconAtSign,
  IconEyeOff,
  IconLock,
  IconX,
  IconFileText,
  IconSearch,
  IconAlertTriangle,
} from './icons';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface AvailableCardSummary {
  id: string;
  title: string;
  documentId: string;
}

export interface WorldEditorProps {
  worldId: string;
  documentId: string;
  token: string;
  websocketUrl?: string;
  readOnly?: boolean;
  className?: string;
  cardTitle?: string;
  cardType?: string;
  breadcrumbs?: string[];
  availableCards?: AvailableCardSummary[];
  onMentionClick?: (cardId: string) => void;
  onStatusChange?: (status: ConnectionStatus) => void;
}

// ─── Memoized Toolbar Button ──────────────────────────────────────────────────
interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  activeClass?: string;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
}

const ToolbarButton = memo<ToolbarButtonProps>(({
  onClick,
  disabled = false,
  active = false,
  activeClass = 'bg-white/[0.08] text-zinc-100 border-white/[0.12]',
  children,
  title,
  ariaLabel,
}) => (
  <button
    type="button"
    title={title}
    aria-label={ariaLabel || title}
    onClick={onClick}
    disabled={disabled}
    className={[
      'inline-flex items-center justify-center gap-1.5 px-2 py-1 rounded text-xs font-medium border',
      'transition-colors duration-150 select-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
      'disabled:opacity-30 disabled:cursor-not-allowed shrink-0',
      active
        ? activeClass
        : 'bg-transparent text-zinc-400 border-transparent hover:bg-white/[0.05] hover:text-zinc-200',
    ].join(' ')}
  >
    {children}
  </button>
));
ToolbarButton.displayName = 'ToolbarButton';

// ─── Connection Status Badge ──────────────────────────────────────────────────
const ConnectionBadge = memo<{ status: ConnectionStatus }>(({ status }) => {
  const map = {
    connected: { dot: 'bg-emerald-400', text: 'text-zinc-400', label: 'Sincronizado' },
    connecting: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400/80', label: 'Conectando…' },
    disconnected: { dot: 'bg-rose-500', text: 'text-rose-400/80', label: 'Offline' },
  };
  const s = map[status];
  return (
    <div
      className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/[0.02] border border-white/[0.05]"
      title={`Status da sincronização: ${s.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-[10px] font-mono tracking-wide ${s.text}`}>{s.label}</span>
    </div>
  );
});
ConnectionBadge.displayName = 'ConnectionBadge';

// ─── World Editor ─────────────────────────────────────────────────────────────
export const WorldEditor: React.FC<WorldEditorProps> = ({
  worldId,
  documentId,
  token,
  websocketUrl = 'ws://localhost:4001',
  readOnly = false,
  className = '',
  cardTitle,
  cardType,
  availableCards = [],
  onMentionClick,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [brokenLinkWarning, setBrokenLinkWarning] = useState<string | null>(null);
  const [wordCount, setWordCount] = useState<number>(0);

  // Keep a stable ref to onStatusChange so provider is not recreated if callback prop changes
  const onStatusChangeRef = useRef(onStatusChange);
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  });

  const wordCountTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Close mention modal on Escape
  useEffect(() => {
    if (!showMentionModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowMentionModal(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMentionModal]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
    };
  }, []);

  // Hocuspocus Provider
  const provider = useMemo(() => {
    return new HocuspocusProvider({
      url: websocketUrl,
      name: `${worldId}:${documentId}`,
      token,
      parameters: { worldId },
      onStatus: (event) => {
        const nextStatus = event.status as ConnectionStatus;
        setStatus(nextStatus);
        onStatusChangeRef.current?.(nextStatus);
      },
    });
  }, [worldId, documentId, token, websocketUrl]);

  useEffect(() => {
    return () => {
      provider.destroy();
    };
  }, [provider]);

  // Calculate words helper
  const calcWords = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).filter(Boolean).length;
  }, []);

  // TipTap Editor with debounced word count computation (no expensive serialization on every render)
  const editor = useEditor(
    {
      editable: !readOnly,
      extensions: [
        StarterKit.configure({
          history: false, // CRDT-managed by Yjs
        }),
        Collaboration.configure({
          document: provider.document,
        }),
        Mention,
        Spoiler,
        HiddenBlock,
      ],
      onCreate: ({ editor: ed }) => {
        const text = ed.getText();
        setWordCount(calcWords(text));
      },
      onUpdate: ({ editor: ed }) => {
        if (wordCountTimerRef.current) clearTimeout(wordCountTimerRef.current);
        wordCountTimerRef.current = setTimeout(() => {
          setWordCount(calcWords(ed.getText()));
        }, 300);
      },
    },
    [provider, readOnly, calcWords],
  );

  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Handle clicking mentions inside editor canvas
  const handleEditorClick = useCallback((e: React.MouseEvent) => {
    const target = (e.target as HTMLElement).closest('span[data-type="mention"]');
    if (target) {
      const targetId =
        target.getAttribute('data-target-card-id') || target.getAttribute('data-id');
      if (targetId) {
        const found = availableCards.some((c) => c.id === targetId);
        if (!found) {
          setBrokenLinkWarning(
            'Este link aponta para um card que foi removido ou não existe no arquivo.',
          );
          setTimeout(() => setBrokenLinkWarning(null), 4000);
          return;
        }
        onMentionClick?.(targetId);
      }
    }
  }, [availableCards, onMentionClick]);

  const insertMention = useCallback((cardId: string, label: string) => {
    if (editor) {
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'mention',
          attrs: { id: cardId, targetCardId: cardId, label },
        })
        .run();
    }
    setShowMentionModal(false);
    setMentionFilter('');
  }, [editor]);

  const filteredCards = useMemo(() => {
    if (!mentionFilter.trim()) return availableCards;
    const lower = mentionFilter.toLowerCase();
    return availableCards.filter((c) => c.title.toLowerCase().includes(lower));
  }, [availableCards, mentionFilter]);

  return (
    <div
      className={[
        'flex flex-col w-full rounded-xl overflow-hidden',
        'bg-[#0e0e12] border border-white/[0.06]',
        'shadow-[0_4px_24px_rgba(0,0,0,0.5)]',
        className,
      ].join(' ')}
    >
      {/* ── Document Top Context Bar ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 sm:px-8 py-4 border-b border-white/[0.05] bg-white/[0.01]">
        <div className="flex items-center gap-3 min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight font-sans truncate">
            {cardTitle || 'Documento de Lore'}
          </h1>
          {cardType && (
            <span className="shrink-0 px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider bg-white/[0.04] text-zinc-400 border border-white/[0.06]">
              {cardType}
            </span>
          )}
        </div>

        {/* Status & Reading Indicators */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          {brokenLinkWarning && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-rose-500/10 border border-rose-500/25 text-rose-300 text-xs">
              <IconAlertTriangle size={13} className="text-rose-400 shrink-0" />
              <span className="truncate max-w-xs">{brokenLinkWarning}</span>
            </div>
          )}
          {readOnly && (
            <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-medium font-mono">
              Modo Leitura
            </span>
          )}
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-zinc-500 font-mono">
            <span>{wordCount} palavras</span>
            <span>·</span>
            <span>~{readingTimeMin} min</span>
          </div>
          <ConnectionBadge status={status} />
        </div>
      </div>

      {/* ── TipTap Toolbar ─────────────────────────────────────────────── */}
      <header
        aria-label="Barra de ferramentas de formatação"
        className="flex items-center px-4 py-1.5 border-b border-white/[0.05] bg-[#0c0c10] overflow-x-auto scrollbar-none gap-1.5"
      >
        {/* Structure: Headings, Quote & Divider */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('heading', { level: 2 }) ?? false}
            title="Subtítulo H2"
            ariaLabel="Título de nível 2"
          >
            <IconHeading2 size={14} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('heading', { level: 3 }) ?? false}
            title="Seção H3"
            ariaLabel="Título de nível 3"
          >
            <IconHeading3 size={14} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('blockquote') ?? false}
            title="Citação em bloco"
            ariaLabel="Citação em bloco"
          >
            <IconQuote size={13} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            disabled={!editor || readOnly}
            title="Divisor de cena / Linha horizontal"
            ariaLabel="Linha divisória horizontal"
          >
            <IconMinus size={14} />
          </ToolbarButton>
        </div>

        <span className="w-px h-3.5 bg-white/[0.08] mx-1 shrink-0" />

        {/* Text Styles: Bold & Italic */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('bold') ?? false}
            title="Negrito (Ctrl+B)"
            ariaLabel="Negrito"
          >
            <IconBold size={13} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('italic') ?? false}
            title="Itálico (Ctrl+I)"
            ariaLabel="Itálico"
          >
            <IconItalic size={13} />
          </ToolbarButton>
        </div>

        <span className="w-px h-3.5 bg-white/[0.08] mx-1 shrink-0" />

        {/* Lists */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('bulletList') ?? false}
            title="Lista com marcadores"
            ariaLabel="Lista com marcadores"
          >
            <IconList size={14} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('orderedList') ?? false}
            title="Lista numerada"
            ariaLabel="Lista numerada"
          >
            <IconListOrdered size={14} />
          </ToolbarButton>
        </div>

        <span className="w-px h-3.5 bg-white/[0.08] mx-1 shrink-0" />

        {/* Lore Extensions */}
        <div className="flex items-center gap-0.5">
          <ToolbarButton
            onClick={() => setShowMentionModal(true)}
            disabled={!editor || readOnly}
            activeClass="bg-indigo-500/15 text-indigo-200 border-indigo-500/30"
            title="Mencionar outro card do mundo (@)"
            ariaLabel="Inserir menção a card"
          >
            <IconAtSign size={13} className="text-indigo-400" />
            <span className="text-[11px] text-indigo-300">Menção</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleMark('spoiler').run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('spoiler') ?? false}
            activeClass="bg-amber-500/15 text-amber-200 border-amber-500/30"
            title="Destacar spoiler / segredo de campanha"
            ariaLabel="Marcar texto como spoiler"
          >
            <IconEyeOff size={13} className="text-amber-400" />
            <span className="text-[11px] text-amber-300">Spoiler</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => {
              if (editor) {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'hiddenBlock',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Nota secreta visível apenas para o Mestre…' }],
                      },
                    ],
                  })
                  .run();
              }
            }}
            disabled={!editor || readOnly}
            title="Inserir bloco secreto (exclusivo para Mestres)"
            ariaLabel="Inserir bloco oculto de DM"
          >
            <IconLock size={13} className="text-zinc-400" />
            <span className="text-[11px] text-zinc-300">Bloco Oculto</span>
          </ToolbarButton>
        </div>
      </header>

      {/* ── Editor Canvas Sheet ────────────────────────────────────────── */}
      <div
        onClick={handleEditorClick}
        className={[
          'px-5 py-8 sm:px-12 sm:py-12',
          'min-h-[540px] max-w-3xl mx-auto w-full',
          readOnly ? 'cursor-default' : 'cursor-text',
        ].join(' ')}
      >
        <EditorContent editor={editor} />
      </div>

      {/* ── Modal de Inserção de Menção ─────────────────────────────────── */}
      {showMentionModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mention-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowMentionModal(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#111115] border border-white/10 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2 text-indigo-400">
                <IconAtSign size={16} />
                <h3 id="mention-modal-title" className="text-sm font-semibold text-zinc-100">
                  Mencionar Card do Arquivo
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowMentionModal(false)}
                aria-label="Fechar modal de menção"
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                <IconX size={14} />
              </button>
            </div>

            {/* Quick search input among available cards */}
            {availableCards.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <IconFileText size={24} className="mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400 font-medium">Nenhum card cadastrado neste mundo</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto">
                  Crie novos cards na barra lateral antes de vincular menções no texto.
                </p>
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <IconSearch className="absolute left-3 top-2.5 text-zinc-500" size={13} />
                  <input
                    type="text"
                    autoFocus
                    value={mentionFilter}
                    onChange={(e) => setMentionFilter(e.target.value)}
                    placeholder="Pesquisar nos cards existentes…"
                    aria-label="Pesquisar cards para menção"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-[#09090b] border border-white/10 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-400/50"
                  />
                </div>

                {/* Cards List */}
                <div className="max-h-52 overflow-y-auto mb-4 border border-white/[0.06] rounded-lg p-1 bg-[#09090b]">
                  {filteredCards.length === 0 ? (
                    <p className="text-xs text-zinc-500 text-center py-4">
                      Nenhum card encontrado com este termo.
                    </p>
                  ) : (
                    filteredCards.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => insertMention(c.id, c.title)}
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-xs text-zinc-300 hover:bg-white/[0.06] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                      >
                        <IconFileText size={13} className="text-zinc-500 shrink-0" />
                        <span className="truncate flex-1 font-sans">{c.title}</span>
                        <span className="text-[10px] text-indigo-400/80 font-mono shrink-0">Inserir</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Footer / Cancel */}
            <div className="border-t border-white/[0.06] pt-3 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                {availableCards.length > 0
                  ? 'Selecione um card acima para vincular na crônica.'
                  : 'Nenhum card disponível.'}
              </span>
              <button
                type="button"
                onClick={() => setShowMentionModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
