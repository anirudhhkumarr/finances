import React, { useState } from 'react';
import { Line } from 'react-chartjs-2';
import { commonOptions } from './ChartConfig';

const IncomeAllocationChart = ({ data }) => {
    const [isAllocationStacked, setIsAllocationStacked] = useState(false);

    return (
        <div className="chart-card">
            <div className="card-head">
                <h3>Income Allocation Trends</h3>
                <button
                    className="badge"
                    onClick={() => setIsAllocationStacked(!isAllocationStacked)}
                    style={{ background: isAllocationStacked ? 'rgba(38, 139, 210, 0.2)' : 'rgba(253, 246, 227, 0.05)', cursor: 'pointer', border: '1px solid rgba(253, 246, 227, 0.1)' }}
                >
                    {isAllocationStacked ? 'Stacked View' : 'Line View'}
                </button>
            </div>
            <div style={{ height: '400px' }}>
                <Line data={{
                    labels: data.years,
                    datasets: [
                        {
                            label: 'Savings Rate',
                            data: data.metrics.map(d => d.savingsRate),
                            borderColor: '#2aa198', // Cyan
                            backgroundColor: isAllocationStacked ? 'rgba(42, 161, 152, 0.6)' : 'rgba(42, 161, 152, 0.1)',
                            borderWidth: isAllocationStacked ? 0 : 3,
                            pointBackgroundColor: '#2aa198',
                            pointRadius: isAllocationStacked ? 0 : 4,
                            fill: isAllocationStacked,
                            tension: 0.3
                        },
                        {
                            label: 'Tax Rate',
                            data: data.metrics.map(d => d.taxRate),
                            borderColor: '#b58900', // Yellow
                            backgroundColor: isAllocationStacked ? 'rgba(181, 137, 0, 0.6)' : 'rgba(181, 137, 0, 0.1)',
                            borderWidth: isAllocationStacked ? 0 : 2,
                            pointBackgroundColor: '#b58900',
                            pointRadius: isAllocationStacked ? 0 : 3,
                            fill: isAllocationStacked,
                            tension: 0.3
                        },
                        {
                            label: 'Expense Rate',
                            data: data.metrics.map(d => d.expenseRate),
                            borderColor: '#d33682', // Magenta
                            backgroundColor: isAllocationStacked ? 'rgba(211, 54, 130, 0.6)' : 'rgba(211, 54, 130, 0.1)',
                            borderWidth: isAllocationStacked ? 0 : 2,
                            pointBackgroundColor: '#d33682',
                            pointRadius: isAllocationStacked ? 0 : 3,
                            fill: isAllocationStacked,
                            tension: 0.3
                        }
                    ]
                }} options={{
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            stacked: isAllocationStacked,
                            ticks: { callback: (v) => v + '%' },
                            max: isAllocationStacked ? 100 : undefined
                        }
                    },
                    plugins: {
                        ...commonOptions.plugins,
                        tooltip: {
                            ...commonOptions.plugins.tooltip,
                            mode: isAllocationStacked ? 'index' : 'nearest',
                            intersect: !isAllocationStacked
                        }
                    }
                }} />
            </div>
        </div>
    );
};

export default IncomeAllocationChart;
