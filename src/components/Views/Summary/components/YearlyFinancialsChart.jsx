import React, { useState } from 'react';
import { Bar } from 'react-chartjs-2';
import { commonOptions, catColors, formatLabel } from './ChartConfig';

const YearlyFinancialsChart = ({ data }) => {
    const [breakdownMode, setBreakdownMode] = useState(0);
    const breakdownLabels = ['All', 'Tax', 'Savings', 'Expenses'];

    return (
        <div className="chart-card">
            <div className="card-head">
                <h3>Yearly Financials & Breakdown</h3>
                <span className="badge">{breakdownLabels[breakdownMode]}</span>
                {/* Filter Control */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', width: '120px' }}>
                    <input
                        type="range"
                        min="0"
                        max="3"
                        step="1"
                        value={breakdownMode}
                        onChange={(e) => setBreakdownMode(Number(e.target.value))}
                        style={{ width: '100%', accentColor: '#3b82f6' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: '#64748b' }}>
                        <span>All</span>
                        <span>Exp</span>
                    </div>
                </div>
            </div>
            <div style={{ height: '400px' }}>
                <Bar data={{
                    labels: data.years,
                    datasets: [
                        // Tax
                        {
                            label: 'Tax',
                            data: data.metrics.map(d => d.tax),
                            backgroundColor: '#eab308',
                            borderRadius: 2,
                            stack: 'stack0',
                            yAxisID: 'y',
                            hidden: breakdownMode !== 0 && breakdownMode !== 1
                        },
                        // Savings Detailed
                        ...([
                            { k: 'savings401k', l: '401k', c: '#34d399' },
                            { k: 'savingsStock', l: 'Stock', c: '#059669' },
                            { k: 'cashFlow', l: 'Cash Flow', c: '#6ee7b7' }
                        ].map(i => ({
                            label: i.l,
                            data: data.metrics.map(d => d[i.k]),
                            backgroundColor: i.c,
                            borderRadius: 1,
                            stack: 'stack0',
                            yAxisID: 'y',
                            hidden: breakdownMode !== 0 && breakdownMode !== 2
                        }))),
                        // Detailed Expenses
                        ...(['rent', 'car', 'cards', 'other'].map(cat => ({
                            label: formatLabel(cat),
                            data: data.metrics.map(d => d.catTotals[cat]),
                            backgroundColor: catColors[cat] || '#64748b',
                            borderRadius: 1,
                            stack: 'stack0',
                            yAxisID: 'y',
                            hidden: breakdownMode !== 0 && breakdownMode !== 3
                        })))
                    ]
                }} options={{
                    ...commonOptions,
                    scales: {
                        x: {
                            stacked: true,
                            grid: { color: '#334155', tickLength: 0 },
                            ticks: { color: '#94a3b8', font: { size: 11, weight: 600 } }
                        },
                        y: {
                            stacked: true,
                            grid: { color: '#334155', borderDash: [5, 5] },
                            ticks: { color: '#64748b' },
                            position: 'left',
                            min: 0
                        }
                    }
                }} />
            </div>
        </div>
    );
};

export default YearlyFinancialsChart;
