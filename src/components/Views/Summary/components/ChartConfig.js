// Chart Configs
export const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#94a3b8', font: { family: "'Outfit', sans-serif" } } },
        tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f8fafc',
            bodyColor: '#e2e8f0',
            borderColor: '#475569',
            borderWidth: 1,
            padding: 12,
            cornerRadius: 8,
            callbacks: {
                label: (ctx) => {
                    let val = ctx.raw;
                    if (typeof val === 'object' && val !== null) return '';
                    if (ctx.dataset.type === 'line' || ctx.chart.config.type === 'line') {
                        return ctx.dataset.label + ': ' + val.toFixed(1) + '%';
                    }
                    if (typeof val === 'number') return ctx.dataset.label + ': $' + val.toLocaleString();
                    return '';
                }
            }
        }
    },
    scales: {
        x: { grid: { color: '#334155', tickLength: 0 }, ticks: { color: '#94a3b8', font: { size: 11, weight: 600 } } },
        y: { grid: { color: '#334155', borderDash: [5, 5] }, ticks: { color: '#64748b' } }
    }
};

export const catColors = {
    rent: '#ef4444',     // Red 500
    car: '#f97316',      // Orange 500
    cards: '#db2777',    // Pink 600
    other: '#881337',    // Rose 900
    chase: '#db2777',
    amex: '#be185d',
    discover: '#9d174d',
    usbank: '#831843',
};

export const formatLabel = (key) => {
    if (key === 'usbank') return 'US Bank';
    if (key === 'amex') return 'Amex';
    return key.charAt(0).toUpperCase() + key.slice(1);
};
