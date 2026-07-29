import { query } from './db.js';

const CITIES = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Black Market', 'BlackMarket'];

let dbLockPromise = Promise.resolve();

// Helper to chunk an array into smaller sizes
function chunkArray(array, size) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

// Function to fetch prices from AODP for a list of item IDs
export async function fetchAndCachePrices(itemIds) {
  if (!itemIds || itemIds.length === 0) return;
  
  // Normalise list of item IDs
  const uniqueIds = [...new Set(itemIds)];
  console.log(`Fetching prices for ${uniqueIds.length} items from AODP...`);
  
  // AODP supports batching, but let's chunk it to max 100 items per request to avoid huge URLs
  const chunks = chunkArray(uniqueIds, 100);
  
  for (const chunk of chunks) {
    const itemsParam = chunk.join(',');
    const locationsParam = CITIES.join(',');
    const url = `https://west.albion-online-data.com/api/v2/stats/prices/${itemsParam}?locations=${locationsParam}`;
    
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`AODP API returned HTTP ${response.status}`);
      }
      
      const data = await response.json();
      if (!Array.isArray(data)) continue;
      
      // Update database inside a transaction, serialized using dbLockPromise
      dbLockPromise = dbLockPromise.then(async () => {
        await query.run('BEGIN TRANSACTION');
        try {
          for (const record of data) {
            // Normalize Caerleon and Black Market names
            let city = record.city;
            if (city === 'BlackMarket') city = 'Black Market';
            
            // Ignore items or cities that aren't in our list
            if (!CITIES.includes(city) && city !== 'BlackMarket') continue;
            
            // Accept qualities 1 to 5 (0 is normalized to 1)
            let quality = record.quality || 1;
            if (quality < 1 || quality > 5) continue;
            
            await query.run(
              `INSERT OR REPLACE INTO prices (
                item_id, city, quality,
                sell_price_min, sell_price_min_date, 
                sell_price_max, sell_price_max_date, 
                buy_price_min, buy_price_min_date, 
                buy_price_max, buy_price_max_date, 
                updated_at
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
              [
                record.item_id,
                city,
                quality,
                record.sell_price_min || 0,
                record.sell_price_min_date,
                record.sell_price_max || 0,
                record.sell_price_max_date,
                record.buy_price_min || 0,
                record.buy_price_min_date,
                record.buy_price_max || 0,
                record.buy_price_max_date
              ]
            );
          }
          await query.run('COMMIT');
        } catch (err) {
          try {
            await query.run('ROLLBACK');
          } catch (rollbackErr) {
            // Rollback might fail if the transaction was already closed or not started
          }
          console.error('Error in database transaction for prices:', err.message);
        }
      });
      await dbLockPromise;
      
    } catch (err) {
      console.error(`Failed to fetch prices for chunk of size ${chunk.length}:`, err.message);
    }
    
    // Small sleep between requests to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  console.log(`Prices update completed for ${uniqueIds.length} items.`);
}

// Background worker runner
export async function startWorker() {
  console.log('Price Update Worker started.');
  
  const runWorkerJob = async () => {
    try {
      console.log('Worker: Running periodic price update...');
      // Get all items to update (resources + equipment + consumables)
      const rows = await query.all(
        "SELECT id FROM items WHERE item_type IN ('raw_resource', 'refined_resource', 'equipment', 'consumable')"
      );
      const itemIds = rows.map(r => r.id);
      
      if (itemIds.length > 0) {
        await fetchAndCachePrices(itemIds);
      }
    } catch (err) {
      console.error('Worker job failed:', err.message);
    }
  };

  // Run immediately on start
  runWorkerJob();
  
  // Run every 15 minutes
  const INTERVAL_MS = 15 * 60 * 1000;
  setInterval(runWorkerJob, INTERVAL_MS);
}
