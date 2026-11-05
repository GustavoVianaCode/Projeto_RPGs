import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { WorldEditor } from './components/WorldEditor';
import { Sidebar } from './components/Sidebar';
import { CmdkSearch } from './components/CmdkSearch';
import { CardReferencesPanel } from './components/CardReferencesPanel';
import { TimelineView } from './components/TimelineView';
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
  IconFolder,
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
  const [showDevControls, setShowDevControls] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>('lore');
  const [activeTimelineId, setActiveTimelineId] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState<number>(0);

  // Prevent duplicate concurrent requests in React StrictMode
  const fetchSessionInFlightRef = useRef(false);

  // Fetch development bootstrap session
  const fetchSession = useCallback(async () => {
    if (fetchSessionInFlightRef.current) return;
    fetchSessionInFlightRef.current = true;

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
      fetchSessionInFlightRef.current = false;
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  // Window resize handler: auto-adjust sidebar when transitioning between desktop and mobile
  useEffect(() => {
    let lastWidth = window.innerWidth;
    const handleResize = () => {
      const currentWidth = window.innerWidth;
      const wasDesktop = lastWidth >= 768;
      const isDesktop = currentWidth >= 768;
      if (!wasDesktop && isDesktop) {
        // Opened up to desktop: restore visible sidebar
        setSidebarOpen(true);
      } else if (wasDesktop && !isDesktop) {
        // Shrunk to mobile: close drawer by default so it doesn't obstruct canvas
        setSidebarOpen(false);
      }
      lastWidth = currentWidth;
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch world and cards information for navigation context
  const { data: worldData } = useWorld(session?.worldId ?? null, session?.token ?? null);
  const { data: cardsData } = useCards(session?.worldId ?? null, session?.token ?? null);

  const handleCardSelect = useCallback((cardId: string, documentId: string) => {
    setActiveCard({ cardId, documentId });
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleTimelineSelect = useCallback((timelineId: string) => {
    setActiveTimelineId(timelineId);
    setActiveTab('timelines');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

  const handleNavigateToCardFromView = useCallback((cardId: string, documentId: string) => {
    setActiveCard({ cardId, documentId });
    setActiveTab('lore');
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      setSidebarOpen(false);
    }
  }, []);

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
  const handleMentionClick = useCallback((targetCardId: string) => {
    const found = cardsData?.find((c) => c.id === targetCardId);
    if (found) {
      setActiveCard({ cardId: found.id, documentId: found.documentId });
      setActiveTab('lore');
      if (typeof window !== 'undefined' && window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    }
  }, [cardsData]);

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
          aria-hidden="true"
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-30 md:hidden transition-opacity duration-200"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      <aside
        className={[
          'h-full flex flex-col transition-all duration-300 ease-in-out',
          'bg-[#0d0d11] md:bg-[#0c0c0f] border-r border-white/[0.06]',
          'select-none shrink-0 z-40',
          'fixed inset-y-0 left-0 md:relative md:z-30',
          sidebarOpen
            ? 'w-64 sm:w-72 translate-x-0'
            : '-translate-x-full md:translate-x-0 md:w-0 md:overflow-hidden md:border-r-0',
        ].join(' ')}
      >
        <div className="flex flex-col h-full px-3 py-3.5 gap-2.5 w-64 sm:w-72 overflow-hidden">
          {/* Brand header */}
          <div className="flex items-center justify-between px-2 pt-1 pb-1">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <IconAtlas size={16} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-semibold tracking-tight text-zinc-100 font-sans">
                  Lore OS
                </span>
                <span className="text-[10px] text-zinc-500 font-mono tracking-tight">
                  Workspace Pessoal
                </span>
              </div>
            </div>

            <button
              type="button"
              title="Recolher barra lateral"
              aria-label="Recolher barra lateral"
              onClick={() => setSidebarOpen(false)}
              className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06] transition-colors md:hidden focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              <IconX size={15} />
            </button>
          </div>

          {/* Active World Badge / Selector */}
          <div className="px-2.5 py-2 rounded-lg bg-white/[0.02] border border-white/[0.05] flex items-center gap-2.5">
            <div className="w-5 h-5 rounded-md bg-white/[0.04] border border-white/[0.08] flex items-center justify-center text-zinc-400 shrink-0">
              <IconGlobe size={12} />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-[9px] uppercase font-mono tracking-wider text-zinc-500 leading-none">
                Mundo Ativo
              </span>
              <span className="text-xs font-medium text-zinc-200 truncate mt-0.5 font-sans">
                {worldTitle}
              </span>
            </div>
            <span
              className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
              title="Mundo sincronizado"
            />
          </div>

          {/* Global Search trigger (Ctrl+K) */}
          <button
            type="button"
            className="group flex items-center gap-2.5 w-full px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 bg-white/[0.02] border border-white/[0.05] hover:bg-white/[0.05] hover:text-zinc-200 hover:border-white/[0.08] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            onClick={() =>
              document.dispatchEvent(
                new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
              )
            }
          >
            <IconSearch size={14} className="text-zinc-500 group-hover:text-zinc-300 transition-colors" />
            <span className="flex-1 text-left">Buscar no arquivo…</span>
            <kbd className="px-1.5 py-0.5 rounded bg-white/[0.04] font-mono text-[10px] text-zinc-400 border border-white/[0.06]">
              Ctrl K
            </kbd>
          </button>

          {/* Archive Tree */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <Sidebar
              worldId={session?.worldId ?? null}
              token={session?.token ?? null}
              activeCardId={effectiveCardId}
              activeTimelineId={activeTimelineId}
              onCardSelect={handleCardSelect}
              onTimelineSelect={handleTimelineSelect}
            />
          </div>

          {/* Bottom Session & Discrete Dev Controls */}
          <div className="pt-2 border-t border-white/[0.06] flex flex-col gap-1.5">
            {session && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-white/[0.015] border border-white/[0.04]">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-[11px] font-semibold text-indigo-300 shrink-0">
                      {userInitials}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="text-xs font-medium text-zinc-200 truncate">
                        {session.user.name}
                      </span>
                      <span className="text-[10px] text-zinc-500 truncate font-mono">
                        {session.user.email}
                      </span>
                    </div>
                  </div>

                  {/* Discrete Dev Toggle Button */}
                  <button
                    type="button"
                    title={showDevControls ? 'Ocultar ferramentas locais' : 'Ferramentas de desenvolvimento local'}
                    aria-label="Ferramentas de desenvolvimento local"
                    onClick={() => setShowDevControls((prev) => !prev)}
                    className={[
                      'p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors',
                      showDevControls ? 'bg-white/[0.08] text-zinc-200' : 'hover:bg-white/[0.04]',
                    ].join(' ')}
                  >
                    <IconInfo size={14} />
                  </button>
                </div>

                {/* Subdued Dev Tray (shown only when explicitly expanded by dev) */}
                {showDevControls && (
                  <div className="flex items-center justify-between px-2 py-1 rounded bg-zinc-950/70 border border-white/[0.06] text-[11px]">
                    <span className="text-zinc-500 font-mono text-[10px]">Dev Local:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        title="Abrir 2ª aba (teste de colaboração instantânea)"
                        onClick={() => window.open(window.location.href, '_blank')}
                        className="px-2 py-0.5 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                      >
                        <span className="flex items-center gap-1">
                          <IconExternalLink size={11} />
                          <span>2ª Aba</span>
                        </span>
                      </button>
                      <button
                        type="button"
                        title="Recarregar Sessão"
                        onClick={fetchSession}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                      >
                        <IconRefresh size={12} />
                      </button>
                      <button
                        type="button"
                        title="Guia de Colaboração & CRDT"
                        onClick={() => setShowCollabGuide(true)}
                        className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
                      >
                        <IconInfo size={12} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* ── Main Workspace ───────────────────────────────────────────────── */}
      <main className="flex-1 h-full overflow-y-auto flex flex-col relative bg-[#09090b]">
        {/* Top Navbar */}
        <header className="sticky top-0 z-20 flex items-center justify-between px-4 sm:px-8 py-2.5 bg-[#09090b]/90 backdrop-blur-md border-b border-white/[0.06]">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              aria-label={sidebarOpen ? 'Recolher barra lateral' : 'Expandir barra lateral'}
              title={sidebarOpen ? 'Recolher barra lateral' : 'Expandir barra lateral'}
              onClick={() => setSidebarOpen((prev) => !prev)}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.06] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400 shrink-0"
            >
              <IconSidebar size={16} />
            </button>

            {/* Breadcrumbs */}
            <nav
              aria-label="Navegação do arquivo"
              className="flex items-center gap-1.5 text-xs text-zinc-500 font-mono truncate"
            >
              <span className="text-zinc-400 hover:text-zinc-200 transition-colors truncate">
                {worldTitle}
              </span>
              <span className="text-zinc-600">/</span>
              {currentCard?.folder?.name && (
                <>
                  <span className="text-zinc-400 truncate">{currentCard.folder.name}</span>
                  <span className="text-zinc-600">/</span>
                </>
              )}
              <span className="text-indigo-300 font-medium truncate max-w-[180px] sm:max-w-xs font-sans">
                {cardTitle}
              </span>
            </nav>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {typeof window !== 'undefined' && window.desktopBridge?.isDesktop && (
              <button
                type="button"
                title="Abrir pasta local de dados do aplicativo"
                onClick={() => window.desktopBridge?.openDataFolder()}
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-zinc-300 bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:text-white transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                <IconFolder size={13} className="text-zinc-400" />
                <span>Dados Locais</span>
              </button>
            )}

            {/* Global Search Button */}
            <button
              type="button"
              aria-label="Buscar no arquivo (Ctrl+K)"
              onClick={() =>
                document.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }),
                )
              }
              className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs text-zinc-400 bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.06] hover:text-zinc-200 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
            >
              <IconSearch size={13} className="text-zinc-400" />
              <span className="hidden sm:inline">Buscar</span>
              <kbd className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-white/[0.05] text-[10px] font-mono text-zinc-400 border border-white/[0.06]">
                ⌘K
              </kbd>
            </button>
          </div>
        </header>

        {/* ── Editorial View Navigation Tabs ─────────────────────────────────── */}
        <div
          role="tablist"
          aria-label="Visões do workspace"
          className="flex items-center gap-1 px-4 sm:px-8 py-2 bg-[#09090b]/80 border-b border-white/[0.05] overflow-x-auto scrollbar-none"
        >
          <button
            role="tab"
            aria-selected={activeTab === 'lore'}
            type="button"
            onClick={() => setActiveTab('lore')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors select-none shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
              activeTab === 'lore'
                ? 'bg-white/[0.08] text-zinc-100 border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent',
            ].join(' ')}
          >
            <IconFileText size={14} className={activeTab === 'lore' ? 'text-indigo-400' : 'text-zinc-500'} />
            <span>Crônica & Lore</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'timelines'}
            type="button"
            onClick={() => setActiveTab('timelines')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors select-none shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
              activeTab === 'timelines'
                ? 'bg-white/[0.08] text-zinc-100 border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent',
            ].join(' ')}
          >
            <IconClock size={14} className={activeTab === 'timelines' ? 'text-amber-400' : 'text-zinc-500'} />
            <span>Linhas do Tempo</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'references'}
            type="button"
            onClick={() => setActiveTab('references')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors select-none shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
              activeTab === 'references'
                ? 'bg-white/[0.08] text-zinc-100 border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent',
            ].join(' ')}
          >
            <IconLink size={14} className={activeTab === 'references' ? 'text-indigo-400' : 'text-zinc-500'} />
            <span>Referências Cruzadas</span>
          </button>

          <button
            role="tab"
            aria-selected={activeTab === 'versions'}
            type="button"
            onClick={() => setActiveTab('versions')}
            className={[
              'flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-colors select-none shrink-0 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400',
              activeTab === 'versions'
                ? 'bg-white/[0.08] text-zinc-100 border border-white/[0.08]'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.03] border border-transparent',
            ].join(' ')}
          >
            <IconHistory size={14} className={activeTab === 'versions' ? 'text-indigo-400' : 'text-zinc-500'} />
            <span>Histórico & Checkpoints</span>
          </button>
        </div>

        {/* Central Editorial Area */}
        <div className="flex-1 max-w-4xl w-full mx-auto py-6 sm:py-10 px-4 sm:px-8">
          {/* Loading state */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-32 gap-3 text-zinc-500">
              <div className="w-7 h-7 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin" />
              <p className="text-xs font-mono tracking-wide text-zinc-400">
                Carregando arquivo de worldbuilding…
              </p>
            </div>
          )}

          {/* Connection Error state */}
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-5 mb-8">
              <div className="flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400">
                  <IconX size={15} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xs font-semibold text-rose-300">
                    Não foi possível conectar ao serviço local
                  </h3>
                  <p className="text-xs text-rose-400/80 mt-1 leading-relaxed">{error}</p>
                  {typeof window !== 'undefined' && window.desktopBridge?.isDesktop && (
                    <div className="mt-2 text-[11px] text-zinc-400 bg-black/40 p-2.5 rounded border border-white/[0.04] leading-relaxed">
                      💡 <strong>Fase 2 (Shell Desktop):</strong> A persistência local embutida (Zero-Docker) será introduzida na Fase 3 com SQLite.
                      Nesta etapa, o backend NestJS requer que o <strong>PostgreSQL (porta 5432)</strong> e o <strong>Redis (porta 6379)</strong> estejam em execução.
                    </div>
                  )}
                  <div className="mt-3.5 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={fetchSession}
                      className="px-3 py-1.5 rounded-md text-xs font-medium bg-rose-500/15 text-rose-200 border border-rose-500/30 hover:bg-rose-500/25 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-rose-400"
                    >
                      Tentar Novamente
                    </button>
                    {typeof window !== 'undefined' && window.desktopBridge?.isDesktop && (
                      <>
                        <button
                          type="button"
                          onClick={async () => {
                            setLoading(true);
                            await window.desktopBridge?.restartService();
                            setTimeout(() => fetchSession(), 1500);
                          }}
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-indigo-500/15 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/25 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
                        >
                          Reiniciar Serviço Local
                        </button>
                        <button
                          type="button"
                          onClick={() => window.desktopBridge?.openDataFolder()}
                          className="px-3 py-1.5 rounded-md text-xs font-medium bg-white/[0.05] text-zinc-300 border border-white/[0.1] hover:bg-white/[0.1] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400"
                        >
                          Abrir Pasta de Dados
                        </button>
                      </>
                    )}
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
            <TimelineView
              worldId={session.worldId}
              token={session.token}
              initialTimelineId={activeTimelineId}
              availableCards={availableCardsForMentions}
              onNavigateToCard={handleNavigateToCardFromView}
              onTimelineSelect={(id) => setActiveTimelineId(id)}
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
              <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-zinc-500 mb-3">
                <IconFileText size={20} />
              </div>
              <h2 className="text-sm font-semibold text-zinc-200">Nenhum card selecionado</h2>
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
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCollabGuide(false)}
        >
          <div
            className="w-full max-w-md rounded-xl bg-[#111115] border border-white/10 p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2">
                <IconInfo size={15} className="text-indigo-400" />
                <h3 className="text-sm font-semibold text-zinc-100">
                  Colaboração em Tempo Real & Atalhos
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCollabGuide(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-white/5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
              >
                <IconX size={14} />
              </button>
            </div>

            <div className="mt-4 flex flex-col gap-3 text-xs text-zinc-400 leading-relaxed">
              <p>
                Este workspace utiliza uma arquitetura colaborativa baseada em{' '}
                <strong className="text-zinc-200">CRDTs (Yjs)</strong> e sincronização via{' '}
                <strong className="text-zinc-200">Hocuspocus WebSocket</strong>.
              </p>

              <div className="flex flex-col gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/5 font-sans">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-indigo-400 shrink-0">1.</span>
                  <span>
                    Abra uma segunda aba para testar a sincronização em tempo real simultânea.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-indigo-400 shrink-0">2.</span>
                  <span>
                    Digite ou formate texto: as alterações são mescladas sem conflitos.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-indigo-400 shrink-0">3.</span>
                  <span>
                    Pressione <kbd className="px-1.5 py-0.5 rounded bg-white/10 font-mono text-[10px] text-indigo-300">Ctrl+K</kbd> para busca rápida no arquivo.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-indigo-400 shrink-0">4.</span>
                  <span>
                    Use a ferramenta <strong className="text-zinc-300">@ Menção</strong> para linkar cards e o <strong className="text-zinc-300">Bloco Oculto</strong> para notas de DM.
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCollabGuide(false)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-400 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-indigo-400"
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
