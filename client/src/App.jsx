import React, { useState } from 'react';
import Navbar from './components/Navbar';
import Dashboard from './components/Dashboard';
import RefiningCalc from './components/RefiningCalc';
import CraftingCalc from './components/CraftingCalc';
import Flipper from './components/Flipper';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');

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
      <Navbar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
      />
      
      <main className="main-content">
        {renderView()}
      </main>
    </div>
  );
}
