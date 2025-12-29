import React, { useState, useEffect } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Balances from './components/Views/Balances/Balances';
import Summary from './components/Views/Summary/Summary';
import DataEntry from './components/Views/DataEntry/DataEntry';

function App() {
  // Persist active tab in session storage (retain on refresh, lost on close)
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem('activeTab') || 'balances';
  });

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    sessionStorage.setItem('activeTab', tab);
  };

  return (
    <div className="app-shell">
      <Sidebar activeTab={activeTab} onTabChange={handleTabChange} />
      <main className="main-content">
        {activeTab === 'balances' && <Balances />}
        {activeTab === 'summary' && <Summary />}
        {activeTab === 'input' && <DataEntry />}
      </main>
    </div>
  );
}

export default App;
