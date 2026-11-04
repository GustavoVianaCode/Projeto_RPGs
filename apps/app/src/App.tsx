import React, { useEffect, useState, useMemo } from 'react';
import { WorldEditor } from './components/WorldEditor';
import { Sidebar } from './components/Sidebar';
import { CmdkSearch } from './components/CmdkSearch';
import { CardReferencesPanel } from './components/CardReferencesPanel';
import { TimelinesView } from './components/TimelinesView';
import { CardVersionsPanel } from './components/CardVersionsPanel';
import { useWorld, useCards } from './hooks/useSidebarTree';
import {
  IconAtlas,
  IconSearch,
  IconExternalLink,
  IconRefresh,
  IconSidebar,
  IconGlobe,
  IconInfo,
  IconX,
  IconFileText,
  IconClock,
  IconLink,
  IconHistory,
} from './components/icons';

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

type WorkspaceTab = 'lore' | 'timelines' | 'references' | 'versions';

// ─── App Component ───────────────────────────────────────────────────────────
export const App: React.FC = () => {
  const [session, setSession] = useState<DevSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeCard, setActiveCard] = useState<ActiveCard | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 768 : true,
  );
  const [showCollabGuide, setShowCollabGuide] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('lore');
  const [editorKey, setEditorKey] = useState<number>(0);

  // Fetch development bootstrap session
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

  // Fetch world and cards information for rich breadcrumbs and navigation context
  const { data: worldData } = useWorld(session?.worldId ?? null, session?.token ?? null);
  const { data: cardsData } = useCards(session?.worldId ?? null, session?.token ?? null);

  const handleCardSelect = (cardId: string, documentId: string) => {
    setActiveCard({ cardId, documentId });
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  const handleNavigateToCardFromView = (cardId: string, documentId: string) => {
    setActiveCard({ cardId, documentId });
    setActiveTab('lore');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  };

  // Resolve current active card ID and document ID
  const effectiveCardId = activeCard?.cardId ?? session?.cardId ?? '';
  const effectiveDocumentId = activeCard?.documentId ?? session?.documentId ?? '';

  // Find active card entity for metadata
  const currentCard = useMemo(() => {
    if (!cardsData || !effectiveCardId) return null;
    return cardsData.find((c) => c.id === effectiveCardId) ?? null;
  }, [cardsData, effectiveCardId]);

  // Derived breadcrumbs and titles
  const worldTitle = worldData?.name ?? 'Arquivo do Mundo';
  const cardTitle = currentCard?.title ?? 'Documento Principal';
  const cardTypeName = currentCard?.cardType?.name ?? 'Documento';

  const breadcrumbs = useMemo(() => {
    const list: string[] = [worldTitle];
    if (currentCard?.folder?.name) {
      list.push(currentCard.folder.name);
    }
    list.push(cardTitle);
    return list;
  }, [worldTitle, currentCard, cardTitle]);

  // Prepared available cards list for TipTap mentions
  const availableCardsForMentions = useMemo(() => {
    if (!cardsData) return [];
    return cardsData.map((c) => ({
      id: c.id,
      title: c.title,
      documentId: c.documentId,
    }));
  }, [cardsData]);

  // Handle clicking a mention tag in the editor to navigate to that card
  const handleMentionClick = (targetCardId: string) => {
    const found = cardsData?.find((c) => c.id === targetCardId);
    if (found) {
      setActiveCard({ cardId: found.id, documentId: found.documentId });
      setActiveTab('lore');
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  };

  // User initials for monogram
  const userInitials = useMemo(() => {
    if (!session?.user?.name) return 'WS';
    return session.user.name
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }, [session?.user?.name]);

  return (
    <div className="h-screen w-screen overflow-hidden flex bg-[#09090b] text-zinc-200">
      {/* Mobile Backdrop when Sidebar Drawer is Open */}
      {sidebarOpen && (
        <div
          role="presentation"
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 md:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={[
          'h-full flex flex-col transition-all duration-300 ease-in-out',
          'bg-zinc-900/95 md:bg-zinc-900/50 backdrop-blur-2xl border-r border-white/[0.06]',
          'select-none shrink-0 z-40',
          'fixed inset-y-0 left-0 md:relative md:z-30',
          sidebarOpen
            ? 'w-64 sm:w-72 translate-x-0'
            : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0',
        ].join(' ')}
      >
        <div className="flex flex-col h-full px-3 py-4 gap-3 w-64 sm:w-72 overflow-hidden">
          {/* Brand header */}
          <div className="flex items-center justify-between px-2 pt-1 pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shadow-[0_0_12px_rgba(99,102,241,0.15)]">
                <IconAtlas size={18} />
              </div>
              <div>
                <h2 className="text-sm font-semibold tracking-tight text-zinc-100 flex items-center gap-1.5">
                  Lore OS
                  <span className="text-[10px] font-mono font-normal px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                    Atlas
                  </span>
                </h2>
                <p className="text-[11px] text-zinc-500 tracking-tight">Worldbuilding Engine</p>
              </div>
            </div>

            <button
              type="button"
              title="Recolher barra lateral"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors md:hidden"
            >
              <IconX size={15} />
            </button>
          </div>

          {/* Active World Badge / Selector */}
          <div className="px-2 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 shrink-0">
              <IconGlobe size={13} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 leading-none">
                Mundo Ativo
              </span>
              <span className="text-xs font-medium text-zinc-200 truncate mt-0.5">
                {worldTitle}
              </span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399] shrink-0" />
          </div>

          {/* Global Search trigger (Ctrl+K) */}
          <button
            type="button"
            className="group flex items-center gap-2.5 w-full px-3 py-2 rounded-xl text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.07] hover:text-zinc-200 hover:border-white/[0.1] transition-all duration-150"
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
              )
            }
          >
            <IconSearch size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span className="flex-1 text-left">Buscar no arquivo…</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.06] font-mono text-[10px] text-zinc-400 border border-white/5">
              Ctrl K
            </kbd>
          </button>

          {/* Archive Tree */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Sidebar
              worldId={session?.worldId ?? null}
              token={session?.token ?? null}
              activeCardId={effectiveCardId}
              onCardSelect={handleCardSelect}
            />
          </div>

          {/* Bottom Session & Dev Controls */}
          <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-2">
            {session && (
              <div className="flex items-center justify-between px-2.5 py-2 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-semibold text-indigo-300 shrink-0">
                    {userInitials}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-xs font-medium text-zinc-200 truncate">
                      {session.user.name}
                    </span>
                    <span className="text-[10px] text-zinc-500 truncate">
                      {session.user.email}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    title="Ajuda e Guia de Colaboração"
                    onClick={() => setShowCollabGuide(true)}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                  >
                    <IconInfo size={14} />
                  </button>
                  <button
                    type="button"
                    title="Abrir 2ª aba (teste de colaboração instantânea)"
                    onClick={() => window.open(window.location.href, '_blank')}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                  >
                    <IconExternalLink size={14} />
                  </button>
                  <button
                    type="button"
                    title="Recarregar Sessão"
                    onClick={fetchSession}
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/10 transition-colors"
                  >
                    <IconRefresh size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Workspace ───────────────────────────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto flex flex-col relative">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-3 bg-[#09090b]/80 backdrop-blur-xl border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label={sidebarOpen ? 'Ocultar barra lateral' : 'Mostrar barra lateral'}
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
            >
              <IconSidebar size={17} />
            </button>

            {/* Breadcrumbs */}
            <nav aria-label="Navegação hierárquica" className="hidden sm:flex items-center gap-2 text-xs font-mono text-zinc-500">
              <span className="text-zinc-400">{worldTitle}</span>
              <span>/</span>
              {currentCard?.folder?.name && (
                <>
                  <span className="text-zinc-400">{currentCard.folder.name}</span>
                  <span>/</span>
                </>
              )}
              <span className="text-indigo-300 font-medium truncate max-w-xs">{cardTitle}</span>
            </nav>
          </div>

          <div className="flex items-center gap-2">
            {/* Mobile Search Button */}
            <button
              type="button"
              aria-label="Buscar no arquivo"
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
                )
              }
              className="inline-flex sm:hidden p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors"
            >
              <IconSearch size={16} />
            </button>

            <button
              type="button"
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
                )
              }
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-zinc-400 bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.08] hover:text-zinc-200 transition-colors"
            >
              <IconSearch size={13} />
              <span>Buscar</span>
              <kbd className="px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono">⌘K</kbd>
            </button>

            <button
              type="button"
              title="Abrir 2ª Aba para testar colaboração em tempo real"
              onClick={() => window.open(window.location.href, '_blank')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-colors"
            >
              <IconExternalLink size={13} />
              <span className="hidden md:inline">2ª Aba (Collab)</span>
            </button>
          </div>
        </header>

        {/* ── Editorial View Navigation Tabs ─────────────────────────────────── */}
        <div className="flex items-center gap-1 px-4 sm:px-8 py-2 bg-[#09090b]/60 backdrop-blur-md border-b border-white/[0.05] overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('lore')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none shrink-0',
              activeTab === 'lore'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent',
            ].join(' ')}
          >
            <IconFileText size={14} className={activeTab === 'lore' ? 'text-indigo-400' : ''} />
            <span>Crônica & Lore</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('timelines')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none shrink-0',
              activeTab === 'timelines'
                ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30 shadow-[0_0_12px_rgba(245,158,11,0.15)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent',
            ].join(' ')}
          >
            <IconClock size={14} className={activeTab === 'timelines' ? 'text-amber-400' : ''} />
            <span>Linhas do Tempo</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('references')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none shrink-0',
              activeTab === 'references'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent',
            ].join(' ')}
          >
            <IconLink size={14} className={activeTab === 'references' ? 'text-indigo-400' : ''} />
            <span>Referências Cruzadas</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('versions')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all select-none shrink-0',
              activeTab === 'versions'
                ? 'bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 shadow-[0_0_12px_rgba(99,102,241,0.15)]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent',
            ].join(' ')}
          >
            <IconHistory size={14} className={activeTab === 'versions' ? 'text-indigo-400' : ''} />
            <span>Histórico & Checkpoints</span>
          </button>
        </div>

        {/* Central Editorial Area */}
        <div className="flex-1 max-w-4xl w-full mx-auto py-8 sm:py-12 px-4 sm:px-8">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-500">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="text-sm font-sans tracking-wide">
                Carregando arquivo de worldbuilding…
              </p>
            </div>
          )}

          {/* Connection Error state */}
          {error && (
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-6 mb-8 backdrop-blur-md">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-rose-500/10 text-rose-400">
                  <IconX size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-rose-300">
                    Não foi possível conectar ao servidor
                  </h3>
                  <p className="text-xs text-rose-400/80 mt-1 leading-relaxed">{error}</p>
                  <div className="mt-4 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchSession}
                      className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-rose-500/20 text-rose-200 border border-rose-500/30 hover:bg-rose-500/30 transition-colors"
                    >
                      Tentar Novamente
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 1: Main TipTap Editor */}
          {!loading && session && effectiveDocumentId && activeTab === 'lore' && (
            <WorldEditor
              key={`${effectiveCardId}:${effectiveDocumentId}:${editorKey}`}
              worldId={session.worldId}
              documentId={effectiveDocumentId}
              token={session.token}
              websocketUrl={session.websocketUrl}
              cardTitle={cardTitle}
              cardType={cardTypeName}
              breadcrumbs={breadcrumbs}
              availableCards={availableCardsForMentions}
              onMentionClick={handleMentionClick}
            />
          )}

          {/* Tab 2: Timelines & Historical Events */}
          {!loading && session && activeTab === 'timelines' && (
            <TimelinesView
              worldId={session.worldId}
              token={session.token}
              availableCards={availableCardsForMentions}
              onNavigateToCard={handleNavigateToCardFromView}
            />
          )}

          {/* Tab 3: Backlinks & Cross-references */}
          {!loading && session && effectiveCardId && activeTab === 'references' && (
            <CardReferencesPanel
              worldId={session.worldId}
              cardId={effectiveCardId}
              token={session.token}
              onNavigateToCard={handleNavigateToCardFromView}
            />
          )}

          {/* Tab 4: Version Checkpoints & History */}
          {!loading && session && effectiveCardId && activeTab === 'versions' && (
            <CardVersionsPanel
              worldId={session.worldId}
              cardId={effectiveCardId}
              token={session.token}
              onVersionRestored={() => setEditorKey((k) => k + 1)}
            />
          )}

          {!loading && session && !effectiveDocumentId && (
            <div className="py-24 text-center flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-zinc-500 mb-4">
                <IconFileText size={24} />
              </div>
              <h2 className="text-base font-semibold text-zinc-200">Nenhum card selecionado</h2>
              <p className="text-xs text-zinc-500 mt-1 max-w-sm">
                Selecione um documento na barra lateral ou use a busca global para abrir um card do mundo.
              </p>
            </div>
          )}
        </div>
      </main>

      {/* ── Modal de Guia de Colaboração & Informações de Sessão ──────────── */}
      {showCollabGuide && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-md"
          onClick={() => setShowCollabGuide(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <IconInfo size={16} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Colaboração em Tempo Real & Atalhos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCollabGuide(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/5 transition-colors"
              >
                <IconX size={15} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-4 text-xs text-zinc-400 leading-relaxed">
              <p>
                Este workspace utiliza uma arquitetura colaborativa baseada em{' '}
                <strong className="text-zinc-200">CRDTs (Yjs)</strong> e sincronização via{' '}
                <strong className="text-zinc-200">Hocuspocus WebSocket</strong>.
              </p>

              <div className="flex flex-col gap-2.5 p-3.5 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-indigo-400 shrink-0">1.</span>
                  <span>
                    Clique em <strong className="text-zinc-300">2ª Aba (Collab)</strong> para abrir outra janela em paralelo.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-indigo-400 shrink-0">2.</span>
                  <span>
                    Digite ou formate texto: as alterações são refletidas instantaneamente sem conflitos.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-indigo-400 shrink-0">3.</span>
                  <span>
                    Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-indigo-300">Ctrl+K</kbd> para busca global por título e resumo.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-indigo-400 shrink-0">4.</span>
                  <span>
                    Use a ferramenta <strong className="text-zinc-300">@ Menção</strong> para linkar cards e o <strong className="text-zinc-300">Bloco Oculto</strong> para segredos de DM.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCollabGuide(false)}
                className="px-4 py-2 rounded-xl text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-400 transition-colors"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

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
