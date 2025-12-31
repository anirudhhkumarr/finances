import React, { useState, useMemo } from 'react';
import { useFinance } from '../../../hooks/useFinance';
import { evaluateExpression } from '../../../utils/math';

const SpreadsheetCell = ({ recordId, group, field, value, formula, isReadOnly, onUpdate }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [inputValue, setInputValue] = useState('');

    const displayValue = (value === undefined || value === null) ? '' : value.toLocaleString();

    // Remove the useEffect that syncs input value when not editing.
    // Instead, we derive the value in the render logic below.

    const handleFocus = () => {
        if (isReadOnly) return;
        setIsEditing(true);
        setInputValue(formula || (value || '').toString());
    };

    const handleBlur = () => {
        if (isReadOnly) return;
        setIsEditing(false);

        const result = evaluateExpression(inputValue);
        const isFormula = inputValue.toString().match(/[=+\-*/]/);
        const formulaToSave = isFormula ? inputValue : null;

        onUpdate(recordId, group, field, result, formulaToSave);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') e.target.blur();
    };

    if (isReadOnly) {
        return (
            <td className="read-only-cell" title="Synced from Balances">
                <span className="synced-value">{displayValue}</span>
            </td>
        );
    }

    return (
        <td>
            <input
                className="cell-input"
                value={isEditing ? inputValue : (formula || displayValue)}
                onChange={(e) => setInputValue(e.target.value)}
                onFocus={handleFocus}
                onBlur={handleBlur}
                onKeyDown={handleKeyDown}
            />
        </td>
    );
};

const Spreadsheet = () => {
    const { appData, updateRecordValue, CategoryMap } = useFinance();
    const [expandedGroups, setExpandedGroups] = useState({ income: true, savings: true, expenses: false });
    const [expandedYears, setExpandedYears] = useState(new Set([new Date().getFullYear().toString()]));

    const toggleGroup = (group) => setExpandedGroups(prev => ({ ...prev, [group]: !prev[group] }));

    const toggleYear = (year) => {
        setExpandedYears(prev => {
            const next = new Set(prev);
            if (next.has(year)) next.delete(year);
            else next.add(year);
            return next;
        });
    };

    const yearGroups = useMemo(() => {
        const groups = {};
        const sorted = (appData.records || []).slice().sort((a, b) => b.id.localeCompare(a.id));

        sorted.forEach(r => {
            const year = r.id.split('-')[0];
            if (!groups[year]) groups[year] = [];
            groups[year].push(r);
        });

        return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
    }, [appData.records]);

    const isFieldReadOnly = (recordId, group, field) => {
        if (recordId < '2026-01') return false;
        return Object.values(CategoryMap).some(target => target.group === group && target.field === field);
    };

    const getMonthName = (id) => {
        const [y, m] = id.split('-');
        return new Date(parseInt(y), parseInt(m) - 1, 1).toLocaleString('default', { month: 'short' });
    };

    return (
        <div className="spreadsheet-container">
            <table id="spreadsheet-table">
                <thead>
                    <tr className="group-header-row">
                        <th className="sticky-col group-header"></th>
                        <th className="income-group group-header" colSpan={expandedGroups.income ? 3 : 1} onClick={() => toggleGroup('income')}>
                            Income <span className="toggle-indicator">{expandedGroups.income ? '[-]' : '[+]'}</span>
                        </th>
                        <th className="savings-group group-header" colSpan={expandedGroups.savings ? 3 : 1} onClick={() => toggleGroup('savings')}>
                            Savings <span className="toggle-indicator">{expandedGroups.savings ? '[-]' : '[+]'}</span>
                        </th>
                        <th className="expenses-group group-header" colSpan={expandedGroups.expenses ? 7 : 1} onClick={() => toggleGroup('expenses')}>
                            Expenses <span className="toggle-indicator">{expandedGroups.expenses ? '[-]' : '[+]'}</span>
                        </th>
                    </tr>
                    <tr>
                        <th className="sticky-col">Month</th>
                        {expandedGroups.income ? (<><th>Gross Salary</th><th>Net Salary</th><th>Other Income</th></>) : <th>Total Income</th>}
                        {expandedGroups.savings ? (<><th>Tax</th><th>401k</th><th>Stock</th></>) : <th>Total Savings</th>}
                        {expandedGroups.expenses ? (
                            <><th>Rent</th><th>Car</th><th>Discover</th><th>Amex</th><th>US Bank</th><th>Chase</th><th>Other</th></>
                        ) : <th>Total Expenses</th>}
                    </tr>
                </thead>
                <tbody>
                    {yearGroups.map(([year, records]) => {
                        const isExpanded = expandedYears.has(year);
                        const yearTotal = {
                            income: { gross: 0, net: 0, other: 0 },
                            savings: { tax: 0, '401k': 0, stock: 0 },
                            expenses: { rent: 0, car: 0, discover: 0, amex: 0, usbank: 0, chase: 0, other: 0 }
                        };

                        records.forEach(r => {
                            const add = (cat, f) => yearTotal[cat][f] += (r[cat]?.[f] || 0);
                            add('income', 'gross'); add('income', 'net'); add('income', 'other');
                            add('savings', 'tax'); add('savings', '401k'); add('savings', 'stock');
                            add('expenses', 'rent'); add('expenses', 'car'); add('expenses', 'discover');
                            add('expenses', 'amex'); add('expenses', 'usbank'); add('expenses', 'chase'); add('expenses', 'other');
                        });

                        return (
                            <React.Fragment key={year}>
                                <tr className={`year-summary-row ${!isExpanded ? 'collapsed' : ''}`} onClick={() => toggleYear(year)}>
                                    <td className="sticky-col year-cell">{year} <span className="year-toggle-icon">{isExpanded ? '▼' : '▶'}</span></td>
                                    {expandedGroups.income ? (
                                        <><td className="summary-cell">{yearTotal.income.gross.toLocaleString()}</td><td className="summary-cell">{yearTotal.income.net.toLocaleString()}</td><td className="summary-cell">{yearTotal.income.other.toLocaleString()}</td></>
                                    ) : <td className="summary-cell highlight-total">{(yearTotal.income.net + yearTotal.income.other).toLocaleString()}</td>}

                                    {expandedGroups.savings ? (
                                        <><td className="summary-cell">{yearTotal.savings.tax.toLocaleString()}</td><td className="summary-cell">{yearTotal.savings['401k'].toLocaleString()}</td><td className="summary-cell">{yearTotal.savings.stock.toLocaleString()}</td></>
                                    ) : <td className="summary-cell highlight-total">{(yearTotal.savings.tax + yearTotal.savings['401k'] + yearTotal.savings.stock).toLocaleString()}</td>}

                                    {expandedGroups.expenses ? (
                                        <><td className="summary-cell">{yearTotal.expenses.rent.toLocaleString()}</td><td className="summary-cell">{yearTotal.expenses.car.toLocaleString()}</td><td className="summary-cell">{yearTotal.expenses.discover.toLocaleString()}</td><td className="summary-cell">{yearTotal.expenses.amex.toLocaleString()}</td><td className="summary-cell">{yearTotal.expenses.usbank.toLocaleString()}</td><td className="summary-cell">{yearTotal.expenses.chase.toLocaleString()}</td><td className="summary-cell">{yearTotal.expenses.other.toLocaleString()}</td></>
                                    ) : <td className="summary-cell highlight-total">{Object.values(yearTotal.expenses).reduce((a, b) => a + b, 0).toLocaleString()}</td>}
                                </tr>

                                {isExpanded && records.map(r => {
                                    const renderCell = (group, field) => (
                                        <SpreadsheetCell key={`${r.id}-${group}-${field}`} recordId={r.id} group={group} field={field} value={r[group]?.[field]} formula={r[group]?.[field + '_expr']} isReadOnly={isFieldReadOnly(r.id, group, field)} onUpdate={updateRecordValue} />
                                    );

                                    return (
                                        <tr key={r.id}>
                                            <td className="sticky-col">{getMonthName(r.id)}</td>
                                            {expandedGroups.income ? <>{renderCell('income', 'gross')}{renderCell('income', 'net')}{renderCell('income', 'other')}</> : <td className="summary-cell">{((r.income?.net || 0) + (r.income?.other || 0)).toLocaleString()}</td>}
                                            {expandedGroups.savings ? <>{renderCell('savings', 'tax')}{renderCell('savings', '401k')}{renderCell('savings', 'stock')}</> : <td className="summary-cell">{((r.savings?.tax || 0) + (r.savings?.['401k'] || 0) + (r.savings?.stock || 0)).toLocaleString()}</td>}
                                            {expandedGroups.expenses ? <>{['rent', 'car', 'discover', 'amex', 'usbank', 'chase', 'other'].map(f => renderCell('expenses', f))}</> : <td className="summary-cell">{Object.values(r.expenses || {}).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0).toLocaleString()}</td>}
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

export default Spreadsheet;
