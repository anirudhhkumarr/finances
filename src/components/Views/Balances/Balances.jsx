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
            now.setMonth(now.getMonth() + 1); // e.g. Dec 26 -> Jan
        }

        const current = { year: now.getFullYear(), month: now.getMonth() };

        // Previous Month
        const prevDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prev = { year: prevDate.getFullYear(), month: prevDate.getMonth() };

        // Load Initial Month (Focus - Newest month first, then previous)
        setMonths([current, prev]);
    }, []);

    // Load Previous Month (History) -> Appended to Bottom
    const loadHistory = () => {
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
        return months.map(m => {
            const date = new Date(m.year, m.month, 1);
            const monthId = date.toISOString().slice(0, 7);
            const nextMonthId = new Date(m.year, m.month + 1, 1).toISOString().slice(0, 7);

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

            // Refined EndBal Logic:
            // Find latest override <= End of Month.
            const monthEndDate = `${nextMonthId}-01`; // First day of next month (exclusive)
            const lastOverrideInMonth = overrideDates.find(d => d >= monthStartDate && d < monthEndDate); // Re-sorted? We reversed above.
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



    // Find today's balance from the rendered data (Current Month)
    // The first month in 'renderedData' is the current month (newest).
    // We need to calculate the balance as of TODAY.
    // However, MonthBlock calculates daily running balances internally.
    // We should probably lift that logic or approximate it here.
    // Or, pass a callback? No, lifting is better or re-calc.
    // Re-calc specific for "Today":
    // StartBal of Current Month + Transactions up to Today.
    const currentBalance = React.useMemo(() => {
        if (renderedData.length === 0) return 0;
        const currentMonthData = renderedData[0]; // Newest

        // This is strictly "Current Month" in view. 
        // If "Now" is in this month, use "Now".
        // If "Now" is in future relative to loaded data (impossible?), or past?
        // App loads current month first.

        const now = new Date();
        const todayStr = now.toISOString().slice(0, 10);
        // Actually, we want the balance "Right Now".
        // MonthBlock logic handles daily accumulation.
        // Let's implement a quick helper for "Balance at Date X"
        // StartBal + Txns in Month <= Date X + Overrides check.

        const { startBal, transactions, monthId } = currentMonthData;

        // Check overrides in this month up to today
        const overrides = appData.balanceOverrides || {};
        const overrideDates = Object.keys(overrides).filter(d => d.startsWith(monthId) && d <= todayStr).sort();
        const lastOverrideDate = overrideDates[overrideDates.length - 1]; // Latest override <= Today

        let runningBal = startBal;
        let scanStart = '0000-00-00'; // Inclusive scan for txns? StartBal is "before month".

        if (lastOverrideDate) {
            runningBal = overrides[lastOverrideDate];
            scanStart = lastOverrideDate; // We only sum txns AFTER this override? 
            // WAIT. Override sets the ENDING balance of that day.
            // So if we have an override for "Today", that IS the balance.
            // If we have override for "Yesterday", we add "Today's" txns.
        } else {
            // scanStart remains before month, effectively we add all txns from start of month
        }

        // Transactions to ADD (those after the override date, and <= today)
        // If no override, add all <= today.
        // If override at T-1, add T (today).
        // If override at T, add NONE (balance is set).

        const relevantTxns = transactions.filter(t => {
            // If override exists, date must be > override date
            // If no override, date must be >= month start (implied by transactions array)
            const afterOverride = lastOverrideDate ? t.date > lastOverrideDate : true;
            return afterOverride && t.date <= todayStr;
        });

        const netChange = relevantTxns.reduce((sum, t) => {
            const amt = t.amount || 0;
            const cat = (t.category || '').toLowerCase();
            return sum + (cat === 'salary' || cat === 'income' ? amt : -amt);
        }, 0);

        return runningBal + netChange;

    }, [renderedData, appData.balanceOverrides]);


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
