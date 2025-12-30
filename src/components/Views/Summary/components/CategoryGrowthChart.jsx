import React from 'react';
import { Line } from 'react-chartjs-2';
import { commonOptions } from './ChartConfig';

const CategoryGrowthChart = ({ data }) => {
    return (
        <div className="chart-card">
            <div className="card-head">
                <h3>Category Growth Trends</h3>
            </div>
            <div style={{ height: '400px' }}>
                <Line data={{
                    labels: data.years,
                    datasets: [
                        {
                            label: 'Net Income',
                            data: data.metrics.map(d => d.growth),
                            borderColor: '#3b82f6',
                            backgroundColor: '#3b82f6',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Savings',
                            data: data.metrics.map(d => d.savingsGrowth),
                            borderColor: '#10b981',
                            backgroundColor: '#10b981',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Tax',
                            data: data.metrics.map(d => d.taxGrowth),
                            borderColor: '#eab308',
                            backgroundColor: '#eab308',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Rent',
                            data: data.metrics.map(d => d.rentGrowth),
                            borderColor: '#ef4444',
                            backgroundColor: '#ef4444',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Other Exp.',
                            data: data.metrics.map(d => d.nonRentGrowth),
                            borderColor: '#f97316', // Orange
                            backgroundColor: '#f97316',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        }
                    ]
                }} options={{
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        legend: { display: true, labels: { color: '#94a3b8' } },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#94a3b8' } },
                        y: {
                            grid: { color: '#334155', borderDash: [5, 5] },
                            ticks: { color: '#64748b', callback: (v) => v + '%' }
                        }
                    }
                }} />
            </div>
        </div>
    );
};

export default CategoryGrowthChart;
