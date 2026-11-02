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

  // Initialize Hocuspocus Provider
  const provider = useMemo(() => {
    return new HocuspocusProvider({
      url: websocketUrl,
      name: `${worldId}:${documentId}`,
      token,
      parameters: {
        worldId,
      },
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

  // TipTap Editor instance
  const editor = useEditor(
    {
      editable: !readOnly,
      extensions: [
        StarterKit.configure({
          history: false, // Handled collaboratively by Yjs
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
      className={`cybercore-editor-container ${className}`}
      style={{
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#ffffff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Cybercore Top Action & Status Bar */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 16px',
          backgroundColor: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          {/* Format Actions */}
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            disabled={!editor || readOnly}
            style={{
              padding: '4px 10px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: editor?.isActive('bold') ? '#e11d48' : '#ffffff',
              color: editor?.isActive('bold') ? '#ffffff' : '#1e293b',
              cursor: readOnly ? 'not-allowed' : 'pointer',
            }}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            disabled={!editor || readOnly}
            style={{
              padding: '4px 10px',
              fontSize: '13px',
              fontWeight: 600,
              fontStyle: 'italic',
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: editor?.isActive('italic') ? '#e11d48' : '#ffffff',
              color: editor?.isActive('italic') ? '#ffffff' : '#1e293b',
              cursor: readOnly ? 'not-allowed' : 'pointer',
            }}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
            disabled={!editor || readOnly}
            style={{
              padding: '4px 10px',
              fontSize: '13px',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: editor?.isActive('heading', { level: 2 }) ? '#e11d48' : '#ffffff',
              color: editor?.isActive('heading', { level: 2 }) ? '#ffffff' : '#1e293b',
              cursor: readOnly ? 'not-allowed' : 'pointer',
            }}
          >
            H2
          </button>

          <span style={{ width: '1px', height: '18px', backgroundColor: '#cbd5e1', margin: '0 4px' }} />

          {/* Custom Lore Extensions Buttons */}
          <button
            type="button"
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
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '4px',
              border: '1px solid #e11d48',
              backgroundColor: '#fff1f2',
              color: '#e11d48',
              cursor: readOnly ? 'not-allowed' : 'pointer',
            }}
          >
            @ Menção
          </button>

          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleMark('spoiler').run()}
            disabled={!editor || readOnly}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '4px',
              border: '1px solid #cbd5e1',
              backgroundColor: editor?.isActive('spoiler') ? '#fef3c7' : '#ffffff',
              color: editor?.isActive('spoiler') ? '#b45309' : '#1e293b',
              cursor: readOnly ? 'not-allowed' : 'pointer',
            }}
          >
            [!] Spoiler
          </button>

          <button
            type="button"
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
                        content: [{ type: 'text', text: 'Nota secreta do Mestre...' }],
                      },
                    ],
                  })
                  .run();
              }
            }}
            disabled={!editor || readOnly}
            style={{
              padding: '4px 10px',
              fontSize: '12px',
              fontWeight: 500,
              borderRadius: '4px',
              border: '1px solid #64748b',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              cursor: readOnly ? 'not-allowed' : 'pointer',
            }}
          >
            🔒 Bloco Oculto
          </button>
        </div>

        {/* Real-time Cybercore Status Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
          <span
            style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              backgroundColor:
                status === 'connected'
                  ? '#10b981'
                  : status === 'connecting'
                    ? '#f59e0b'
                    : '#ef4444',
            }}
          />
          <span style={{ color: '#64748b', fontWeight: 500 }}>
            {status === 'connected'
              ? 'Sincronizado'
              : status === 'connecting'
                ? 'Conectando...'
                : 'Desconectado'}
          </span>
          {readOnly && (
            <span
              style={{
                backgroundColor: '#fee2e2',
                color: '#dc2626',
                padding: '2px 6px',
                borderRadius: '4px',
                fontWeight: 600,
                fontSize: '11px',
              }}
            >
              Leitura
            </span>
          )}
        </div>
      </header>

      {/* Editor Content Area */}
      <div
        style={{
          padding: '16px 20px',
          minHeight: '350px',
          cursor: readOnly ? 'default' : 'text',
          fontSize: '15px',
          lineHeight: '1.6',
          color: '#0f172a',
        }}
      >
        <EditorContent editor={editor} />
      </div>
    </div>
  );
};

