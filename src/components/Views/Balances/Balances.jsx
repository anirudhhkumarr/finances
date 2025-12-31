import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useFinance } from '../../../hooks/useFinance';
import MonthBlock from './MonthBlock';

const Balances = () => {
    const { appData } = useFinance();
    const [months, setMonths] = useState(() => {
        const now = new Date();
        // If > 25th, start next month, else current
        if (now.getDate() > 25) {
            now.setMonth(now.getMonth() + 1); // e.g. Dec 26 -> Jan
        }

        const current = { year: now.getFullYear(), month: now.getMonth() };

        // Previous Month
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prev = { year: prevDate.getFullYear(), month: prevDate.getMonth() };

        return [current, prev];
    });

    // Refs for Infinite Scroll
    const bottomSentinelRef = useRef(null);
    const containerRef = useRef(null);
    const [isLoading, setIsLoading] = useState(false);

    // Load Previous Month (History) -> Appended to Bottom
    const loadHistory = useCallback(() => {
        if (isLoading) return;

        setIsLoading(true);

        // Artificial delay for UX smoothing
        setTimeout(() => {
            setMonths(prev => {
                const last = prev[prev.length - 1]; // "Last" in array is currently the oldest loaded
                const d = new Date(last.year, last.month - 1, 1);

                // Stop at Dec 2025 (No older data needed)
                if (d.getFullYear() < 2025 || (d.getFullYear() === 2025 && d.getMonth() < 11)) return prev;

                const newMonth = { year: d.getFullYear(), month: d.getMonth() };
                return [...prev, newMonth]; // Append "older" month to bottom
            });
            setIsLoading(false);
        }, 10);
    }, [isLoading]);

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
    }, [isLoading, loadHistory, months]); // Re-bind on months change (new refs potentially, though refs are stable, effect runs)

    // Calculate Data for Rendered Months
    const renderedData = useMemo(() => {
        if (months.length === 0) return [];

        // Build Data for each month.
        return months.map(m => {
            const date = new Date(m.year, m.month, 1);
            const monthId = date.toISOString().slice(0, 7);

            // Calculate Start Balance logic with Overrides
            // 1. Find latest override < this month
            // 2. Sum transactions between override and this month
            const overrides = appData.balanceOverrides || {};
            const overrideDates = Object.keys(overrides).sort();

            // Find latest date strictly before the 1st of this month
            const monthStartDate = `${monthId}-01`;
            const relevantOverrideDate = overrideDates.reverse().find(d => d < monthStartDate);

            let baseBalance = 0;
            let rangeStart = '0000-00-00'; // Exclusive

            if (relevantOverrideDate) {
                baseBalance = overrides[relevantOverrideDate];
                rangeStart = relevantOverrideDate;
            }

            // Sum transactions > rangeStart AND < monthStartDate
            // Note: rangeStart is exclusive because override sets the closing balance of that day
            const historicTxns = (appData.transactions || []).filter(t => t.date > rangeStart && t.date < monthStartDate);

            const interimChange = historicTxns.reduce((sum, t) => {
                const amt = t.amount || 0;
                const cat = (t.category || '').toLowerCase();
                return sum + (cat === 'salary' || cat === 'income' ? amt : -amt);
            }, 0);

            const startBal = baseBalance + interimChange;

            const txns = (appData.transactions || []).filter(t => t.date.startsWith(monthId));

            // End Balance (for this month)
            // Need to account for overrides WITHIN this month for the *month's* end balance?
            // Actually, MonthBlock handles internal running balance.
            // But if we want to show it here (e.g. for debugging or if we use endBal), we should probably calculate it correctly too.
            // Let's rely on StartBal + NetChange for now, but really MonthBlock should handle the display.
            // However, to be consistent, let's calculate simplistic NetChange.
            // If there's an override IN this month, simply adding netChange is wrong.
            // But checking overrides within the month is O(D) ~ 30.

            // Find latest override <= End of Month.
            // Actually we reversed above. Let's operate generically.

            // Simplification: We only really pass 'startBal' to MonthBlock. 
            // EndBal is just for our own reference or potential display.
            const netChange = txns.reduce((sum, t) => {
                const amt = t.amount || 0;
                const cat = (t.category || '').toLowerCase();
                return sum + (cat === 'salary' || cat === 'income' ? amt : -amt);
            }, 0);

            return {
                year: m.year,
                monthIndex: m.month,
                monthId,
                startBal,
                endBal: startBal + netChange, // Approximation, MonthBlock does the real daily walk
                transactions: txns
            };
        });

    }, [months, appData.transactions, appData.balanceOverrides]);





    return (
        <div className="balances-layout">
            {/* Sidebar Removed as per User Request */}

            {/* Main Content */}
            <div id="balances-year-stack" ref={containerRef}>
                {/* Global Column Headers */}
                <div className="balance-row header sticky-columns">
                    <div className="bal-day">Date</div>
                    <div className="bal-weekday">Day</div>
                    <div className="bal-amt">Amount</div>
                    <div className="bal-balance-wrapper">Balance</div>
                    <div className="bal-cat">Category</div>
                </div>

                {renderedData.map(month => (
                    <MonthBlock key={month.monthId} data={month} />
                ))}

                {/* Bottom Sentinel */}
                <div ref={bottomSentinelRef} style={{ height: '20px', background: 'transparent' }} />
            </div>
        </div>
    );
};

export default Balances;
