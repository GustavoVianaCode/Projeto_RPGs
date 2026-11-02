import React, { useState } from 'react';
import { useSidebarTree, FolderNode, CardItem } from '../hooks/useSidebarTree';

interface SidebarProps {
  worldId: string | null;
  token: string | null;
  onCardSelect: (cardId: string, documentId: string) => void;
}

// ─── Card Item ────────────────────────────────────────────────────────────────
const CardRow: React.FC<{
  card: CardItem;
  level: number;
  onSelect: (cardId: string, documentId: string) => void;
}> = ({ card, level, onSelect }) => (
  <button
    type="button"
    onClick={() => onSelect(card.id, card.documentId)}
    className="flex items-center gap-2 w-full text-left rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors duration-150"
    style={{ paddingLeft: `calc(0.5rem + 0.75rem * ${level})` }}
  >
    <span className="text-sm leading-none shrink-0">{card.icon ?? '📄'}</span>
    <span className="truncate">{card.title}</span>
  </button>
);

// ─── Folder Node (recursive) ─────────────────────────────────────────────────
const FolderRow: React.FC<{
  node: FolderNode;
  level: number;
  onSelect: (cardId: string, documentId: string) => void;
}> = ({ node, level, onSelect }) => {
  const [open, setOpen] = useState(true);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center gap-2 w-full text-left rounded-md px-2 py-1 text-sm text-zinc-400 hover:bg-white/5 hover:text-zinc-200 transition-colors duration-150"
        style={{ paddingLeft: `calc(0.5rem + 0.75rem * ${level})` }}
      >
        <span className="text-xs leading-none text-zinc-600 shrink-0">
          {open ? '▾' : '▸'}
        </span>
        <span className="text-sm leading-none shrink-0">{node.icon ?? '📁'}</span>
        <span className="truncate font-medium">{node.name}</span>
      </button>

      {open && (
        <div>
          {node.children.map((child) => (
            <FolderRow
              key={child.id}
              node={child}
              level={level + 1}
              onSelect={onSelect}
            />
          ))}
          {node.cards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              level={level + 1}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ─── Sidebar ─────────────────────────────────────────────────────────────────
export const Sidebar: React.FC<SidebarProps> = ({
  worldId,
  token,
  onCardSelect,
}) => {
  const { tree, rootCards, isLoading, mutate } = useSidebarTree(worldId, token);

  const handleNewFolder = () => {
    const name = window.prompt('Nome da nova pasta:');
    if (!name || !worldId || !token) return;

    fetch(`http://localhost:4000/api/worlds/${worldId}/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ name }),
    })
      .then(() => mutate())
      .catch(console.error);
  };

  const handleNewCard = () => {
    const title = window.prompt('Título do novo card:');
    if (!title || !worldId || !token) return;

    fetch(`http://localhost:4000/api/worlds/${worldId}/cards`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ title }),
    })
      .then(() => mutate())
      .catch(console.error);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 mb-1">
        <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">
          Conteúdo
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Nova Pasta"
            onClick={handleNewFolder}
            className="p-1 rounded hover:bg-white/5 text-zinc-600 hover:text-zinc-300 transition-colors duration-150 text-xs"
          >
            📁+
          </button>
          <button
            type="button"
            title="Novo Card"
            onClick={handleNewCard}
            className="p-1 rounded hover:bg-white/5 text-zinc-600 hover:text-zinc-300 transition-colors duration-150 text-xs"
          >
            📄+
          </button>
        </div>
      </div>

      {/* Tree */}
      <div className="flex-1 overflow-y-auto flex flex-col gap-0.5 px-1">
        {isLoading && (
          <p className="text-xs text-zinc-700 px-3 py-2">Carregando…</p>
        )}

        {!isLoading && tree.length === 0 && rootCards.length === 0 && (
          <p className="text-xs text-zinc-700 px-3 py-2">Nenhum conteúdo ainda.</p>
        )}

        {tree.map((folder) => (
          <FolderRow
            key={folder.id}
            node={folder}
            level={0}
            onSelect={onCardSelect}
          />
        ))}

        {rootCards.map((card) => (
          <CardRow
            key={card.id}
            card={card}
            level={0}
            onSelect={onCardSelect}
          />
        ))}
      </div>
    </div>
  );
};
