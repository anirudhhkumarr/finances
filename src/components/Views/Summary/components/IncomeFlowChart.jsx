import React from 'react';
import { Chart } from 'react-chartjs-2';
import { commonOptions, catColors } from './ChartConfig';

const IncomeFlowChart = ({ data }) => {
    // Sankey Colors (Blue Income, Green Savings, Yellow Tax, Red Expenses)
    const colorMap = {
        'Gross Income': '#3b82f6', // Blue
        'Net Income': '#60a5fa',   // Blue 400
        'Tax': '#eab308',          // Yellow (Gold)

        'Total Savings': '#10b981', // Emerald (Green)
        '401k': '#34d399',          // Emerald 400
        'Stock': '#059669',         // Emerald 600
        'Cash': '#6ee7b7',          // Emerald 300

        'Expenses': '#ef4444',      // Red

        // Categories
        'Rent': catColors.rent,
        'Car': catColors.car,
        'Cards': catColors.cards, // Deep Red for Cards group
        'Other': catColors.other,
        'cards': catColors.cards, // Fallback
    };

    return (
        <div className="chart-card wide glow">
            <div className="card-head">
                <h3>Income Flow ({data.sankeyYear})</h3>
            </div>
            <div style={{ height: '500px' }}>
                <Chart type='sankey' data={{
                    datasets: [{
                        label: 'Income Flow',
                        data: data.sankeyData,
                        colorFrom: (c) => colorMap[c.dataset.data[c.dataIndex].from] || '#94a3b8',
                        colorTo: (c) => colorMap[c.dataset.data[c.dataIndex].to] || '#94a3b8',
                        colorMode: 'gradient',
                        nodePadding: 120, // Keep manual padding
                        nodeWidth: 40,
                        // Label Customization
                        font: { size: 14, weight: 'bold', family: "'Outfit', sans-serif" },
                        color: '#ffffff', // White Labels
                        labels: (() => {
                            const gross = data.sankeyGross || 1;
                            const labels = {};
                            // Iterate generic categories to map to %
                            const nodes = new Set();
                            data.sankeyData.forEach(d => {
                                nodes.add(d.from);
                                nodes.add(d.to);
                            });
                            nodes.forEach(n => {
                                // Find total flow for this node to calc %
                                let val = 0;
                                if (n === 'Gross Income') {
                                    val = gross;
                                } else {
                                    val = data.sankeyData.filter(d => d.to === n).reduce((s, d) => s + d.flow, 0);
                                }
                                const pct = ((val / gross) * 100).toFixed(0);
                                labels[n] = `${n} (${pct}%)`;
                            });
                            return labels;
                        })()
                    }]
                }} options={{
                    ...commonOptions,
                    plugins: {
                        ...commonOptions.plugins,
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (ctx) => {
                                    const item = ctx.raw;
                                    const gross = data.sankeyGross || 1;
                                    const pct = ((item.flow || 0) / gross * 100).toFixed(1);
                                    return `${item.from} → ${item.to}: $${(item.flow || 0).toLocaleString()} (${pct}%)`;
                                }
                            }
                        }
                    },
                    maintainAspectRatio: false,
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    }
                }} />
            </div>
        </div>
    );
};

export default IncomeFlowChart;
