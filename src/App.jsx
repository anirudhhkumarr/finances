import React, { useState, useEffect } from 'react';
import Sidebar from './components/Layout/Sidebar';
import Balances from './components/Views/Balances/Balances';
import Summary from './components/Views/Summary/Summary';
import DataEntry from './components/Views/DataEntry/DataEntry';
import PasswordDialog from './components/Common/PasswordDialog';
import ErrorBoundary from './components/Common/ErrorBoundary';
import { useFinance } from './contexts/FinanceContext';

function App() {
  const { passwordRequest } = useFinance();

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
        <ErrorBoundary>
          {activeTab === 'balances' && <Balances />}
          {activeTab === 'summary' && <Summary />}
          {activeTab === 'input' && <DataEntry />}
        </ErrorBoundary>
      </main>

      {/* Global Password Dialog */}
      {passwordRequest && (
        <PasswordDialog
          mode={passwordRequest.mode}
          onConfirm={passwordRequest.onConfirm}
          onCancel={passwordRequest.onCancel}
        />
      )}
    </div>
  );
}

export default App;
