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
                    style={{ background: isAllocationStacked ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255,255,255,0.05)', cursor: 'pointer', border: '1px solid rgba(255,255,255,0.1)' }}
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
                            borderColor: '#10b981', // Green
                            backgroundColor: isAllocationStacked ? 'rgba(16, 185, 129, 0.6)' : 'rgba(16, 185, 129, 0.1)',
                            borderWidth: isAllocationStacked ? 0 : 3,
                            pointBackgroundColor: '#10b981',
                            pointRadius: isAllocationStacked ? 0 : 4,
                            fill: isAllocationStacked,
                            tension: 0.3
                        },
                        {
                            label: 'Tax Rate',
                            data: data.metrics.map(d => d.taxRate),
                            borderColor: '#eab308', // Yellow (Gold)
                            backgroundColor: isAllocationStacked ? 'rgba(234, 179, 8, 0.6)' : 'rgba(234, 179, 8, 0.1)',
                            borderWidth: isAllocationStacked ? 0 : 2,
                            pointBackgroundColor: '#eab308',
                            pointRadius: isAllocationStacked ? 0 : 3,
                            fill: isAllocationStacked,
                            tension: 0.3
                        },
                        {
                            label: 'Expense Rate',
                            data: data.metrics.map(d => d.expenseRate),
                            borderColor: '#ef4444', // Red
                            backgroundColor: isAllocationStacked ? 'rgba(239, 68, 68, 0.6)' : 'rgba(239, 68, 68, 0.1)',
                            borderWidth: isAllocationStacked ? 0 : 2,
                            pointBackgroundColor: '#ef4444',
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
