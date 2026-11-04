import React, { useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';
import {
  IconHistory,
  IconPlus,
  IconRotateCcw,
  IconRefresh,
  IconCheck,
  IconAlertTriangle,
  IconX,
} from './icons';

export interface VersionSummary {
  id: string;
  versionNumber: number;
  label: string | null;
  titleSnapshot: string;
  preview: string;
  wordCount: number;
  createdAt: string;
  createdById: string | null;
}

interface CardVersionsPanelProps {
  worldId: string;
  cardId: string;
  token: string;
  onVersionRestored?: () => void;
}

export const CardVersionsPanel: React.FC<CardVersionsPanelProps> = ({
  worldId,
  cardId,
  token,
  onVersionRestored,
}) => {
  const [versions, setVersions] = useState<VersionSummary[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Create checkpoint modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [checkpointLabel, setCheckpointLabel] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Restore confirm modal
  const [versionToRestore, setVersionToRestore] = useState<VersionSummary | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  const fetchVersions = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await apiFetch<VersionSummary[]>(
        `/worlds/${worldId}/cards/${cardId}/versions`,
        token,
      );
      setVersions(list);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha ao buscar histórico de versões';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (worldId && cardId && token) {
      fetchVersions();
    }
  }, [worldId, cardId, token]);

  const handleCreateCheckpoint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      await apiFetch(`/worlds/${worldId}/cards/${cardId}/versions`, token, {
        method: 'POST',
        body: JSON.stringify({ label: checkpointLabel.trim() || undefined }),
      });
      setShowCreateModal(false);
      setCheckpointLabel('');
      setSuccessMsg('Checkpoint salvo com sucesso!');
      setTimeout(() => setSuccessMsg(null), 4000);
      await fetchVersions();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRestoreVersion = async () => {
    if (!versionToRestore || isRestoring) return;

    setIsRestoring(true);
    try {
      await apiFetch(
        `/worlds/${worldId}/cards/${cardId}/versions/${versionToRestore.id}/restore`,
        token,
        { method: 'POST' },
      );
      setVersionToRestore(null);
      setSuccessMsg(
        `Versão #${versionToRestore.versionNumber} restaurada com sucesso! Um backup de segurança do estado anterior foi salvo.`,
      );
      setTimeout(() => setSuccessMsg(null), 5000);
      await fetchVersions();
      onVersionRestored?.();
    } catch (err) {
      console.error(err);
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex flex-col w-full rounded-2xl bg-zinc-900/40 backdrop-blur-xl border border-white/[0.08] p-6 shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between pb-4 border-b border-white/[0.06] mb-6">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <IconHistory size={17} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-zinc-100">
              Histórico de Versões e Checkpoints
            </h2>
            <p className="text-[11px] text-zinc-500">
              Registre pontos de restauração manuais e reverta alterações com segurança
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchVersions}
            title="Atualizar versões"
            className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.06] transition-colors"
          >
            <IconRefresh size={14} className={loading ? 'animate-spin' : ''} />
          </button>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-500 text-white hover:bg-indigo-400 transition-colors shadow-sm"
          >
            <IconPlus size={13} />
            <span>Criar Checkpoint</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300">
          <IconCheck size={15} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="mb-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300">
          {error}
        </div>
      )}

      {loading && (
        <div className="py-16 flex flex-col items-center justify-center gap-2 text-zinc-500 text-xs">
          <div className="w-4 h-4 rounded-full border-2 border-indigo-500/30 border-t-indigo-400 animate-spin" />
          <span>Carregando arquivo de revisões…</span>
        </div>
      )}

      {!loading && versions.length === 0 && (
        <div className="py-16 text-center flex flex-col items-center">
          <div className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-center text-zinc-500 mb-3">
            <IconHistory size={20} />
          </div>
          <h3 className="text-sm font-semibold text-zinc-200">
            Nenhum checkpoint registrado
          </h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm">
            Crie pontos de salvamento para congelar versões do documento antes de grandes reescritas na lore.
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-indigo-500/20 text-indigo-200 border border-indigo-500/30 hover:bg-indigo-500/30 transition-colors"
          >
            <IconPlus size={13} />
            <span>Criar Primeiro Checkpoint</span>
          </button>
        </div>
      )}

      {!loading && versions.length > 0 && (
        <div className="flex flex-col gap-3">
          {versions.map((ver) => {
            const dateStr = new Date(ver.createdAt).toLocaleString('pt-BR', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            });

            return (
              <div
                key={ver.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                <div className="flex flex-col min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 mb-1">
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/15 text-indigo-300 border border-indigo-500/20">
                      v{ver.versionNumber}
                    </span>
                    <span className="text-xs font-semibold text-zinc-200 truncate">
                      {ver.label || `Revisão #${ver.versionNumber}`}
                    </span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-zinc-500 font-mono">
                    <span>{dateStr}</span>
                    <span>·</span>
                    <span>{ver.wordCount} palavras</span>
                  </div>

                  {ver.preview && (
                    <p className="text-xs text-zinc-400/80 mt-2 line-clamp-2 font-serif italic">
                      "{ver.preview}…"
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                  <button
                    type="button"
                    onClick={() => setVersionToRestore(ver)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/[0.04] text-zinc-300 border border-white/[0.08] hover:bg-indigo-500/15 hover:text-indigo-200 hover:border-indigo-500/30 transition-all"
                  >
                    <IconRotateCcw size={13} />
                    <span>Restaurar</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal: Criar Checkpoint ────────────────────────────────────────── */}
      {showCreateModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-5 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-100">
                Criar Checkpoint de Versão
              </h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <IconX size={14} />
              </button>
            </div>

            <form onSubmit={handleCreateCheckpoint} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs text-zinc-400 mb-1 font-medium">
                  Rótulo ou Nota de Revisão (opcional)
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="ex: Antes da reforma militar, Rascunho final do capítulo 3"
                  value={checkpointLabel}
                  onChange={(e) => setCheckpointLabel(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg bg-zinc-950 border border-white/10 text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-indigo-400/50"
                />
              </div>

              <p className="text-[11px] text-zinc-500 leading-relaxed">
                Um instantâneo completo do texto e da estrutura atual será congelado neste momento e poderá ser restaurado a qualquer momento.
              </p>

              <div className="flex items-center justify-end gap-2 mt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-500 text-white hover:bg-indigo-400 disabled:opacity-40 transition-colors"
                >
                  {isSubmitting ? 'Salvando…' : 'Salvar Checkpoint'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Confirmação de Restauração ──────────────────────────────── */}
      {versionToRestore && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/75 backdrop-blur-sm"
          onClick={() => setVersionToRestore(null)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-zinc-900 border border-white/10 p-6 shadow-2xl backdrop-blur-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 text-amber-400 mb-3">
              <IconAlertTriangle size={20} />
              <h3 className="text-sm font-semibold text-zinc-100">
                Restaurar Versão #{versionToRestore.versionNumber}?
              </h3>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              O documento atual será revertido para o estado da revisão{' '}
              <strong className="text-white">"{versionToRestore.label || `v${versionToRestore.versionNumber}`}"</strong>.
            </p>

            <div className="my-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-[11px] text-zinc-400 leading-relaxed">
              <strong className="text-emerald-400 font-semibold block mb-0.5">Proteção de Dados Garantida:</strong>
              Um backup automático do conteúdo que está atualmente no editor será criado imediatamente antes da restauração, para que nada seja perdido.
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setVersionToRestore(null)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isRestoring}
                onClick={handleRestoreVersion}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 text-zinc-950 hover:bg-amber-400 disabled:opacity-40 transition-colors"
              >
                {isRestoring ? 'Restaurando…' : 'Sim, Restaurar Versão'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

