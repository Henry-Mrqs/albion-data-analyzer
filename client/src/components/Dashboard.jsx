import React, { useState, useEffect, useRef } from 'react';
import { Search, MapPin, TrendingUp, AlertCircle, ShoppingCart, DollarSign, Loader2, AlertTriangle } from 'lucide-react';

const CITY_BONUSES = {
  // Refining
  'HIDE': { city: 'Martlock', label: 'Bônus de Refino de Couro (+36.7% RRR)' },
  'LEATHER': { city: 'Martlock', label: 'Bônus de Refino de Couro (+36.7% RRR)' },
  'ORE': { city: 'Thetford', label: 'Bônus de Refino de Minério (+36.7% RRR)' },
  'METALBAR': { city: 'Thetford', label: 'Bônus de Refino de Barra (+36.7% RRR)' },
  'WOOD': { city: 'Fort Sterling', label: 'Bônus de Refino de Madeira (+36.7% RRR)' },
  'PLANK': { city: 'Fort Sterling', label: 'Bônus de Refino de Tábua (+36.7% RRR)' },
  'FIBER': { city: 'Lymhurst', label: 'Bônus de Refino de Fibra (+36.7% RRR)' },
  'CLOTH': { city: 'Lymhurst', label: 'Bônus de Refino de Tecido (+36.7% RRR)' },
  'STONE': { city: 'Bridgewatch', label: 'Bônus de Refino de Pedra (+36.7% RRR)' },
  'STONEBLOCK': { city: 'Bridgewatch', label: 'Bônus de Refino de Bloco (+36.7% RRR)' },
  // Crafting weapon groups
  'AXE': { city: 'Martlock', label: 'Bônus de Craft de Machados (+15.2% RRR)' },
  'SWORD': { city: 'Lymhurst', label: 'Bônus de Craft de Espadas (+15.2% RRR)' },
  'BOW': { city: 'Lymhurst', label: 'Bônus de Craft de Arcos (+15.2% RRR)' },
  'DAGGER': { city: 'Bridgewatch', label: 'Bônus de Craft de Adagas (+15.2% RRR)' },
  'SPEAR': { city: 'Fort Sterling', label: 'Bônus de Craft de Lanças (+15.2% RRR)' },
  'MACE': { city: 'Thetford', label: 'Bônus de Craft de Maças (+15.2% RRR)' },
  'HAMMER': { city: 'Fort Sterling', label: 'Bônus de Craft de Martelos (+15.2% RRR)' },
  
  // Magic Staffs
  'FIRE_STAFF': { city: 'Thetford', label: 'Bônus de Craft de Cajado de Fogo (+15.2% RRR)' },
  'FIRESTAFF': { city: 'Thetford', label: 'Bônus de Craft de Cajado de Fogo (+15.2% RRR)' },
  'FROST_STAFF': { city: 'Martlock', label: 'Bônus de Craft de Cajado de Gelo (+15.2% RRR)' },
  'FROSTSTAFF': { city: 'Martlock', label: 'Bônus de Craft de Cajado de Gelo (+15.2% RRR)' },
  'HOLY_STAFF': { city: 'Fort Sterling', label: 'Bônus de Craft de Cajado Sagrado (+15.2% RRR)' },
  'HOLYSTAFF': { city: 'Fort Sterling', label: 'Bônus de Craft de Cajado Sagrado (+15.2% RRR)' },
  'NATURE_STAFF': { city: 'Thetford', label: 'Bônus de Craft de Cajado da Natureza (+15.2% RRR)' },
  'NATURESTAFF': { city: 'Thetford', label: 'Bônus de Craft de Cajado da Natureza (+15.2% RRR)' },
  'ARCANE_STAFF': { city: 'Lymhurst', label: 'Bônus de Craft de Cajado Arcano (+15.2% RRR)' },
  'ARCANESTAFF': { city: 'Lymhurst', label: 'Bônus de Craft de Cajado Arcano (+15.2% RRR)' },
  'CURSE_STAFF': { city: 'Bridgewatch', label: 'Bônus de Craft de Cajado Amaldiçoado (+15.2% RRR)' },
  'CURSESTAFF': { city: 'Bridgewatch', label: 'Bônus de Craft de Cajado Amaldiçoado (+15.2% RRR)' },

  // Special Weapons
  'CROSSBOW': { city: 'Bridgewatch', label: 'Bônus de Craft de Bestas (+15.2% RRR)' },
  'QUARTERSTAFF': { city: 'Martlock', label: 'Bônus de Craft de Cajados Bilaminados (+15.2% RRR)' },
  'WARGLOVE': { city: 'Bridgewatch', label: 'Bônus de Craft de Luvas de Guerra (+15.2% RRR)' },
  'WAR_GLOVE': { city: 'Bridgewatch', label: 'Bônus de Craft de Luvas de Guerra (+15.2% RRR)' },

  // Offhands
  'OFF_SHIELD': { city: 'Martlock', label: 'Bônus de Craft de Escudos (+15.2% RRR)' },
  'OFF_TORCH': { city: 'Lymhurst', label: 'Bônus de Craft de Tochas (+15.2% RRR)' },
  'OFF_TOWERTOME': { city: 'Lymhurst', label: 'Bônus de Craft de Livros de Feitiços (+15.2% RRR)' },

  // Armors, Helmets, Shoes
  'PLATE_ARMOR': { city: 'Bridgewatch', label: 'Bônus de Craft de Armaduras de Placas (+15.2% RRR)' },
  'PLATE_HELMET': { city: 'Fort Sterling', label: 'Bônus de Craft de Elmos de Placas (+15.2% RRR)' },
  'PLATE_SHOES': { city: 'Martlock', label: 'Bônus de Craft de Botas de Placas (+15.2% RRR)' },
  
  'LEATHER_JACKET': { city: 'Martlock', label: 'Bônus de Craft de Casacos de Couro (+15.2% RRR)' },
  'LEATHER_HELMET': { city: 'Thetford', label: 'Bônus de Craft de Capuzes de Couro (+15.2% RRR)' },
  'LEATHER_SHOES': { city: 'Lymhurst', label: 'Bônus de Craft de Sapatos de Couro (+15.2% RRR)' },
  
  'CLOTH_ROBE': { city: 'Bridgewatch', label: 'Bônus de Craft de Robes de Tecido (+15.2% RRR)' },
  'CLOTH_HELMET': { city: 'Thetford', label: 'Bônus de Craft de Hábitos de Tecido (+15.2% RRR)' },
  'CLOTH_SHOES': { city: 'Fort Sterling', label: 'Bônus de Craft de Sandálias de Tecido (+15.2% RRR)' },

  // Consumables & Accessories
  'POTION': { city: 'Caerleon', label: 'Bônus de Produção de Poções (+15.2% RRR)' },
  'FOOD': { city: 'Caerleon', label: 'Bônus de Produção de Alimentos (+15.2% RRR)' },
  'BAG': { city: 'Caerleon', label: 'Bônus de Craft de Bolsas (+15.2% RRR)' },
  'CAPE': { city: 'Caerleon', label: 'Bônus de Craft de Capas (+15.2% RRR)' }
};

export default function Dashboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [priceData, setPriceData] = useState(null);
  const [loadingPrices, setLoadingPrices] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  // Close search dropdown on click outside
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
        const response = await fetch(`/api/items/search?q=${encodeURIComponent(searchQuery)}`);
        const data = await response.json();
        setSearchResults(data);
      } catch (err) {
        console.error('Error searching items:', err);
      }
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  // Fetch prices for selected item
  const handleSelectItem = async (item) => {
    setSelectedItem(item);
    setSearchQuery(`${item.name_pt} (${item.id})`);
    setShowDropdown(false);
    setLoadingPrices(true);
    setPriceData(null);

    try {
      const response = await fetch(`/api/prices?ids=${item.id}`);
      const data = await response.json();
      setPriceData(data[item.id] || {});
    } catch (err) {
      console.error('Error fetching item prices:', err);
    } finally {
      setLoadingPrices(false);
    }
  };

  // Determine Item Bonus Category
  const getBonusCity = () => {
    if (!selectedItem) return null;
    
    // Check if ID matches any keyword in CITY_BONUSES keys
    const itemIdUpper = selectedItem.id.toUpperCase();
    for (const key of Object.keys(CITY_BONUSES)) {
      if (itemIdUpper.includes(key)) {
        return CITY_BONUSES[key];
      }
    }
    return null;
  };

  // Calculate highest & lowest sell prices
  const getPriceAnalysis = () => {
    if (!priceData) return { cheapestCity: null, expensiveCity: null };
    
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    let cheapestCity = null;
    let expensiveCity = null;
    
    // We only evaluate cities that have actual data (sell_price_min > 0)
    // Exclude Black Market from buying, but we can include it or analyze separately
    const citiesToAnalyze = ['Martlock', 'Thetford', 'Fort Sterling', 'Lymhurst', 'Bridgewatch', 'Caerleon'];

    citiesToAnalyze.forEach(city => {
      const data = priceData[city];
      if (data && data.sell_price_min && data.sell_price_min > 0) {
        if (data.sell_price_min < minPrice) {
          minPrice = data.sell_price_min;
          cheapestCity = city;
        }
        if (data.sell_price_min > maxPrice) {
          maxPrice = data.sell_price_min;
          expensiveCity = city;
        }
      }
    });

    return { cheapestCity, expensiveCity };
  };

  const { cheapestCity, expensiveCity } = getPriceAnalysis();
  const bonusInfo = getBonusCity();
  const hasNoPricesAtAll = priceData && Object.keys(priceData).length > 0 && Object.values(priceData).every(
    cityData => !cityData.sell_price_min || cityData.sell_price_min === 0
  );

  // City map visual parameters
  const cityPositions = {
    'Thetford': { cx: 120, cy: 120, name: 'Thetford', color: '#00e676' },
    'Fort Sterling': { cx: 480, cy: 120, name: 'Fort Sterling', color: '#e0e0e0' },
    'Lymhurst': { cx: 500, cy: 280, name: 'Lymhurst', color: '#ffb300' },
    'Bridgewatch': { cx: 300, cy: 420, name: 'Bridgewatch', color: '#ff5722' },
    'Martlock': { cx: 100, cy: 280, name: 'Martlock', color: '#0288d1' },
    'Caerleon': { cx: 300, cy: 250, name: 'Caerleon', color: '#d32f2f' }
  };

  const getCityStateClass = (cityName) => {
    if (!selectedItem || !priceData) return '';
    let classes = '';
    
    if (bonusInfo && bonusInfo.city === cityName) {
      classes += ' city-node-bonus';
    }
    if (expensiveCity === cityName) {
      classes += ' city-node-expensive';
    }
    if (cheapestCity === cityName) {
      classes += ' city-node-cheap';
    }
    return classes;
  };

  const getCityBorderGlow = (cityName) => {
    if (!selectedItem) return 'rgba(138, 75, 245, 0.25)';
    if (expensiveCity === cityName) return 'var(--color-warning)'; // Gold
    if (cheapestCity === cityName) return 'var(--color-info)'; // Blue
    if (bonusInfo && bonusInfo.city === cityName) return 'var(--color-success)'; // Green
    return 'rgba(255, 255, 255, 0.1)';
  };

  const formatSilver = (num) => {
    if (!num || num === 0) return 'Sem dados';
    return `${num.toLocaleString('pt-BR')} S`;
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '24px', minHeight: 'calc(100vh - 160px)' }}>
      {/* Left Area: Map and Search */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Search Panel */}
        <div className="glass-panel" style={{ padding: '20px' }}>
          <div className="search-container" ref={dropdownRef}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={20} />
              </span>
              <input
                className="input-field"
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                  if (selectedItem && e.target.value !== `${selectedItem.name_pt} (${selectedItem.id})`) {
                    setSelectedItem(null);
                    setPriceData(null);
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Busque por item (ex: T5_ORE, Machado, Couro...)"
                style={{ paddingLeft: '48px', fontSize: '16px', height: '48px' }}
              />
            </div>
            
            {showDropdown && searchResults.length > 0 && (
              <div className="search-dropdown">
                {searchResults.map(item => (
                  <div key={item.id} className="search-item" onClick={() => handleSelectItem(item)}>
                    <div>
                      <div style={{ fontWeight: '600', color: 'var(--text-primary)' }}>{item.name_pt}</div>
                      <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{item.name_en} | {item.id}</div>
                    </div>
                    <span style={{
                      fontSize: '11px',
                      background: 'rgba(138, 75, 245, 0.2)',
                      border: '1px solid rgba(138, 75, 245, 0.4)',
                      borderRadius: '4px',
                      padding: '2px 6px',
                      textTransform: 'uppercase',
                      color: 'var(--color-primary-hover)'
                    }}>
                      T{item.tier}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Interactive Economic Map */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: '450px', position: 'relative' }}>
          <h3 style={{ marginBottom: '16px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <MapPin size={20} className="text-primary" />
            Mapa de Oportunidades Econômicas
          </h3>
          
          {selectedItem && (
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '13px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-success)', boxShadow: 'var(--glow-success)' }} />
                <span>Bônus Regional</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-warning)', boxShadow: 'var(--glow-warning)' }} />
                <span>Melhor Venda (Maior Preço)</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: 'var(--color-info)', boxShadow: 'var(--glow-info)' }} />
                <span>Melhor Compra (Menor Insumo)</span>
              </div>
            </div>
          )}

          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyItems: 'center', justifyContent: 'center' }}>
            {loadingPrices ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                <Loader2 className="animate-spin" size={36} color="var(--color-primary)" style={{ animation: 'spin 1.5s linear infinite' }} />
                <span style={{ color: 'var(--text-secondary)' }}>Carregando dados econômicos do AODP...</span>
              </div>
            ) : (
              <svg viewBox="0 0 600 500" style={{ width: '100%', maxHeight: '420px' }}>
                <defs>
                  {/* Glowing markers definition */}
                  <filter id="glow-violet" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="6" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Map Connections Roads */}
                {/* Caerleon Routes */}
                <line x1="300" y1="250" x2="120" y2="120" stroke="rgba(138, 75, 245, 0.15)" strokeWidth="2" strokeDasharray="5,5" />
                <line x1="300" y1="250" x2="480" y2="120" stroke="rgba(138, 75, 245, 0.15)" strokeWidth="2" strokeDasharray="5,5" />
                <line x1="300" y1="250" x2="500" y2="280" stroke="rgba(138, 75, 245, 0.15)" strokeWidth="2" strokeDasharray="5,5" />
                <line x1="300" y1="250" x2="300" y2="420" stroke="rgba(138, 75, 245, 0.15)" strokeWidth="2" strokeDasharray="5,5" />
                <line x1="300" y1="250" x2="100" y2="280" stroke="rgba(138, 75, 245, 0.15)" strokeWidth="2" strokeDasharray="5,5" />
                
                {/* Outer Ring Roads */}
                <path d="M 120,120 L 480,120 L 500,280 L 300,420 L 100,280 Z" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="2" />

                {/* Cities Plotting */}
                {Object.keys(cityPositions).map(name => {
                  const pos = cityPositions[name];
                  const borderGlow = getCityBorderGlow(name);
                  const isBonus = bonusInfo && bonusInfo.city === name;
                  const isExpensive = expensiveCity === name;
                  const isCheapest = cheapestCity === name;
                  
                  return (
                    <g key={name} style={{ cursor: 'pointer' }}>
                      {/* Outer Ring Circle Indicator */}
                      <circle
                        cx={pos.cx}
                        cy={pos.cy}
                        r="32"
                        className={getCityStateClass(name)}
                        fill="rgba(20, 10, 36, 0.8)"
                        stroke={borderGlow}
                        strokeWidth={isExpensive || isCheapest || isBonus ? "3" : "1.5"}
                        style={{ transition: 'all 0.3s ease' }}
                      />
                      
                      {/* City Center Dot */}
                      <circle cx={pos.cx} cy={pos.cy} r="6" fill={pos.color} />
                      
                      {/* City Name Label */}
                      <text
                        x={pos.cx}
                        y={pos.cy - 40}
                        textAnchor="middle"
                        fill="var(--text-primary)"
                        style={{ fontFamily: 'var(--font-display)', fontSize: '13px', fontWeight: 'bold', pointerEvents: 'none' }}
                      >
                        {name}
                      </text>

                      {/* Dynamic City Node Tags */}
                      {selectedItem && (
                        <g transform={`translate(${pos.cx}, ${pos.cy + 42})`}>
                          {isBonus && (
                            <g transform="translate(0, 0)">
                              <rect x="-65" y="-9" width="130" height="18" rx="4" fill="rgba(0, 230, 118, 0.15)" stroke="var(--color-success)" strokeWidth="1" />
                              <text y="4" textAnchor="middle" fill="#81c784" style={{ fontSize: '9px', fontWeight: 600 }}>BÔNUS DE PRODUÇÃO</text>
                            </g>
                          )}
                          {isExpensive && (
                            <g transform={isBonus ? "translate(0, 22)" : "translate(0, 0)"}>
                              <rect x="-65" y="-9" width="130" height="18" rx="4" fill="rgba(255, 214, 0, 0.15)" stroke="var(--color-warning)" strokeWidth="1" />
                              <text y="4" textAnchor="middle" fill="#ffe082" style={{ fontSize: '9px', fontWeight: 600 }}>MELHOR VENDA (MAIOR)</text>
                            </g>
                          )}
                          {isCheapest && (
                            <g transform={isBonus ? "translate(0, 22)" : "translate(0, 0)"}>
                              <rect x="-65" y="-9" width="130" height="18" rx="4" fill="rgba(0, 176, 255, 0.15)" stroke="var(--color-info)" strokeWidth="1" />
                              <text y="4" textAnchor="middle" fill="#80d8ff" style={{ fontSize: '9px', fontWeight: 600 }}>MELHOR COMPRA (INSUMO)</text>
                            </g>
                          )}
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      </div>

      {/* Right Area: Prices Side Panel */}
      <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        {selectedItem ? (
          <>
            {/* Item Card Details */}
            <div style={{ borderBottom: '1px solid rgba(138, 75, 245, 0.2)', paddingBottom: '16px' }}>
              <span style={{
                fontSize: '11px',
                background: 'rgba(138, 75, 245, 0.15)',
                border: '1px solid rgba(138, 75, 245, 0.35)',
                borderRadius: '4px',
                padding: '2px 8px',
                textTransform: 'uppercase',
                color: 'var(--color-primary-hover)',
                fontWeight: 'bold',
                display: 'inline-block',
                marginBottom: '8px'
              }}>
                Tier {selectedItem.tier}
              </span>
              <h2 style={{ fontSize: '20px', color: 'var(--text-primary)', marginBottom: '4px' }}>{selectedItem.name_pt}</h2>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{selectedItem.id}</span>
              <div style={{ marginTop: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
                Peso: {selectedItem.weight} kg
              </div>
            </div>

            {hasNoPricesAtAll && (
              <div style={{
                background: 'rgba(255, 214, 0, 0.08)',
                border: '1px solid rgba(255, 214, 0, 0.35)',
                borderRadius: '8px',
                padding: '12px 14px',
                color: '#ffe082',
                fontSize: '12.5px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
                  <AlertTriangle size={16} />
                  <span>Sem Preços na API</span>
                </div>
                <span>
                  Este item não possui registros de preços recentes na API. Abra o <a href="https://github.com/ao-data/albion-data-client/releases" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--color-info)', textDecoration: 'underline', fontWeight: 600 }}>Albion Data Client</a> no jogo, visite o mercado de várias cidades e espere alguns segundos para atualizar.
                </span>
              </div>
            )}

            {/* Regional Bonus Detail */}
            {bonusInfo && (
              <div style={{
                background: 'rgba(0, 230, 118, 0.08)',
                border: '1px solid rgba(0, 230, 118, 0.25)',
                borderRadius: '8px',
                padding: '12px'
              }}>
                <div style={{ fontSize: '11px', color: 'var(--color-success)', fontWeight: 'bold', textTransform: 'uppercase', marginBottom: '2px' }}>
                  Cidade de Especialização
                </div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-primary)' }}>
                  {bonusInfo.city}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                  {bonusInfo.label}
                </div>
              </div>
            )}

            {/* Prices per City list */}
            <div>
              <h4 style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Preços por Cidade
              </h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {Object.keys(cityPositions).map(city => {
                  const data = priceData ? priceData[city] : null;
                  const isExp = expensiveCity === city;
                  const isCheap = cheapestCity === city;
                  
                  return (
                    <div key={city} className="glass-card" style={{
                      padding: '10px 12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      borderLeft: isExp 
                        ? '3px solid var(--color-warning)' 
                        : isCheap 
                          ? '3px solid var(--color-info)' 
                          : '1px solid rgba(138, 75, 245, 0.15)'
                    }}>
                      <div>
                        <div style={{ fontWeight: '600', fontSize: '14px', color: 'var(--text-primary)' }}>{city}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          Venda: {formatSilver(data?.sell_price_min)}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-secondary)' }}>
                          Compra: {data?.buy_price_max ? `${data.buy_price_max.toLocaleString('pt-BR')} S` : 'N/A'}
                        </div>
                        <div style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                          {data?.updated_at ? new Date(data.updated_at).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'}) : ''}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '20px'
          }}>
            <TrendingUp size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3>Nenhum Item Selecionado</h3>
            <p style={{ fontSize: '13px', marginTop: '8px' }}>
              Pesquise e selecione um item no painel para iluminar o mapa econômico e exibir os detalhes de preços e bônus.
            </p>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
