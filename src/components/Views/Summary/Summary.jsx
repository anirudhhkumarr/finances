import React from 'react';
import { useFinance } from '../../../contexts/FinanceContext';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
);

const Summary = () => {
    const { appData } = useFinance();

    const data = React.useMemo(() => {
        // Sort Ascending for Chart
        const sorted = (appData.records || []).slice().sort((a, b) => a.id.localeCompare(b.id)); // Limit to last 12?
        const labels = sorted.map(r => r.id);

        return {
            labels,
            datasets: [
                {
                    label: 'Net Income',
                    data: sorted.map(r => (r.income?.net || 0) + (r.income?.other || 0)),
                    backgroundColor: '#4ade80',
                },
                {
                    label: 'Expenses',
                    data: sorted.map(r => {
                        const e = r.expenses || {};
                        return (e.rent || 0) + (e.car || 0) + (e.amex || 0) + (e.discover || 0) + (e.usbank || 0) + (e.chase || 0) + (e.other || 0);
                    }),
                    backgroundColor: '#f87171',
                }
            ],
        };
    }, [appData.records]);

    const options = {
        responsive: true,
        plugins: {
            legend: {
                position: 'top',
                labels: { color: '#94a3b8' }
            },
            title: {
                display: true,
                text: 'Income vs Expenses',
                color: '#f8fafc'
            },
        },
        scales: {
            x: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } },
            y: { ticks: { color: '#94a3b8' }, grid: { color: '#334155' } }
        }
    };

    return (
        <div className="dashboard-grid">
            <div className="card full-width">
                <h3>Financial Overview</h3>
                <div className="chart-wrapper">
                    <Bar options={options} data={data} redraw={true} />
                </div>
            </div>

            <div className="card">
                <h3>Recent Activity</h3>
                <div style={{ color: '#94a3b8', fontSize: '13px' }}>
                    Coming soon...
                </div>
            </div>
        </div>
    );
};

export default Summary;
