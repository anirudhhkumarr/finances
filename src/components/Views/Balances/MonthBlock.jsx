import React, { useState } from 'react';
import { useFinance } from '../../../contexts/FinanceContext';

const MonthBlock = ({ data }) => {
    const { appData, saveTransaction, setBalanceOverride } = useFinance();
    const { year, monthIndex, monthId, startBal, transactions } = data;
    const [hideEmpty, setHideEmpty] = useState(true); // Collapse empty rows by default

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthName = new Date(year, monthIndex, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Calculation Helper (Chronological then Reverse)
    const chronologicalRows = [];
    let runningBal = startBal;

    const recurringExpenses = {
        // Day -> Category mappings
        2: 'Rent',
        3: 'Invest',
        8: 'Chase',
        9: 'Discover',
        15: 'Salary',
        16: 'Invest',
        18: 'Amex',
        21: 'US Bank',
        27: 'PG&E',
        29: 'Xfinity',
        31: 'Salary'
    };

    const overrides = appData.balanceOverrides || {};

    for (let d = 1; d <= daysInMonth; d++) {
        const dStr = d.toString().padStart(2, '0');
        const dateStr = `${monthId}-${dStr}`;
        const dayTxns = transactions.filter(t => t.date === dateStr);

        let dailyNet = 0;
        dayTxns.forEach(t => {
            const amt = t.amount || 0;
            if (t.category?.toLowerCase() === 'salary') dailyNet += amt;
            else dailyNet -= amt;
        });

        // Apply transactions to running balance first
        runningBal += dailyNet;

        // Check for Override (Sets the ENDING balance for this day)
        const overrideVal = overrides[dateStr];
        let isOverride = false;
        if (overrideVal !== undefined && overrideVal !== null) {
            runningBal = overrideVal;
            isOverride = true;
        }

        if (dayTxns.length > 0) {
            dayTxns.forEach((txn, idx) => {
                // Show balance only on the last transaction of the day? 
                // Or repeat it? Usually balance is shown on the row.
                // If multiple txns, usually the last one shows the final daily balance.
                // But for simplicity/editing, maybe allow editing on any?
                // Let's attach the daily balance to all, but visually it might look repetitive.
                // Current UI: 1 row per txn. If multiple, we have multiple rows with same day.
                // It's cleaner if only the last row of the day shows the Daily Balance?
                // But "override by clicking on any date".
                // If I click on the first txn of the day and override, it overrides the DAY's balance.

                // Let's just output the same runningBal for all, as 'runningBal' is end-of-day in this loop logic.
                // NOTE: Real running balance fluctuates *during* the day.
                // BUT my loop calculates `runningBal += dailyNet` (bulk).
                // So I am displaying "End of Day Balance" on every transaction row for that day.
                // This implies "After all transactions today, balance is X".

                chronologicalRows.push({
                    dateStr,
                    dayNum: d,
                    balance: runningBal,
                    txn,
                    isFirst: false,
                    isOverride
                });
            });
        } else {
            chronologicalRows.push({
                dateStr,
                dayNum: d,
                balance: runningBal,
                txn: null,
                autoCategory: recurringExpenses[d] || '',
                isFirst: true,
                isOverride
            });
        }
    }

    // Now Reverse for Display (Newest Top)
    const displayRows = [...chronologicalRows].reverse();

    const processedRows = [];
    let lastDate = null;
    displayRows.forEach(row => {
        const showDay = row.dateStr !== lastDate;
        processedRows.push({ ...row, showDay });
        lastDate = row.dateStr;
    });

    const handleBlur = (dateStr, id, field, val, autoCategory) => {
        saveTransaction(dateStr, id, field, val, { category: autoCategory });
    };

    const handleBalanceBlur = (dateStr, val) => {
        setBalanceOverride(dateStr, val);
    };

    // Calculate Month End Balance (Most recent running bal) for Summary
    // Since we reversed, it's the first row's balance?
    // Yes, displayRows[0].balance is the balance of the last day (or last processed day).
    const currentMonthBalance = displayRows.length > 0 ? displayRows[0].balance : startBal;

    // Filter rows if hideEmpty is true
    const visibleRows = hideEmpty
        ? processedRows.filter(row => row.txn || row.autoCategory)
        : processedRows;

    return (
        <div className="month-section">
            <div className="sticky-month-header seamless">
                <span style={{ flex: 1 }}>{monthName}</span>
                <button
                    className="toggle-empty-btn"
                    onClick={() => setHideEmpty(!hideEmpty)}
                    title={hideEmpty ? "Show empty days" : "Hide empty days"}
                >
                    {hideEmpty ? 'Show All' : 'Compact'}
                </button>
            </div>
            <div className="month-grid seamless">
                {visibleRows.map((row) => {
                    const key = row.txn ? row.txn.id : `${row.dateStr}-empty`;
                    const dateObj = new Date(row.dateStr + 'T12:00:00');
                    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                    const category = (row.txn?.category || row.autoCategory || '').toLowerCase();
                    const amount = row.txn?.amount || 0;
                    const isNegativeAmount = amount < 0;
                    const isIncome = category === 'salary' || category === 'income' || isNegativeAmount;
                    const isInvest = category.includes('invest') || category.includes('stock') || category.includes('401k');

                    let typeClass = 'type-expense';
                    if (isIncome) typeClass = 'type-income';
                    if (isInvest) typeClass = 'type-invest';

                    return (
                        <div key={key} className={`balance-row ${row.txn ? 'active' : ''} ${!row.txn && row.autoCategory ? 'recurring' : ''} ${typeClass}`}>
                            <div className={`bal-day ${row.txn?.category ? 'highlight' : ''}`}>{row.showDay ? row.dayNum : ''}</div>
                            <div className="bal-weekday">{row.showDay ? weekday : ''}</div>

                            <input
                                type="text"
                                className={`bal-amt ${isNegativeAmount ? 'negative-refund' : ''}`}
                                placeholder=""
                                defaultValue={row.txn?.amount || ''}
                                onBlur={(e) => handleBlur(row.dateStr, row.txn?.id, 'amount', e.target.value, row.autoCategory)}
                            />

                            {/* Balance Cell - Now Editable */}
                            {/* Only show/edit on the first row for a given date (which is the last chrono row)? 
                                In 'processedRows' (reversed), the first row encountered for a date IS the last chronological transaction (End of Day).
                                So 'showDay' corresponds to the newest entry for that day.
                                We should probably only show the balance on that entry to avoid clutter?
                                Existing code showed it on every row. User said "running balance main summary".
                                Let's keep it on every row but maybe only editable on one?
                                Or editable on all => updates the same date override.
                            */}
                            <div className={`bal-balance-wrapper ${row.balance >= 0 ? 'positive' : 'negative'}`}>
                                <input
                                    key={`${key}-bal-${row.balance}`} // Force re-render on external update
                                    type="text"
                                    className={`bal-balance-input ${row.isOverride ? 'override' : ''}`}
                                    defaultValue={row.balance} // Display raw number for editing?
                                    // Ideally format with commas on blur, but for input type number/text...
                                    // Let's use text to allow formating but simplicity first.
                                    onBlur={(e) => handleBalanceBlur(row.dateStr, e.target.value)}
                                    title="Click to override daily ending balance"
                                />
                            </div>

                            <input
                                type="text"
                                className="bal-cat"
                                placeholder=""
                                defaultValue={row.txn?.category || row.autoCategory || ''}
                                onBlur={(e) => handleBlur(row.dateStr, row.txn?.id, 'category', e.target.value)}
                                list="category-list"
                            />
                        </div>
                    );
                })}
            </div>
            <datalist id="category-list">
                <option value="Salary" />
                <option value="Rent" />
                <option value="Car" />
                <option value="Chase" />
                <option value="Discover" />
                <option value="Amex" />
                <option value="US Bank" />
                <option value="Invest" />
            </datalist>
        </div>
    );
};

export default MonthBlock;
