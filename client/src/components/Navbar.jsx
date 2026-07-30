import { LayoutDashboard, Flame, Hammer, Truck, LogOut, ShieldAlert, Download, BadgeAlert } from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab }) {
  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: LayoutDashboard },
    { id: 'refining', label: 'Calculadora de Refino', icon: Flame },
    { id: 'crafting', label: 'Calculadora de Craft', icon: Hammer },
    { id: 'flipper', label: 'Flipper', icon: Truck },
  ];

  return (
    <nav className="glass-panel" style={{
      position: 'fixed',
      top: '16px',
      left: '16px',
      right: '16px',
      zIndex: 1000,
      padding: '12px 24px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderRadius: '12px',
      height: '64px'
    }}>
      {/* Brand Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setActiveTab('dashboard')}>
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary) 0%, #621be5 100%)',
          width: '32px',
          height: '32px',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: 'var(--glow-primary)'
        }}>
          <ShieldAlert size={18} color="white" />
        </div>
        <span style={{
          fontFamily: 'var(--font-display)',
          fontWeight: 800,
          fontSize: '18px',
          background: 'linear-gradient(90deg, #fff 0%, var(--text-secondary) 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          ALBION <span style={{ color: 'var(--color-primary)', WebkitTextFillColor: 'initial' }}>DATA</span>
        </span>
      </div>

      {/* Center Links */}
      <div style={{ display: 'flex', gap: '6px' }}>
        {menuItems.map(item => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                background: isActive ? 'rgba(138, 75, 245, 0.15)' : 'transparent',
                border: isActive ? '1px solid rgba(138, 75, 245, 0.35)' : '1px solid transparent',
                borderRadius: '8px',
                padding: '8px 16px',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontFamily: 'var(--font-sans)',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
                outline: 'none'
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                  e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                  e.currentTarget.style.background = 'transparent';
                }
              }}
            >
              <Icon size={16} />
              {item.label}
            </button>
          );
        })}
      </div>

      {/* Right User State */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <a
          href="https://github.com/ao-data/albion-data-client/releases"
          target="_blank"
          rel="noopener noreferrer"
          style={{
            background: 'rgba(0, 176, 255, 0.1)',
            border: '1px solid rgba(0, 176, 255, 0.25)',
            borderRadius: '8px',
            padding: '8px 14px',
            color: 'var(--color-info)',
            fontSize: '13px',
            fontWeight: 600,
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(0, 176, 255, 0.2)';
            e.currentTarget.style.borderColor = 'rgba(0, 176, 255, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(0, 176, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(0, 176, 255, 0.25)';
          }}
        >
          <Download size={14} />
          Albion Data Client
        </a>
      </div>
    </nav>
  );
}
