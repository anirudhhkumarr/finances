// Chart Configs
export const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
        legend: { labels: { color: '#839496', font: { family: "'Outfit', sans-serif" } } },
        tooltip: {
            backgroundColor: 'rgba(0, 43, 54, 0.95)',
            titleColor: '#fdf6e3',
            bodyColor: '#93a1a1',
            borderColor: '#586e75',
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
        x: { grid: { color: '#073642', tickLength: 0 }, ticks: { color: '#839496', font: { size: 11, weight: 600 } } },
        y: { grid: { color: '#073642', borderDash: [5, 5] }, ticks: { color: '#586e75' } }
    }
};

export const catColors = {
    rent: '#d33682',     // Base Magenta
    car: '#de5599',      // Lighter Magenta
    cards: '#a92b61',    // Darker Magenta
    other: '#e37dae',    // Soft Magenta
    chase: '#268bd2',    // Blue
    amex: '#2aa198',     // Cyan
    discover: '#b58900', // Yellow
    usbank: '#859900',   // Green
};

export const formatLabel = (key) => {
    if (key === 'usbank') return 'US Bank';
    if (key === 'amex') return 'Amex';
    return key.charAt(0).toUpperCase() + key.slice(1);
};
