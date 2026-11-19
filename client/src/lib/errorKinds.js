// IDEIA-071: reconhece o erro de carga de um pedaço de código (import() de aba que falha, tipicamente
// depois de um deploy com o index.html antigo em cache). PURO.
const CHUNK_RE = /dynamically imported module|Importing a module script failed|Loading chunk .* failed|Loading CSS chunk/i;

export function isChunkLoadError(error) {
  if (!error || typeof error !== 'object') return false;
  if (error.name === 'ChunkLoadError') return true;
  return typeof error.message === 'string' && CHUNK_RE.test(error.message);
}
