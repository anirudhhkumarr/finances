import React from 'react';
import { Wallet, BarChart3, Grip, Download, Upload } from 'lucide-react';
import { useFinance } from '../../contexts/FinanceContext';

const Sidebar = ({ activeTab, onTabChange }) => {
    const { exportData, importData } = useFinance();
    return (
        <aside className="app-sidebar-minimal">
            <div className="sidebar-logo">FM</div>
            <nav className="sidebar-nav">
                <button
                    className={`nav-btn-icon ${activeTab === 'balances' ? 'active' : ''}`}
                    onClick={() => onTabChange('balances')}
                    title="Balances"
                >
                    <Wallet size={24} strokeWidth={1.5} />
                </button>
                <button
                    className={`nav-btn-icon ${activeTab === 'summary' ? 'active' : ''}`}
                    onClick={() => onTabChange('summary')}
                    title="Summary"
                >
                    <BarChart3 size={24} strokeWidth={1.5} />
                </button>
                <button
                    className={`nav-btn-icon ${activeTab === 'input' ? 'active' : ''}`}
                    onClick={() => onTabChange('input')}
                    title="Data Entry"
                >
                    <Grip size={24} strokeWidth={1.5} />
                </button>
            </nav>

            <div className="sidebar-footer" style={{ marginTop: 'auto', paddingBottom: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button
                    className="nav-btn-icon"
                    onClick={exportData}
                    title="Export / Backup Data"
                >
                    <Download size={20} />
                </button>

                <label className="nav-btn-icon" title="Import / Restore Data" style={{ cursor: 'pointer' }}>
                    <Upload size={20} />
                    <input
                        type="file"
                        accept=".json"
                        style={{ display: 'none' }}
                        onChange={(e) => {
                            if (e.target.files?.[0]) importData(e.target.files[0]);
                            e.target.value = null; // Reset
                        }}
                    />
                </label>
            </div>
        </aside>
    );
};

export default Sidebar;
