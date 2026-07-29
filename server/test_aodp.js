import { fetchAndCachePrices } from './worker.js';
import { query } from './db.js';

async function testFetch() {
  const ids = ['T4_BURDOCK', 'T3_COMFREY', 'T4_POTION_POISON'];
  try {
    console.log("Triggering price sync for corrected IDs...");
    await fetchAndCachePrices(ids);
    
    for (const id of ids) {
      const rows = await query.all(
        'SELECT * FROM prices WHERE item_id = ? AND city = ?',
        [id, 'Caerleon']
      );
      console.log(`Newly cached prices in DB for ${id} in Caerleon:`, JSON.stringify(rows, null, 2));
    }
  } catch (err) {
    console.error(err);
  }
}
testFetch();
