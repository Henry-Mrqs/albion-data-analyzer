import { beforeEach, describe, expect, it, vi } from 'vitest';
import { clearGoldCache, fetchGold, goldUrl, parseGold } from './gold';
import { MarketError } from './market';

// Linhas reais da API (dossiê P3, 2026-11-18).
const ROWS = [
  { price: 9416, timestamp: '2026-11-17T23:00:00' },
  { price: 9414, timestamp: '2026-11-18T00:00:00' },
  { price: 9411, timestamp: '2026-11-18T01:00:00' },
];
const T = Date.UTC(2026, 10, 18, 1);

beforeEach(() => clearGoldCache());

describe('goldUrl', () => {
  it('west/europe/east com count 1 (padrão) e count 3', () => {
    expect(goldUrl('west')).toBe('https://west.albion-online-data.com/api/v2/stats/gold?count=1');
    expect(goldUrl('europe')).toBe('https://europe.albion-online-data.com/api/v2/stats/gold?count=1');
    expect(goldUrl('east')).toBe('https://east.albion-online-data.com/api/v2/stats/gold?count=1');
    expect(goldUrl('west', 3)).toBe('https://west.albion-online-data.com/api/v2/stats/gold?count=3');
  });
});

describe('parseGold', () => {
  it('devolve o ponto mais recente por timestamp, em qualquer ordem', () => {
    expect(parseGold(ROWS)).toEqual({ price: 9411, t: T });
    expect(parseGold([...ROWS].reverse())).toEqual({ price: 9411, t: T });
    expect(parseGold([ROWS[2], ROWS[0], ROWS[1]])).toEqual({ price: 9411, t: T });
  });

  it('price 0, negativo, NaN, texto, ausente e timestamp inválido são ignorados; só lixo -> null', () => {
    const lixo = [
      { price: 0, timestamp: '2026-11-18T05:00:00' },
      { price: -3, timestamp: '2026-11-18T05:00:00' },
      { price: NaN, timestamp: '2026-11-18T05:00:00' },
      { price: '9000', timestamp: '2026-11-18T05:00:00' },
      { timestamp: '2026-11-18T05:00:00' },
      { price: 9000, timestamp: 'ontem' },
      { price: 9000 },
      null,
      7,
    ];
    expect(parseGold(lixo)).toBeNull();
    // o ruim mais novo não esconde o bom mais velho
    expect(parseGold([...lixo, ROWS[0]])).toEqual({ price: 9416, t: Date.UTC(2026, 10, 17, 23) });
  });

  it('rows null/objeto/texto/vazio -> null, sem lançar', () => {
    for (const r of [null, undefined, {}, 'x', 5, []]) expect(parseGold(r)).toBeNull();
  });
});

describe('fetchGold', () => {
  it('usa requestFn com a URL e o rótulo "ouro"; 2ª chamada em < 3 min não requisita; depois de 3 min requisita', async () => {
    const requestFn = vi.fn(async () => ROWS);
    const a = await fetchGold({ server: 'west', now: 1000, requestFn });
    expect(a).toEqual({ price: 9411, t: T });
    expect(requestFn).toHaveBeenCalledTimes(1);
    expect(requestFn).toHaveBeenCalledWith('https://west.albion-online-data.com/api/v2/stats/gold?count=1', undefined, 'ouro');
    await fetchGold({ server: 'west', now: 1000 + 3 * 60 * 1000 - 1, requestFn });
    expect(requestFn).toHaveBeenCalledTimes(1);
    await fetchGold({ server: 'west', now: 1000 + 3 * 60 * 1000, requestFn });
    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it('force ignora o cache (botão de atualizar)', async () => {
    const requestFn = vi.fn(async () => ROWS);
    await fetchGold({ server: 'west', now: 1000, requestFn });
    await fetchGold({ server: 'west', now: 1001, requestFn, force: true });
    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it('servidor diferente não compartilha o cache', async () => {
    const requestFn = vi.fn(async () => ROWS);
    await fetchGold({ server: 'west', now: 1000, requestFn });
    await fetchGold({ server: 'europe', now: 1001, requestFn });
    expect(requestFn).toHaveBeenCalledTimes(2);
    expect(requestFn.mock.calls[1][0]).toContain('europe.');
  });

  it('erro do requestFn é repassado como está e NÃO entra no cache', async () => {
    const err = new MarketError('Limite de requisições da API atingido.', 'throttle', 5);
    const requestFn = vi.fn().mockRejectedValueOnce(err).mockResolvedValueOnce(ROWS);
    await expect(fetchGold({ server: 'west', now: 1000, requestFn })).rejects.toBe(err);
    expect((await fetchGold({ server: 'west', now: 1001, requestFn })).price).toBe(9411);
    expect(requestFn).toHaveBeenCalledTimes(2);
  });

  it('resposta vazia ([]) ou só lixo -> erro claro, não preço 0, e não cacheia', async () => {
    const requestFn = vi.fn(async () => []);
    await expect(fetchGold({ server: 'west', now: 1000, requestFn })).rejects.toThrow('A API não devolveu o preço do ouro');
    await expect(fetchGold({ server: 'west', now: 1001, requestFn })).rejects.toThrow('A API não devolveu o preço do ouro');
    expect(requestFn).toHaveBeenCalledTimes(2);
  });
});
