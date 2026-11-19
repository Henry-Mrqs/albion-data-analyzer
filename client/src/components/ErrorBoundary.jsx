import { Component } from 'react';
import { isChunkLoadError } from '../lib/errorKinds';
import RestoreSettings from './RestoreSettings';

// IDEIA-071: limite de erro (só classe captura erro de render). NÃO captura erro de manipulador de evento,
// de setTimeout/fetch não aguardado, nem do próprio limite. O fallback não depende de settings.js nem do catálogo.
const NO_ERROR = { error: null, has: false };

const messageOf = (e) => {
  if (e && typeof e === 'object' && typeof e.message === 'string') return e.message;
  return e == null ? '' : String(e);
};

export default class ErrorBoundary extends Component {
  state = NO_ERROR;

  static getDerivedStateFromError(error) {
    return { error, has: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary:', error, info?.componentStack);
  }

  componentDidUpdate(prev) {
    if (this.state.has && prev.resetKey !== this.props.resetKey) this.setState(NO_ERROR);
  }

  render() {
    if (!this.state.has) return this.props.children;
    const { title, reload = () => location.reload(), storage } = this.props;
    const { error } = this.state;

    if (isChunkLoadError(error)) {
      return (
        <div className="banner warn" role="alert">
          <div>
            <strong>Há uma versão nova do app</strong>
            <p style={{ margin: '4px 0 8px' }}>Esta aba não pôde ser carregada porque o app foi atualizado. Recarregue a página.</p>
            <button type="button" className="btn sm" onClick={reload}>
              Recarregar
            </button>
          </div>
        </div>
      );
    }

    const detalhe = messageOf(error);
    return (
      <div className="banner err" role="alert">
        <div>
          <strong>{title ?? 'Algo deu errado ao mostrar esta tela'}</strong>
          <p style={{ margin: '4px 0 8px' }}>
            O app encontrou um erro e parou de desenhar esta parte. Seus preços e os dados do jogo não foram afetados. Isso costuma acontecer quando a configuração salva neste navegador (taxas, cidades, receitas escolhidas) vem de uma versão antiga ou está corrompida. Tente de novo; se o erro voltar, restaure as configurações.
          </p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-start' }}>
            <button type="button" className="btn sm" onClick={() => this.setState(NO_ERROR)}>
              Tentar de novo
            </button>
            <RestoreSettings reload={reload} {...(storage ? { storage } : {})} />
          </div>
          <details style={{ marginTop: 8 }}>
            <summary className="hint">Detalhes técnicos</summary>
            <pre className="hint" style={{ whiteSpace: 'pre-wrap' }}>{detalhe || 'Sem mensagem de erro.'}</pre>
          </details>
        </div>
      </div>
    );
  }
}
