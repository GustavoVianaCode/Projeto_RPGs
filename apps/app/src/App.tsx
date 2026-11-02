import React, { useEffect, useState } from 'react';
import { WorldEditor } from './components/WorldEditor';
import { Sidebar } from './components/Sidebar';
import { CmdkSearch } from './components/CmdkSearch';

interface DevSession {
  token: string;
  worldId: string;
  documentId: string;
  cardId: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  websocketUrl: string;
}

interface ActiveCard {
  cardId: string;
  documentId: string;
}

// ─── App ─────────────────────────────────────────────────────────────────────
export const App: React.FC = () => {
  const [session, setSession] = useState<DevSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);

  const fetchSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:4000/api/dev/editor-session');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      setSession(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setError(`${message} — verifique se a API está rodando na porta 4000.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  const handleCardSelect = (cardId: string, documentId: string) => {
    setActiveCard({ cardId, documentId });
  };

  // Resolve which documentId / cardId to use in the editor
  const editorDocumentId = activeCard?.documentId ?? session?.documentId ?? '';
  const editorCardId = activeCard?.cardId ?? session?.cardId ?? '';

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-zinc-950">
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside
        className={[
          'w-60 shrink-0 h-full flex flex-col',
          'bg-zinc-900/40 backdrop-blur-lg',
          'border-r border-white/5',
          'px-3 py-5 gap-1',
        ].join(' ')}
      >
        {/* Logotipo / Nome do Projeto */}
        <div className="px-3 mb-4">
          <div className="flex items-center gap-2">
            <span className="text-xl">🌌</span>
            <div>
              <p className="text-zinc-100 font-semibold text-sm leading-tight">Lore OS</p>
              <p className="text-zinc-600 text-xs">Worldbuilding Engine</p>
            </div>
          </div>
        </div>

        {/* Cmd+K hint */}
        <button
          type="button"
          className="flex items-center gap-2 w-full px-3 py-1.5 mb-2 rounded-lg text-xs text-zinc-600 bg-white/3 border border-white/5 hover:bg-white/5 hover:text-zinc-400 transition-all duration-200"
          onClick={() =>
            document.dispatchEvent(
              new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
            )
          }
        >
          <span>🔍</span>
          <span className="flex-1 text-left">Buscar…</span>
          <kbd className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[10px] text-zinc-700">
            Ctrl K
          </kbd>
        </button>

        {/* Dynamic Sidebar Tree */}
        <div className="flex-1 overflow-hidden">
          <Sidebar
            worldId={session?.worldId ?? null}
            token={session?.token ?? null}
            onCardSelect={handleCardSelect}
          />
        </div>

        {/* Divider */}
        <div className="my-2 border-t border-white/5" />

        {/* Dev tools section */}
        <p className="px-3 text-[10px] font-semibold uppercase tracking-widest text-zinc-700 mb-1">
          Dev
        </p>
        <button
          type="button"
          onClick={() => window.open(window.location.href, '_blank')}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-all duration-200"
        >
          <span className="text-base leading-none">👥</span>
          <span className="font-medium">2ª Aba (Collab)</span>
        </button>
        <button
          type="button"
          onClick={fetchSession}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-zinc-500 hover:bg-white/5 hover:text-zinc-300 transition-all duration-200"
        >
          <span className="text-base leading-none">🔄</span>
          <span className="font-medium">Recarregar Sessão</span>
        </button>

        {/* Session badge */}
        <div className="mt-2 flex flex-col gap-2">
          {session && (
            <div className="px-3 py-2 rounded-lg bg-white/3 border border-white/5">
              <p className="text-zinc-400 text-xs font-medium truncate">{session.user.name}</p>
              <p className="text-zinc-600 text-[10px] truncate">{session.user.email}</p>
              <span className="inline-block mt-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-semibold">
                JWT Ativo
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* ── Main Content ─────────────────────────────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto">
        <div className="max-w-3xl mx-auto py-12 px-6">
          {/* Page title */}
          <div className="mb-8">
            <h1 className="text-zinc-100 text-2xl font-bold tracking-tight">
              Editor de Lore
            </h1>
            {session && (
              <p className="text-zinc-600 text-sm mt-1">
                Mundo: <span className="text-zinc-400">{session.worldId}</span>
                {' · '}
                Doc:{' '}
                <span className="text-zinc-400">
                  {activeCard?.documentId ?? session.documentId}
                </span>
                {activeCard && (
                  <>
                    {' · '}
                    Card: <span className="text-zinc-400">{activeCard.cardId}</span>
                  </>
                )}
              </p>
            )}
          </div>

          {/* Loading */}
          {loading && (
            <div className="flex items-center justify-center py-24">
              <div className="flex items-center gap-3 text-zinc-600 text-sm">
                <span className="animate-spin text-base">⏳</span>
                Iniciando sessão de desenvolvimento…
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-5 py-4 mb-6">
              <p className="text-red-400 text-sm font-medium">Falha ao conectar</p>
              <p className="text-red-500/70 text-xs mt-0.5">{error}</p>
              <button
                type="button"
                onClick={fetchSession}
                className="mt-3 px-4 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-all duration-200"
              >
                Tentar Novamente
              </button>
            </div>
          )}

          {/* Editor */}
          {!loading && session && editorDocumentId && (
            <WorldEditor
              key={`${editorCardId}:${editorDocumentId}`}
              worldId={session.worldId}
              documentId={editorDocumentId}
              token={session.token}
              websocketUrl={session.websocketUrl}
            />
          )}

          {/* Dev guide footer */}
          <div className="mt-10 rounded-xl bg-zinc-900/40 backdrop-blur-md border border-white/5 px-6 py-5">
            <h3 className="text-zinc-400 text-xs font-semibold uppercase tracking-widest mb-3">
              Guia de Colaboração
            </h3>
            <ol className="flex flex-col gap-2.5 text-sm text-zinc-600 list-decimal list-inside">
              <li>
                Abra a <span className="text-zinc-400">2ª Aba (Collab)</span> na sidebar e posicione as janelas lado a lado.
              </li>
              <li>
                Digite em qualquer aba — a sincronização é{' '}
                <span className="text-zinc-400">instantânea</span> via Hocuspocus (porta 4001).
              </li>
              <li>
                Pressione{' '}
                <kbd className="text-indigo-400 text-xs bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">
                  Ctrl+K
                </kbd>{' '}
                para busca global de cards.
              </li>
              <li>
                Ao parar de digitar, o Hocuspocus salva o AST JSON e enfileira menções no{' '}
                <span className="text-zinc-400">BullMQ</span> via Redis.
              </li>
            </ol>
          </div>
        </div>
      </main>

      {/* ── Cmd+K Search Modal ────────────────────────────────────────────── */}
      {session && (
        <CmdkSearch
          worldId={session.worldId}
          token={session.token}
          onSelect={handleCardSelect}
        />
      )}
    </div>
  );
};
