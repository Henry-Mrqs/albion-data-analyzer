import React, { useState, useEffect } from 'react';
import { Flame, Info, CheckCircle2, XCircle, Calculator, Percent, Shield, AlertTriangle, RotateCw, MapPin, Edit3 } from 'lucide-react';

const RESOURCES = [
  { id: 'HIDE/LEATHER', label: 'Couro / Couro Bruto', rawType: 'HIDE', refinedType: 'LEATHER', cityBonus: 'Martlock' },
  { id: 'ORE/METALBAR', label: 'Barra de Metal / Minério', rawType: 'ORE', refinedType: 'METALBAR', cityBonus: 'Thetford' },
  { id: 'WOOD/PLANK', label: 'Tábua / Madeira', rawType: 'WOOD', refinedType: 'PLANK', cityBonus: 'Fort Sterling' },
  { id: 'FIBER/CLOTH', label: 'Tecido / Fibra', rawType: 'FIBER', refinedType: 'CLOTH', cityBonus: 'Lymhurst' },
  { id: 'STONE/STONEBLOCK', label: 'Bloco de Pedra / Pedra', rawType: 'STONE', refinedType: 'STONEBLOCK', cityBonus: 'Bridgewatch' }
];

const CITIES = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon'];
const ALL_CITIES = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Black Market'];
const TIERS = [4, 5, 6, 7, 8];
const ENCHANTMENTS = [0, 1, 2, 3, 4];

// Item Value lookup for tax calculation
const ITEM_VALUES = {
  // Raw
  'HIDE': { 4: 8, 5: 16, 6: 32, 7: 64, 8: 128 },
  'ORE': { 4: 8, 5: 16, 6: 32, 7: 64, 8: 128 },
  'WOOD': { 4: 8, 5: 16, 6: 32, 7: 64, 8: 128 },
  'FIBER': { 4: 8, 5: 16, 6: 32, 7: 64, 8: 128 },
  'STONE': { 4: 8, 5: 16, 6: 32, 7: 64, 8: 128 },
  // Refined
  'LEATHER': { 4: 16, 5: 32, 6: 64, 7: 128, 8: 256 },
  'METALBAR': { 4: 16, 5: 32, 6: 64, 7: 128, 8: 256 },
  'PLANK': { 4: 16, 5: 32, 6: 64, 7: 128, 8: 256 },
  'CLOTH': { 4: 16, 5: 32, 6: 64, 7: 128, 8: 256 },
  'STONEBLOCK': { 4: 16, 5: 32, 6: 64, 7: 128, 8: 256 }
};

const getFriendlyResourceName = (itemId) => {
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
      'STONE': 'Pedra'
    };
    
    const baseName = resourceNames[baseType] || baseType;
    const enchSuffix = ench > 0 ? `.${ench}` : '';
    return `${baseName} T${tier}${enchSuffix}`;
  }
  return itemId;
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

export default function RefiningCalc() {
  const [selectedRes, setSelectedRes] = useState(RESOURCES[0]);
  const [buyCity, setBuyCity] = useState('Martlock');
  const [refineCity, setRefineCity] = useState('Martlock');
  const [sellCity, setSellCity] = useState('Martlock');
  
  const [selectedTier, setSelectedTier] = useState(4);
  const [selectedEnch, setSelectedEnch] = useState(0);
  
  const [useFocus, setUseFocus] = useState(false);
  const [dailyBonus, setDailyBonus] = useState(0);
  
  const [taxMode, setTaxMode] = useState('nutrition');
  const [stationTaxValue, setStationTaxValue] = useState(400); // 400 silver / 100 nutrition OR 150 flat
  
  const [isPremium, setIsPremium] = useState(true);
  const [useBuyOrder, setUseBuyOrder] = useState(true);
  
  const [manualPrices, setManualPrices] = useState({ raw: '', prev: '', refined: '' });
  const [manualRRR, setManualRRR] = useState('');
  
  const [prices, setPrices] = useState(null);
  const [loading, setLoading] = useState(false);

  // Determine item IDs
  const getRawItemId = (tier, ench) => {
    const suffix = ench === 0 || selectedRes.rawType === 'STONE' ? '' : `_LEVEL${ench}`;
    return `T${tier}_${selectedRes.rawType}${suffix}`;
  };

  const getRefinedItemId = (tier, ench) => {
    const suffix = ench === 0 || selectedRes.refinedType === 'STONEBLOCK' ? '' : `_LEVEL${ench}`;
    return `T${tier}_${selectedRes.refinedType}${suffix}`;
  };

  const getPrevRefinedItemId = (tier, ench) => {
    const suffix = ench === 0 || selectedRes.refinedType === 'STONEBLOCK' ? '' : `_LEVEL${ench}`;
    return `T${tier - 1}_${selectedRes.refinedType}${suffix}`;
  };

  const rawId = getRawItemId(selectedTier, selectedEnch);
  const refinedId = getRefinedItemId(selectedTier, selectedEnch);
  const prevRefinedId = getPrevRefinedItemId(selectedTier, selectedEnch);

  // Fetch prices for the required items
  const fetchPrices = async (force = false) => {
    setLoading(true);
    try {
      const url = force 
        ? `/api/prices?ids=${rawId},${refinedId},${prevRefinedId}&force=true` 
        : `/api/prices?ids=${rawId},${refinedId},${prevRefinedId}`;
      const response = await fetch(url);
      const data = await response.json();
      setPrices(data);
    } catch (err) {
      console.error('Error fetching prices for calculator:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices(false);
  }, [selectedRes, selectedTier, selectedEnch, rawId, refinedId, prevRefinedId]);

  // RRR Formula calculation
  const isCityBonusActive = selectedRes.cityBonus === refineCity;
  
  const calculateRRR = () => {
    if (manualRRR !== '' && !isNaN(parseFloat(manualRRR))) {
      return parseFloat(manualRRR) / 100;
    }
    
    // Base bonus factor values based on Albion online mechanics
    let bonusFactor = 0;
    
    // Base royal city return
    bonusFactor += 0.179; // ~15.2% base
    
    if (isCityBonusActive) {
      bonusFactor += 0.401; // Specialization adds to ~36.7%
    }
    
    if (useFocus) {
      bonusFactor += 0.585; // Focus adds to bonus factor
    }
    
    // Daily bonus is additive to the bonus factor
    if (dailyBonus > 0) {
      bonusFactor += (dailyBonus / 100) * 1.5; // Approximation, actual math varies slightly
    }
    
    // RRR = BonusFactor / (1 + BonusFactor)
    let calculatedRRR = bonusFactor / (1 + bonusFactor);
    
    // Cap at typical maximums or return
    return Math.min(0.9, calculatedRRR); 
  };

  const getPreciseRRR = () => {
    // Return precise known values if standard settings to avoid floating point weirdness
    if (manualRRR === '' && dailyBonus === 0) {
      if (isCityBonusActive) {
        return useFocus ? 0.539 : 0.367;
      }
      return useFocus ? 0.435 : 0.152;
    }
    return calculateRRR();
  };

  const rrrValue = getPreciseRRR();

  // Recipe definition
  const getRecipe = () => {
    const rawCount = selectedTier === 4 ? 2 : selectedTier === 5 ? 3 : selectedTier === 6 ? 4 : 5;
    return { rawCount, prevCount: 1 };
  };

  const recipe = getRecipe();

  // Price resolution helpers
  const getPriceInCity = (itemId, city, type = 'sell') => {
    if (!prices || !prices[itemId] || !prices[itemId][city]) return 0;
    const cityData = prices[itemId][city];
    let bestPrice = type === 'sell' ? Infinity : 0;
    const priceKey = type === 'sell' ? 'sell_price_min' : 'buy_price_max';
    
    for (let q = 1; q <= 5; q++) {
      if (cityData[q] && cityData[q][priceKey] > 0) {
        if (type === 'sell') {
          if (cityData[q][priceKey] < bestPrice) bestPrice = cityData[q][priceKey];
        } else {
          if (cityData[q][priceKey] > bestPrice) bestPrice = cityData[q][priceKey];
        }
      }
    }
    if (bestPrice !== Infinity && bestPrice !== 0) return bestPrice;
    return cityData[priceKey] || 0;
  };

  const getPriceDateInCity = (itemId, city, type = 'sell') => {
    if (!prices || !prices[itemId] || !prices[itemId][city]) return null;
    const cityData = prices[itemId][city];
    const dateKey = type === 'sell' ? 'sell_price_min_date' : 'buy_price_max_date';
    const priceKey = type === 'sell' ? 'sell_price_min' : 'buy_price_max';
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
    for (const city of CITIES) {
      const price = getPriceInCity(itemId, city, useBuyOrder ? 'buy' : 'sell');
      if (price > 0 && price < minPrice) {
        minPrice = price;
        bestCity = city;
      }
    }
    return { city: bestCity, price: minPrice === Infinity ? 0 : minPrice };
  };

  const getBestCityToSell = (itemId) => {
    if (!prices || !prices[itemId]) return { city: 'Sem dados', price: 0 };
    let bestCity = 'Sem dados';
    let maxPrice = 0;
    for (const city of ALL_CITIES) {
      const price = getPriceInCity(itemId, city, city === 'Black Market' ? 'buy' : 'sell');
      if (price > maxPrice) {
        maxPrice = price;
        bestCity = city;
      }
    }
    return { city: bestCity, price: maxPrice };
  };

  // Determine active prices (Manual vs API)
  const getActivePrice = (manual, itemId, city, type) => {
    if (manual !== '' && !isNaN(parseFloat(manual))) return parseFloat(manual);
    return getPriceInCity(itemId, city, type);
  };

  const rawPrice = getActivePrice(manualPrices.raw, rawId, buyCity, useBuyOrder ? 'buy' : 'sell');
  const prevRefinedPrice = getActivePrice(manualPrices.prev, prevRefinedId, buyCity, useBuyOrder ? 'buy' : 'sell');
  const targetRefinedPrice = getActivePrice(manualPrices.refined, refinedId, sellCity, sellCity === 'Black Market' ? 'buy' : 'sell');

  const missingPricesList = [];
  if (rawPrice === 0 && manualPrices.raw === '') missingPricesList.push(`Matéria-prima (${rawId}) em ${buyCity}`);
  if (prevRefinedPrice === 0 && manualPrices.prev === '' && selectedTier > 4) missingPricesList.push(`Material Prévio (${prevRefinedId}) em ${buyCity}`);
  if (targetRefinedPrice === 0 && manualPrices.refined === '') missingPricesList.push(`Item Refinado (${refinedId}) em ${sellCity}`);
  const hasMissingPrices = missingPricesList.length > 0;

  // System value of refined item for silver tax calculation
  const getSystemItemValue = () => {
    const baseValue = ITEM_VALUES[selectedRes.refinedType]?.[selectedTier] || 16;
    // Enchants multiply item value by powers of 2
    const multiplier = Math.pow(2, selectedEnch);
    return baseValue * multiplier;
  };

  const systemValue = getSystemItemValue();
  
  // Fee Calculation
  // Nutrition Cost = Item Value * 0.1125
  const nutritionCost = systemValue * 0.1125;
  const silverFee = taxMode === 'nutrition' 
    ? Math.round(nutritionCost * (stationTaxValue / 100))
    : stationTaxValue; // flat mode

  // Math calculations
  const rawCostTotal = rawPrice * recipe.rawCount;
  // Tier 4+ needs previous refined, except stone which always needs T3? T4 Stone needs T3 Stoneblock.
  const prevCount = selectedTier > 3 ? recipe.prevCount : 0;
  const prevCostTotal = prevRefinedPrice * prevCount;
  
  // Buy setup fee (if using buy orders, we pay 2.5% setup fee on cost)
  const buySetupFeeMultiplier = useBuyOrder ? 0.025 : 0;
  const grossCost = (rawCostTotal + prevCostTotal) * (1 + buySetupFeeMultiplier);
  
  // Net production cost applying RRR
  const netProductionCost = Math.round(grossCost * (1 - rrrValue) + silverFee);

  // Market Taxes
  // Sell order fee: 4% market tax + 2.5% listing fee = 6.5% (Premium) or 8% + 2.5% = 10.5% (without)
  const taxRate = isPremium ? 0.065 : 0.105;
  const netSellPrice = Math.round(targetRefinedPrice * (1 - taxRate));
  const profitPerClick = netSellPrice - netProductionCost;
  const profitMargin = netProductionCost > 0 ? (profitPerClick / netProductionCost) * 100 : 0;
  
  // Materials returned per click
  const rawReturned = (recipe.rawCount * rrrValue).toFixed(2);
  const prevReturned = (prevCount * rrrValue).toFixed(2);

  // Ingredients for the table
  const tableIngredients = [
    { itemId: rawId, label: getFriendlyResourceName(rawId), count: recipe.rawCount },
    { itemId: prevRefinedId, label: getFriendlyResourceName(prevRefinedId), count: prevCount }
  ].filter(i => i.count > 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 160px)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '400px 1fr', gap: '24px' }}>
        {/* Parameters Form Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
            <Flame size={20} className="text-primary" />
            Configuração Avançada de Refino
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {/* Resource Selection */}
            <div className="input-group">
              <label className="input-label">Tipo de Recurso</label>
              <select 
                className="input-field" 
                value={selectedRes.id}
                onChange={(e) => setSelectedRes(RESOURCES.find(r => r.id === e.target.value))}
              >
                {RESOURCES.map(r => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </div>
            {/* Tier / Ench Selection */}
            <div className="input-group" style={{ display: 'flex', gap: '4px' }}>
              <div style={{ flex: 1 }}>
                <label className="input-label">Tier</label>
                <select className="input-field" value={selectedTier} onChange={(e) => setSelectedTier(parseInt(e.target.value))}>
                  {TIERS.map(t => <option key={t} value={t}>T{t}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label className="input-label">Encant.</label>
                <select className="input-field" value={selectedEnch} onChange={(e) => setSelectedEnch(parseInt(e.target.value))} disabled={selectedRes.rawType === 'STONE'}>
                  {ENCHANTMENTS.map(e => <option key={e} value={e}>.{e}</option>)}
                </select>
              </div>
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

          {/* Logística */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontWeight: '600', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <MapPin size={16} /> Logística (Cidades)
            </div>
            <div className="input-group">
              <label className="input-label">Onde comprar os Insumos?</label>
              <select className="input-field" value={buyCity} onChange={(e) => setBuyCity(e.target.value)}>
                {CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Onde Refinar?</label>
              <select className="input-field" value={refineCity} onChange={(e) => setRefineCity(e.target.value)}>
                {CITIES.map(c => <option key={c} value={c}>{c} {c === selectedRes.cityBonus ? '(Bônus)' : ''}</option>)}
              </select>
            </div>
            <div className="input-group">
              <label className="input-label">Onde vender o Refinado?</label>
              <select className="input-field" value={sellCity} onChange={(e) => setSellCity(e.target.value)}>
                {ALL_CITIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

          {/* Station Tax */}
          <div className="input-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <label className="input-label" style={{ marginBottom: 0 }}>Taxa da Banca</label>
              <div style={{ display: 'flex', gap: '8px', fontSize: '12px' }}>
                <span style={{ cursor: 'pointer', color: taxMode === 'nutrition' ? 'var(--color-primary)' : 'var(--text-muted)' }} onClick={() => setTaxMode('nutrition')}>Nutrição</span>
                <span style={{ cursor: 'pointer', color: taxMode === 'flat' ? 'var(--color-primary)' : 'var(--text-muted)' }} onClick={() => setTaxMode('flat')}>Exato (Prata)</span>
              </div>
            </div>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', right: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '12px' }}>
                {taxMode === 'nutrition' ? 'por 100 nut.' : 'pratas'}
              </span>
              <input 
                className="input-field" 
                type="number" 
                value={stationTaxValue}
                onChange={(e) => setStationTaxValue(Math.max(0, parseFloat(e.target.value) || 0))}
                placeholder={taxMode === 'nutrition' ? "ex: 450" : "ex: 150"}
                style={{ paddingRight: '100px' }}
              />
            </div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              Custo calculado por item: <strong style={{ color: 'var(--text-secondary)' }}>{silverFee} pratas</strong>
            </div>
          </div>

          <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '4px 0' }} />

          {/* Overrides and Toggles */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontWeight: '600', color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Edit3 size={16} /> Bônus e Taxas
            </div>
            
            {/* RRR Overrides */}
            <div style={{ display: 'flex', gap: '12px' }}>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">Bônus Diário (%)</label>
                <select className="input-field" value={dailyBonus} onChange={(e) => setDailyBonus(parseInt(e.target.value))}>
                  <option value={0}>Nenhum</option>
                  <option value={10}>+10% Bônus</option>
                  <option value={20}>+20% Bônus</option>
                </select>
              </div>
              <div className="input-group" style={{ flex: 1 }}>
                <label className="input-label">RRR Exato Override</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>%</span>
                  <input className="input-field" type="number" step="0.1" value={manualRRR} onChange={(e) => setManualRRR(e.target.value)} placeholder="ex: 53.9" />
                </div>
              </div>
            </div>

            {/* Toggles */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>Usar Foco</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Aumenta muito a % de retorno</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={useFocus} onChange={(e) => setUseFocus(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px' }}>Comprar com Buy Order</div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Paga +2.5% de taxa na compra</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={useBuyOrder} onChange={(e) => setUseBuyOrder(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
              <div>
                <div style={{ fontWeight: '600', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  Conta Premium <Shield size={12} className="text-warning" />
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Mercado (6.5% vs 10.5%)</div>
              </div>
              <label className="toggle-switch">
                <input type="checkbox" checked={isPremium} onChange={(e) => setIsPremium(e.target.checked)} />
                <span className="slider"></span>
              </label>
            </div>
          </div>
        </div>

        {/* Results Display Panel */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(138, 75, 245, 0.2)', paddingBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
              <Calculator size={20} className="text-primary" />
              Resultado Econômico de Precisão
            </h3>
            <button onClick={() => fetchPrices(true)} disabled={loading} className="btn-primary" style={{ height: '36px', padding: '0 16px', fontSize: '13px' }}>
              <RotateCw size={14} className={loading ? 'animate-spin' : ''} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
              Forçar Sincronização
            </button>
          </div>

          {/* City Bonus Indicator Banner */}
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
                {isCityBonusActive ? 'Cidade Especializada Ativa' : 'Refino Fora da Especialização'}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                {isCityBonusActive 
                  ? `Refinando em ${refineCity}, que possui bônus nativo de RRR para este recurso.`
                  : `A cidade especializada deste recurso é ${selectedRes.cityBonus}. Refinando em ${refineCity}, o retorno é severamente menor.`}
                {buyCity !== refineCity && <span> <strong>(Custo de Transporte não incluído nos cálculos)</strong></span>}
              </div>
            </div>
          </div>

          {hasMissingPrices && (
            <div style={{ background: 'rgba(255, 214, 0, 0.08)', border: '1px solid rgba(255, 214, 0, 0.35)', borderRadius: '8px', padding: '16px', color: '#ffe082', fontSize: '13px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}>
                <AlertTriangle size={20} />
                <span>Dados Ausentes na API</span>
              </div>
              <span>Os seguintes itens estão sem preço nas cidades selecionadas:</span>
              <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                {missingPricesList.map((item, idx) => <li key={idx}>{item}</li>)}
              </ul>
              <span>Você pode inserir os preços manualmente abaixo nas tabelas de custo/venda.</span>
            </div>
          )}

          {/* Detailed Calculations breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
            {/* Ingredients list */}
            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Custo dos Insumos
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>{getFriendlyResourceName(rawId)} (x{recipe.rawCount})</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Compra: {buyCity} {useBuyOrder ? '(Buy Order)' : ''}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                      {(rawPrice * recipe.rawCount).toLocaleString('pt-BR')} pratas
                    </div>
                  </div>
                  <input type="number" placeholder="Preço un. Manual" className="input-field" style={{ height: '28px', fontSize: '12px' }} value={manualPrices.raw} onChange={(e) => setManualPrices({...manualPrices, raw: e.target.value})} />
                </div>

                {prevCount > 0 && (
                  <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>{getFriendlyResourceName(prevRefinedId)} (x{prevCount})</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Compra: {buyCity} {useBuyOrder ? '(Buy Order)' : ''}</div>
                      </div>
                      <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                        {(prevRefinedPrice * prevCount).toLocaleString('pt-BR')} pratas
                      </div>
                    </div>
                    <input type="number" placeholder="Preço un. Manual" className="input-field" style={{ height: '28px', fontSize: '12px' }} value={manualPrices.prev} onChange={(e) => setManualPrices({...manualPrices, prev: e.target.value})} />
                  </div>
                )}

                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Taxa do Plot (Banca)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Item Value: {systemValue}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: 'var(--text-secondary)' }}>{silverFee.toLocaleString('pt-BR')} pratas</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mathematical RRR and returns */}
            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Resultados e Retornos
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Taxa de Retorno Aplicada</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>RRR final no refino</div>
                  </div>
                  <div style={{ fontWeight: 'bold', color: 'var(--color-success)', fontSize: '18px' }}>
                    {(rrrValue * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="glass-card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>Recursos Retornados</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Média esperada por clique</div>
                  </div>
                  <div style={{ textAlign: 'right', fontSize: '13px', color: 'var(--text-secondary)' }}>
                    <div>{rawReturned} Brutos</div>
                    {prevCount > 0 && <div>{prevReturned} Refinados</div>}
                  </div>
                </div>

                <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>Valor de Venda (Produto)</div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Venda: {sellCity} | Líquido: {netSellPrice.toLocaleString('pt-BR')}</div>
                    </div>
                    <div style={{ textAlign: 'right', fontWeight: 'bold', color: 'var(--text-primary)' }}>
                      {targetRefinedPrice.toLocaleString('pt-BR')} pratas
                    </div>
                  </div>
                  <input type="number" placeholder="Preço Venda Manual" className="input-field" style={{ height: '28px', fontSize: '12px' }} value={manualPrices.refined} onChange={(e) => setManualPrices({...manualPrices, refined: e.target.value})} />
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Banner with precise profit margin estimation */}
          {hasMissingPrices ? (
            <div className="glass-card" style={{ marginTop: 'auto', padding: '24px', borderLeft: '5px solid var(--color-warning)', background: 'rgba(255, 214, 0, 0.04)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <AlertTriangle size={24} color="var(--color-warning)" />
              <div>
                <div style={{ fontWeight: 'bold', color: 'var(--text-primary)', fontSize: '16px' }}>Cálculo de Lucro Suspenso</div>
                <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>Insira os preços manuais ou atualize a API.</div>
              </div>
            </div>
          ) : (
            <div className="glass-card" style={{
              marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '24px',
              borderLeft: profitPerClick > 0 ? '5px solid var(--color-success)' : '5px solid var(--color-danger)',
              background: profitPerClick > 0 ? 'rgba(0, 230, 118, 0.04)' : 'rgba(255, 23, 68, 0.04)',
              borderRadius: '8px'
            }}>
              <div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  Custo Líquido vs Venda Líquida
                </div>
                <div style={{ display: 'flex', gap: '24px', marginTop: '8px' }}>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custo Produção:</span>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{netProductionCost.toLocaleString('pt-BR')}</div>
                  </div>
                  <div>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Venda Líquida:</span>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: 'var(--text-primary)' }}>{netSellPrice.toLocaleString('pt-BR')}</div>
                  </div>
                </div>
              </div>
              
              <div style={{ textAlign: 'right' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'flex-end' }}>
                  {profitPerClick > 0 ? (
                    <><CheckCircle2 color="var(--color-success)" size={24} /><span style={{ color: 'var(--color-success)', fontWeight: 'bold', fontSize: '18px' }}>Margem: +{profitMargin.toFixed(1)}%</span></>
                  ) : (
                    <><XCircle color="var(--color-danger)" size={24} /><span style={{ color: 'var(--color-danger)', fontWeight: 'bold', fontSize: '18px' }}>Margem: {profitMargin.toFixed(1)}%</span></>
                  )}
                </div>
                <div style={{ fontSize: '24px', fontWeight: 800, color: profitPerClick > 0 ? 'var(--color-success)' : 'var(--color-danger)', marginTop: '4px' }}>
                  {profitPerClick > 0 ? '+' : ''}{profitPerClick.toLocaleString('pt-BR')} pratas
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lucro Real Estimado por Clique</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tabela de Preços Global mantida minimalista em baixo caso queiram comparar */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', margin: 0 }}>
          <Calculator size={20} className="text-primary" /> Visão Global do Mercado (API)
        </h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid rgba(138, 75, 245, 0.3)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px', fontWeight: '600' }}>Item / Recurso</th>
                {ALL_CITIES.map(city => (
                  <th key={city} style={{ padding: '12px', fontWeight: '600', textAlign: 'right' }}>
                    {city === 'Black Market' ? 'Mercado Negro' : city}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableIngredients.map(ing => (
                <tr key={ing.itemId} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)' }}>
                  <td style={{ padding: '12px' }}>
                    <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{ing.label} (Compra)</div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{ing.itemId}</div>
                  </td>
                  {ALL_CITIES.map(city => {
                    const isBM = city === 'Black Market';
                    const price = getPriceInCity(ing.itemId, city, isBM ? 'buy' : 'sell');
                    const priceDate = getPriceDateInCity(ing.itemId, city, isBM ? 'buy' : 'sell');
                    const ageStr = formatPriceAge(priceDate);
                    return (
                      <td key={city} style={{ padding: '12px', textAlign: 'right' }}>
                        {price === 0 ? <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>sem dados</span> : (
                          <div>
                            <span style={{ color: city === buyCity ? 'var(--color-success)' : 'var(--text-primary)', fontWeight: city === buyCity ? 'bold' : 'normal' }}>
                              {price.toLocaleString('pt-BR')}
                            </span>
                            {ageStr && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ageStr}</div>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
              <tr style={{ background: 'rgba(138, 75, 245, 0.08)' }}>
                <td style={{ padding: '12px' }}>
                  <div style={{ color: 'var(--color-primary-hover)', fontWeight: 'bold' }}>{getFriendlyResourceName(refinedId)} (Venda)</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{refinedId}</div>
                </td>
                {ALL_CITIES.map(city => {
                  const isBM = city === 'Black Market';
                  const price = getPriceInCity(refinedId, city, isBM ? 'buy' : 'sell');
                  const priceDate = getPriceDateInCity(refinedId, city, isBM ? 'buy' : 'sell');
                  const ageStr = formatPriceAge(priceDate);
                  return (
                    <td key={city} style={{ padding: '12px', textAlign: 'right' }}>
                      {price === 0 ? <span style={{ color: 'var(--color-danger)', fontSize: '13px' }}>sem dados</span> : (
                        <div>
                          <span style={{ color: city === sellCity ? 'var(--color-success)' : 'var(--text-primary)', fontWeight: city === sellCity ? 'bold' : 'normal' }}>
                            {price.toLocaleString('pt-BR')}
                          </span>
                          {ageStr && <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{ageStr}</div>}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
