import React, { useState, useEffect } from 'react';
import { 
  Truck, RotateCw, Filter, Shield, AlertTriangle, Volume2, 
  ArrowRight, Scale, BadgeAlert, CheckSquare, Square, Info, 
  Sparkles, ShoppingCart, Check, Calendar, Search, HelpCircle, 
  ChevronsUpDown, Landmark, DollarSign, Tag
} from 'lucide-react';

const QUALITY_NAMES = {
  1: 'Normal',
  2: 'Bom',
  3: 'Excelente',
  4: 'Excelente',
  5: 'Obra-Prima'
};

const QUALITY_LABELS = {
  1: 'Normal',
  2: 'Bom (Good)',
  3: 'Excelente (Outstanding)',
  4: 'Excelente (Excellent)',
  5: 'Obra-Prima (Masterpiece)'
};

// Helper to map items to Portuguese categories
const getCategoryName = (item) => {
  const itemId = item.id || item.item_id;
  if (!itemId) return 'Outro';
  if (item.item_type === 'raw_resource') return 'Recurso Bruto';
  if (item.item_type === 'refined_resource') return 'Recurso Refinado';
  if (item.item_type === 'consumable') return 'Consumível';
  
  if (itemId.includes('AXE')) return 'Machado';
  if (itemId.includes('SWORD')) return 'Espada';
  if (itemId.includes('BOW')) return 'Arco';
  if (itemId.includes('CROSSBOW')) return 'Besta';
  if (itemId.includes('DAGGER')) return 'Adaga';
  if (itemId.includes('SPEAR')) return 'Lança';
  if (itemId.includes('MACE')) return 'Maça';
  if (itemId.includes('HAMMER')) return 'Martelo';
  if (itemId.includes('QUARTERSTAFF')) return 'Cajado Bilaminado';
  if (itemId.includes('WARGLOVE') || itemId.includes('WAR_GLOVE')) return 'Luvas de Guerra';
  if (itemId.includes('STAFF')) return 'Cajado';
  
  if (itemId.includes('ARMOR_PLATE')) return 'Peito (Placa)';
  if (itemId.includes('ARMOR_LEATHER')) return 'Peito (Couro)';
  if (itemId.includes('ARMOR_CLOTH')) return 'Peito (Tecido)';
  
  if (itemId.includes('HELMET_PLATE')) return 'Elmo (Placa)';
  if (itemId.includes('HELMET_LEATHER')) return 'Capuz (Couro)';
  if (itemId.includes('HELMET_CLOTH')) return 'Hábito (Tecido)';
  
  if (itemId.includes('SHOES_PLATE')) return 'Botas (Placa)';
  if (itemId.includes('SHOES_LEATHER')) return 'Sapatos (Couro)';
  if (itemId.includes('SHOES_CLOTH')) return 'Sandálias (Tecido)';
  
  if (itemId.includes('BAG')) return 'Bolsa';
  if (itemId.includes('CAPE')) return 'Capa';
  if (itemId.includes('OFF_')) return 'Mão Secundária (Offhand)';
  return 'Outro';
};

const getSubTierName = (name, tier, enchantment, quality) => {
  const baseName = name.replace(/\s+T\d+(\.\d+)?$/, '');
  const qualityName = QUALITY_NAMES[quality] || 'Normal';
  const enchantStr = enchantment > 0 ? `.${enchantment}` : '';
  return `${baseName} T${tier}${enchantStr} ${qualityName}`;
};

const formatRelativeTime = (dateString) => {
  if (!dateString || dateString.startsWith('0001-01-01')) return 'Sem dados';
  try {
    const date = new Date(dateString + 'Z'); // UTC
    if (isNaN(date.getTime())) return 'Sem dados';
    
    const diffMs = Date.now() - date.getTime();
    const diffMin = Math.round(diffMs / 60000);
    const diffHours = Math.round(diffMs / 3600000);
    
    if (diffMin < 1) return 'Agora';
    if (diffMin < 60) return `Há ${diffMin}m`;
    if (diffHours < 24) return `Há ${diffHours}h`;
    const diffDays = Math.round(diffHours / 24);
    return `Há ${diffDays}d`;
  } catch (e) {
    return 'Sem dados';
  }
};

const getPriceAgeHours = (dateString) => {
  if (!dateString || dateString.startsWith('0001-01-01')) return Infinity;
  const date = new Date(dateString + 'Z');
  if (isNaN(date.getTime())) return Infinity;
  return (Date.now() - date.getTime()) / 3600000;
};

const formatValueAbbreviated = (value) => {
  if (value === undefined || value === null || value === 0) return '0';
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(2)} m`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(0)} k`;
  }
  return value.toString();
};

const formatPercent = (value) => {
  if (value === undefined || value === null) return '0%';
  return value.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) + '%';
};

const CITIES = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon', 'Black Market'];

const getCitiesSummary = (selectedList) => {
  if (selectedList.length === 0) return 'Nenhuma';
  if (selectedList.length === CITIES.length) return 'Todas as Cidades';
  if (selectedList.length > 2) {
    return `${selectedList.slice(0, 2).join(', ')} (+${selectedList.length - 2})`;
  }
  return selectedList.join(', ');
};

export default function Flipper() {
  const [pricesData, setPricesData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Custom Purchase & Sale City Filters (Multi-select)
  const [selectedBuyCities, setSelectedBuyCities] = useState(CITIES);
  const [selectedSellCities, setSelectedSellCities] = useState(['Black Market']);
  const [buyDropdownOpen, setBuyDropdownOpen] = useState(false);
  const [sellDropdownOpen, setSellDropdownOpen] = useState(false);
  
  // Transaction Mode Filters
  const [allowBuyInstant, setAllowBuyInstant] = useState(true); // Buy from Sell Orders
  const [allowBuyOrder, setAllowBuyOrder] = useState(true);     // Buy via Buy Orders
  const [allowSellInstant, setAllowSellInstant] = useState(true); // Sell directly to Buy Orders
  const [allowSellOrder, setAllowSellOrder] = useState(true);     // List as Sell Order
  
  // Data Age Filters (Hours)
  const [maxBuyAge, setMaxBuyAge] = useState(24);   // default 24h
  const [maxSellAge, setMaxSellAge] = useState(24);  // default 24h

  // Item Types Filter
  const [allowEquipment, setAllowEquipment] = useState(true);
  const [allowResources, setAllowResources] = useState(true);
  const [allowConsumables, setAllowConsumables] = useState(true);

  // Classic Filters (Defaults updated to include T8, .4, and Quality 4)
  const [selectedTiers, setSelectedTiers] = useState([4, 5, 6, 7, 8]);
  const [selectedEnchs, setSelectedEnchs] = useState([0, 1, 2, 3, 4]);
  const [selectedQualities, setSelectedQualities] = useState([1, 2, 3, 4, 5]); // Normal, Bom, Excelente (Outstanding), Excelente (Excellent), Obra-Prima
  const [searchFilter, setSearchFilter] = useState('');
  const [minMargin, setMinMargin] = useState(20); // 20% default margin
  const [maxMargin, setMaxMargin] = useState(1000); // 1000% default max margin (1000 means Sem Limite)
  const [maxInvestment, setMaxInvestment] = useState(1000000); // 1M silver default
  const [maxProfit, setMaxProfit] = useState(5000000); // 5M silver default max profit (5M means Sem Limite)
  const [isPremium, setIsPremium] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [mountCapacity, setMountCapacity] = useState(1200); // Ox (1200 kg)

  // Equipment Category filter selection
  const [selectedCategories, setSelectedCategories] = useState([
    'Machado', 'Espada', 'Arco', 'Besta', 'Adaga', 'Lança', 'Maça', 'Martelo', 'Cajado Bilaminado', 'Luvas de Guerra', 'Cajado',
    'Peito (Placa)', 'Peito (Couro)', 'Peito (Tecido)',
    'Elmo (Placa)', 'Capuz (Couro)', 'Hábito (Tecido)',
    'Botas (Placa)', 'Sapatos (Couro)', 'Sandálias (Tecido)',
    'Bolsa', 'Capa', 'Mão Secundária (Offhand)', 'Recurso Bruto', 'Recurso Refinado', 'Consumível', 'Outro'
  ]);

  // Cargo Manifest Checklist Selection & Quantities mapping
  const [quantities, setQuantities] = useState({});
  const [selectedCandidates, setSelectedCandidates] = useState({});
  const [lastOpportunityCount, setLastOpportunityCount] = useState(0);

  // Fetch prices from backend API
  const fetchPrices = async (force = false) => {
    setLoading(true);
    setError('');
    try {
      const url = force ? '/api/flipper/prices?force=true' : '/api/flipper/prices';
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Falha ao obter dados do mercado.');
      }
      const data = await response.json();
      setPricesData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices(false); // initial mount loads cached data
  }, []);

  // Beep alarm for instant riskless flips (Buy Instant -> Sell Instant)
  const playAlarm = () => {
    if (!audioEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const beep = (delay, freq) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, ctx.currentTime + delay);
        gain.gain.setValueAtTime(0, ctx.currentTime + delay);
        gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + delay + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + 0.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(ctx.currentTime + delay);
        osc.stop(ctx.currentTime + delay + 0.16);
      };
      beep(0, 932); // A#5
      beep(0.15, 1175); // D6
    } catch (e) {
      console.error('Audio synthesis failed:', e);
    }
  };

  // Compile unique key for mapping selections
  const getCandidateKey = (opp) => {
    return `${opp.item_id}_qb${opp.buy_quality}_qs${opp.sell_quality}_${opp.buy_city}_${opp.sell_city}_mb${opp.buy_mode}_ms${opp.sell_mode}`;
  };

  // Compile opportunities list based on selected filters and math rules
  const getOpportunities = () => {
    if (pricesData.length === 0) return [];
    
    // Group prices by item_id
    const grouped = {};
    for (const p of pricesData) {
      if (!grouped[p.item_id]) {
        grouped[p.item_id] = {
          id: p.item_id,
          name_pt: p.name_pt,
          name_en: p.name_en,
          tier: p.tier,
          enchantment: p.enchantment,
          weight: p.weight,
          item_type: p.item_type,
          pricesByCityAndQuality: {} // format: { city: { quality: priceObject } }
        };
      }
      if (!grouped[p.item_id].pricesByCityAndQuality[p.city]) {
        grouped[p.item_id].pricesByCityAndQuality[p.city] = {};
      }
      grouped[p.item_id].pricesByCityAndQuality[p.city][p.quality] = p;
    }

    const taxRate = isPremium ? 0.04 : 0.08;
    const setupRate = 0.015;
    const candidates = [];

    // Filter cities to process
    const activeBuyCities = selectedBuyCities;
    const activeSellCities = selectedSellCities;

    for (const itemId of Object.keys(grouped)) {
      const item = grouped[itemId];

      // Item type filter
      if (item.item_type === 'equipment' && !allowEquipment) continue;
      if ((item.item_type === 'raw_resource' || item.item_type === 'refined_resource') && !allowResources) continue;
      if (item.item_type === 'consumable' && !allowConsumables) continue;

      // Tier & Enchantment filter
      if (!selectedTiers.includes(item.tier)) continue;
      if (!selectedEnchs.includes(item.enchantment)) continue;

      // Category filter
      const category = getCategoryName(item);
      if (!selectedCategories.includes(category)) continue;

      // Search keyword filter
      if (searchFilter.trim()) {
        const queryNorm = searchFilter.toLowerCase();
        const matchesPt = item.name_pt.toLowerCase().includes(queryNorm);
        const matchesEn = item.name_en.toLowerCase().includes(queryNorm);
        const matchesId = item.id.toLowerCase().includes(queryNorm);
        if (!matchesPt && !matchesEn && !matchesId) continue;
      }

      // We will look for the combination of (BuyCity, SellCity, BuyMode, SellMode, BuyQuality, SellQuality) 
      // that yields the highest absolute profit for this specific item.
      let bestForThisItem = null;

      for (const originCity of activeBuyCities) {
        const originPrices = item.pricesByCityAndQuality[originCity];
        if (!originPrices) continue;

        for (const destCity of activeSellCities) {
          // Avoid buying and selling in the same city, unless it's Caerleon <-> Black Market
          if (originCity === destCity) continue;
          if (originCity.includes('Market') && destCity.includes('Market')) continue; // skip Black Market to Black Market
          
          const destPrices = item.pricesByCityAndQuality[destCity];
          if (!destPrices) continue;

          // Qualities to evaluate (1 to 5)
          for (const qBuy of [1, 2, 3, 4, 5]) {
            if (!selectedQualities.includes(qBuy)) continue;
            const originData = originPrices[qBuy];
            if (!originData) continue;

            // Purchase Modes allowed
            const buyModesToTest = [];
            if (allowBuyInstant && originData.sell_price_min > 0) buyModesToTest.push({ mode: 'Instant', price: originData.sell_price_min, date: originData.sell_price_min_date, costMultiplier: 1.0 });
            if (allowBuyOrder && originData.buy_price_max > 0) buyModesToTest.push({ mode: 'Order', price: originData.buy_price_max, date: originData.buy_price_max_date, costMultiplier: 1.015 }); // 1.5% setup fee

            for (const buyOption of buyModesToTest) {
              // Check buy price age
              const buyAgeHours = getPriceAgeHours(buyOption.date);
              if (maxBuyAge !== Infinity && buyAgeHours > maxBuyAge) continue;

              const purchaseCost = Math.round(buyOption.price * buyOption.costMultiplier);
              if (purchaseCost > maxInvestment) continue;

              // Sell Options (Qualities and Modes)
              for (const qSell of [1, 2, 3, 4, 5]) {
                const destData = destPrices[qSell];
                if (!destData) continue;

                // Sell Modes allowed
                const sellModesToTest = [];
                // 1. Instant Sale (selling directly to active Buy Orders). 
                // We can fulfill a buy order of quality qSell using an item of quality qBuy as long as qBuy >= qSell.
                if (allowSellInstant && qBuy >= qSell && destData.buy_price_max > 0) {
                  sellModesToTest.push({ mode: 'Instant', price: destData.buy_price_max, date: destData.buy_price_max_date, netMultiplier: (1 - taxRate) });
                }
                // 2. Sale Order (listing a new Sell Order).
                // Must be exact quality match (qBuy == qSell) because you list what you have.
                if (allowSellOrder && qBuy === qSell && destData.sell_price_min > 0) {
                  sellModesToTest.push({ mode: 'Order', price: destData.sell_price_min, date: destData.sell_price_min_date, netMultiplier: (1 - taxRate - setupRate) });
                }

                for (const sellOption of sellModesToTest) {
                  // Check sell price age
                  const sellAgeHours = getPriceAgeHours(sellOption.date);
                  if (maxSellAge !== Infinity && sellAgeHours > maxSellAge) continue;

                  // Profit calculation
                  const netRevenue = Math.round(sellOption.price * sellOption.netMultiplier);
                  const netProfit = netRevenue - purchaseCost;

                  if (netProfit > 0) {
                    const margin = (netProfit / purchaseCost) * 100;
                    
                    // Apply min/max margin and max profit limits
                    const passesMinMargin = margin >= minMargin;
                    const passesMaxMargin = maxMargin === 1000 || margin <= maxMargin;
                    const passesMaxProfit = maxProfit === 5000000 || netProfit <= maxProfit;
                    
                    if (passesMinMargin && passesMaxMargin && passesMaxProfit) {
                      const candidate = {
                        item_id: item.id,
                        name_pt: item.name_pt,
                        name_en: item.name_en,
                        weight: item.weight || 0.1,
                        item_type: item.item_type,
                        buy_city: originCity,
                        buy_mode: buyOption.mode,
                        buy_price: buyOption.price,
                        buy_quality: qBuy,
                        buy_date: buyOption.date,
                        purchase_cost: purchaseCost,
                        sell_city: destCity,
                        sell_mode: sellOption.mode,
                        sell_price: sellOption.price,
                        sell_quality: qSell,
                        sell_date: sellOption.date,
                        profit_net: netProfit,
                        margin: margin
                      };

                      // Keep only the absolute best option for this item
                      if (!bestForThisItem || candidate.profit_net > bestForThisItem.profit_net) {
                        bestForThisItem = candidate;
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }

      if (bestForThisItem) {
        candidates.push(bestForThisItem);
      }
    }

    // Sort candidates by highest profit margin (%) descending
    return candidates.sort((a, b) => b.margin - a.margin);
  };

  const filteredOpps = getOpportunities();
  
  // Risk-Free Flips are Buy Instant + Sell Instant
  const riskFreeFlips = filteredOpps.filter(c => c.buy_mode === 'Instant' && c.sell_mode === 'Instant');

  // Trigger beep sound when new risk-free immediate profits pop up
  useEffect(() => {
    if (riskFreeFlips.length > 0 && riskFreeFlips.length !== lastOpportunityCount) {
      playAlarm();
      setLastOpportunityCount(riskFreeFlips.length);
    } else if (riskFreeFlips.length === 0) {
      setLastOpportunityCount(0);
    }
  }, [riskFreeFlips.length, lastOpportunityCount, audioEnabled]);

  // Manifest quantity change handler (minimum 1)
  const handleQtyChange = (key, value) => {
    const qty = Math.max(1, parseInt(value) || 1);
    setQuantities(prev => ({
      ...prev,
      [key]: qty
    }));
  };

  // Toggle item inclusion in Cargo Manifest
  const handleToggleSelect = (key) => {
    setSelectedCandidates(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Compile calculations for selected trip items
  const manifestItems = filteredOpps.filter(opp => {
    const key = getCandidateKey(opp);
    return selectedCandidates[key] === true;
  });

  const manifestTotalCost = manifestItems.reduce((sum, opp) => {
    return sum + opp.purchase_cost;
  }, 0);

  const manifestTotalWeight = manifestItems.reduce((sum, opp) => {
    return sum + opp.weight;
  }, 0);

  const manifestTotalProfit = manifestItems.reduce((sum, opp) => {
    return sum + opp.profit_net;
  }, 0);

  const manifestAvgMargin = manifestTotalCost > 0 ? Math.round((manifestTotalProfit / manifestTotalCost) * 100) : 0;
  const isManifestWeightExceeded = manifestTotalWeight > mountCapacity;
  const isManifestCostExceeded = manifestTotalCost > maxInvestment;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', minHeight: 'calc(100vh - 160px)' }}>
      
      {/* Header Panel */}
      <div className="glass-panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', padding: '20px' }}>
        <div>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--text-primary)', marginBottom: '4px' }}>
            <Truck size={26} className="text-primary" style={{ color: 'var(--color-primary-hover)' }} />
            Flipper Universal (Transporte + Flip)
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
            Planeje operações lucrativas definindo livremente as cidades, as formas de negociação, qualidade de itens e filtros de idade dos dados.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            onClick={playAlarm}
            className="btn-primary"
            style={{ height: '42px', background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)', color: 'var(--text-secondary)', boxShadow: 'none' }}
          >
            <Volume2 size={16} />
            Testar Alarme
          </button>
          
          <button 
            onClick={() => fetchPrices(true)} 
            className="btn-primary" 
            disabled={loading}
            style={{ height: '42px', padding: '0 20px' }}
          >
            <RotateCw size={16} className={loading ? 'animate-spin' : ''} style={{ animation: loading ? 'spin 1.5s linear infinite' : 'none' }} />
            Sincronizar AODP
          </button>
        </div>
      </div>

      {/* Immediate Spread Alert Banner */}
      {riskFreeFlips.length > 0 && (
        <div className="instant-flip-banner" style={{
          background: 'linear-gradient(90deg, rgba(230, 81, 0, 0.9) 0%, rgba(245, 124, 0, 0.9) 50%, rgba(230, 81, 0, 0.9) 100%)',
          border: '1px solid rgba(255, 152, 0, 0.3)',
          padding: '12px',
          borderRadius: '8px',
          textAlign: 'center',
          color: '#fff',
          fontWeight: 'bold',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '12px',
          boxShadow: '0 0 15px rgba(255, 152, 0, 0.25)'
        }}>
          <span>⚡</span>
          <span>
            LUCRO IMEDIATO E SEM RISCO: Encontradas {riskFreeFlips.length} oportunidades de Compra Instantânea + Venda Instantânea!
          </span>
          <span>⚡</span>
        </div>
      )}

      {/* Advanced Filters Panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', padding: '20px' }}>
        <h3 style={{ fontSize: '15px', display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', margin: 0 }}>
          <Filter size={18} color="var(--color-primary-hover)" />
          Filtros Operacionais do Flipper
        </h3>

        {/* First Row: Search, Item Types, Cities Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
          
          {/* Text Search */}
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label">Buscar Item por Nome ou ID</label>
            <div style={{ position: 'relative', marginTop: '6px' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={16} />
              </span>
              <input
                className="input-field"
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Ex: T6 bag, espada, madeira..."
                style={{ paddingLeft: '38px', height: '38px' }}
              />
            </div>
          </div>

          {/* Cities Dropdown Filters (Multi-select Checkboxes) */}
          <div className="input-group" style={{ margin: 0, position: 'relative' }}>
            <label className="input-label">Cidade de Compra (Origem)</label>
            <button
              type="button"
              className="input-field"
              onClick={() => {
                setBuyDropdownOpen(!buyDropdownOpen);
                setSellDropdownOpen(false);
              }}
              style={{
                marginTop: '6px',
                height: '38px',
                background: 'rgba(20,20,20,0.4)',
                color: 'white',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '0 12px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <span style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: '85%'
              }}>
                {getCitiesSummary(selectedBuyCities)}
              </span>
              <ChevronsUpDown size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
            </button>
            {buyDropdownOpen && (
              <>
                <div 
                  onClick={() => setBuyDropdownOpen(false)} 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#16161a',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  padding: '12px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedBuyCities(CITIES)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary-hover)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedBuyCities([])}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                    >
                      Limpar
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {CITIES.map(c => {
                      const isSelected = selectedBuyCities.includes(c);
                      return (
                        <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)', zIndex: 101 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedBuyCities(prev => 
                                isSelected ? prev.filter(x => x !== c) : [...prev, c]
                              );
                            }}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          {c}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="input-group" style={{ margin: 0, position: 'relative' }}>
            <label className="input-label">Cidade de Venda (Destino)</label>
            <button
              type="button"
              className="input-field"
              onClick={() => {
                setSellDropdownOpen(!sellDropdownOpen);
                setBuyDropdownOpen(false);
              }}
              style={{
                marginTop: '6px',
                height: '38px',
                background: 'rgba(20,20,20,0.4)',
                color: 'white',
                border: '1px solid var(--glass-border)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                width: '100%',
                padding: '0 12px',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <span style={{
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: '85%'
              }}>
                {getCitiesSummary(selectedSellCities)}
              </span>
              <ChevronsUpDown size={16} style={{ opacity: 0.6, flexShrink: 0 }} />
            </button>
            {sellDropdownOpen && (
              <>
                <div 
                  onClick={() => setSellDropdownOpen(false)} 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 99 }}
                />
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  marginTop: '4px',
                  background: '#16161a',
                  border: '1px solid var(--glass-border)',
                  borderRadius: '8px',
                  boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                  padding: '12px',
                  zIndex: 100,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '6px', marginBottom: '4px' }}>
                    <button
                      type="button"
                      onClick={() => setSelectedSellCities(CITIES)}
                      style={{ background: 'none', border: 'none', color: 'var(--color-primary-hover)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedSellCities([])}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
                    >
                      Limpar
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto' }}>
                    {CITIES.map(c => {
                      const isSelected = selectedSellCities.includes(c);
                      return (
                        <label key={c} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)', zIndex: 101 }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedSellCities(prev => 
                                isSelected ? prev.filter(x => x !== c) : [...prev, c]
                              );
                            }}
                            style={{ accentColor: 'var(--color-primary)' }}
                          />
                          {c}
                        </label>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Item Types Checklist */}
          <div>
            <span className="input-label">Categorias Gerais de Item</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={allowEquipment} 
                  onChange={(e) => setAllowEquipment(e.target.checked)} 
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Equipamento de Combate
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={allowResources} 
                  onChange={(e) => setAllowResources(e.target.checked)} 
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Recursos (Brutos e Refinados)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={allowConsumables} 
                  onChange={(e) => setAllowConsumables(e.target.checked)} 
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Consumíveis (Comidas/Poções)
              </label>
            </div>
          </div>
        </div>

        {/* Second Row: Transaction Mode, Data Age, Tiers/Ench, Qualities */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', borderTop: '1px solid rgba(138, 75, 245, 0.12)', paddingTop: '20px' }}>
          
          {/* Allowed Transaction Modes */}
          <div>
            <span className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Landmark size={14} /> Modo de Compra</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={allowBuyInstant} 
                  onChange={(e) => setAllowBuyInstant(e.target.checked)} 
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Compra Instantânea (Ordem de Venda)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={allowBuyOrder} 
                  onChange={(e) => setAllowBuyOrder(e.target.checked)} 
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Pedido de Compra (+1.5% setup)
              </label>
            </div>
          </div>

          <div>
            <span className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><DollarSign size={14} /> Modo de Venda</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={allowSellInstant} 
                  onChange={(e) => setAllowSellInstant(e.target.checked)} 
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Venda Instantânea (Ordem de Compra)
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                <input 
                  type="checkbox" 
                  checked={allowSellOrder} 
                  onChange={(e) => setAllowSellOrder(e.target.checked)} 
                  style={{ accentColor: 'var(--color-primary)' }}
                />
                Pedido de Venda (Listar, +1.5% setup)
              </label>
            </div>
          </div>

          {/* Age Filters */}
          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> Idade Dados Compra</label>
            <select 
              className="input-field" 
              value={maxBuyAge}
              onChange={(e) => setMaxBuyAge(e.target.value === 'Infinity' ? Infinity : parseFloat(e.target.value))}
              style={{ marginTop: '6px', height: '38px', background: 'rgba(20,20,20,0.4)', color: 'white', border: '1px solid var(--glass-border)' }}
            >
              <option value={1}>Menos de 1 hora</option>
              <option value={3}>Menos de 3 horas</option>
              <option value={6}>Menos de 6 horas</option>
              <option value={12}>Menos de 12 horas</option>
              <option value={24}>Menos de 24 horas</option>
              <option value={72}>Menos de 3 dias</option>
              <option value="Infinity">Sem Limite (Qualquer)</option>
            </select>
          </div>

          <div className="input-group" style={{ margin: 0 }}>
            <label className="input-label" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14} /> Idade Dados Venda</label>
            <select 
              className="input-field" 
              value={maxSellAge}
              onChange={(e) => setMaxSellAge(e.target.value === 'Infinity' ? Infinity : parseFloat(e.target.value))}
              style={{ marginTop: '6px', height: '38px', background: 'rgba(20,20,20,0.4)', color: 'white', border: '1px solid var(--glass-border)' }}
            >
              <option value={1}>Menos de 1 hora</option>
              <option value={3}>Menos de 3 horas</option>
              <option value={6}>Menos de 6 horas</option>
              <option value={12}>Menos de 12 horas</option>
              <option value={24}>Menos de 24 horas</option>
              <option value={72}>Menos de 3 dias</option>
              <option value="Infinity">Sem Limite (Qualquer)</option>
            </select>
          </div>
        </div>

        {/* Third Row: Tiers, Enchantments, Qualities, and Sliders */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', borderTop: '1px solid rgba(138, 75, 245, 0.12)', paddingTop: '20px' }}>
          
          {/* Tiers & Enchantments */}
          <div>
            <span className="input-label">Nível (Tier) e Encanto</span>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '8px' }}>
              {[4, 5, 6, 7, 8].map(tier => {
                const isSelected = selectedTiers.includes(tier);
                return (
                  <button
                    key={tier}
                    onClick={() => setSelectedTiers(prev => isSelected ? prev.filter(t => t !== tier) : [...prev, tier])}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid', cursor: 'pointer',
                      background: isSelected ? 'var(--color-primary)' : 'rgba(255,255,255,0.05)',
                      borderColor: isSelected ? 'var(--color-primary-hover)' : 'rgba(255,255,255,0.1)',
                      color: 'white', fontWeight: 600, transition: 'all 0.15s ease'
                    }}
                  >
                    T{tier}
                  </button>
                );
              })}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
              {[0, 1, 2, 3, 4].map(ench => {
                const isSelected = selectedEnchs.includes(ench);
                return (
                  <button
                    key={ench}
                    onClick={() => setSelectedEnchs(prev => isSelected ? prev.filter(e => e !== ench) : [...prev, ench])}
                    style={{
                      padding: '4px 10px', borderRadius: '6px', fontSize: '12px', border: '1px solid', cursor: 'pointer',
                      background: isSelected ? 'rgba(0, 176, 255, 0.25)' : 'rgba(255,255,255,0.05)',
                      borderColor: isSelected ? 'var(--color-info)' : 'rgba(255,255,255,0.1)',
                      color: 'white', fontWeight: 600, transition: 'all 0.15s ease'
                    }}
                  >
                    .{ench}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Qualities */}
          <div>
            <span className="input-label">Qualidades Disponíveis</span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
              {[1, 2, 3, 4, 5].map(q => {
                const isSelected = selectedQualities.includes(q);
                return (
                  <label key={q} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
                    <input 
                      type="checkbox" 
                      checked={isSelected} 
                      onChange={() => setSelectedQualities(prev => isSelected ? prev.filter(item => item !== q) : [...prev, q])} 
                      style={{ accentColor: 'var(--color-primary)' }}
                    />
                    {QUALITY_LABELS[q]}
                  </label>
                );
              })}
            </div>
          </div>

          {/* Profit margins sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Margem de Lucro Mínima</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>{minMargin}%</span>
              </div>
              <input 
                type="range" 
                min="5" 
                max="80" 
                value={minMargin} 
                onChange={(e) => setMinMargin(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: 'var(--color-primary)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Margem de Lucro Máxima</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                  {maxMargin === 1000 ? 'Sem Limite' : `${maxMargin}%`}
                </span>
              </div>
              <input 
                type="range" 
                min="10" 
                max="1000" 
                step="10"
                value={maxMargin} 
                onChange={(e) => setMaxMargin(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: 'var(--color-primary)' }}
              />
            </div>
          </div>

          {/* Investment & Max Profit sliders */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Investimento Máximo por Un.</span>
                <span style={{ color: 'var(--color-info)', fontWeight: 'bold' }}>{(maxInvestment/1000).toLocaleString('pt-BR')}k pratas</span>
              </div>
              <input 
                type="range" 
                min="10000" 
                max="5000000" 
                step="20000"
                value={maxInvestment} 
                onChange={(e) => setMaxInvestment(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: 'var(--color-primary)' }}
              />
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: 'var(--text-secondary)' }}>
                <span>Lucro Máximo por Un.</span>
                <span style={{ color: 'var(--color-success)', fontWeight: 'bold' }}>
                  {maxProfit === 5000000 ? 'Sem Limite' : `${(maxProfit/1000).toLocaleString('pt-BR')}k pratas`}
                </span>
              </div>
              <input 
                type="range" 
                min="10000" 
                max="5000000" 
                step="20000"
                value={maxProfit} 
                onChange={(e) => setMaxProfit(parseInt(e.target.value))}
                style={{ width: '100%', marginTop: '6px', accentColor: 'var(--color-primary)' }}
              />
            </div>
          </div>

          {/* Premium active & audio config */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignSelf: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input 
                type="checkbox" 
                checked={isPremium} 
                onChange={(e) => setIsPremium(e.target.checked)} 
                style={{ accentColor: 'var(--color-primary)' }}
              />
              Premium Ativo (Taxa 4% BM/Caerleon)
            </label>

            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', cursor: 'pointer', color: 'var(--text-primary)' }}>
              <input 
                type="checkbox" 
                checked={audioEnabled} 
                onChange={(e) => setAudioEnabled(e.target.checked)} 
                style={{ accentColor: 'var(--color-primary)' }}
              />
              Sinal Sonoro Spread Livre de Risco
            </label>
          </div>

        </div>

        {/* Category checkboxes selector toggle */}
        <div style={{ borderTop: '1px solid rgba(138, 75, 245, 0.12)', paddingTop: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <span className="input-label">Categorias Sub-Filtro (Armas, Armaduras, Acessórios e Recursos)</span>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => setSelectedCategories([
                  'Machado', 'Espada', 'Arco', 'Besta', 'Adaga', 'Lança', 'Maça', 'Martelo', 'Cajado Bilaminado', 'Luvas de Guerra', 'Cajado',
                  'Peito (Placa)', 'Peito (Couro)', 'Peito (Tecido)', 'Elmo (Placa)', 'Capuz (Couro)', 'Hábito (Tecido)',
                  'Botas (Placa)', 'Sapatos (Couro)', 'Sandálias (Tecido)', 'Bolsa', 'Capa', 'Mão Secundária (Offhand)',
                  'Recurso Bruto', 'Recurso Refinado', 'Consumível', 'Outro'
                ])}
                style={{ background: 'none', border: 'none', color: 'var(--color-primary-hover)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
              >
                Selecionar Todas
              </button>
              <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>|</span>
              <button
                onClick={() => setSelectedCategories([])}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '11px', cursor: 'pointer', padding: 0 }}
              >
                Limpar Seleção
              </button>
            </div>
          </div>
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '72px', overflowY: 'auto',
            background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', padding: '10px'
          }}>
            {[
              'Machado', 'Espada', 'Arco', 'Besta', 'Adaga', 'Lança', 'Maça', 'Martelo', 'Cajado Bilaminado', 'Luvas de Guerra', 'Cajado',
              'Peito (Placa)', 'Peito (Couro)', 'Peito (Tecido)', 'Elmo (Placa)', 'Capuz (Couro)', 'Hábito (Tecido)',
              'Botas (Placa)', 'Sapatos (Couro)', 'Sandálias (Tecido)', 'Bolsa', 'Capa', 'Mão Secundária (Offhand)',
              'Recurso Bruto', 'Recurso Refinado', 'Consumível', 'Outro'
            ].map(cat => {
              const isSelected = selectedCategories.includes(cat);
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategories(prev => isSelected ? prev.filter(c => c !== cat) : [...prev, cat])}
                  style={{
                    padding: '3px 8px', borderRadius: '4px', fontSize: '11px', border: '1px solid', cursor: 'pointer',
                    background: isSelected ? 'rgba(138, 75, 245, 0.25)' : 'rgba(255,255,255,0.02)',
                    borderColor: isSelected ? 'var(--color-primary-hover)' : 'rgba(255,255,255,0.08)',
                    color: isSelected ? 'white' : 'var(--text-secondary)', transition: 'all 0.15s ease'
                  }}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Mount Weight Limit Control */}
      <div className="glass-panel" style={{ display: 'flex', gap: '24px', alignItems: 'center', padding: '20px', flexWrap: 'wrap' }}>
        <div style={{
          background: 'rgba(138, 75, 245, 0.08)', width: '48px', height: '48px', borderRadius: '12px',
          display: 'flex', alignItems: 'center', justifycontent: 'center', border: '1px solid rgba(138, 75, 245, 0.2)', flexShrink: 0
        }}>
          <Scale size={24} style={{ color: 'var(--color-primary-hover)', margin: 'auto' }} />
        </div>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', marginBottom: '4px' }}>Capacidade da Montaria de Transporte</h4>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Insira a capacidade máxima de carga útil em kg (ex: Boi T5 tem ~1200kg, Urso T8 tem ~4500kg). O planejador calculará as viagens lotadas e emitirá alertas.
          </p>
        </div>
        <div className="input-group" style={{ margin: 0, width: '180px' }}>
          <label className="input-label">Capacidade Máxima (kg)</label>
          <input 
            className="input-field" 
            type="number" 
            value={mountCapacity}
            onChange={(e) => setMountCapacity(Math.max(1, parseInt(e.target.value) || 1))}
            placeholder="ex: 1200"
          />
        </div>
      </div>

      {/* Cargo Manifest Trip Planner Card */}
      {manifestItems.length > 0 && (
        <div className="glass-panel" style={{
          borderLeft: '5px solid var(--color-primary)', background: 'rgba(138, 75, 245, 0.04)', padding: '24px',
          display: 'flex', flexDirection: 'column', gap: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)', fontSize: '16px', margin: 0 }}>
              <ShoppingCart size={20} color="var(--color-primary-hover)" />
              Manifesto de Carga da Viagem ({manifestItems.length} itens selecionados)
            </h3>
            {isPremium && (
              <span style={{ fontSize: '11px', color: 'var(--color-success)', background: 'rgba(0, 230, 118, 0.1)', border: '1px solid rgba(0, 230, 118, 0.25)', padding: '3px 8px', borderRadius: '6px', fontWeight: 'bold' }}>
                Imposto Premium Ativo (4%)
              </span>
            )}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
            
            {/* Profit */}
            <div className="glass-card" style={{ padding: '16px', borderLeft: '3px solid var(--color-success)', background: 'rgba(0,230,118,0.02)', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Lucro Líquido Acumulado</span>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: 'var(--color-success)', marginTop: '4px' }}>
                +{manifestTotalProfit.toLocaleString('pt-BR')} pratas
              </div>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Margem ROI Média: {manifestAvgMargin}%</span>
            </div>

            {/* Total Investment */}
            <div className="glass-card" style={{ padding: '16px', borderLeft: `3px solid ${isManifestCostExceeded ? 'var(--color-danger)' : 'var(--color-info)'}`, background: 'rgba(0,176,255,0.02)', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Custo do Investimento</span>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: isManifestCostExceeded ? 'var(--color-danger)' : 'var(--text-primary)', marginTop: '4px' }}>
                {manifestTotalCost.toLocaleString('pt-BR')} pratas
              </div>
              <span style={{ fontSize: '11px', color: isManifestCostExceeded ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                {isManifestCostExceeded ? '⚠️ Limite de investimento ultrapassado!' : `Abaixo do limite de investimento`}
              </span>
            </div>

            {/* Total Weight */}
            <div className="glass-card" style={{ padding: '16px', borderLeft: `3px solid ${isManifestWeightExceeded ? 'var(--color-danger)' : 'var(--color-primary)'}`, background: 'rgba(138,75,245,0.02)', borderRadius: '8px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Peso Total da Carga</span>
              <div style={{ fontSize: '22px', fontWeight: 'bold', color: isManifestWeightExceeded ? 'var(--color-danger)' : 'var(--text-primary)', marginTop: '4px' }}>
                {manifestTotalWeight.toFixed(1)} kg
              </div>
              <span style={{ fontSize: '11px', color: isManifestWeightExceeded ? 'var(--color-danger)' : 'var(--text-muted)' }}>
                {isManifestWeightExceeded ? '⚠️ SOBRECARGA! Montaria vai travar!' : `Disponível: ${(mountCapacity - manifestTotalWeight).toFixed(1)} kg / ${mountCapacity} kg`}
              </span>
            </div>
          </div>

          {/* Progress Bar of capacity */}
          <div style={{ marginTop: '4px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '6px', color: 'var(--text-secondary)' }}>
              <span>Carga da Viagem</span>
              <span style={{ fontWeight: '600', color: isManifestWeightExceeded ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                {((manifestTotalWeight / mountCapacity) * 100).toFixed(0)}%
              </span>
            </div>
            <div style={{ height: '8px', background: 'rgba(255,255,255,0.08)', borderRadius: '4px', overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${Math.min(100, (manifestTotalWeight / mountCapacity) * 100)}%`,
                background: isManifestWeightExceeded ? 'var(--color-danger)' : 'linear-gradient(90deg, var(--color-primary) 0%, var(--color-primary-hover) 100%)',
                boxShadow: isManifestWeightExceeded ? 'none' : '0 0 8px rgba(138, 75, 245, 0.4)',
                borderRadius: '4px',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Main Results Table Panel */}
      <div className="glass-panel" style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column' }}>
        {error && (
          <div style={{ color: 'var(--color-danger)', padding: '20px', textAlign: 'center', fontSize: '15px' }}>
            Erro de dados: {error}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, minHeight: '200px' }}>
            <RotateCw className="animate-spin" size={32} color="var(--color-primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
          </div>
        ) : filteredOpps.length > 0 ? (
          <>
            {/* API Limitation Warning Banner */}
            <div style={{ 
              background: 'rgba(0, 176, 255, 0.05)', 
              border: '1px solid rgba(0, 176, 255, 0.25)', 
              padding: '12px 16px', 
              borderRadius: '8px', 
              marginBottom: '16px', 
              fontSize: '13px', 
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <Info size={18} color="var(--color-info)" style={{ flexShrink: 0 }} />
              <span>
                <strong>Nota sobre Quantidades de Mercado:</strong> A API do AODP fornece apenas estatísticas de preço. Ela <strong>não retorna</strong> o volume atual de ordens ativas (ex: se o Black Market deseja comprar 3 ou 100 unidades). Recomendamos verificar a quantidade disponível no jogo antes de comprar grandes volumes.
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="custom-table" style={{ borderSpacing: '0 8px', borderCollapse: 'separate' }}>
              <thead>
                <tr>
                  <th style={{ padding: '16px 20px', fontSize: '13px', letterSpacing: '0.05em' }}>ITEM</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', letterSpacing: '0.05em' }}>COMPRA</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', letterSpacing: '0.05em' }}>VENDA</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', letterSpacing: '0.05em' }}>FEE</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', letterSpacing: '0.05em', textAlign: 'center', width: '70px' }}>QTD</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', letterSpacing: '0.05em', width: '150px' }}>LUCRO</th>
                  <th style={{ padding: '16px 20px', fontSize: '13px', letterSpacing: '0.05em', width: '110px', textAlign: 'center' }}>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {filteredOpps.map((opp, idx) => {
                  const key = getCandidateKey(opp);
                  const weightPerItem = opp.weight || 0.1;
                  
                  const tripQty = 1; // Always 1 per user request
                  const isChecked = selectedCandidates[key] === true;
                  
                  const itemTotalCost = tripQty * opp.purchase_cost;
                  const itemTotalProfit = tripQty * opp.profit_net;
                  
                  // Calculate total fees: Sell Revenue - Buy Cost - Net Profit
                  const totalFees = (opp.sell_price * tripQty) - (opp.buy_price * tripQty) - itemTotalProfit;
                  // Total cost shown in red = purchase price * qty + fees
                  const displayTotalCost = (opp.buy_price * tripQty) + Math.max(0, totalFees);

                  const isInstantRiskFree = opp.buy_mode === 'Instant' && opp.sell_mode === 'Instant';
                  
                  const cellBg = isChecked ? 'rgba(138, 75, 245, 0.08)' : '#121214';
                  const rowBorder = '1px solid rgba(255,255,255,0.03)';

                  return (
                    <tr key={key} style={{ 
                      borderLeft: isInstantRiskFree ? '3px solid rgba(255, 152, 0, 0.6)' : 'none'
                    }}>
                      
                      {/* Item Details with Render Artwork & Badges */}
                      <td style={{ 
                        verticalAlign: 'middle', 
                        padding: '16px 20px', 
                        background: cellBg, 
                        borderTop: rowBorder, 
                        borderBottom: rowBorder,
                        borderLeft: '1px solid rgba(138, 75, 245, 0.1)',
                        borderTopLeftRadius: '8px',
                        borderBottomLeftRadius: '8px'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <img 
                            src={`https://render.albiononline.com/v1/item/${opp.item_id}.png?quality=${opp.buy_quality}`} 
                            alt={opp.name_pt}
                            style={{ 
                              width: '54px', 
                              height: '54px', 
                              borderRadius: '8px', 
                              background: 'rgba(0,0,0,0.4)', 
                              border: '1px solid rgba(138, 75, 245, 0.15)',
                              flexShrink: 0
                            }}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <span style={{ 
                                fontSize: '10px', 
                                fontWeight: '700', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                background: 'rgba(0, 176, 255, 0.12)', 
                                color: '#00b0ff',
                                border: '1px solid rgba(0, 176, 255, 0.2)'
                              }}>
                                T{opp.tier}.{opp.enchantment}
                              </span>
                              <span style={{ 
                                fontSize: '10px', 
                                fontWeight: '700', 
                                padding: '2px 6px', 
                                borderRadius: '4px', 
                                background: 'rgba(138, 75, 245, 0.12)', 
                                color: '#a16cfa',
                                border: '1px solid rgba(138, 75, 245, 0.2)'
                              }}>
                                {QUALITY_NAMES[opp.buy_quality]?.toUpperCase()}
                              </span>
                            </div>
                            <div style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-primary)' }}>
                              {opp.name_pt}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 'normal', display: 'flex', gap: '8px' }}>
                              <span>{opp.item_id}</span>
                              <span>•</span>
                              <span style={{ color: 'var(--color-info)' }}>{getCategoryName(opp)}</span>
                              <span>•</span>
                              <span>{weightPerItem.toFixed(2)} kg</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* COMPRA */}
                      <td style={{ 
                        verticalAlign: 'middle', 
                        padding: '16px 20px', 
                        background: cellBg, 
                        borderTop: rowBorder, 
                        borderBottom: rowBorder,
                        width: '210px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: '#00b0ff', fontSize: '13px' }}>{opp.buy_city}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatRelativeTime(opp.buy_date)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#00b0ff' }}>
                              {formatValueAbbreviated(opp.buy_price)}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                              {opp.buy_mode === 'Instant' ? 'COMPRA INST.' : 'ORDEM COMPRA'}
                            </span>
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            QTD {tripQty}
                          </div>
                        </div>
                      </td>

                      {/* VENDA */}
                      <td style={{ 
                        verticalAlign: 'middle', 
                        padding: '16px 20px', 
                        background: cellBg, 
                        borderTop: rowBorder, 
                        borderBottom: rowBorder,
                        width: '210px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontWeight: '700', color: '#e040fb', fontSize: '13px' }}>{opp.sell_city}</span>
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>{formatRelativeTime(opp.sell_date)}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#e040fb' }}>
                              {formatValueAbbreviated(opp.sell_price)}
                            </span>
                            <span style={{ fontSize: '9px', fontWeight: '700', color: 'var(--text-muted)', letterSpacing: '0.5px' }}>
                              {opp.sell_mode === 'Instant' ? 'BM/IMED.' : 'ORDEM VENDA'}
                            </span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>QTD {tripQty}</span>
                            <span 
                              style={{ 
                                fontSize: '9px', 
                                padding: '1px 5px', 
                                borderRadius: '4px', 
                                background: 'rgba(255, 171, 0, 0.08)', 
                                color: '#ffab00', 
                                border: '1px solid rgba(255, 171, 0, 0.2)',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '2px',
                                cursor: 'help'
                              }}
                              title="A API do AODP não retorna a quantidade de ordens ativas. Você deve abrir a aba do item no jogo para confirmar se o comprador quer 3 ou 100 unidades."
                            >
                              <AlertTriangle size={9} />
                              Ver no Jogo 👁
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* FEE */}
                      <td style={{ 
                        verticalAlign: 'middle', 
                        padding: '16px 20px', 
                        background: cellBg, 
                        borderTop: rowBorder, 
                        borderBottom: rowBorder,
                        width: '120px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontSize: '15px', fontWeight: '700', color: '#ff5252' }}>
                            {formatValueAbbreviated(displayTotalCost)}
                          </span>
                          <span style={{ fontSize: '11px', color: '#ff8a80', opacity: 0.85 }}>
                            fee {formatValueAbbreviated(Math.max(0, totalFees))}
                          </span>
                        </div>
                      </td>

                      {/* QTD */}
                      <td style={{ 
                        verticalAlign: 'middle', 
                        textAlign: 'center', 
                        padding: '16px 20px', 
                        background: cellBg, 
                        borderTop: rowBorder, 
                        borderBottom: rowBorder,
                        width: '60px'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--text-primary)' }}>
                          {tripQty}
                        </span>
                      </td>

                      {/* LUCRO */}
                      <td style={{ 
                        verticalAlign: 'middle', 
                        padding: '16px 20px', 
                        background: cellBg, 
                        borderTop: rowBorder, 
                        borderBottom: rowBorder,
                        width: '140px'
                      }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
                          <div style={{
                            background: 'rgba(0, 230, 118, 0.08)',
                            border: '1px solid rgba(0, 230, 118, 0.2)',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            textAlign: 'center',
                            width: '100%'
                          }}>
                            <span style={{ fontSize: '15px', fontWeight: '700', color: '#00e676' }}>
                              +{formatValueAbbreviated(itemTotalProfit)}
                            </span>
                          </div>
                          <span style={{ fontSize: '11px', color: '#00e676', fontWeight: '600' }}>
                            {formatPercent(opp.margin)} Profit
                          </span>
                        </div>
                      </td>

                      {/* AÇÃO */}
                      <td style={{ 
                        verticalAlign: 'middle', 
                        textAlign: 'center', 
                        padding: '16px 20px', 
                        background: cellBg, 
                        borderTop: rowBorder, 
                        borderBottom: rowBorder,
                        borderRight: '1px solid rgba(138, 75, 245, 0.1)',
                        borderTopRightRadius: '8px',
                        borderBottomRightRadius: '8px',
                        width: '100px'
                      }}>
                        <button
                          onClick={() => handleToggleSelect(key)}
                          style={{
                            background: isChecked ? 'rgba(0, 230, 118, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                            border: isChecked ? '1px solid var(--color-success)' : '1px solid var(--glass-border)',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            color: isChecked ? 'var(--color-success)' : 'var(--text-secondary)',
                            fontSize: '12px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            width: '80px',
                            outline: 'none'
                          }}
                          onMouseEnter={(e) => {
                            if (!isChecked) {
                              e.currentTarget.style.background = 'rgba(138, 75, 245, 0.1)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isChecked) {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                            }
                          }}
                        >
                          {isChecked ? 'Incluso' : 'Adicionar'}
                        </button>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            flex: 1, minHeight: '220px', color: 'var(--text-muted)', textAlign: 'center'
          }}>
            <HelpCircle size={44} style={{ marginBottom: '12px', opacity: 0.4 }} />
            <h3>Nenhuma Oportunidade Encontrada</h3>
            <p style={{ fontSize: '13px', marginTop: '6px', maxWidth: '400px' }}>
              Nenhum item correspondeu aos filtros aplicados. Tente expandir os Tiers, aumentar a idade máxima dos dados, reduzir a margem mínima ou alterar as cidades selecionadas.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .instant-flip-banner {
          animation: pulseBorder 2.5s infinite;
        }
        @keyframes pulseBorder {
          0% { box-shadow: 0 0 10px rgba(230, 81, 0, 0.2); }
          50% { box-shadow: 0 0 20px rgba(230, 81, 0, 0.5); }
          100% { box-shadow: 0 0 10px rgba(230, 81, 0, 0.2); }
        }
      `}</style>
    </div>
  );
}
