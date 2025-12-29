import React, { useState, useMemo } from 'react';
import { useFinance } from '../../../contexts/FinanceContext';
import { evaluateExpression } from '../../../utils/math';

// Icons
const IconChevronDown = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="6 9 12 15 18 9"></polyline>
    </svg>
);

const IconChevronRight = () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="9 18 15 12 9 6"></polyline>
    </svg>
);

const IconRefresh = () => (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 4v6h-6"></path>
        <path d="M1 20v-6h6"></path>
        <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
    </svg>
);





const DataCell = React.memo(({
    recordId, group, field, value, formula,
    isReadOnly, onUpdate, isSummary, colIndex
}) => {
    const [isEditing, setIsEditing] = useState(false);

    const displayValue = useMemo(() => {
        if (value === undefined || value === null) return '';
        return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
    }, [value]);

    const handleKey = (e) => {
        if (e.key === 'Enter') e.target.blur();
    };

    const handleBlur = (e) => {
        setIsEditing(false);
        const input = e.target.value.trim();

        if (!input) {
            onUpdate(recordId, group, field, 0, null);
            return;
        }

        // Implicit Formula Evaluation
        // We do NOT check for '=' prefix anymore.
        // We pass the raw input to evaluateExpression which handles sanitization.
        const result = evaluateExpression(input);

        // Validation: Only update if valid finite number
        if (!isNaN(result) && isFinite(result)) {
            // Determine if it was a formula or just a number
            // If input contains math operators, we store it as a formula.
            // also allow '=' for backward compatibility if user types it
            const isFormula = /[+\-*/]/.test(input) || input.startsWith('=');

            // If the user entered a simple number "100", isFormula is false -> formula cleared.
            // If "100+200", isFormula is true -> formula stored "100+200".
            onUpdate(recordId, group, field, result, isFormula ? input : null);
        } else {
            console.warn(`Invalid input: "${input}". Reverting.`);
            // Revert handled by React state (displayValue)
        }
    };

    if (isSummary) {
        return (
            <td className={`dc-cell summary col-${colIndex}`}>
                <div className="dc-cell-content">
                    {displayValue}
                </div>
            </td>
        );
    }

    if (isEditing && !isReadOnly) {
        return (
            <td className={`dc-cell editing col-${colIndex}`}>
                <input
                    autoFocus
                    type="text"
                    defaultValue={formula || value}
                    onBlur={handleBlur}
                    onKeyDown={handleKey}
                />
            </td>
        );
    }

    return (
        <td
            className={`dc-cell ${isReadOnly ? 'read-only' : ''} col-${colIndex}`}
            onClick={() => !isReadOnly && setIsEditing(true)}
            title={formula || ''}
        >
            <div className="dc-cell-content">
                {displayValue}
            </div>
        </td>
    );
});

const DataEntry = () => {
    const { appData, updateRecordValue, CategoryMap, syncRecord } = useFinance();

    // Default Expanded Years
    const [expandedYears, setExpandedYears] = useState(() => {
        const currentYear = new Date().getFullYear();
        return {
            [currentYear]: true,
            [currentYear + 1]: true
        };
    });

    // Column Group State
    const [groupState, setGroupState] = useState({
        income: true,
        taxes: true,    // New Group
        savings: true,
        expenses: true
    });

    const toggleYear = (y) => {
        setExpandedYears(prev => ({ ...prev, [y]: !prev[y] }));
    };

    const toggleGroup = (grp) => {
        setGroupState(prev => ({ ...prev, [grp]: !prev[grp] }));
    };

    const isFieldReadOnly = (recordId, group, field) => {
        if (recordId < '2026-01') return false;
        return Object.values(CategoryMap).some(target => target.group === group && target.field === field);
    };

    const yearsData = useMemo(() => {
        const groups = {};
        (appData.records || []).forEach(r => {
            const y = r.id.split('-')[0];
            if (!groups[y]) groups[y] = [];
            groups[y].push(r);
        });

        const sortedYears = Object.keys(groups).sort((a, b) => b - a);

        return sortedYears.map(year => {
            const records = groups[year].sort((a, b) => b.id.localeCompare(a.id));

            // Calculate totals for the YEAR (collapsed year view)
            const totals = {
                income: { gross: 0, tax: 0, net: 0, other: 0, _total: 0 },
                savings: { '401k': 0, stock: 0, _total: 0 },
                expenses: { rent: 0, car: 0, chase: 0, amex: 0, discover: 0, usbank: 0, other: 0, _total: 0 }
            };

            // Augment records with row-level totals for collapsed columns
            const augmentedRecords = records.map(r => {
                const get = (g, f) => (parseFloat(r[g]?.[f]) || 0);

                // Income Summary: Just Gross Salary (as requested)
                const incTotal = get('income', 'gross');

                const taxTotal = get('taxes', 'amount');
                const savTotal = get('savings', '401k') + get('savings', 'stock');
                const expTotal = get('expenses', 'rent') + get('expenses', 'car') + get('expenses', 'chase') +
                    get('expenses', 'amex') + get('expenses', 'discover') + get('expenses', 'usbank') + get('expenses', 'other');

                // Accumulate Year Totals
                totals.income.gross += get('income', 'gross');
                totals.income.tax += get('income', 'tax');
                totals.income.net += get('income', 'net');
                totals.income.other += get('income', 'other');
                totals.income._total += incTotal;

                // Removed legacy taxes accumulation

                totals.savings['401k'] += get('savings', '401k');
                totals.savings.stock += get('savings', 'stock');
                totals.savings._total += savTotal;

                totals.expenses.rent += get('expenses', 'rent');
                totals.expenses.car += get('expenses', 'car');
                totals.expenses.discover += get('expenses', 'discover');
                totals.expenses.amex += get('expenses', 'amex');
                totals.expenses.usbank += get('expenses', 'usbank');
                totals.expenses.chase += get('expenses', 'chase');
                totals.expenses.other += get('expenses', 'other');
                totals.expenses._total += expTotal;

                return {
                    ...r,
                    _derived: {
                        income: incTotal,
                        taxes: taxTotal,
                        savings: savTotal,
                        expenses: expTotal
                    }
                };
            });

            return { year, records: augmentedRecords, totals };
        });
    }, [appData.records]);

    return (
        <div className="data-entry-wrapper">
            <table className="dc-table">
                <colgroup>
                    <col style={{ width: '100px', minWidth: '100px' }} />
                    {groupState.income ? <><col /><col /><col /><col /></> : <col className="collapsed-col" />}
                    {groupState.savings ? <><col /><col /></> : <col className="collapsed-col" />}
                    {groupState.expenses ? <><col /><col /><col /><col /><col /><col /><col /></> : <col className="collapsed-col" />}
                </colgroup>
                <thead className="dc-thead">
                    {/* Group Header */}
                    <tr className="dc-header-row group">
                        <th className="sticky-corner"></th>

                        <th colSpan={groupState.income ? 4 : 1}
                            className="dc-group-th income cursor-pointer"
                            onClick={() => toggleGroup('income')}>
                            Income {groupState.income ? '[-]' : '[+]'}
                        </th>

                        <th colSpan={groupState.savings ? 2 : 1}
                            className="dc-group-th savings cursor-pointer"
                            onClick={() => toggleGroup('savings')}>
                            Savings {groupState.savings ? '[-]' : '[+]'}
                        </th>

                        <th colSpan={groupState.expenses ? 7 : 1}
                            className="dc-group-th expenses cursor-pointer"
                            onClick={() => toggleGroup('expenses')}>
                            Expenses {groupState.expenses ? '[-]' : '[+]'}
                        </th>
                    </tr>

                    {/* Field Header */}
                    <tr className="dc-header-row field">
                        <th className="sticky-col-month">Month</th>

                        {groupState.income ? (
                            <>
                                <th className="dc-th">Gross Salary</th>
                                <th className="dc-th">Tax</th>
                                <th className="dc-th">Net Salary</th>
                                <th className="dc-th">Other Inc</th>
                            </>
                        ) : <th className="dc-th">Total</th>}

                        {groupState.savings ? (
                            <>
                                <th className="dc-th">401k</th>
                                <th className="dc-th">Stock</th>
                            </>
                        ) : <th className="dc-th">Total</th>}

                        {groupState.expenses ? (
                            <>
                                <th className="dc-th">Rent</th>
                                <th className="dc-th">Car</th>
                                <th className="dc-th">Disc</th>
                                <th className="dc-th">Amex</th>
                                <th className="dc-th">USB</th>
                                <th className="dc-th">Chase</th>
                                <th className="dc-th">Other Exp</th>
                            </>
                        ) : <th className="dc-th">Total</th>}
                    </tr>
                </thead>
                <tbody className="dc-tbody">
                    {yearsData.map(({ year, records, totals }) => {
                        const isExpanded = expandedYears[year];
                        return (
                            <React.Fragment key={year}>
                                {/* Year Summary / Toggle Row */}
                                <tr className="dc-year-row" onClick={() => toggleYear(year)}>
                                    <td className="sticky-col-month year-toggle">
                                        {isExpanded ? <IconChevronDown /> : <IconChevronRight />}
                                        <span style={{ marginLeft: 8 }}>{year}</span>
                                    </td>

                                    {/* Income Group Summary */}
                                    {groupState.income ? (
                                        <>
                                            <DataCell isSummary value={totals.income.gross} />
                                            <DataCell isSummary value={totals.income.tax} />
                                            <DataCell isSummary value={totals.income.net} />
                                            <DataCell isSummary value={totals.income.other} />
                                        </>
                                    ) : (
                                        <DataCell isSummary value={totals.income._total} />
                                    )}

                                    {/* Savings Group Summary */}
                                    {groupState.savings ? (
                                        <>
                                            <DataCell isSummary value={totals.savings['401k']} />
                                            <DataCell isSummary value={totals.savings.stock} />
                                        </>
                                    ) : (
                                        <DataCell isSummary value={totals.savings._total} />
                                    )}

                                    {/* Expenses Group Summary */}
                                    {groupState.expenses ? (
                                        <>
                                            <DataCell isSummary value={totals.expenses.rent} />
                                            <DataCell isSummary value={totals.expenses.car} />
                                            <DataCell isSummary value={totals.expenses.discover} />
                                            <DataCell isSummary value={totals.expenses.amex} />
                                            <DataCell isSummary value={totals.expenses.usbank} />
                                            <DataCell isSummary value={totals.expenses.chase} />
                                            <DataCell isSummary value={totals.expenses.other} />
                                        </>
                                    ) : (
                                        <DataCell isSummary value={totals.expenses._total} />
                                    )}
                                </tr>

                                {/* Month Rows */}
                                {isExpanded && records.map((r) => {
                                    const [y, m] = r.id.split('-');
                                    const label = new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('default', { month: 'short' });

                                    return (
                                        <tr key={r.id} className="dc-data-row">
                                            <td className="sticky-col-month month-label group">
                                                {label}
                                                <button
                                                    className="dc-sync-btn"
                                                    title="Reset & Sync from Transactions"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        syncRecord(r.id);
                                                    }}
                                                >
                                                    <IconRefresh />
                                                </button>
                                            </td>

                                            {/* Income Row Data */}
                                            {groupState.income ? (
                                                <>
                                                    <DataCell recordId={r.id} group="income" field="gross" value={r.income?.gross} formula={r.income?.gross_expr} isReadOnly={isFieldReadOnly(r.id, 'income', 'gross')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="income" field="tax" value={r.income?.tax} formula={r.income?.tax_expr} isReadOnly={true /* Derived */} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="income" field="net" value={r.income?.net} formula={r.income?.net_expr} isReadOnly={isFieldReadOnly(r.id, 'income', 'net')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="income" field="other" value={r.income?.other} formula={r.income?.other_expr} isReadOnly={isFieldReadOnly(r.id, 'income', 'other')} onUpdate={updateRecordValue} />
                                                </>
                                            ) : (
                                                <DataCell isReadOnly value={r._derived.income} />
                                            )}

                                            {/* Savings Row Data */}
                                            {groupState.savings ? (
                                                <>
                                                    <DataCell recordId={r.id} group="savings" field="401k" value={r.savings?.['401k']} formula={r.savings?.['401k_expr']} isReadOnly={isFieldReadOnly(r.id, 'savings', '401k')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="savings" field="stock" value={r.savings?.stock} formula={r.savings?.stock_expr} isReadOnly={isFieldReadOnly(r.id, 'savings', 'stock')} onUpdate={updateRecordValue} />
                                                </>
                                            ) : (
                                                <DataCell isReadOnly value={r._derived.savings} />
                                            )}

                                            {/* Expenses Row Data */}
                                            {groupState.expenses ? (
                                                <>
                                                    <DataCell recordId={r.id} group="expenses" field="rent" value={r.expenses?.rent} formula={r.expenses?.rent_expr} isReadOnly={isFieldReadOnly(r.id, 'expenses', 'rent')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="expenses" field="car" value={r.expenses?.car} formula={r.expenses?.car_expr} isReadOnly={isFieldReadOnly(r.id, 'expenses', 'car')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="expenses" field="discover" value={r.expenses?.discover} formula={r.expenses?.discover_expr} isReadOnly={isFieldReadOnly(r.id, 'expenses', 'discover')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="expenses" field="amex" value={r.expenses?.amex} formula={r.expenses?.amex_expr} isReadOnly={isFieldReadOnly(r.id, 'expenses', 'amex')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="expenses" field="usbank" value={r.expenses?.usbank} formula={r.expenses?.usbank_expr} isReadOnly={isFieldReadOnly(r.id, 'expenses', 'usbank')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="expenses" field="chase" value={r.expenses?.chase} formula={r.expenses?.chase_expr} isReadOnly={isFieldReadOnly(r.id, 'expenses', 'chase')} onUpdate={updateRecordValue} />
                                                    <DataCell recordId={r.id} group="expenses" field="other" value={r.expenses?.other} formula={r.expenses?.other_expr} isReadOnly={isFieldReadOnly(r.id, 'expenses', 'other')} onUpdate={updateRecordValue} />
                                                </>
                                            ) : (
                                                <DataCell isReadOnly value={r._derived.expenses} />
                                            )}
                                        </tr>
                                    );
                                })}
                            </React.Fragment>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default DataEntry;
