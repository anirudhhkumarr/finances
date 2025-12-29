import React from 'react';
import { Wallet, BarChart3, Grip } from 'lucide-react';

const Sidebar = ({ activeTab, onTabChange }) => {
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
        </aside>
    );
};

export default Sidebar;
