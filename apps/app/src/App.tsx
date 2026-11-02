import React, { useEffect, useState } from 'react';
import { WorldEditor } from './components/WorldEditor';

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

export const App: React.FC = () => {
  const [session, setSession] = useState<DevSession | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('http://localhost:4000/api/dev/editor-session');
      if (!response.ok) {
        throw new Error(`Falha ao obter sessão de desenvolvimento: HTTP ${response.status}`);
      }
      const data = await response.json();
      setSession(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro ao conectar à API (localhost:4000)';
      setError(`${message}. Verifique se a API está rodando na porta 4000.`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSession();
  }, []);

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '32px 20px', minHeight: '100vh' }}>
      {/* Brand Header */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span
              style={{
                backgroundColor: '#e11d48',
                color: '#ffffff',
                padding: '4px 8px',
                borderRadius: '6px',
                fontWeight: 800,
                fontSize: '14px',
                letterSpacing: '0.05em',
              }}
            >
              CYBERCORE
            </span>
            <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#0f172a' }}>
              Plataforma de Worldbuilding — Teste do Editor TipTap & Hocuspocus
            </h1>
          </div>
          <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
            Módulo 3: Sincronização Yjs via WebSocket (Porta 4001) + API NestJS (Porta 4000)
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => window.open(window.location.href, '_blank')}
            style={{
              padding: '8px 14px',
              backgroundColor: '#e11d48',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 1px 2px rgba(225, 29, 72, 0.3)',
            }}
          >
            👥 Abrir 2ª Aba para Colaboração
          </button>
          <button
            type="button"
            onClick={fetchSession}
            style={{
              padding: '8px 14px',
              backgroundColor: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            🔄 Recarregar Sessão
          </button>
        </div>
      </header>

      {/* Session / State Details Card */}
      {session && (
        <div
          style={{
            backgroundColor: '#ffffff',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 18px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '12px',
            color: '#475569',
          }}
        >
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
            <span>
              <strong>Usuário:</strong> {session.user.name} ({session.user.email})
            </span>
            <span>
              <strong>Mundo:</strong> {session.worldId}
            </span>
            <span>
              <strong>Documento:</strong> {session.documentId}
            </span>
            <span>
              <strong>WebSocket:</strong> {session.websocketUrl}
            </span>
          </div>
          <span
            style={{
              backgroundColor: '#ecfdf5',
              color: '#059669',
              padding: '2px 8px',
              borderRadius: '12px',
              fontWeight: 600,
              fontSize: '11px',
            }}
          >
            Token JWT Ativo
          </span>
        </div>
      )}

      {/* Main Content Area */}
      {loading && (
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '8px',
            padding: '60px 20px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>
            Iniciando sessão de desenvolvimento e autenticando...
          </div>
        </div>
      )}

      {error && (
        <div
          style={{
            backgroundColor: '#fff1f2',
            border: '1px solid #fecdd3',
            color: '#be123c',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '20px',
          }}
        >
          <strong>Erro ao inicializar o teste:</strong> {error}
          <div style={{ marginTop: '8px' }}>
            <button
              type="button"
              onClick={fetchSession}
              style={{
                padding: '6px 12px',
                backgroundColor: '#be123c',
                color: '#ffffff',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '12px',
                fontWeight: 600,
              }}
            >
              Tentar Novamente
            </button>
          </div>
        </div>
      )}

      {!loading && session && (
        <WorldEditor
          worldId={session.worldId}
          documentId={session.documentId}
          token={session.token}
          websocketUrl={session.websocketUrl}
        />
      )}

      {/* Collaboration Guide */}
      <footer
        style={{
          marginTop: '28px',
          padding: '18px 22px',
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          fontSize: '13px',
          color: '#334155',
          lineHeight: '1.6',
        }}
      >
        <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginBottom: '8px' }}>
          💡 Como simular e validar a colaboração em tempo real:
        </h3>
        <ol style={{ paddingLeft: '20px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <li>
            Clique no botão <strong>"👥 Abrir 2ª Aba para Colaboração"</strong> no topo direito (ou abra duas janelas lado a lado).
          </li>
          <li>
            Digite, formate ou delete textos em qualquer uma das abas: a sincronização ocorre <strong>instantaneamente</strong> via WebSocket no Hocuspocus (porta 4001).
          </li>
          <li>
            Teste os botões customizados: <code>@ Menção</code> (insere um link de card), <code>[!] Spoiler</code> e <code>🔒 Bloco Oculto</code>.
          </li>
          <li>
            Ao parar de digitar, o Hocuspocus aplica debounce nativo e salva o estado binário Yjs, o AST JSON e o <code>plainText</code> no PostgreSQL, enfileirando as menções no <code>BullMQ</code> via Redis.
          </li>
        </ol>
      </footer>
    </div>
  );
};

