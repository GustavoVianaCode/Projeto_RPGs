import React, { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useSearch, SearchResult } from '../hooks/useSearch';
import { IconSearch, IconFileText, IconX } from './icons';

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

  // Global Ctrl+K / Cmd+K and Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Reset query when closed
  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Busca no arquivo do mundo"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4 bg-black/70 backdrop-blur-md transition-opacity duration-200"
      onClick={() => setOpen(false)}
    >
      <div
        className={[
          'w-full max-w-2xl rounded-2xl overflow-hidden',
          'bg-zinc-900/90 border border-white/10',
          'shadow-[0_0_0_1px_rgba(255,255,255,0.06),0_24px_64px_rgba(0,0,0,0.8)]',
          'backdrop-blur-2xl flex flex-col',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} className="flex flex-col w-full">
          {/* Header Input */}
          <div className="relative flex items-center px-4 border-b border-white/[0.08] bg-white/[0.02]">
            <IconSearch className="text-zinc-500 shrink-0 ml-1 mr-3" size={18} />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar no arquivo (personagens, locais, facções, lore)…"
              className="w-full bg-transparent py-4 text-sm text-zinc-100 placeholder-zinc-500 outline-none font-sans"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
                title="Limpar busca"
              >
                <IconX size={15} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono tracking-wider text-zinc-500 bg-white/[0.05] border border-white/10">
                ESC
              </kbd>
            )}
          </div>

          {/* Results List */}
          <Command.List className="max-h-96 overflow-y-auto p-2 scroll-py-2 focus:outline-none">
            {query.trim().length < 2 && (
              <div className="py-12 px-6 text-center">
                <p className="text-sm text-zinc-400 font-medium">Atlas & Lore Search</p>
                <p className="text-xs text-zinc-600 mt-1 max-w-sm mx-auto">
                  Digite ao menos 2 caracteres para localizar cards, resumos ou documentos sincronizados.
                </p>
              </div>
            )}

            {query.trim().length >= 2 && isLoading && (
              <div className="py-10 px-6 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
                <p className="text-xs text-zinc-500">Consultando índice do mundo…</p>
              </div>
            )}

            {query.trim().length >= 2 && !isLoading && results.length === 0 && (
              <div className="py-12 px-6 text-center">
                <p className="text-sm text-zinc-400">Nenhum resultado encontrado</p>
                <p className="text-xs text-zinc-600 mt-1">
                  Não encontramos nenhum card com o termo “{query}”.
                </p>
              </div>
            )}

            {results.map((result: SearchResult) => (
              <Command.Item
                key={result.id}
                value={result.id}
                onSelect={() => {
                  onSelect(result.id, result.documentId);
                  setOpen(false);
                }}
                className={[
                  'group flex items-center justify-between gap-3 px-3.5 py-3 rounded-xl cursor-pointer',
                  'transition-all duration-150 text-zinc-300 select-none',
                  'aria-selected:bg-indigo-500/15 aria-selected:text-white aria-selected:border-indigo-500/30 border border-transparent',
                  'hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0 group-aria-selected:bg-indigo-500/20 group-aria-selected:border-indigo-500/40 transition-colors">
                    <IconFileText size={15} className="text-zinc-400 group-aria-selected:text-indigo-300" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-medium text-zinc-200 group-aria-selected:text-white truncate">
                      {result.title}
                    </span>
                    {result.summary && (
                      <span className="text-xs text-zinc-500 group-aria-selected:text-zinc-300/80 truncate mt-0.5 line-clamp-1">
                        {result.summary}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/5 group-aria-selected:bg-indigo-500/20 group-aria-selected:text-indigo-300 group-aria-selected:border-indigo-500/30">
                    Card
                  </span>
                  <kbd className="hidden group-aria-selected:inline-block text-[10px] font-mono text-indigo-300/80">
                    ↵
                  </kbd>
                </div>
              </Command.Item>
            ))}
          </Command.List>

          {/* Footer Shortcuts hint */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-white/[0.06] bg-zinc-950/60 text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] text-zinc-400">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] text-zinc-400">↓</kbd>
                <span className="ml-1">Navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] text-zinc-400">↵</kbd>
                <span className="ml-1">Abrir</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] text-zinc-400">ESC</kbd>
                <span className="ml-1">Fechar</span>
              </span>
            </div>
            <span className="text-[10px] text-zinc-600 font-mono">
              {results.length > 0 ? `${results.length} encontrado(s)` : 'Navegação por teclado'}
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
};
