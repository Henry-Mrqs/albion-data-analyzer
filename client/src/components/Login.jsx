import React, { useState } from 'react';
import { ShieldAlert, Lock, User, AlertCircle, RefreshCw } from 'lucide-react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError('Por favor, preencha todos os campos.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao realizar login');
      }

      onLogin(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      width: '100vw',
      padding: '24px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background grid and shapes */}
      <div style={{
        position: 'absolute',
        top: '-15%',
        left: '-15%',
        width: '50%',
        height: '50%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(138, 75, 245, 0.15) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute',
        bottom: '-15%',
        right: '-15%',
        width: '50%',
        height: '50%',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(0, 176, 255, 0.1) 0%, transparent 70%)',
        filter: 'blur(50px)',
        pointerEvents: 'none'
      }} />

      <div className="glass-panel" style={{
        maxWidth: '420px',
        width: '100%',
        padding: '40px 32px',
        border: '1px solid rgba(138, 75, 245, 0.25)',
        boxShadow: '0 15px 35px rgba(0, 0, 0, 0.5), 0 0 30px rgba(138, 75, 245, 0.05)',
        zIndex: 10
      }}>
        {/* Header Icon */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
          <div style={{
            background: 'linear-gradient(135deg, var(--color-primary) 0%, #621be5 100%)',
            width: '64px',
            height: '64px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: 'var(--glow-primary)'
          }}>
            <ShieldAlert size={36} color="white" />
          </div>
        </div>

        {/* Title */}
        <h2 style={{
          fontSize: '26px',
          fontWeight: 800,
          textAlign: 'center',
          marginBottom: '8px',
          fontFamily: 'var(--font-display)',
          letterSpacing: '-0.5px'
        }}>
          ALBION MARKET
        </h2>
        <p style={{
          color: 'var(--text-secondary)',
          fontSize: '14px',
          textAlign: 'center',
          marginBottom: '32px'
        }}>
          Acesso Privado - Grupo de Amigos
        </p>

        {/* Error Alert */}
        {error && (
          <div style={{
            background: 'rgba(255, 23, 68, 0.08)',
            border: '1px solid rgba(255, 23, 68, 0.3)',
            borderRadius: '8px',
            padding: '12px 16px',
            color: '#ff8a80',
            fontSize: '14px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            gap: '10px'
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label className="input-label" htmlFor="username">Usuário</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}>
                <User size={16} />
              </span>
              <input
                id="username"
                className="input-field"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Insira o seu usuário"
                style={{ paddingLeft: '44px' }}
                disabled={loading}
              />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '32px' }}>
            <label className="input-label" htmlFor="password">Senha</label>
            <div style={{ position: 'relative' }}>
              <span style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-muted)'
              }}>
                <Lock size={16} />
              </span>
              <input
                id="password"
                className="input-field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingLeft: '44px' }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ width: '100%', height: '48px' }}
            disabled={loading}
          >
            {loading ? (
              <RefreshCw className="animate-spin" size={18} style={{ animation: 'spin 1.5s linear infinite' }} />
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        {/* Info Footnote */}
        <div style={{
          marginTop: '32px',
          textAlign: 'center',
          fontSize: '11px',
          color: 'var(--text-muted)',
          lineHeight: '1.4'
        }}>
          Este sistema econômico é de uso exclusivo de membros autorizados. Cadastros são gerenciados manualmente no banco de dados.
        </div>
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
