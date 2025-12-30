import React, { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { useAnnualData } from './hooks/useAnnualData';
import IncomeFlowChart from './components/IncomeFlowChart';
import YearlyFinancialsChart from './components/YearlyFinancialsChart';
import IncomeAllocationChart from './components/IncomeAllocationChart';
import CategoryGrowthChart from './components/CategoryGrowthChart';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    SankeyController,
    Flow,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AnnualAnalytics = () => {
    const [selectedYear, setSelectedYear] = useState('2025');
    const annualData = useAnnualData(selectedYear);

    // Slider Setup
    const sliderOptions = [...annualData.years, 'All'];
    const sliderIndex = sliderOptions.indexOf(selectedYear) === -1 ? sliderOptions.length - 1 : sliderOptions.indexOf(selectedYear);

    const handleSliderChange = (e) => {
        const idx = parseInt(e.target.value);
        setSelectedYear(sliderOptions[idx]);
    };

    return (
        <div className="annual-dashboard">
            <div className="dash-header">
                <div>
                    <h1 className="title">Annual Ledger</h1>
                </div>
                {/* Year Slider Control */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '200px' }}>
                    <label style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '4px', fontWeight: 600 }}>
                        {selectedYear === 'All' ? 'All Time' : selectedYear}
                    </label>
                    <input
                        type="range"
                        min="0"
                        max={sliderOptions.length - 1}
                        value={sliderIndex}
                        onChange={handleSliderChange}
                        style={{ width: '100%', accentColor: '#10b981' }}
                    />
                </div>
            </div>

            {annualData.years.length === 0 ? (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '400px',
                    color: '#94a3b8',
                    gap: '16px'
                }}>
                    <div style={{ fontSize: '48px', opacity: 0.5 }}>📊</div>
                    <h3>No Data Available</h3>
                    <p>Enter some income and expenses in the Balances tab to generate reports.</p>
                </div>
            ) : (
                <div className="grid-layout">
                    {/* 1. Sankey Flow (Latest Year) - Full Width */}
                    <IncomeFlowChart data={annualData} />

                    {/* 2. The Annual Ledger (Detailed Stack) */}
                    <YearlyFinancialsChart data={annualData} />

                    {/* 3. Income Allocation Trends (Line) */}
                    <IncomeAllocationChart data={annualData} />

                    {/* 4. Category Growth Trends (Dedicated Line Chart) */}
                    <CategoryGrowthChart data={annualData} />
                </div>
            )}
        </div>
    );
};

export default AnnualAnalytics;
