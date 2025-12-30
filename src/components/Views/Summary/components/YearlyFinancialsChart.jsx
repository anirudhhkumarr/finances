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
                        style={{ width: '100%', accentColor: '#268bd2' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', fontSize: '10px', color: '#586e75' }}>
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
                            backgroundColor: '#b58900',
                            borderRadius: 2,
                            stack: 'stack0',
                            yAxisID: 'y',
                            hidden: breakdownMode !== 0 && breakdownMode !== 1
                        },
                        // Savings Detailed
                        ...([
                            { k: 'savings401k', l: '401k', c: '#6c71c4' },     // Violet
                            { k: 'savingsStock', l: 'Stock', c: '#2aa198' },   // Cyan
                            { k: 'cashFlow', l: 'Cash Flow', c: '#859900' }    // Green
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
                            backgroundColor: catColors[cat] || '#586e75',
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
                            grid: { color: '#073642', tickLength: 0 },
                            ticks: { color: '#839496', font: { size: 11, weight: 600 } }
                        },
                        y: {
                            stacked: true,
                            grid: { color: '#073642', borderDash: [5, 5] },
                            ticks: { color: '#839496' },
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
