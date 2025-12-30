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
                            borderColor: '#268bd2',
                            backgroundColor: '#268bd2',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Savings',
                            data: data.metrics.map(d => d.savingsGrowth),
                            borderColor: '#2aa198', // Cyan
                            backgroundColor: '#2aa198',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Tax',
                            data: data.metrics.map(d => d.taxGrowth),
                            borderColor: '#b58900',
                            backgroundColor: '#b58900',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Rent',
                            data: data.metrics.map(d => d.rentGrowth),
                            borderColor: '#d33682',
                            backgroundColor: '#d33682',
                            borderWidth: 2,
                            pointRadius: 4,
                            tension: 0.3,
                            fill: false
                        },
                        {
                            label: 'Other Exp.',
                            data: data.metrics.map(d => d.nonRentGrowth),
                            borderColor: '#dc322f', // Red (Avoid Orange/Brown)
                            backgroundColor: '#dc322f',
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
                        legend: { display: true, labels: { color: '#839496' } },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw.toFixed(1)}%`
                            }
                        }
                    },
                    scales: {
                        x: { grid: { display: false }, ticks: { color: '#839496' } },
                        y: {
                            grid: { color: '#073642', borderDash: [5, 5] },
                            ticks: { color: '#586e75', callback: (v) => v + '%' }
                        }
                    }
                }} />
            </div>
        </div>
    );
};

export default CategoryGrowthChart;
