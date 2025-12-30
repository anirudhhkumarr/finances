import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
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
        28: 'Xfinity',
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

        // Track what the balance WOULD be without any override for THIS specific day
        const autoBal = runningBal + dailyNet;

        // Update running balance for next day
        runningBal = autoBal;

        // Check for Override (Sets the ENDING balance for this day)
        const overrideVal = overrides[dateStr];
        let isOverride = false;
        if (overrideVal !== undefined && overrideVal !== null) {
            runningBal = overrideVal;
            isOverride = true;
        }

        if (dayTxns.length > 0) {
            dayTxns.forEach((txn, idx) => {
                chronologicalRows.push({
                    dateStr,
                    dayNum: d,
                    balance: runningBal,
                    autoBal: autoBal, // Store for comparison
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
                autoBal: autoBal, // Store for comparison
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

    const handleBalanceBlur = (dateStr, val, currentBalance, autoBal, isCurrentlyOverride) => {
        const inputVal = val.trim();

        // 1. If empty, clear the override
        if (inputVal === '') {
            setBalanceOverride(dateStr, '');
            return;
        }

        const numVal = parseFloat(inputVal);
        if (isNaN(numVal)) return;

        // 2. If it matches the calculated balance, clear the override
        // Using a small epsilon for float comparison though usually they are integers
        if (Math.abs(numVal - autoBal) < 0.01) {
            setBalanceOverride(dateStr, '');
            return;
        }

        // 3. If it changed from the current (potentially overridden) balance, update it
        if (Math.abs(numVal - currentBalance) > 0.01) {
            setBalanceOverride(dateStr, numVal);
        }
    };

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
                    {hideEmpty ? <Eye size={16} /> : <EyeOff size={16} />}
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
                            <div className={`bal-day ${(row.txn?.category || row.autoCategory) ? 'highlight' : ''}`}>{row.showDay ? row.dayNum : ''}</div>
                            <div className="bal-weekday">{row.showDay ? weekday : ''}</div>

                            <input
                                type="text"
                                inputMode="decimal"
                                className={`bal-amt ${isNegativeAmount ? 'negative-refund' : ''}`}
                                placeholder=""
                                defaultValue={row.txn?.amount || ''}
                                onBlur={(e) => handleBlur(row.dateStr, row.txn?.id, 'amount', e.target.value, row.autoCategory)}
                            />

                            <div className={`bal-balance-wrapper ${row.balance >= 0 ? 'positive' : 'negative'}`}>
                                <input
                                    key={`${key}-bal-${row.balance}`}
                                    type="text"
                                    inputMode="decimal"
                                    className={`bal-balance-input ${row.isOverride ? 'override' : ''}`}
                                    defaultValue={row.balance}
                                    onBlur={(e) => handleBalanceBlur(row.dateStr, e.target.value, row.balance, row.autoBal, row.isOverride)}
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
                <option value="PG&E" />
                <option value="Xfinity" />
                <option value="Invest" />
            </datalist>
        </div>
    );
};

export default MonthBlock;
