import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import RefiningCalc from './components/RefiningCalc';
import CraftingCalc from './components/CraftingCalc';
import Flipper from './components/Flipper';

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [authenticating, setAuthenticating] = useState(true);

  // Validate session on mount
  useEffect(() => {
    const validateSession = async () => {
      if (!token) {
        setAuthenticating(false);
        return;
      }

      try {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Session expired');
        }

        const data = await response.json();
        setUser(data.user);
      } catch (err) {
        console.error('Auth error:', err);
        handleLogout();
      } finally {
        setAuthenticating(false);
      }
    };

    validateSession();
  }, [token]);

  const handleLogin = (newToken, newUser) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    setUser(newUser);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  if (authenticating) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-secondary)'
      }}>
        Carregando sessão...
      </div>
    );
  }

  // Protect access: if not logged in, render Login Page only
  if (!token || !user) {
    return <Login onLogin={handleLogin} />;
  }

  // Render correct page view
  const renderView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'refining':
        return <RefiningCalc />;
      case 'crafting':
        return <CraftingCalc />;
      case 'flipper':
        return <Flipper />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="layout-container">
      {/* Floating Glassmorphic Navbar */}
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        user={user} 
        onLogout={handleLogout} 
      />
      
      {/* Page Body Wrap */}
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}
