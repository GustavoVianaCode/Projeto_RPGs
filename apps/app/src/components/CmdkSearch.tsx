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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4 bg-black/75 backdrop-blur-sm transition-opacity duration-200"
      onClick={() => setOpen(false)}
    >
      <div
        className={[
          'w-full max-w-xl rounded-xl overflow-hidden',
          'bg-[#101014] border border-white/10',
          'shadow-[0_16px_48px_rgba(0,0,0,0.8)]',
          'flex flex-col',
        ].join(' ')}
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} className="flex flex-col w-full">
          {/* Header Input */}
          <div className="relative flex items-center px-4 border-b border-white/[0.08] bg-[#0c0c10]">
            <IconSearch className="text-zinc-500 shrink-0 ml-0.5 mr-3" size={16} />
            <Command.Input
              autoFocus
              value={query}
              onValueChange={setQuery}
              placeholder="Buscar no arquivo (personagens, locais, eventos, lore)…"
              className="w-full bg-transparent py-3.5 text-sm text-zinc-100 placeholder-zinc-500 outline-none font-sans"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                title="Limpar busca"
                aria-label="Limpar termo de busca"
              >
                <IconX size={14} />
              </button>
            ) : (
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider text-zinc-500 bg-white/[0.04] border border-white/10">
                ESC
              </kbd>
            )}
          </div>

          {/* Results List */}
          <Command.List className="max-h-80 overflow-y-auto p-1.5 scroll-py-1 focus:outline-none">
            {query.trim().length < 2 && (
              <div className="py-10 px-6 text-center">
                <p className="text-xs text-zinc-400 font-medium">Busca no Arquivo do Mundo</p>
                <p className="text-[11px] text-zinc-500 mt-1 max-w-xs mx-auto">
                  Digite ao menos 2 caracteres para localizar cards, resumos e documentos.
                </p>
              </div>
            )}

            {query.trim().length >= 2 && isLoading && (
              <div className="py-10 px-6 text-center flex flex-col items-center justify-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-indigo-400/30 border-t-indigo-400 animate-spin" />
                <p className="text-xs text-zinc-500 font-mono">Consultando índice do mundo…</p>
              </div>
            )}

            {query.trim().length >= 2 && !isLoading && results.length === 0 && (
              <div className="py-10 px-6 text-center">
                <p className="text-xs text-zinc-300 font-medium">Nenhum resultado encontrado</p>
                <p className="text-[11px] text-zinc-500 mt-1">
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
                  'group flex items-center justify-between gap-3 px-3 py-2 rounded-lg cursor-pointer',
                  'transition-colors duration-140 text-zinc-300 select-none',
                  'aria-selected:bg-white/[0.08] aria-selected:text-white',
                  'hover:bg-white/[0.04]',
                ].join(' ')}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-md bg-white/[0.03] border border-white/[0.06] flex items-center justify-center shrink-0 group-aria-selected:border-indigo-400/30 transition-colors">
                    <IconFileText size={14} className="text-zinc-400 group-aria-selected:text-indigo-300" />
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-zinc-200 group-aria-selected:text-white truncate">
                      {result.title}
                    </span>
                    {result.summary && (
                      <span className="text-[11px] text-zinc-500 group-aria-selected:text-zinc-300 truncate line-clamp-1">
                        {result.summary}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[9px] uppercase font-mono tracking-wider px-1.5 py-0.5 rounded bg-white/[0.04] text-zinc-500 border border-white/5 group-aria-selected:text-zinc-300">
                    Card
                  </span>
                  <kbd className="hidden group-aria-selected:inline-block text-[10px] font-mono text-zinc-400">
                    ↵
                  </kbd>
                </div>
              </Command.Item>
            ))}
          </Command.List>

          {/* Footer Shortcuts hint */}
          <div className="flex items-center justify-between px-4 py-2 border-t border-white/[0.06] bg-[#0c0c10] text-[11px] text-zinc-500">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[9px] text-zinc-400">↑</kbd>
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[9px] text-zinc-400">↓</kbd>
                <span className="ml-1 text-[10px]">Navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[9px] text-zinc-400">↵</kbd>
                <span className="ml-1 text-[10px]">Abrir</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[9px] text-zinc-400">ESC</kbd>
                <span className="ml-1 text-[10px]">Fechar</span>
              </span>
            </div>
            <span className="text-[10px] text-zinc-500 font-mono">
              {results.length > 0 ? `${results.length} resultado(s)` : 'Atalhos de teclado'}
            </span>
          </div>
        </Command>
      </div>
    </div>
  );
};
