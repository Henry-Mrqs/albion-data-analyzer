import React, { useState, useEffect, useRef } from 'react';
import { 
  Hammer, Calculator, CheckCircle2, XCircle, AlertTriangle, 
  Shield, Percent, Info, Search, RotateCw 
} from 'lucide-react';

const CITIES = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon'];
const TIERS = [4, 5, 6, 7, 8];
const ENCHANTMENTS = [0, 1, 2, 3, 4];

// Item Value lookup for crafting tax calculations
const EQUIPMENT_BASE_VALUES = {
  4: 120,
  5: 240,
  6: 480,
  7: 960,
  8: 1920
};

const getFriendlyResourceName = (itemId, fallbackType) => {
  const match = itemId.match(/^T(\d+)_(.+?)(?:_LEVEL(\d+))?$/);
  if (match) {
    const tier = match[1];
    const baseType = match[2];
    const ench = match[3] ? parseInt(match[3]) : 0;
    
    const resourceNames = {
      'METALBAR': 'Barra de Metal',
      'PLANK': 'Tábua',
      'LEATHER': 'Couro',
      'CLOTH': 'Tecido',
      'STONEBLOCK': 'Bloco de Pedra',
      'ORE': 'Minério',
      'WOOD': 'Madeira',
      'HIDE': 'Couro Bruto',
      'FIBER': 'Fibra',
      'STONE': 'Pedra',
      'BURDOCK': 'Bardana',
      'COMFREY': 'Confrei',
      'TEASEL': 'Cardo',
      'FOXGLOVE': 'Dedaleira',
      'MULLEIN': 'Verbasco',
      'YARROW': 'Milefólio',
      'EGG': 'Ovo',
      'MILK': 'Leite',
      'MEAT': 'Carne',
      'BUTTER': 'Manteiga',
      'ALCOHOL': 'Álcool',
      'BREAD': 'Pão',
      'TURNIP': 'Nabo',
      'CABBAGE': 'Repolho',
      'POTATO': 'Batata',
      'CORN': 'Milho',
      'PUMPKIN': 'Abóbora',
      'WHEAT': 'Trigo',
      'CARROT': 'Cenoura'
    };
    
    const baseName = resourceNames[baseType] || fallbackType || baseType;
    const enchSuffix = ench > 0 ? `.${ench}` : '';
    return `${baseName} T${tier}${enchSuffix}`;
  }
  return fallbackType || itemId;
};

const formatPriceAge = (dateStr) => {
  if (!dateStr || dateStr.startsWith('0001')) return '';
  try {
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'agora';
    if (diffMins < 60) return `${diffMins}m atrás`;
    if (diffHours < 24) return `${diffHours}h atrás`;
    return `${diffDays}d atrás`;
  } catch (err) {
    return '';
  }
};

// Helper to parse item ID supporting both "@" (equipment) and "_LEVEL" (resources) formats
const parseItemId = (itemId) => {
  const matchEquipment = itemId.match(/^T(\d+)_(.+)@(\d+)$/);
  const matchResource = itemId.match(/^T(\d+)_(.+)_LEVEL(\d+)$/);
  const matchFlat = itemId.match(/^T(\d+)_(.+)$/);
  
  if (matchEquipment) {
    return {
      tier: parseInt(matchEquipment[1]),
      baseId: matchEquipment[2],
      enchantment: parseInt(matchEquipment[3])
    };
  } else if (matchResource) {
    return {
      tier: parseInt(matchResource[1]),
      baseId: matchResource[2],
      enchantment: parseInt(matchResource[3])
    };
  } else if (matchFlat) {
    return {
      tier: parseInt(matchFlat[1]),
      baseId: matchFlat[2],
      enchantment: 0
    };
  }
  return null;
};

// Intelligent Dynamic Recipe Generator based on backend recipes database
const generateRecipeFromData = (itemId, recipes) => {
  if (!recipes) return null;
  
  // Clean up ID to find the base ID
  const baseId = itemId.replace(/^T\d+_/, '').replace(/_LEVEL\d+$/, '').split('@')[0];
  const tier = parseInt(itemId.match(/^T(\d+)_/)?.[1] || '4');
  
  let recipe = null;
  // 1. Direct match in recipes keys
  if (recipes[baseId]) {
    recipe = recipes[baseId];
  } else {
    // 2. Substring match (e.g. ARMOR_PLATE_SET1 contains ARMOR_PLATE)
    const key = Object.keys(recipes).find(k => baseId.includes(k));
    if (key) {
      recipe = recipes[key];
    }
  }

  if (!recipe) {
    return {
      id: baseId,
      name: baseId,
      bonusGroup: 'OTHER',
      bonusCity: 'Caerleon',
      baseWeight: 3.0,
      resources: [],
      batchCount: 1,
      itemType: 'equipment'
    };
  }

  if (recipe.itemType === 'consumable') {
    const tierData = recipe.tiers[tier] || Object.values(recipe.tiers)[0];
    return {
      id: baseId,
      name: tierData.name,
      bonusGroup: recipe.bonusGroup,
      bonusCity: recipe.bonusCity,
      baseWeight: recipe.baseWeight,
      resources: tierData.resources,
      batchCount: recipe.batchCount,
      itemType: recipe.itemType
    };
  }

  return {
    id: baseId,
    name: recipe.name || baseId,
    bonusGroup: recipe.bonusGroup,
    bonusCity: recipe.bonusCity,
    baseWeight: recipe.baseWeight,
    resources: recipe.resources || [],
    batchCount: 1,
    itemType: 'equipment'
  };
};

export default function CraftingCalc() {
  const [recipesList, setRecipesList] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedCity, setSelectedCity] = useState('Martlock');
  const [selectedTier, setSelectedTier] = useState(4);
  const [selectedEnch, setSelectedEnch] = useState(0);
  
  const [useFocus, setUseFocus] = useState(false);
  const [stationTax, setStationTax] = useState(150); // Operator station tax in flat silver
  const [isPremium, setIsPremium] = useState(true);
  
  const [ingredientSelections, setIngredientSelections] = useState({});
  
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(false);

  // Search Autocomplete state
  const [searchQuery, setSearchQuery] = useState('Machado de Batalha T4 (T4_MAIN_AXE)');
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Fetch recipes on mount
  useEffect(() => {
    const fetchRecipes = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('/api/recipes', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setRecipesList(data);
        const initialRecipe = generateRecipeFromData('T4_MAIN_AXE', data);
        setSelectedItem(initialRecipe);
      } catch (err) {
        console.error('Error fetching recipes:', err);
      }
    };
    fetchRecipes();
  }, []);

  // Update selectedItem resources/name when selectedTier changes (especially for consumables)
  useEffect(() => {
    if (recipesList && selectedItem && selectedItem.itemType === 'consumable') {
      const currentFullId = `T${selectedTier}_${selectedItem.id}`;
      const newRecipe = generateRecipeFromData(currentFullId, recipesList);
      if (newRecipe && newRecipe.name !== selectedItem.name) {
        setSelectedItem(newRecipe);
      }
    }
  }, [selectedTier, recipesList]);

  // Generate target and ingredient item IDs
  const getTargetItemId = (id, tier, ench) => {
    // Consumables don't use the standard enchantment level suffix
    if (selectedItem.itemType === 'consumable') {
      // Potions and Foods are mapped directly by their seeded IDs, e.g. T4_POTION_HEAL
      // We reconstruct it based on chosen Tier and Base ID
      return `T${tier}_${id}`;
    }
    // Equipment uses "@" for enchanted items (e.g. T5_MAIN_AXE@1)
    const suffix = ench === 0 ? '' : `@${ench}`;
    return `T${tier}_${id}${suffix}`;
  };

  const getIngredientItemId = (type, tier, ench) => {
    const suffix = ench === 0 || type === 'STONEBLOCK' ? '' : `_LEVEL${ench}`;
    return `T${tier}_${type}${suffix}`;
  };

  const targetId = selectedItem ? getTargetItemId(selectedItem.id, selectedTier, selectedEnch) : '';
  const ingredients = selectedItem ? selectedItem.resources.map(res => {
    // If resource is static (potions/foods have set resource itemIds in recipe)
    const itemId = res.itemId || getIngredientItemId(res.type, selectedTier, selectedEnch);
    return {
      ...res,
      itemId
    };
  }) : [];

  // Fetch prices for target item and its materials (with on-demand cache age refresh)
  const fetchPrices = async (force = false) => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const itemIds = [targetId, ...ingredients.map(ing => ing.itemId)];
      const token = localStorage.getItem('token');
      const url = force ? `/api/prices?ids=${itemIds.join(',')}&force=true` : `/api/prices?ids=${itemIds.join(',')}`;
      
      const response = await fetch(url, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      setPrices(data);
    } catch (err) {
      console.error('Error fetching prices for crafting calculator:', err);
    } finally {
      setLoading(false);
    }
  };

  // Re-fetch prices when item, tier, or enchantment changes
  useEffect(() => {
    if (selectedItem) {
      fetchPrices(false);
    }
  }, [selectedItem, selectedTier, selectedEnch, targetId]);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch search results from backend API when query changes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await fetch(`/api/items/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Error searching items:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSelectItem = (item) => {
    const parsed = parseItemId(item.id);
    if (!parsed) return;
    
    const recipe = generateRecipeFromData(item.id, recipesList);
    setSelectedItem(recipe);
    setSelectedTier(parsed.tier);
    setSelectedEnch(parsed.enchantment);
    setSearchQuery(`${item.name_pt} (${item.id})`);
    setShowDropdown(false);
  };

  // Guard loading state until recipes are fetched
  if (!recipesList || !selectedItem) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 'calc(100vh - 160px)' }}>
        <RotateCw className="animate-spin" size={32} color="var(--color-primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
      </div>
    );
  }

  // Crafting RRR calculations
  const isCityBonusActive = selectedItem.bonusCity === selectedCity;
  
  const getRRR = () => {
    if (isCityBonusActive) {
      return useFocus ? 0.479 : 0.248; // 47.9% or 24.8%
    }
    return useFocus ? 0.435 : 0.152; // 43.5% or 15.2%
  };

  const rrrValue = getRRR();

  // Price resolution helpers - scan qualities 1-5 for best available price
  const getPriceInCity = (itemId, city) => {
    if (!prices || !prices[itemId] || !prices[itemId][city]) return 0;
    const cityData = prices[itemId][city];
    // Scan quality 1-5 for the lowest non-zero sell_price_min
    let bestPrice = 0;
    for (let q = 1; q <= 5; q++) {
      if (cityData[q] && cityData[q].sell_price_min > 0) {
        if (bestPrice === 0 || cityData[q].sell_price_min < bestPrice) {
          bestPrice = cityData[q].sell_price_min;
        }
      }
    }
    if (bestPrice > 0) return bestPrice;
    return cityData.sell_price_min || 0;
  };

  const getBuyOrderInCity = (itemId, city) => {
    if (!prices || !prices[itemId] || !prices[itemId][city]) return 0;
    const cityData = prices[itemId][city];
    // Scan quality 1-5 for the highest non-zero buy_price_max
    let bestPrice = 0;
    for (let q = 1; q <= 5; q++) {
      if (cityData[q] && cityData[q].buy_price_max > 0) {
        if (cityData[q].buy_price_max > bestPrice) {
          bestPrice = cityData[q].buy_price_max;
        }
      }
    }
    if (bestPrice > 0) return bestPrice;
    return cityData.buy_price_max || 0;
  };

  // Get the date string associated with the resolved price
  const getPriceDateInCity = (itemId, city, mode = 'sell') => {
    if (!prices || !prices[itemId] || !prices[itemId][city]) return null;
    const cityData = prices[itemId][city];
    const dateKey = mode === 'sell' ? 'sell_price_min_date' : 'buy_price_max_date';
    const priceKey = mode === 'sell' ? 'sell_price_min' : 'buy_price_max';
    // Scan quality 1-5 matching the resolved price
    for (let q = 1; q <= 5; q++) {
      if (cityData[q] && cityData[q][priceKey] > 0) {
        return cityData[q][dateKey] || null;
      }
    }
    return cityData[dateKey] || null;
  };

  const getBestCityToBuy = (itemId) => {
    if (!prices || !prices[itemId]) return { city: 'Sem dados', price: 0 };
    let bestCity = 'Sem dados';
    let minPrice = Infinity;
    
    const citiesToSearch = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon'];
    for (const city of citiesToSearch) {
      const price = getPriceInCity(itemId, city);
      if (price > 0 && price < minPrice) {
        minPrice = price;
        bestCity = city;
      }
    }
    return { city: bestCity, price: minPrice === Infinity ? 0 : minPrice };
  };

  const getBestCityToSell = (itemId) => {
    if (!prices || !prices[itemId]) return { city: 'Sem dados', price: 0, sellType: 'Ordem de Venda' };
    let bestCity = 'Sem dados';
    let maxPrice = 0;
    let bestSellType = 'Ordem de Venda';
    
    const citiesToSearch = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Black Market'];
    for (const city of citiesToSearch) {
      if (city === 'Black Market') {
        const buyOrderPrice = getBuyOrderInCity(itemId, city);
        if (buyOrderPrice > maxPrice) {
          maxPrice = buyOrderPrice;
          bestCity = city;
          bestSellType = 'Ordem de Compra';
        }
      } else {
        const sellPrice = getPriceInCity(itemId, city);
        if (sellPrice > maxPrice) {
          maxPrice = sellPrice;
          bestCity = city;
          bestSellType = 'Ordem de Venda';
        }
      }
    }
    return { city: bestCity, price: maxPrice, sellType: bestSellType };
  };

  const selectIngredientCity = (itemId, city) => {
    setIngredientSelections(prev => ({
      ...prev,
      [itemId]: { mode: 'city', city }
    }));
  };

  const selectIngredientManual = (itemId, price) => {
    setIngredientSelections(prev => ({
      ...prev,
      [itemId]: { mode: 'manual', price }
    }));
  };

  // Math Calculations
  // Total cost of materials (before RRR) in the selected crafting city
  let materialsCostGross = 0;
  const ingredientsCalculated = ingredients.map(ing => {
    const selection = ingredientSelections[ing.itemId];
    let price = 0;
    if (selection?.mode === 'manual') {
      price = selection.price || 0;
    } else {
      const targetCity = selection?.city || selectedCity;
      price = getPriceInCity(ing.itemId, targetCity);
    }
    const cost = price * ing.count;
    materialsCostGross += cost;
    return {
      ...ing,
      price,
      cost,
      sourceMode: selection?.mode || 'city',
      sourceValue: selection?.mode === 'manual' ? (selection.price || 0) : (selection?.city || selectedCity)
    };
  });

  // Silver Fee calculation - Flat silver fee in pratas
  const baseValue = selectedItem.itemType === 'consumable' ? 12 : (EQUIPMENT_BASE_VALUES[selectedTier] || 120);
  const systemValue = baseValue * Math.pow(2, selectedEnch);
  const silverFee = stationTax;

  // Net cost of materials applying RRR + Silver Fee
  const netCraftingCost = Math.round(materialsCostGross * (1 - rrrValue) + silverFee);

  // Sales comparisons
  const taxRateSellOrder = isPremium ? 0.065 : 0.105; // 4% market tax + 2.5% fee
  const taxRateBuyOrder = isPremium ? 0.04 : 0.08;   // 4% or 8% direct market tax

  // Option 1: Sell via Sell Order in Royal Crafting City (or Caerleon if crafted there)
  const localSellPrice = getPriceInCity(targetId, selectedCity);
  const localNetSell = Math.round(localSellPrice * selectedItem.batchCount * (1 - taxRateSellOrder));
  const localProfit = localNetSell - netCraftingCost;
  const localMargin = localNetSell > 0 && netCraftingCost > 0 ? (localProfit / netCraftingCost) * 100 : 0;

  // Option 2: Sell to Caerleon Black Market Buy Order (instant)
  const bmBuyOrderPrice = getBuyOrderInCity(targetId, 'Black Market');
  const bmNetSell = Math.round(bmBuyOrderPrice * selectedItem.batchCount * (1 - taxRateBuyOrder));
  const bmProfit = bmNetSell - netCraftingCost;
  const bmMargin = bmNetSell > 0 && netCraftingCost > 0 ? (bmProfit / netCraftingCost) * 100 : 0;

  // Decide best option
  const hasBMOption = bmBuyOrderPrice > 0;
  const isBMProfitBetter = hasBMOption && bmProfit > localProfit;
  
  const bestProfit = isBMProfitBetter ? bmProfit : localProfit;
  const bestMargin = isBMProfitBetter ? bmMargin : localMargin;
  const bestNetSell = isBMProfitBetter ? bmNetSell : localNetSell;
  const bestOptionName = isBMProfitBetter ? 'Mercado Negro (Ordem de Compra)' : `Mercado Local ${selectedCity} (Ordem de Venda)`;

  const missingMaterials = [];
  ingredientsCalculated.forEach(ing => {
    if (ing.price === 0) {
      missingMaterials.push(`Material: ${ing.type || ing.itemId} (${ing.itemId})`);
    }
  });
  if (localSellPrice === 0 && bmBuyOrderPrice === 0) {
    missingMaterials.push(`Preço de Venda (${targetId})`);
  }
  const hasMissingPrices = missingMaterials.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 160px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '360px 1fr', gap: '24px' }}>
        {/* Selection parameters panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Hammer size={20} className="text-primary" />
            Parâmetros de Fabricação
          </h3>

          {/* Item Selection via Search Autocomplete */}
          <div className="input-group" style={{ position: 'relative' }} ref={dropdownRef}>
            <label className="input-label">Buscar Equipamento ou Consumível</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={16} />
              </span>
              <input 
                className="input-field" 
                type="text" 
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Digite o item (ex: poção, elmo, bolsa, T5...)"
                style={{ paddingLeft: '36px' }}
              />
            </div>

            {showDropdown && searchResults.length > 0 && (
              <div className="search-dropdown" style={{ width: '100%' }}>
                {searchResults
                  .filter(item => item.item_type === 'equipment' || item.item_type === 'consumable')
                  .map(item => (
                    <div key={item.id} className="search-item" onClick={() => handleSelectItem(item)}>
                      <div>
                        <div style={{ fontWeight: '600', color: 'var(--text-primary)', fontSize: '13px' }}>{item.name_pt}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{item.name_en} | {item.id}</div>
                      </div>
                      <span style={{
                        fontSize: '10px',
                        background: item.item_type === 'consumable' ? 'rgba(0, 230, 118, 0.15)' : 'rgba(138, 75, 245, 0.15)',
                        border: item.item_type === 'consumable' ? '1px solid rgba(0, 230, 118, 0.3)' : '1px solid rgba(138, 75, 245, 0.3)',
                        borderRadius: '4px',
                        padding: '1px 5px',
                        color: item.item_type === 'consumable' ? 'var(--color-success)' : 'var(--color-primary-hover)',
                        textTransform: 'uppercase'
                      }}>
                        T{item.tier}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>

          {/* City Selection */}
          <div className="input-group">
            <label className="input-label">Cidade do Craft</label>
            <select 
              className="input-field" 
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
            >
              {CITIES.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Tier Selection */}
            <div className="input-group">
              <label className="input-label">Tier</label>
              <select 
                className="input-field" 
                value={selectedTier}
                onChange={(e) => setSelectedTier(parseInt(e.target.value))}
                disabled={selectedItem.itemType === 'consumable' && (selectedItem.id.includes('GROWTH') || selectedItem.id.includes('RESIST'))} // gigantify/resist have custom Tiers like T3/T5/T7
              >
                {TIERS.map(t => (
                  <option key={t} value={t}>Tier {t}</option>
                ))}
              </select>
            </div>

            {/* Enchantment Selection */}
            <div className="input-group">
              <label className="input-label">Encantamento</label>
              <select 
                className="input-field" 
                value={selectedEnch}
                onChange={(e) => setSelectedEnch(parseInt(e.target.value))}
                disabled={selectedItem.itemType === 'consumable'} // Consumables do not support standard enchants in this DB structure
              >
                {ENCHANTMENTS.map(e => (
                  <option key={e} value={e}>.{e}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Station Tax */}
          <div className="input-group">
            <label className="input-label">Taxa do Plot do Operador (Pratas)</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }}>
                pratas
              </span>
              <input 
                className="input-field" 
                type="number" 
                value={stationTax}
                onChange={(e) => setStationTax(Math.max(0, parseInt(e.target.value) || 0))}
                placeholder="ex: 150"
                style={{ paddingRight: '60px' }}
              />
            </div>
          </div>

          {/* Focus Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid rgba(138, 75, 245, 0.15)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px' }}>Usar Foco de Aprendizado</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aumenta o retorno de materiais (RRR)</div>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={useFocus} 
                onChange={(e) => setUseFocus(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>

          {/* Premium Account Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderTop: '1px solid rgba(138, 75, 245, 0.15)' }}>
            <div>
              <div style={{ fontWeight: '600', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                Premium Habilitada <Shield size={14} className="text-warning" />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aplica menores impostos de mercado</div>
            </div>
            <label className="toggle-switch">
              <input 
                type="checkbox" 
                checked={isPremium} 
                onChange={(e) => setIsPremium(e.target.checked)} 
              />
              <span className="slider"></span>
            </label>
          </div>
        </div>

        {/* Calculator Analysis Display Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(138, 75, 245, 0.2)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Hammer size={20} className="text-primary" />
              Análise de Lucratividade: {selectedItem.name} 
              {selectedItem.batchCount > 1 && ` (Lote de ${selectedItem.batchCount} unidades)`}
            </h3>
            <button 
              onClick={() => fetchPrices(true)} 
              disabled={loading}
              className="btn-primary"
              style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}
            >
              <RotateCw size={14} className={loading ? 'animate-spin' : ''} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
              Forçar Sincronização
            </button>
          </div>

          {/* City Bonus Banner */}
          <div style={{
            background: isCityBonusActive ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255, 23, 68, 0.05)',
            border: isCityBonusActive ? '1px solid rgba(0, 230, 118, 0.25)' : '1px solid rgba(255, 23, 68, 0.15)',
            borderRadius: '8px',
            padding: '16px',
            display: 'flex',
            gap: '12px'
          }}>
            <Info size={24} style={{ flexShrink: 0, color: isCityBonusActive ? 'var(--color-success)' : 'var(--text-muted)' }} />
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '15px', color: 'var(--text-primary)' }}>
                {isCityBonusActive ? 'Especialização da Cidade Aplicada (+24.8% RRR)' : 'Sem Bônus Geográfico (+15.2% RRR)'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {isCityBonusActive 
                  ? `Você está fabricando este item na cidade especializada (${selectedCity}). RRR base: ${(rrrValue * 100).toFixed(1)}%.`
                  : `A cidade especializada deste craft é ${selectedItem.bonusCity}. Fabricando em ${selectedCity}, sua RRR é de ${(rrrValue * 100).toFixed(1)}%.`}
              </div>
            </div>
          </div>

          {hasMissingPrices && (
            <div style={{
              background: 'rgba(255, 214, 0, 0.08)',
              border: '1px solid rgba(255, 214, 0, 0.35)',
              borderRadius: '8px',
              padding: '16px',
              color: '#ffe082',
              fontSize: '13px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <AlertTriangle size={20} />
                <span>Preços Ausentes na API para Crafting</span>
              </div>
              <span>
                Não é possível estimar o lucro real porque os seguintes elementos estão sem preço na API em {selectedCity}:
              </span>
              <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                {missingMaterials.map((mat, idx) => <li key={idx}>{mat}</li>)}
              </ul>
              <span>
                Abra o <a href="https://github.com/ao-data/albion-data-client/releases" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-info)', textDecoration: 'underline', fontWeight: 600 }}>Albion Data Client</a> no jogo, visite os mercados relevantes e pesquise estes itens para atualizar a API.
              </span>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <RotateCw className="animate-spin" size={32} color="var(--color-primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '24px' }}>
              {/* Material Recipe List */}
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Materiais Requeridos
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ingredientsCalculated.map(ing => {
                    const bestBuy = getBestCityToBuy(ing.itemId);
                    return (
                      <div key={ing.itemId} className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <div style={{ fontWeight: '600', fontSize: '14px' }}>{getFriendlyResourceName(ing.itemId, ing.type)} (x{ing.count})</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ing.itemId}</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold' }}>{ing.cost.toLocaleString('pt-BR')} pratas</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                              {ing.price.toLocaleString('pt-BR')} pratas / un ({ing.sourceMode === 'manual' ? 'Manual' : ing.sourceValue})
                            </div>
                          </div>
                        </div>
                        {/* Per-city price breakdown */}
                        <div style={{ borderTop: '1px dashed rgba(255,255,255,0.08)', paddingTop: '8px' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: '6px', fontSize: '11px' }}>
                            {['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon'].map(city => {
                              const cityPrice = getPriceInCity(ing.itemId, city);
                              const isBest = cityPrice > 0 && city === bestBuy.city;
                              const isSelected = ing.sourceMode === 'city' && ing.sourceValue === city;
                              const priceAge = getPriceDateInCity(ing.itemId, city, 'sell');
                              const ageStr = formatPriceAge(priceAge);
                              return (
                                <div 
                                  key={city} 
                                  onClick={() => { if (cityPrice > 0) selectIngredientCity(ing.itemId, city); }}
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: isSelected 
                                      ? 'rgba(138, 75, 245, 0.25)' 
                                      : (isBest ? 'rgba(0, 230, 118, 0.08)' : 'rgba(255,255,255,0.02)'),
                                    border: isSelected 
                                      ? '1px solid var(--color-primary-hover)' 
                                      : (isBest ? '1px solid rgba(0, 230, 118, 0.25)' : '1px solid rgba(255,255,255,0.05)'),
                                    cursor: cityPrice > 0 ? 'pointer' : 'default',
                                    transition: 'all 0.2s',
                                    transform: isSelected ? 'scale(1.02)' : 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', fontSize: '10px', fontWeight: isSelected ? 'bold' : 'normal' }}>{city}</span>
                                    {isSelected && <span style={{ fontSize: '8px', color: 'var(--color-primary-hover)', fontWeight: 'bold' }}>✓</span>}
                                  </div>
                                  <div style={{ fontWeight: isSelected || isBest ? '700' : '500', color: isSelected ? 'var(--text-primary)' : (isBest ? 'var(--color-success)' : (cityPrice > 0 ? 'var(--text-primary)' : 'var(--color-danger)')) }}>
                                    {cityPrice > 0 ? cityPrice.toLocaleString('pt-BR') : 'sem dados'}
                                  </div>
                                  {ageStr && <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>{ageStr}</div>}
                                </div>
                              );
                            })}

                            {/* Manual price option inside the grid */}
                            {(() => {
                              const isSelected = ing.sourceMode === 'manual';
                              const manualVal = isSelected ? ing.sourceValue : 0;
                              return (
                                <div 
                                  style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    background: isSelected ? 'rgba(138, 75, 245, 0.25)' : 'rgba(255,255,255,0.02)',
                                    border: isSelected ? '1px solid var(--color-primary-hover)' : '1px solid rgba(255,255,255,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '2px',
                                    transition: 'all 0.2s',
                                    transform: isSelected ? 'scale(1.02)' : 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px' }}>
                                    <span style={{ color: isSelected ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: isSelected ? 'bold' : 'normal' }}>Manual</span>
                                    <input 
                                      type="radio" 
                                      name={`price-source-${ing.itemId}`} 
                                      checked={isSelected}
                                      onChange={() => selectIngredientManual(ing.itemId, manualVal || 0)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </div>
                                  <input 
                                    type="number" 
                                    value={isSelected ? manualVal : ''}
                                    placeholder="Valor..."
                                    onChange={(e) => {
                                      const val = Math.max(0, parseInt(e.target.value) || 0);
                                      selectIngredientManual(ing.itemId, val);
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (!isSelected) {
                                        selectIngredientManual(ing.itemId, 0);
                                      }
                                    }}
                                    style={{
                                      background: 'rgba(0,0,0,0.3)',
                                      border: '1px solid rgba(255,255,255,0.1)',
                                      borderRadius: '3px',
                                      color: 'var(--text-primary)',
                                      fontSize: '11px',
                                      padding: '2px 4px',
                                      width: '100%',
                                      marginTop: '2px',
                                      outline: 'none'
                                    }}
                                  />
                                </div>
                              );
                            })()}
                          </div>
                          <div style={{ marginTop: '6px', fontSize: '11px', display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                            <span>Melhor compra: <strong style={{ color: 'var(--color-primary-hover)' }}>{bestBuy.city}</strong></span>
                            <span>{bestBuy.price > 0 ? `${bestBuy.price.toLocaleString('pt-BR')} pratas / un` : <span style={{ color: 'var(--color-danger)' }}>sem dados</span>}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  <div className="glass-card" style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>Taxa da Forja/Plot</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Taxa fixa cobrada pela banca</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{silverFee.toLocaleString('pt-BR')} pratas</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Taxa fixa</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Pricing Comparison Cards */}
              <div>
                <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Comparativo de Mercado (Líquido do Lote)
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {/* Local City Order */}
                  <div className="glass-card" style={{
                    borderLeft: localProfit > 0 ? '3px solid var(--color-success)' : '3px solid var(--color-danger)',
                    background: localProfit > 0 ? 'rgba(0, 230, 118, 0.02)' : 'rgba(255, 23, 68, 0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Mercado Local ({selectedCity})</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Venda via Ordem (Impostos: {(taxRateSellOrder * 100).toFixed(1)}%)</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontWeight: 'bold', color: localProfit > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                          {localProfit > 0 ? '+' : ''}{localProfit.toLocaleString('pt-BR')} pratas ({localMargin.toFixed(1)}%)
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                          Unitário: {localSellPrice.toLocaleString('pt-BR')} pratas | Lote ({selectedItem.batchCount}x): {(localSellPrice * selectedItem.batchCount).toLocaleString('pt-BR')} pratas
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Caerleon Black Market */}
                  <div className="glass-card" style={{
                    borderLeft: bmProfit > 0 ? '3px solid var(--color-success)' : '3px solid var(--color-danger)',
                    background: bmProfit > 0 ? 'rgba(0, 230, 118, 0.02)' : 'rgba(255, 23, 68, 0.02)'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Mercado Negro (Caerleon)</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Venda Imediata BM (Impostos: {(taxRateBuyOrder * 100).toFixed(0)}%)</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        {hasBMOption ? (
                          <>
                            <div style={{ fontWeight: 'bold', color: bmProfit > 0 ? 'var(--color-success)' : 'var(--color-danger)' }}>
                              {bmProfit > 0 ? '+' : ''}{bmProfit.toLocaleString('pt-BR')} pratas ({bmMargin.toFixed(1)}%)
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Unitário: {bmBuyOrderPrice.toLocaleString('pt-BR')} pratas | Lote ({selectedItem.batchCount}x): {(bmBuyOrderPrice * selectedItem.batchCount).toLocaleString('pt-BR')} pratas
                            </div>
                          </>
                        ) : (
                          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sem ordens de compra</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Melhor Ponto de Venda Geral */}
                  {(() => {
                    const bestSell = getBestCityToSell(targetId);
                    return (
                      <div className="glass-card" style={{
                        borderLeft: '3px solid var(--color-primary)',
                        background: 'rgba(138, 75, 245, 0.02)'
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontWeight: 'bold', fontSize: '14px' }}>Melhor Ponto de Venda Geral</div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bestSell.city} ({bestSell.sellType})</div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 'bold', color: 'var(--color-primary-hover)' }}>
                              {bestSell.price > 0 ? `${bestSell.price.toLocaleString('pt-BR')} pratas` : <span style={{ color: 'var(--color-danger)' }}>sem dados</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                              Preço unitário máximo registrado
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Global profit margin evaluation banner */}
          {!loading && (
            hasMissingPrices ? (
              <div className="glass-card" style={{
                marginTop: 'auto',
                padding: '24px',
                borderLeft: '5px solid var(--color-warning)',
                background: 'rgba(255, 214, 0, 0.04)',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <AlertTriangle size={24} color="var(--color-warning)" />
                <div>
                  <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '16px' }}>Cálculo de Lucro Suspenso</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Materiais ou produtos sem preço registrado na API. Visite os mercados correspondentes no jogo para atualizar.
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-card" style={{
                marginTop: 'auto',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '24px',
                borderLeft: bestProfit > 0 ? '5px solid var(--color-success)' : '5px solid var(--color-danger)',
                background: bestProfit > 0 ? 'rgba(0, 230, 118, 0.04)' : 'rgba(255, 23, 68, 0.04)',
                borderRadius: '8px'
              }}>
                <div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                    Melhor Opção: {bestOptionName}
                  </div>
                  <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custo Líquido:</span>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{netCraftingCost.toLocaleString('pt-BR')} pratas</div>
                    </div>
                    <div>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Venda Líquida:</span>
                      <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{bestNetSell.toLocaleString('pt-BR')} pratas</div>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                    {bestProfit > 0 ? (
                      <>
                        <CheckCircle2 color="var(--color-success)" size={24} />
                        <span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '16px', fontFamily: 'var(--font-display)' }}>PROFIT GARANTIDO</span>
                      </>
                    ) : (
                      <>
                        <XCircle color="var(--color-danger)" size={24} />
                        <span style={{ color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '16px', fontFamily: 'var(--font-display)' }}>NÃO FABRICAR (PREJUÍZO)</span>
                      </>
                    )}
                  </div>
                  <div style={{ fontSize: '26px', fontWeight: 800, color: bestProfit > 0 ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '4px' }}>
                    {bestProfit > 0 ? '+' : ''}{bestProfit.toLocaleString('pt-BR')} pratas
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {bestProfit > 0 ? `Retorno de ${bestMargin.toFixed(1)}%` : `Perda de ${bestProfit.toLocaleString('pt-BR')} pratas por lote`}
                  </div>
                </div>
              </div>
            )
          )}
        </div>
      </div>

      {/* Bottom Table: Comparativo de Preços por Cidade */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', margin: 0 }}>
          <Calculator size={20} className="text-primary" />
          Comparativo de Preços Multicidades (Pratas)
        </h3>
        
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '1000px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(138, 75, 245, 0.3)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px', fontWeight: '600' }}>Item / Recurso</th>
                {['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Black Market'].map(city => (
                  <th key={city} style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>
                    {city === 'Black Market' ? 'Mercado Negro' : city}
                  </th>
                ))}
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>Custo Manual</th>
                <th style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>Selecionado</th>
              </tr>
            </thead>
            <tbody>
              {/* Ingredients rows */}
              {ingredientsCalculated.map(ing => {
                const bestBuy = getBestCityToBuy(ing.itemId);
                const isManualSelected = ing.sourceMode === 'manual';
                const manualValue = isManualSelected ? ing.sourceValue : 0;
                return (
                  <tr 
                    key={ing.itemId} 
                    style={{ 
                      borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'rgba(138, 75, 245, 0.04)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>
                        {getFriendlyResourceName(ing.itemId, ing.type)} (x{ing.count})
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ing.itemId}</div>
                    </td>
                    
                    {['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Black Market'].map(city => {
                      const price = getPriceInCity(ing.itemId, city);
                      const isCheapest = price > 0 && city === bestBuy.city;
                      const isSelected = ing.sourceMode === 'city' && ing.sourceValue === city;
                      const priceDate = getPriceDateInCity(ing.itemId, city, 'sell');
                      const ageStr = formatPriceAge(priceDate);
                      return (
                        <td 
                          key={city} 
                          onClick={() => { if (price > 0) selectIngredientCity(ing.itemId, city); }}
                          style={{ 
                            padding: '12px', 
                            textAlign: 'right',
                            cursor: price > 0 ? 'pointer' : 'default',
                            background: isSelected ? 'rgba(138, 75, 245, 0.12)' : 'transparent',
                            outline: isSelected ? '1px solid var(--color-primary-hover)' : 'none',
                            transition: 'all 0.2s'
                          }}
                        >
                          {price === 0 ? (
                            <span style={{ color: 'var(--color-danger)', fontSize: '13px', fontWeight: '500' }}>sem dados</span>
                          ) : (
                            <div>
                              <span style={{ 
                                color: isSelected ? 'var(--color-primary-hover)' : (isCheapest ? 'var(--color-success)' : 'var(--text-primary)'), 
                                fontWeight: isSelected || isCheapest ? '700' : 'normal',
                              }}>
                                {price.toLocaleString('pt-BR')}
                                {isSelected && (
                                  <span style={{ 
                                    fontSize: '9px', 
                                    background: 'var(--color-primary)', 
                                    color: '#fff', 
                                    padding: '1px 3px', 
                                    borderRadius: '2px', 
                                    marginLeft: '4px',
                                    display: 'inline-block',
                                    verticalAlign: 'middle'
                                  }}>
                                    ativo
                                  </span>
                                )}
                              </span>
                              {ageStr && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{ageStr}</div>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    
                    {/* Manual price column cell */}
                    <td style={{ 
                      padding: '12px', 
                      textAlign: 'right',
                      background: isManualSelected ? 'rgba(138, 75, 245, 0.12)' : 'transparent',
                      outline: isManualSelected ? '1px solid var(--color-primary-hover)' : 'none'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                        <input 
                          type="number" 
                          value={isManualSelected ? manualValue : ''}
                          placeholder="Manual"
                          onChange={(e) => {
                            const val = Math.max(0, parseInt(e.target.value) || 0);
                            selectIngredientManual(ing.itemId, val);
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!isManualSelected) {
                              selectIngredientManual(ing.itemId, 0);
                            }
                          }}
                          style={{
                            background: 'rgba(0,0,0,0.3)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '3px',
                            color: 'var(--text-primary)',
                            fontSize: '12px',
                            padding: '2px 6px',
                            width: '70px',
                            textAlign: 'right'
                          }}
                        />
                        <input 
                          type="radio" 
                          name={`table-price-source-${ing.itemId}`} 
                          checked={isManualSelected}
                          onChange={() => selectIngredientManual(ing.itemId, manualValue || 0)}
                          style={{ cursor: 'pointer' }}
                        />
                      </div>
                    </td>

                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: 'var(--color-primary-hover)' }}>
                      <div>
                        <div style={{ color: 'var(--text-primary)' }}>{ing.price.toLocaleString('pt-BR')} pratas</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>
                          {ing.sourceMode === 'manual' ? 'Manual' : ing.sourceValue}
                        </div>
                      </div>
                    </td>
                  </tr>
                );
              })}
              
              {/* Product row */}
              {(() => {
                const bestSell = getBestCityToSell(targetId);
                return (
                  <tr 
                    style={{ 
                      background: 'rgba(138, 75, 245, 0.08)',
                      borderTop: '2px solid rgba(138, 75, 245, 0.3)',
                      borderBottom: '2px solid rgba(138, 75, 245, 0.3)',
                      fontWeight: 'bold'
                    }}
                  >
                    <td style={{ padding: '12px' }}>
                      <div style={{ color: 'var(--color-primary-hover)' }}>
                        {selectedItem.name} (Produto)
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{targetId}</div>
                    </td>
                    
                    {['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Black Market'].map(city => {
                      const isBM = city === 'Black Market';
                      const price = isBM 
                        ? getBuyOrderInCity(targetId, 'Black Market') 
                        : getPriceInCity(targetId, city);
                      const isBest = price > 0 && city === bestSell.city;
                      const priceDate = getPriceDateInCity(targetId, city, isBM ? 'buy' : 'sell');
                      const ageStr = formatPriceAge(priceDate);
                      return (
                        <td key={city} style={{ padding: '12px', textAlign: 'right' }}>
                          {price === 0 ? (
                            <span style={{ color: 'var(--color-danger)', fontSize: '13px', fontWeight: '500' }}>sem dados</span>
                          ) : (
                            <div>
                              <span style={{ 
                                color: isBest ? 'var(--color-success)' : 'var(--text-primary)',
                                fontWeight: '700'
                              }}>
                                {price.toLocaleString('pt-BR')}
                                {isBest && (
                                  <span style={{ 
                                    fontSize: '10px', 
                                    background: 'rgba(0, 230, 118, 0.15)', 
                                    color: 'var(--color-success)', 
                                    padding: '1px 4px', 
                                    borderRadius: '3px', 
                                    marginLeft: '4px',
                                    display: 'inline-block',
                                    verticalAlign: 'middle'
                                  }}>
                                    venda
                                  </span>
                                )}
                              </span>
                              {ageStr && <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '2px' }}>{ageStr}</div>}
                            </div>
                          )}
                        </td>
                      );
                    })}
                    
                    {/* Blank cell for Manual column in the product row to keep alignment */}
                    <td style={{ padding: '12px' }}></td>
                    
                    <td style={{ padding: '12px', textAlign: 'right', color: 'var(--color-primary-hover)' }}>
                      {bestSell.price > 0 ? (
                        <div>
                          <div>{bestSell.city}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{bestSell.price.toLocaleString('pt-BR')} pratas</div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--color-danger)' }}>sem dados</span>
                      )}
                    </td>
                  </tr>
                );
              })()}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
