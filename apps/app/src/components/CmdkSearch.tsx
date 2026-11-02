import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useSearch } from '../hooks/useSearch';

interface CmdkSearchProps {
  worldId: string | null;
  token: string | null;
  onSelect: (cardId: string, documentId: string) => void;
}

export const CmdkSearch: React.FC<CmdkSearchProps> = ({
  worldId,
  token,
  onSelect,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { results, isLoading } = useSearch(worldId, token, query);

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset query when closing
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  return (
    /* Overlay */
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-[20vh]"
      onClick={() => setOpen(false)}
    >
      {/* Dialog */}
      <div
        className="w-full max-w-xl bg-zinc-900/90 backdrop-blur-md border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false}>
          <Command.Input
            autoFocus
            value={query}
            onValueChange={setQuery}
            placeholder="Buscar cards, personagens, locais…"
            className="w-full bg-transparent px-5 py-4 text-zinc-100 placeholder-zinc-600 border-b border-white/5 outline-none text-sm"
          />

          <Command.List className="max-h-80 overflow-y-auto p-2">
            {query.trim().length < 2 && (
              <Command.Empty className="text-zinc-600 text-sm text-center py-8">
                Digite ao menos 2 caracteres para buscar…
              </Command.Empty>
            )}

            {query.trim().length >= 2 && isLoading && (
              <Command.Empty className="text-zinc-600 text-sm text-center py-8">
                Buscando…
              </Command.Empty>
            )}

            {query.trim().length >= 2 && !isLoading && results.length === 0 && (
              <Command.Empty className="text-zinc-600 text-sm text-center py-8">
                Nenhum resultado encontrado.
              </Command.Empty>
            )}

            {results.map((result) => (
              <Command.Item
                key={result.id}
                value={result.id}
                onSelect={() => {
                  onSelect(result.id, result.documentId);
                  setOpen(false);
                }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer text-zinc-300 aria-selected:bg-white/8 hover:bg-white/5 transition-colors duration-100"
              >
                <span className="text-base leading-none shrink-0">
                  {result.icon ?? '📄'}
                </span>
                <div className="flex flex-col min-w-0">
                  <span className="text-sm font-medium text-zinc-200 truncate">
                    {result.title}
                  </span>
                  {result.summary && (
                    <span className="text-xs text-zinc-600 truncate">
                      {result.summary}
                    </span>
                  )}
                </div>
                <span className="ml-auto text-[10px] text-zinc-700 shrink-0">
                  rank {result.rank.toFixed(2)}
                </span>
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
};
