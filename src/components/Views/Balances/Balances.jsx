import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { useFinance } from '../../../contexts/FinanceContext';
import MonthBlock from './MonthBlock';

const Balances = () => {
    const { appData } = useFinance();
    const [months, setMonths] = useState([]);

    // Refs for Infinite Scroll
    const bottomSentinelRef = useRef(null);
    const containerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    // Initial Load Logic
    useEffect(() => {
        const now = new Date();
        // If > 25th, start next month, else current
        if (now.getDate() > 25) {
            now.setMonth(now.getMonth() + 1);
        }

        const startYear = now.getFullYear();
        const startMonth = now.getMonth();

        // Load Initial Month (Focus - Newest month first)
        setMonths([{ year: startYear, month: startMonth }]);
    }, []);

    // Load Previous Month (History) -> Appended to Bottom
    const loadHistory = () => {
        if (isLoading) return;

        // Limit: Do not load before Jan 2026
        const last = months[months.length - 1];
        if (last && last.year === 2026 && last.month === 0) {
            return; // Stop at Jan 2026
        }

        setIsLoading(true);

        // Artificial delay for UX smoothing
        setTimeout(() => {
            setMonths(prev => {
                const last = prev[prev.length - 1]; // "Last" in array is currently the oldest loaded
                const d = new Date(last.year, last.month - 1, 1);

                // Double check inside state update to be safe
                if (d.getFullYear() < 2026) return prev;

                const newMonth = { year: d.getFullYear(), month: d.getMonth() };
                return [...prev, newMonth]; // Append "older" month to bottom
            });
            setIsLoading(false);
        }, 10);
    };

    // Intersection Observer Setup (Bottom Only)
    useEffect(() => {
        if (months.length === 0) return;

        const options = {
            root: null, // viewport
            rootMargin: '200px', // Trigger before hitting edge
            threshold: 0.1
        };

        const callback = (entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !isLoading) {
                    if (entry.target === bottomSentinelRef.current) {
                        loadHistory();
                    }
                }
            });
        };

        const observer = new IntersectionObserver(callback, options);

        if (bottomSentinelRef.current) observer.observe(bottomSentinelRef.current);

        return () => observer.disconnect();
    }, [months, isLoading]); // Re-bind on months change (new refs potentially, though refs are stable, effect runs)

    // Calculate Data for Rendered Months
    const renderedData = React.useMemo(() => {
        if (months.length === 0) return [];

        // Build Data for each month.
        // The `months` array is ordered from newest to oldest.
        // Each month's start balance is calculated independently based on all transactions prior to it.
        return months.map(m => {
            const date = new Date(m.year, m.month, 1);
            const monthId = date.toISOString().slice(0, 7);

            // Calculate Start Balance for THIS month specifically
            // (Sum of all txns < this month)
            const historicTxns = (appData.transactions || []).filter(t => t.date < `${monthId}-01`);
            const startBal = historicTxns.reduce((sum, t) => {
                const amt = t.amount || 0;
                const cat = (t.category || '').toLowerCase();
                return sum + (cat === 'salary' || cat === 'income' ? amt : -amt);
            }, 0);

            const txns = (appData.transactions || []).filter(t => t.date.startsWith(monthId));

            // End Balance (for this month)
            const netChange = txns.reduce((sum, t) => {
                const amt = t.amount || 0;
                const cat = (t.category || '').toLowerCase();
                return sum + (cat === 'salary' || cat === 'income' ? amt : -amt);
            }, 0);

            // Note: MonthBlock calculates daily running bal from Start.

            return {
                year: m.year,
                monthIndex: m.month,
                monthId,
                startBal,
                endBal: startBal + netChange,
                transactions: txns
            };
        });

    }, [months, appData.transactions]);



    return (
        <div id="balances-year-stack" ref={containerRef}>
            {renderedData.map(month => (
                <MonthBlock key={month.monthId} data={month} />
            ))}

            {/* Bottom Sentinel */}
            <div ref={bottomSentinelRef} style={{ height: '20px', background: 'transparent' }} />
        </div>
    );
};

export default Balances;
