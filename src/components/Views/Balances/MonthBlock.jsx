import React from 'react';
import { useFinance } from '../../../contexts/FinanceContext';

const MonthBlock = ({ data }) => {
    const { saveTransaction, setBalanceOverride } = useFinance();
    const { year, monthIndex, monthId, startBal, transactions, isOverride } = data;

    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const monthName = new Date(year, monthIndex, 1).toLocaleString('default', { month: 'long', year: 'numeric' });

    // Local state for editing header
    const [isEditingStart, setIsEditingStart] = React.useState(false);
    const handleStartBlur = (e) => {
        setBalanceOverride(monthId, e.target.value);
        setIsEditingStart(false);
    };

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

    for (let d = 1; d <= daysInMonth; d++) {
        const dStr = d.toString().padStart(2, '0');
        const dateStr = `${monthId}-${dStr}`;
        const dayTxns = transactions.filter(t => t.date === dateStr);

        if (dayTxns.length > 0) {
            dayTxns.forEach((txn) => {
                const amt = txn.amount || 0;
                if (txn.category?.toLowerCase() === 'salary') runningBal += amt;
                else runningBal -= amt;

                chronologicalRows.push({
                    dateStr,
                    dayNum: d,
                    balance: runningBal,
                    txn,
                    isFirst: false
                });
            });
        } else {
            chronologicalRows.push({
                dateStr,
                dayNum: d,
                balance: runningBal,
                txn: null,
                autoCategory: recurringExpenses[d] || '',
                isFirst: true
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

    const handleBlur = (dateStr, id, field, val) => {
        saveTransaction(dateStr, id, field, val);
    };

    return (
        <div className="month-section">
            <div className="sticky-month-header seamless">
                <span>{monthName}</span>
                {isEditingStart ? (
                    <input
                        autoFocus
                        type="number"
                        className="month-stats-brief input-override"
                        defaultValue={startBal}
                        onBlur={handleStartBlur}
                        onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    />
                ) : (
                    <span
                        className={`month-stats-brief ${isOverride ? 'override-active' : ''}`}
                        onClick={() => setIsEditingStart(true)}
                        title="Click to correct/override start balance"
                        style={{ cursor: 'pointer', borderBottom: isOverride ? '1px dashed #4cd964' : 'none' }}
                    >
                        Start: ${startBal.toLocaleString()}
                    </span>
                )}
            </div>
            <div className="month-grid seamless">
                <div className="balance-row header">
                    <div className="bal-day">Date</div>
                    <div className="bal-weekday">Day</div>
                    <div className="bal-amt" style={{ textAlign: 'right' }}>Amount</div>
                    <div className="bal-balance">Balance</div>
                    <div className="bal-cat">Category</div>
                </div>

                {processedRows.map((row) => {
                    const key = row.txn ? row.txn.id : `${row.dateStr}-empty`;
                    const dateObj = new Date(row.dateStr + 'T12:00:00');
                    const weekday = dateObj.toLocaleDateString('en-US', { weekday: 'short' });

                    return (
                        <div key={key} className={`balance-row ${row.txn ? 'active' : ''} ${!row.txn && row.autoCategory ? 'recurring' : ''}`}>
                            <div className="bal-day">{row.showDay ? row.dayNum : ''}</div>
                            <div className="bal-weekday">{row.showDay ? weekday : ''}</div>

                            <input
                                type="number"
                                className="bal-amt"
                                placeholder=""
                                defaultValue={row.txn?.amount || ''}
                                onBlur={(e) => handleBlur(row.dateStr, row.txn?.id, 'amount', e.target.value)}
                            />

                            <div className={`bal-balance ${row.balance >= 0 ? 'positive' : 'negative'}`}>
                                {row.balance.toLocaleString()}
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
