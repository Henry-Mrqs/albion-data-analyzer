import { useState } from 'react';
import { albionKeys, clearAlbionKeys } from '../lib/resetState';

// IDEIA-071: "Restaurar configurações". NÃO depende de settings.js, do catálogo nem de hooks do app:
// precisa funcionar justamente quando eles estão quebrados. Apaga SÓ as chaves 'albion:*'.
const defaultStorage = () => {
  try {
    return localStorage;
  } catch {
    return null;
  }
};

export default function RestoreSettings({ storage = defaultStorage(), reload = () => location.reload(), compact = false }) {
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(0);
  const count = open ? albionKeys(storage).length : 0;

  const close = () => {
    setOpen(false);
    setFailed(0);
  };
  const confirm = () => {
    const r = clearAlbionKeys(storage);
    if (r.failed.length > 0) {
      setFailed(r.failed.length);
      return;
    }
    reload();
  };

  if (!open) {
    return (
      <button type="button" className={`btn ghost${compact ? ' sm' : ''}`} onClick={() => setOpen(true)}>
        Restaurar configurações
      </button>
    );
  }
  return (
    <div className="banner warn" role="group" aria-label="Confirmação para restaurar configurações" style={{ textAlign: 'left' }}>
      <div>
        {count === 0 ? (
          <p style={{ margin: '0 0 8px' }}>Não há configurações salvas neste navegador.</p>
        ) : (
          <p style={{ margin: '0 0 8px' }}>
            <strong>Restaurar configurações?</strong>{' '}
            Isto apaga as configurações salvas por este app neste navegador (servidor, Premium, taxas de bancada, cidades, itens e receitas escolhidas, avisos já dispensados):{' '}
            <strong>{count === 1 ? '1 item' : `${count} itens`}</strong>. Preços e dados do jogo não são afetados e nada fora do app é apagado. A página será recarregada.
          </p>
        )}
        {failed > 0 && (
          <p role="alert" style={{ margin: '0 0 8px', color: 'var(--bad, #f87171)' }}>
            Não foi possível apagar {failed} {failed === 1 ? 'item' : 'itens'}. A página não foi recarregada.
          </p>
        )}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="btn sm" disabled={count === 0} onClick={confirm}>
            Apagar e recarregar
          </button>
          <button type="button" className="btn sm ghost" onClick={close}>
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
