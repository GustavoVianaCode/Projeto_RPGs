import React, { useEffect, useMemo, useState } from 'react';
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

// ─── Toolbar Button ───────────────────────────────────────────────────────────
interface ToolbarButtonProps {
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  activeClass?: string;
  children: React.ReactNode;
  title?: string;
  ariaLabel?: string;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  disabled = false,
  active = false,
  activeClass = 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40 shadow-[0_0_12px_rgba(99,102,241,0.2)]',
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
      'inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border',
      'transition-all duration-150 select-none outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
      'disabled:opacity-30 disabled:cursor-not-allowed',
      active
        ? activeClass
        : 'bg-transparent text-zinc-400 border-transparent hover:bg-white/[0.05] hover:text-zinc-200 hover:border-white/5',
    ].join(' ')}
  >
    {children}
  </button>
);

// ─── Connection Badge ─────────────────────────────────────────────────────────
const ConnectionBadge: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const map = {
    connected: { dot: 'bg-emerald-400 shadow-[0_0_8px_#34d399]', text: 'text-emerald-400', label: 'Sincronizado' },
    connecting: { dot: 'bg-amber-400 animate-pulse', text: 'text-amber-400', label: 'Conectando…' },
    disconnected: { dot: 'bg-rose-500', text: 'text-rose-400', label: 'Offline' },
  };
  const s = map[status];
  return (
    <div
      className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.03] border border-white/[0.06]"
      title={`Status da conexão WebSocket: ${s.label}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-[11px] font-mono tracking-wide ${s.text}`}>{s.label}</span>
    </div>
  );
};

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
  breadcrumbs = [],
  availableCards = [],
  onMentionClick,
  onStatusChange,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');
  const [showMentionModal, setShowMentionModal] = useState(false);
  const [mentionFilter, setMentionFilter] = useState('');
  const [brokenLinkWarning, setBrokenLinkWarning] = useState<string | null>(null);

  // Close mention modal on Escape key press
  useEffect(() => {
    if (!showMentionModal) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setShowMentionModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showMentionModal]);

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
        onStatusChange?.(nextStatus);
      },
    });
  }, [worldId, documentId, token, websocketUrl, onStatusChange]);

  useEffect(() => {
    return () => {
      provider.destroy();
    };
  }, [provider]);

  // TipTap Editor
  const editor = useEditor(
    {
      editable: !readOnly,
      extensions: [
        StarterKit.configure({
          history: false, // gerenciado pelo Yjs
        }),
        Collaboration.configure({
          document: provider.document,
        }),
        Mention,
        Spoiler,
        HiddenBlock,
      ],
    },
    [provider, readOnly],
  );

  // Compute reading statistics
  const wordCount = useMemo(() => {
    if (!editor) return 0;
    const text = editor.getText().trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [editor?.getText()]); // eslint-disable-line react-hooks/exhaustive-deps

  const readingTimeMin = Math.max(1, Math.ceil(wordCount / 200));

  // Handle clicking mentions inside editor
  const handleEditorClick = (e: React.MouseEvent) => {
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
  };

  const insertMention = (cardId: string, label: string) => {
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
  };

  const filteredCards = availableCards.filter((c) =>
    c.title.toLowerCase().includes(mentionFilter.toLowerCase()),
  );

  return (
    <div
      className={[
        'flex flex-col w-full rounded-2xl overflow-hidden',
        'bg-zinc-900/40 backdrop-blur-xl',
        'border border-white/[0.08]',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_12px_48px_rgba(0,0,0,0.6)]',
        className,
      ].join(' ')}
    >
      {/* ── Document Top Context Bar ───────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/[0.06] bg-white/[0.015]">
        <div className="flex flex-col min-w-0 pr-4">
          {/* Breadcrumbs */}
          {breadcrumbs.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono tracking-wide mb-1 truncate">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={crumb}>
                  {idx > 0 && <span className="text-zinc-600">/</span>}
                  <span className={idx === breadcrumbs.length - 1 ? 'text-zinc-300' : ''}>
                    {crumb}
                  </span>
                </React.Fragment>
              ))}
            </div>
          )}

          {/* Title & Type Badge */}
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-bold text-zinc-100 tracking-tight font-sans truncate">
              {cardTitle || 'Documento de Lore'}
            </h1>
            {cardType && (
              <span className="shrink-0 px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
                {cardType}
              </span>
            )}
          </div>
        </div>

        {/* Status Indicators */}
        <div className="flex items-center gap-3 shrink-0">
          {brokenLinkWarning && (
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-bounce">
              <IconAlertTriangle size={13} className="text-rose-400" />
              <span>{brokenLinkWarning}</span>
            </div>
          )}
          {readOnly && (
            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-semibold">
              Modo Leitura
            </span>
          )}
          <div className="hidden sm:flex items-center gap-2 text-xs text-zinc-500 font-mono">
            <span>{wordCount} palavras</span>
            <span>·</span>
            <span>~{readingTimeMin} min</span>
          </div>
          <ConnectionBadge status={status} />
        </div>
      </div>

      {/* ── TipTap Toolbar ─────────────────────────────────────────────── */}
      <header
        className={[
          'flex items-center justify-between px-4 py-2 border-b border-white/[0.06]',
          'bg-zinc-950/40 backdrop-blur-md overflow-x-auto gap-2',
        ].join(' ')}
      >
        <div className="flex items-center gap-1 flex-wrap">
          {/* Headings */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('heading', { level: 2 }) ?? false}
            title="Subtítulo H2"
          >
            <IconHeading2 size={15} />
            <span className="text-[11px]">H2</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('heading', { level: 3 }) ?? false}
            title="Seção H3"
          >
            <IconHeading3 size={15} />
            <span className="text-[11px]">H3</span>
          </ToolbarButton>

          <span className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          {/* Text Styles */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('bold') ?? false}
            title="Negrito (Ctrl+B)"
          >
            <IconBold size={14} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('italic') ?? false}
            title="Itálico (Ctrl+I)"
          >
            <IconItalic size={14} />
          </ToolbarButton>

          <span className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          {/* Lists & Quotes */}
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBulletList().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('bulletList') ?? false}
            title="Lista com marcadores"
          >
            <IconList size={15} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('orderedList') ?? false}
            title="Lista numerada"
          >
            <IconListOrdered size={15} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('blockquote') ?? false}
            title="Citação em bloco"
          >
            <IconQuote size={14} />
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().setHorizontalRule().run()}
            disabled={!editor || readOnly}
            title="Divisor de cena / Linha horizontal"
          >
            <IconMinus size={15} />
          </ToolbarButton>

          <span className="w-px h-4 bg-white/10 mx-1 shrink-0" />

          {/* Lore Extensions */}
          <ToolbarButton
            onClick={() => setShowMentionModal(true)}
            disabled={!editor || readOnly}
            activeClass="bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
            title="Mencionar outro card do mundo (@)"
          >
            <IconAtSign size={14} className="text-indigo-400" />
            <span className="text-xs text-indigo-300 font-medium">Menção</span>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleMark('spoiler').run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('spoiler') ?? false}
            activeClass="bg-amber-500/20 text-amber-300 border-amber-500/30"
            title="Destacar spoiler / segredo de campanha"
          >
            <IconEyeOff size={14} className="text-amber-400" />
            <span className="text-xs text-amber-300 font-medium">Spoiler</span>
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
          >
            <IconLock size={14} className="text-indigo-300" />
            <span className="text-xs text-zinc-300">Bloco Oculto</span>
          </ToolbarButton>
        </div>
      </header>

      {/* ── Editor Canvas Sheet ────────────────────────────────────────── */}
      <div
        onClick={handleEditorClick}
        className={[
          'px-4 py-6 sm:px-12 sm:py-10',
          'min-h-[520px]',
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
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setShowMentionModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-5 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-3">
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
                <IconX size={15} />
              </button>
            </div>

            {/* Quick search input among available cards */}
            {availableCards.length === 0 ? (
              <div className="py-8 px-4 text-center">
                <IconFileText size={26} className="mx-auto text-zinc-600 mb-2" />
                <p className="text-xs text-zinc-400 font-medium">Nenhum card cadastrado neste mundo</p>
                <p className="text-[11px] text-zinc-600 mt-1 max-w-xs mx-auto">
                  Crie novos cards na barra lateral antes de vincular menções no texto.
                </p>
              </div>
            ) : (
              <>
                <div className="relative mb-3">
                  <IconSearch className="absolute left-3 top-2.5 text-zinc-500" size={14} />
                  <input
                    type="text"
                    autoFocus
                    value={mentionFilter}
                    onChange={(e) => setMentionFilter(e.target.value)}
                    placeholder="Pesquisar nos cards existentes…"
                    aria-label="Pesquisar cards para menção"
                    className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg bg-zinc-950 border border-white/10 text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-indigo-400/50"
                  />
                </div>

                {/* Cards List */}
                <div className="max-h-48 overflow-y-auto mb-4 border border-white/5 rounded-lg p-1 bg-zinc-950/40">
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
                        className="w-full flex items-center gap-2 px-2.5 py-1.5 rounded text-left text-xs text-zinc-300 hover:bg-indigo-500/15 hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                      >
                        <IconFileText size={13} className="text-zinc-500 shrink-0" />
                        <span className="truncate flex-1">{c.title}</span>
                        <span className="text-[10px] text-indigo-400/80 font-mono shrink-0">Inserir</span>
                      </button>
                    ))
                  )}
                </div>
              </>
            )}

            {/* Footer / Cancel */}
            <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between">
              <span className="text-[11px] text-zinc-500">
                {availableCards.length > 0
                  ? 'Selecione um card acima para vincular na lore.'
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
