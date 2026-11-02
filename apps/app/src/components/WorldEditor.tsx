import React, { useEffect, useMemo, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Collaboration from '@tiptap/extension-collaboration';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { Mention, Spoiler, HiddenBlock } from '../extensions';

export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected';

export interface WorldEditorProps {
  worldId: string;
  documentId: string;
  token: string;
  websocketUrl?: string;
  readOnly?: boolean;
  className?: string;
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
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
  onClick,
  disabled = false,
  active = false,
  activeClass = 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  children,
  title,
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={[
      'px-3 py-1.5 rounded-md text-xs font-semibold border',
      'transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed',
      active
        ? activeClass
        : 'bg-transparent text-zinc-500 border-white/5 hover:bg-white/5 hover:text-zinc-300 hover:border-white/10',
    ].join(' ')}
  >
    {children}
  </button>
);

// ─── Connection Badge ─────────────────────────────────────────────────────────
const ConnectionBadge: React.FC<{ status: ConnectionStatus }> = ({ status }) => {
  const map = {
    connected: { dot: 'bg-emerald-500', text: 'text-emerald-400', label: 'Sincronizado' },
    connecting: { dot: 'bg-amber-500 animate-pulse', text: 'text-amber-400', label: 'Conectando…' },
    disconnected: { dot: 'bg-red-500', text: 'text-red-400', label: 'Desconectado' },
  };
  const s = map[status];
  return (
    <div className="flex items-center gap-2">
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      <span className={`text-xs font-medium ${s.text}`}>{s.label}</span>
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
  onStatusChange,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>('connecting');

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

  return (
    <div
      className={[
        'flex flex-col rounded-xl overflow-hidden',
        'bg-zinc-900/40 backdrop-blur-lg',
        'border border-white/5',
        'shadow-[0_0_0_1px_rgba(255,255,255,0.02),0_8px_40px_rgba(0,0,0,0.5)]',
        className,
      ].join(' ')}
    >
      {/* ── Toolbar ────────────────────────────────────────────────────── */}
      <header
        className={[
          'flex items-center justify-between px-4 py-2.5',
          'bg-zinc-900/60 border-b border-white/5',
          'backdrop-blur-md',
        ].join(' ')}
      >
        {/* Format & Extension Actions */}
        <div className="flex items-center gap-1 flex-wrap">
          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('bold') ?? false}
            title="Negrito"
          >
            <strong>B</strong>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('italic') ?? false}
            title="Itálico"
          >
            <em>I</em>
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('heading', { level: 2 }) ?? false}
            title="Título H2"
          >
            H2
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('heading', { level: 3 }) ?? false}
            title="Título H3"
          >
            H3
          </ToolbarButton>

          {/* Divisor */}
          <span className="w-px h-4 bg-white/10 mx-1" />

          {/* Lore Extensions */}
          <ToolbarButton
            onClick={() => {
              const cardId = prompt('ID do Card para mencionar:');
              const label = prompt('Texto do Card:');
              if (cardId && label && editor) {
                editor
                  .chain()
                  .focus()
                  .insertContent({
                    type: 'mention',
                    attrs: { id: cardId, targetCardId: cardId, label },
                  })
                  .run();
              }
            }}
            disabled={!editor || readOnly}
            activeClass="bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
            title="Inserir menção a card"
          >
            @ Menção
          </ToolbarButton>

          <ToolbarButton
            onClick={() => editor?.chain().focus().toggleMark('spoiler').run()}
            disabled={!editor || readOnly}
            active={editor?.isActive('spoiler') ?? false}
            activeClass="bg-amber-500/15 text-amber-300 border-amber-500/25"
            title="Marcar spoiler"
          >
            [!] Spoiler
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
                        content: [{ type: 'text', text: 'Nota secreta do Mestre…' }],
                      },
                    ],
                  })
                  .run();
              }
            }}
            disabled={!editor || readOnly}
            title="Inserir bloco oculto (DM only)"
          >
            🔒 Bloco Oculto
          </ToolbarButton>
        </div>

        {/* Status & Read-only Badge */}
        <div className="flex items-center gap-3">
          {readOnly && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-[10px] font-semibold">
              Leitura
            </span>
          )}
          <ConnectionBadge status={status} />
        </div>
      </header>

      {/* ── Editor Content Area ─────────────────────────────────────────── */}
      <div
        className={[
          'px-8 py-7',
          'min-h-[420px]',
          readOnly ? 'cursor-default' : 'cursor-text',
        ].join(' ')}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};
