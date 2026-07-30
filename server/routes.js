import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { query } from './db.js';
import { fetchAndCachePrices } from './worker.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'albion-secret-key-12345';



// Helper to remove accents and normalize text for search
function normalizeText(text) {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}



// Search items with autocomplete (Portuguese, English, or ID)
router.get('/items/search', async (req, res) => {
  const { q } = req.query;
  if (!q) {
    return res.json([]);
  }
  
  const searchNormalized = normalizeText(q);
  
  try {
    // Fetch all items from static DB to filter in-memory for accent insensitivity
    const items = await query.all('SELECT * FROM items');
    
    const filtered = items.filter(item => {
      const idMatch = item.id.toLowerCase().includes(searchNormalized);
      const ptMatch = normalizeText(item.name_pt).includes(searchNormalized);
      const enMatch = normalizeText(item.name_en).includes(searchNormalized);
      return idMatch || ptMatch || enMatch;
    });
    
    // Return top 15 results
    res.json(filtered.slice(0, 15));
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Failed to search items' });
  }
});

// Get prices for specific items (with on-demand caching if stale/missing)
router.get('/prices', async (req, res) => {
  const { ids } = req.query;
  if (!ids) {
    return res.status(400).json({ error: 'Item IDs parameter "ids" is required' });
  }
  
  const itemIds = ids.split(',').filter(id => id.length > 0);
  if (itemIds.length === 0) {
    return res.json({});
  }
  
  try {
    // 1. Check which items have stale or missing prices (older than 3 minutes)
    // 3 minutes = 180,000 ms
    const { force } = req.query;
    let staleItemIds = [];

    if (force === 'true') {
      staleItemIds = itemIds;
    } else {
      const cacheAgeLimit = new Date(Date.now() - 3 * 60 * 1000).toISOString();
      const staleItemsRows = await query.all(
        `SELECT DISTINCT id FROM items 
         WHERE id IN (${itemIds.map(() => '?').join(',')}) 
         AND (
           id NOT IN (SELECT DISTINCT item_id FROM prices)
           OR id IN (
             SELECT item_id FROM prices 
             GROUP BY item_id 
             HAVING MIN(datetime(updated_at)) < datetime(?)
           )
         )`,
        [...itemIds, cacheAgeLimit]
      );
      staleItemIds = staleItemsRows.map(r => r.id);
    }
    
    // 2. Fetch missing/stale prices on demand
    if (staleItemIds.length > 0) {
      console.log(`On-demand refresh triggered (force=${force || 'false'}) for: ${staleItemIds.join(', ')}`);
      await fetchAndCachePrices(staleItemIds);
    }
    
    // 3. Return prices from database
    const pricesRows = await query.all(
      `SELECT p.*, i.name_pt, i.name_en, i.weight 
       FROM prices p 
       JOIN items i ON p.item_id = i.id 
       WHERE p.item_id IN (${itemIds.map(() => '?').join(',')})`,
      itemIds
    );
    
    // Group prices by item_id
    const pricesByItem = {};
    for (const row of pricesRows) {
      if (!pricesByItem[row.item_id]) {
        pricesByItem[row.item_id] = {};
      }
      if (!pricesByItem[row.item_id][row.city]) {
        pricesByItem[row.item_id][row.city] = {};
      }
      
      const priceDetails = {
        sell_price_min: row.sell_price_min,
        sell_price_min_date: row.sell_price_min_date,
        sell_price_max: row.sell_price_max,
        sell_price_max_date: row.sell_price_max_date,
        buy_price_min: row.buy_price_min,
        buy_price_min_date: row.buy_price_min_date,
        buy_price_max: row.buy_price_max,
        buy_price_max_date: row.buy_price_max_date,
        updated_at: row.updated_at
      };
      
      // Store by quality
      pricesByItem[row.item_id][row.city][row.quality] = priceDetails;
      
      // Backward compatibility: copy quality 1 values to base city object
      if (row.quality === 1) {
        Object.assign(pricesByItem[row.item_id][row.city], priceDetails);
      }
    }
    
    res.json(pricesByItem);
  } catch (err) {
    console.error('Prices error:', err);
    res.status(500).json({ error: 'Failed to fetch prices' });
  }
});

// Transport Arbitrage Calculator
router.get('/transport/arbitrage', async (req, res) => {
  const { force } = req.query;
  try {
    // Fetch all items
    const items = await query.all("SELECT id, name_pt, name_en, weight, item_type FROM items");
    const itemIds = items.map(r => r.id);
    
    // Fetch stale or missing prices from AODP
    if (itemIds.length > 0) {
      let staleItemIds = [];
      if (force === 'true') {
        staleItemIds = itemIds;
      } else {
        // Cache limit: 3 minutes
        const cacheAgeLimit = new Date(Date.now() - 3 * 60 * 1000).toISOString();
        const staleRows = await query.all(
          `SELECT DISTINCT id FROM items 
           WHERE (
             id NOT IN (SELECT DISTINCT item_id FROM prices)
             OR id IN (
               SELECT item_id FROM prices 
               GROUP BY item_id 
               HAVING MIN(datetime(updated_at)) < datetime(?)
             )
           )`,
          [cacheAgeLimit]
        );
        staleItemIds = staleRows.map(r => r.id);
      }
      
      if (staleItemIds.length > 0) {
        console.log(`Transport on-demand sync (force=${force || 'false'}): refreshing ${staleItemIds.length} items.`);
        await fetchAndCachePrices(staleItemIds);
      }
    }
    
    // Fetch all prices
    const prices = await query.all("SELECT * FROM prices");
    
    // Group prices by item_id
    const pricesByItem = {};
    for (const p of prices) {
      if (!pricesByItem[p.item_id]) {
        pricesByItem[p.item_id] = {};
      }
      pricesByItem[p.item_id][p.city] = p;
    }
    
    const opportunities = [];
    const royalCities = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch'];
    
    // Scan items to find arbitrage opportunities
    for (const item of items) {
      const itemPrices = pricesByItem[item.id];
      if (!itemPrices) continue;
      
      // We want to buy at a royal city and sell at Caerleon or Black Market
      for (const buyCity of royalCities) {
        const buyPriceData = itemPrices[buyCity];
        // If we buy, we buy at the minimum sell order price (sell_price_min)
        if (!buyPriceData || !buyPriceData.sell_price_min || buyPriceData.sell_price_min === 0) continue;
        
        const buyPrice = buyPriceData.sell_price_min;
        
        // Target cities: Caerleon, Black Market
        const sellTargets = ['Caerleon', 'Black Market'];
        for (const sellCity of sellTargets) {
          const sellPriceData = itemPrices[sellCity];
          if (!sellPriceData) continue;
          
          // Option A: Quick sell to a buy order (buy_price_max)
          // Option B: List as a sell order (sell_price_min)
          // We check which one is valid and has high value
          const options = [];
          
          if (sellPriceData.buy_price_max && sellPriceData.buy_price_max > 0) {
            options.push({
              type: 'Ordem de Compra (Imediato)',
              price: sellPriceData.buy_price_max,
              // Market tax is 4% (Premium) or 8% (Non-Premium). Let's use 4% for calculation as a base
              taxRate: 0.04
            });
          }
          
          if (sellPriceData.sell_price_min && sellPriceData.sell_price_min > 0) {
            options.push({
              type: 'Ordem de Venda (Listar)',
              price: sellPriceData.sell_price_min,
              // Listing has 4% market tax + 2.5% setup fee = 6.5% (Premium)
              taxRate: 0.065
            });
          }
          
          for (const opt of options) {
            const sellPrice = opt.price;
            const netSell = sellPrice * (1 - opt.taxRate);
            const profit = netSell - buyPrice;
            
            // Check if there is positive profit
            if (profit > 0 && buyPrice > 0) {
              const profitMargin = (profit / buyPrice) * 100;
              
              // Only suggest if profit margin is > 10% and profit is significant (e.g. > 200 silver)
              if (profitMargin >= 10 && profit >= 200) {
                opportunities.push({
                  item_id: item.id,
                  name_pt: item.name_pt,
                  name_en: item.name_en,
                  weight: item.weight,
                  buy_city: buyCity,
                  buy_price: buyPrice,
                  sell_city: sellCity,
                  sell_price: sellPrice,
                  sell_type: opt.type,
                  profit_net: Math.round(profit),
                  margin: Math.round(profitMargin),
                  weight_total: item.weight
                });
              }
            }
          }
        }
      }
    }
    
    // Sort opportunities by highest absolute net profit
    opportunities.sort((a, b) => b.profit_net - a.profit_net);
    
    // Return top 50 opportunities
    res.json(opportunities.slice(0, 50));
  } catch (err) {
    console.error('Arbitrage error:', err);
    res.status(500).json({ error: 'Failed to calculate transport opportunities' });
  }
});

// Flipper prices endpoint for all items (equipment, resources, consumables)
router.get('/flipper/prices', async (req, res) => {
  const { force } = req.query;
  try {
    // 1. Check which items have stale or missing prices
    const allItemsRows = await query.all("SELECT id FROM items");
    const allItemIds = allItemsRows.map(r => r.id);
    
    if (allItemIds.length > 0) {
      let staleItemIds = [];
      
      if (force === 'true') {
        staleItemIds = allItemIds;
      } else {
        // Cache age limit for scanning: 10 minutes to avoid overloading the API on page loads
        const cacheAgeLimit = new Date(Date.now() - 10 * 60 * 1000).toISOString();
        const staleRows = await query.all(
          `SELECT DISTINCT id FROM items 
           WHERE (
             id NOT IN (SELECT DISTINCT item_id FROM prices)
             OR id IN (
               SELECT item_id FROM prices 
               GROUP BY item_id 
               HAVING MIN(datetime(updated_at)) < datetime(?)
             )
           )`,
          [cacheAgeLimit]
        );
        staleItemIds = staleRows.map(r => r.id);
      }
      
      if (staleItemIds.length > 0) {
        console.log(`Flipper on-demand background sync (force=${force || 'false'}): refreshing ${staleItemIds.length} items.`);
        // Run in background without awaiting to keep UI loads instant
        fetchAndCachePrices(staleItemIds).catch(err => {
          console.error('Background prices fetch failed:', err.message);
        });
      }
    }

    // 2. Fetch and return all cached prices with item metadata
    const pricesRows = await query.all(
      `SELECT p.*, i.name_pt, i.name_en, i.weight, i.tier, i.enchantment, i.item_type 
       FROM prices p 
       JOIN items i ON p.item_id = i.id`
    );
    res.json(pricesRows);
  } catch (err) {
    console.error('Flipper prices error:', err);
    res.status(500).json({ error: 'Failed to fetch flipper prices' });
  }
});

// Recipe database for all items (equipment, potions, foods)
const RECIPES = {
  POTION_HEAL: {
    itemType: 'consumable',
    bonusGroup: 'POTION',
    bonusCity: 'Caerleon',
    baseWeight: 0.1,
    batchCount: 5,
    tiers: {
      4: {
        name: 'Poção de Cura T4',
        resources: [
          { itemId: 'T4_BURDOCK', count: 24, type: 'Bardana T4' },
          { itemId: 'T3_EGG', count: 6, type: 'Ovo T3' }
        ]
      },
      6: {
        name: 'Poção de Cura T6',
        resources: [
          { itemId: 'T6_FOXGLOVE', count: 72, type: 'Dedaleira T6' },
          { itemId: 'T5_EGG', count: 18, type: 'Ovo T5' },
          { itemId: 'T6_ALCOHOL', count: 18, type: 'Aguardente de Batata T6' }
        ]
      }
    }
  },
  POTION_COOLDOWN: {
    itemType: 'consumable',
    bonusGroup: 'POTION',
    bonusCity: 'Caerleon',
    baseWeight: 0.1,
    batchCount: 5,
    tiers: {
      4: {
        name: 'Poção de Veneno T4',
        resources: [
          { itemId: 'T4_BURDOCK', count: 8, type: 'Bardana T4' },
          { itemId: 'T3_COMFREY', count: 4, type: 'Confrei T3' }
        ]
      },
      6: {
        name: 'Poção de Veneno T6',
        resources: [
          { itemId: 'T6_FOXGLOVE', count: 24, type: 'Dedaleira T6' },
          { itemId: 'T5_TEASEL', count: 12, type: 'Cardo T5' },
          { itemId: 'T3_COMFREY', count: 12, type: 'Confrei T3' },
          { itemId: 'T6_MILK', count: 6, type: 'Leite T6' }
        ]
      },
      8: {
        name: 'Poção de Veneno T8',
        resources: [
          { itemId: 'T8_YARROW', count: 72, type: 'Milefólio T8' },
          { itemId: 'T7_MULLEIN', count: 36, type: 'Verbasco T7' },
          { itemId: 'T5_TEASEL', count: 36, type: 'Cardo T5' },
          { itemId: 'T8_MILK', count: 18, type: 'Leite T8' },
          { itemId: 'T8_ALCOHOL', count: 18, type: 'Uísque de Abóbora T8' }
        ]
      }
    }
  },
  POTION_STONESKIN: {
    itemType: 'consumable',
    bonusGroup: 'POTION',
    bonusCity: 'Caerleon',
    baseWeight: 0.1,
    batchCount: 5,
    tiers: {
      3: {
        name: 'Poção de Resistência T3',
        resources: [
          { itemId: 'T3_COMFREY', count: 8, type: 'Confrei T3' }
        ]
      },
      5: {
        name: 'Poção de Resistência T5',
        resources: [
          { itemId: 'T5_TEASEL', count: 24, type: 'Cardo T5' },
          { itemId: 'T4_BURDOCK', count: 12, type: 'Bardana T4' },
          { itemId: 'T4_MILK', count: 6, type: 'Leite T4' }
        ]
      },
      7: {
        name: 'Poção de Resistência T7',
        resources: [
          { itemId: 'T7_MULLEIN', count: 72, type: 'Verbasco T7' },
          { itemId: 'T6_FOXGLOVE', count: 36, type: 'Dedaleira T6' },
          { itemId: 'T4_BURDOCK', count: 36, type: 'Bardana T4' },
          { itemId: 'T6_MILK', count: 18, type: 'Leite T6' },
          { itemId: 'T7_ALCOHOL', count: 18, type: 'Cachaça de Milho T7' }
        ]
      }
    }
  },
  POTION_GROWTH: {
    itemType: 'consumable',
    bonusGroup: 'POTION',
    bonusCity: 'Caerleon',
    baseWeight: 0.1,
    batchCount: 5,
    tiers: {
      3: {
        name: 'Poção de Gigante T3',
        resources: [
          { itemId: 'T3_COMFREY', count: 8, type: 'Confrei T3' }
        ]
      },
      5: {
        name: 'Poção de Gigante T5',
        resources: [
          { itemId: 'T5_TEASEL', count: 24, type: 'Cardo T5' },
          { itemId: 'T4_BURDOCK', count: 12, type: 'Bardana T4' },
          { itemId: 'T5_EGG', count: 6, type: 'Ovo T5' }
        ]
      },
      7: {
        name: 'Poção de Gigante T7',
        resources: [
          { itemId: 'T7_MULLEIN', count: 72, type: 'Verbasco T7' },
          { itemId: 'T6_FOXGLOVE', count: 36, type: 'Dedaleira T6' },
          { itemId: 'T5_EGG', count: 18, type: 'Ovo T5' },
          { itemId: 'T7_ALCOHOL', count: 18, type: 'Cachaça de Milho T7' }
        ]
      }
    }
  },
  MEAL_STEW: {
    itemType: 'consumable',
    bonusGroup: 'FOOD',
    bonusCity: 'Caerleon',
    baseWeight: 0.1,
    batchCount: 10,
    tiers: {
      4: {
        name: 'Ensopado de Cabra T4',
        resources: [
          { itemId: 'T4_MEAT', count: 8, type: 'Carne de Cabra T4' },
          { itemId: 'T4_TURNIP', count: 4, type: 'Nabo T4' },
          { itemId: 'T4_BREAD', count: 4, type: 'Pão T4' }
        ]
      },
      6: {
        name: 'Ensopado de Carneiro T6',
        resources: [
          { itemId: 'T6_MEAT', count: 24, type: 'Carne de Carneiro T6' },
          { itemId: 'T6_POTATO', count: 12, type: 'Batata T6' },
          { itemId: 'T4_BREAD', count: 12, type: 'Pão T4' }
        ]
      },
      8: {
        name: 'Ensopado de Boi T8',
        resources: [
          { itemId: 'T8_MEAT', count: 72, type: 'Carne de Boi T8' },
          { itemId: 'T8_PUMPKIN', count: 36, type: 'Abóbora T8' },
          { itemId: 'T4_BREAD', count: 36, type: 'Pão T4' }
        ]
      }
    }
  },
  MEAL_SANDWICH: {
    itemType: 'consumable',
    bonusGroup: 'FOOD',
    bonusCity: 'Caerleon',
    baseWeight: 0.1,
    batchCount: 10,
    tiers: {
      4: {
        name: 'Sanduíche de Cabra T4',
        resources: [
          { itemId: 'T4_MEAT', count: 8, type: 'Carne de Cabra T4' },
          { itemId: 'T4_BUTTER', count: 4, type: 'Manteiga de Cabra T4' },
          { itemId: 'T4_BREAD', count: 4, type: 'Pão T4' }
        ]
      },
      6: {
        name: 'Sanduíche de Carneiro T6',
        resources: [
          { itemId: 'T6_MEAT', count: 24, type: 'Carne de Carneiro T6' },
          { itemId: 'T6_BUTTER', count: 12, type: 'Manteiga de Ovelha T6' },
          { itemId: 'T4_BREAD', count: 12, type: 'Pão T4' }
        ]
      },
      8: {
        name: 'Sanduíche de Boi T8',
        resources: [
          { itemId: 'T8_MEAT', count: 72, type: 'Carne de Boi T8' },
          { itemId: 'T8_BUTTER', count: 36, type: 'Manteiga de Vaca T8' },
          { itemId: 'T4_BREAD', count: 36, type: 'Pão T4' }
        ]
      }
    }
  },
  MEAL_OMELETTE: {
    itemType: 'consumable',
    bonusGroup: 'FOOD',
    bonusCity: 'Caerleon',
    baseWeight: 0.1,
    batchCount: 10,
    tiers: {
      3: {
        name: 'Omelete de Galinha T3',
        resources: [
          { itemId: 'T3_MEAT', count: 8, type: 'Carne de Galinha T3' },
          { itemId: 'T3_WHEAT', count: 4, type: 'Trigo T3' },
          { itemId: 'T3_EGG', count: 2, type: 'Ovo T3' }
        ]
      },
      5: {
        name: 'Omelete de Ganso T5',
        resources: [
          { itemId: 'T5_MEAT', count: 24, type: 'Carne de Ganso T5' },
          { itemId: 'T5_CABBAGE', count: 12, type: 'Repolho T5' },
          { itemId: 'T5_EGG', count: 6, type: 'Ovo T5' }
        ]
      },
      7: {
        name: 'Omelete de Porco T7',
        resources: [
          { itemId: 'T7_MEAT', count: 72, type: 'Carne de Porco T7' },
          { itemId: 'T7_CORN', count: 36, type: 'Milho T7' },
          { itemId: 'T5_EGG', count: 18, type: 'Ovo T5' }
        ]
      }
    }
  },
  // Equipment rules
  MAIN_AXE: { name: 'Machado de Batalha (Battleaxe)', baseWeight: 4.3, resources: [{ type: 'METALBAR', count: 16 }, { type: 'PLANK', count: 8 }], bonusGroup: 'AXE', bonusCity: 'Martlock' },
  '2H_AXE': { name: 'Grande Machado (Greataxe)', baseWeight: 5.8, resources: [{ type: 'METALBAR', count: 20 }, { type: 'PLANK', count: 12 }], bonusGroup: 'AXE', bonusCity: 'Martlock' },
  MAIN_SWORD: { name: 'Espada Larga (Broadsword)', baseWeight: 4.1, resources: [{ type: 'METALBAR', count: 16 }, { type: 'LEATHER', count: 8 }], bonusGroup: 'SWORD', bonusCity: 'Lymhurst' },
  '2H_DUALSWORD': { name: 'Espadas Duplas (Dual Swords)', baseWeight: 5.5, resources: [{ type: 'METALBAR', count: 20 }, { type: 'LEATHER', count: 12 }], bonusGroup: 'SWORD', bonusCity: 'Lymhurst' },
  MAIN_BOW: { name: 'Arco (Bow)', baseWeight: 3.8, resources: [{ type: 'PLANK', count: 32 }], bonusGroup: 'BOW', bonusCity: 'Lymhurst' },
  '2H_WARBOW': { name: 'Arco de Guerra (Warbow)', baseWeight: 4.2, resources: [{ type: 'PLANK', count: 32 }], bonusGroup: 'BOW', bonusCity: 'Lymhurst' },
  MAIN_DAGGER: { name: 'Adaga (Dagger)', baseWeight: 2.8, resources: [{ type: 'LEATHER', count: 12 }, { type: 'METALBAR', count: 8 }], bonusGroup: 'DAGGER', bonusCity: 'Bridgewatch' },
  MAIN_SPEAR: { name: 'Lança (Spear)', baseWeight: 4.0, resources: [{ type: 'PLANK', count: 8 }, { type: 'METALBAR', count: 8 }], bonusGroup: 'SPEAR', bonusCity: 'Fort Sterling' },
  MAIN_MACE: { name: 'Maça (Mace)', baseWeight: 4.8, resources: [{ type: 'METALBAR', count: 16 }, { type: 'LEATHER', count: 8 }], bonusGroup: 'MACE', bonusCity: 'Thetford' },
  MAIN_HAMMER: { name: 'Martelo (Hammer)', baseWeight: 5.2, resources: [{ type: 'METALBAR', count: 16 }, { type: 'PLANK', count: 8 }], bonusGroup: 'HAMMER', bonusCity: 'Fort Sterling' },
  MAIN_FIRESTAFF: { name: 'Cajado de Fogo (Fire Staff)', baseWeight: 4.0, resources: [{ type: 'PLANK', count: 16 }, { type: 'CLOTH', count: 8 }], bonusGroup: 'FIRE_STAFF', bonusCity: 'Thetford' },
  MAIN_FROSTSTAFF: { name: 'Cajado de Gelo (Frost Staff)', baseWeight: 4.0, resources: [{ type: 'PLANK', count: 16 }, { type: 'CLOTH', count: 8 }], bonusGroup: 'FROST_STAFF', bonusCity: 'Martlock' },
  MAIN_HOLYSTAFF: { name: 'Cajado Sagrado (Holy Staff)', baseWeight: 4.0, resources: [{ type: 'PLANK', count: 16 }, { type: 'CLOTH', count: 8 }], bonusGroup: 'HOLY_STAFF', bonusCity: 'Fort Sterling' },
  MAIN_NATURESTAFF: { name: 'Cajado da Natureza (Nature Staff)', baseWeight: 4.0, resources: [{ type: 'PLANK', count: 16 }, { type: 'CLOTH', count: 8 }], bonusGroup: 'NATURE_STAFF', bonusCity: 'Thetford' },
  MAIN_ARCANESTAFF: { name: 'Cajado Arcano (Arcane Staff)', baseWeight: 4.0, resources: [{ type: 'PLANK', count: 16 }, { type: 'CLOTH', count: 8 }], bonusGroup: 'ARCANE_STAFF', bonusCity: 'Lymhurst' },
  MAIN_CURSESTAFF: { name: 'Cajado Amaldiçoado (Cursed Staff)', baseWeight: 4.0, resources: [{ type: 'PLANK', count: 16 }, { type: 'CLOTH', count: 8 }], bonusGroup: 'CURSE_STAFF', bonusCity: 'Bridgewatch' },
  MAIN_CROSSBOW: { name: 'Besta (Crossbow)', baseWeight: 5.0, resources: [{ type: 'PLANK', count: 20 }, { type: 'METALBAR', count: 12 }], bonusGroup: 'CROSSBOW', bonusCity: 'Bridgewatch' },
  '2H_QUARTERSTAFF': { name: 'Cajado Bilaminado (Quarterstaff)', baseWeight: 4.5, resources: [{ type: 'PLANK', count: 20 }, { type: 'LEATHER', count: 12 }], bonusGroup: 'QUARTERSTAFF', bonusCity: 'Martlock' },
  '2H_WARGLOVE': { name: 'Luvas de Guerra (War Gloves)', baseWeight: 3.5, resources: [{ type: 'METALBAR', count: 12 }, { type: 'LEATHER', count: 12 }], bonusGroup: 'WAR_GLOVE', bonusCity: 'Bridgewatch' },
  OFF_SHIELD: { name: 'Escudo (Shield)', baseWeight: 2.5, resources: [{ type: 'METALBAR', count: 8 }], bonusGroup: 'SHIELD', bonusCity: 'Martlock' },
  OFF_TORCH: { name: 'Tocha (Torch)', baseWeight: 1.5, resources: [{ type: 'PLANK', count: 4 }, { type: 'LEATHER', count: 4 }], bonusGroup: 'TORCH', bonusCity: 'Lymhurst' },
  OFF_TOWERTOME: { name: 'Livro de Feitiços (Tome)', baseWeight: 1.0, resources: [{ type: 'CLOTH', count: 8 }], bonusGroup: 'TOME', bonusCity: 'Lymhurst' },
  ARMOR_PLATE: { name: 'Armadura de Placas (Plate Armor)', baseWeight: 6.5, resources: [{ type: 'METALBAR', count: 16 }], bonusGroup: 'PLATE_ARMOR', bonusCity: 'Bridgewatch' },
  ARMOR_LEATHER: { name: 'Casaco de Couro (Leather Jacket)', baseWeight: 4.5, resources: [{ type: 'LEATHER', count: 16 }], bonusGroup: 'LEATHER_JACKET', bonusCity: 'Martlock' },
  ARMOR_CLOTH: { name: 'Robe de Tecido (Cloth Robe)', baseWeight: 3.2, resources: [{ type: 'CLOTH', count: 16 }], bonusGroup: 'CLOTH_ROBE', bonusCity: 'Bridgewatch' },
  HELMET_PLATE: { name: 'Elmo de Placas (Plate Helmet)', baseWeight: 1.2, resources: [{ type: 'METALBAR', count: 8 }], bonusGroup: 'PLATE_HELMET', bonusCity: 'Fort Sterling' },
  HELMET_LEATHER: { name: 'Capuz de Couro (Leather Hood)', baseWeight: 1.0, resources: [{ type: 'LEATHER', count: 8 }], bonusGroup: 'LEATHER_HELMET', bonusCity: 'Thetford' },
  HELMET_CLOTH: { name: 'Hábito de Tecido (Cloth Cowl)', baseWeight: 1.0, resources: [{ type: 'CLOTH', count: 8 }], bonusGroup: 'CLOTH_HELMET', bonusCity: 'Thetford' },
  SHOES_PLATE: { name: 'Botas de Placas (Plate Boots)', baseWeight: 1.5, resources: [{ type: 'METALBAR', count: 8 }], bonusGroup: 'PLATE_SHOES', bonusCity: 'Martlock' },
  SHOES_LEATHER: { name: 'Sapatos de Couro (Leather Shoes)', baseWeight: 1.3, resources: [{ type: 'LEATHER', count: 8 }], bonusGroup: 'LEATHER_SHOES', bonusCity: 'Lymhurst' },
  SHOES_CLOTH: { name: 'Sandálias de Tecido (Cloth Sandals)', baseWeight: 1.1, resources: [{ type: 'CLOTH', count: 8 }], bonusGroup: 'CLOTH_SHOES', bonusCity: 'Fort Sterling' },
  BAG: { name: 'Bolsa (Bag)', baseWeight: 1.5, resources: [{ type: 'LEATHER', count: 8 }, { type: 'CLOTH', count: 8 }], bonusGroup: 'BAG', bonusCity: 'Caerleon' },
  CAPE: { name: 'Capa (Cape)', baseWeight: 1.0, resources: [{ type: 'CLOTH', count: 4 }], bonusGroup: 'CAPE', bonusCity: 'Caerleon' }
};

router.get('/recipes', (req, res) => {
  res.json(RECIPES);
});

export default router;
