import React, { useEffect, useRef } from 'react';
import { Chart } from 'chart.js';
import { commonOptions } from './ChartConfig';

const IncomeFlowChart = ({ data }) => {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    // Sankey Colors
    const colorMap = {
        'Gross Income': '#268bd2',
        'Net Income': '#2aa198',
        'Tax': '#b58900',
        'Total Savings': '#6c71c4',
        '401k': '#6c71c4',
        'Stock': '#2aa198',
        'Cash': '#268bd2',
        'Expenses': '#d33682',
        'Rent': '#d33682',      // Base Magenta
        'Car': '#de5599',       // Lighter Magenta
        'Cards': '#a92b61',     // Darker Magenta
        'Other': '#e37dae',     // Soft Pinkish Magenta
        'cards': '#a92b61',     // Match Cards
    };

    useEffect(() => {
        const ctx = chartRef.current; // Use the element directly for getChart check

        // 1. Destroy any existing chart instance on this canvas (GLOBAL CHECK)
        const existingChart = Chart.getChart(ctx);
        if (existingChart) {
            existingChart.destroy();
        }

        // 2. Also clear our local ref just in case
        if (chartInstance.current) {
            chartInstance.current.destroy();
            chartInstance.current = null;
        }

        if (ctx && data.sankeyData) {
            chartInstance.current = new Chart(ctx, {
                type: 'sankey',
                data: {
                    datasets: [{
                        label: 'Income Flow',
                        data: [...data.sankeyData],
                        colorFrom: (c) => colorMap[c.dataset.data[c.dataIndex].from] || '#839496',
                        colorTo: (c) => colorMap[c.dataset.data[c.dataIndex].to] || '#839496',
                        colorMode: 'gradient',
                        nodePadding: 80,
                        nodeWidth: 40,
                        font: { size: 14, weight: 'bold', family: "'Outfit', sans-serif" },
                        color: '#fdf6e3',
                        labels: (() => {
                            const gross = data.sankeyGross || 1;
                            const labels = {};
                            const nodes = new Set();
                            data.sankeyData.forEach(d => {
                                nodes.add(d.from);
                                nodes.add(d.to);
                            });
                            nodes.forEach(n => {
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
                },
                options: {
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
                }
            });
        }

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
        };
    }, [data]); // Re-run when data changes

    return (
        <div className="chart-card wide glow">
            <div className="card-head">
                <h3>Income Flow ({data.sankeyYear})</h3>
            </div>
            <div style={{ height: '500px', position: 'relative' }}>
                <canvas ref={chartRef} />
            </div>
        </div>
    );
};

export default IncomeFlowChart;
