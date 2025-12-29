import React, { createContext, useContext, useState, useEffect } from 'react';
import { migrateLegacyData } from '../utils/migration';

const FinanceContext = createContext();

const DATA_KEY = 'financeAppData';

const defaultData = {
    records: [],
    transactions: [], // { id, date, category, amount, desc }
    planning: { currentBalance: 0, futureExpenses: [] },
    balanceOverrides: {} // Map 'YYYY-MM' -> Amount
};

export const FinanceProvider = ({ children }) => {
    const [appData, setAppData] = useState(() => {
        const stored = localStorage.getItem(DATA_KEY);
        // Ensure balanceOverrides exists
        const data = stored ? JSON.parse(stored) : defaultData;
        if (!data.balanceOverrides) data.balanceOverrides = {};
        return data;
    });

    // Save on change
    useEffect(() => {
        localStorage.setItem(DATA_KEY, JSON.stringify(appData));
    }, [appData]);

    // Expose Migration Tool
    useEffect(() => {
        window.migrateData = () => {
            const { records, transactions } = migrateLegacyData();
            setAppData(prev => ({
                ...prev,
                records: records,
                transactions: transactions
            }));
            console.log("Migration Complete: ", records.length, "records", transactions.length, "transactions");
        };

        // Auto-run for easy re-import (User requested)
        // setTimeout(() => window.migrateData(), 1000); 
    }, []);

    const saveTransaction = (dateStr, id, field, val) => {
        let value = val;
        if (field === 'amount') value = parseFloat(val);

        setAppData(prev => {
            let nextTxns = [...(prev.transactions || [])];

            if (!id) {
                // Create
                if (!value && value !== 0 && value !== '') return prev;
                if (field === 'category' && value === '') return prev;

                const newTxn = {
                    id: Date.now().toString(),
                    date: dateStr,
                    category: '',
                    amount: 0
                };
                newTxn[field] = value;
                nextTxns.push(newTxn);
            } else {
                // Update
                const idx = nextTxns.findIndex(t => t.id === id);
                if (idx !== -1) {
                    const txn = { ...nextTxns[idx], [field]: value };
                    // Delete if empty
                    if (!txn.category && !txn.amount && txn.amount !== 0) {
                        nextTxns.splice(idx, 1);
                    } else {
                        nextTxns[idx] = txn;
                    }
                }
            }

            const newData = { ...prev, transactions: nextTxns };

            // Sync logic (simplified syncMonth)
            const monthId = dateStr.slice(0, 7);
            const syncedData = syncMonth(newData, monthId);
            return syncedData;
        });
    };

    // Exact mapping from Balances Category -> Spreadsheet Column
    const CategoryMap = {
        'Salary': { group: 'income', field: 'net' },
        'Rent': { group: 'expenses', field: 'rent' },
        'Car': { group: 'expenses', field: 'car' },
        'Chase': { group: 'expenses', field: 'chase' },
        'Amex': { group: 'expenses', field: 'amex' },
        'Discover': { group: 'expenses', field: 'discover' },
        'US Bank': { group: 'expenses', field: 'usbank' },
        'PG&E': { group: 'expenses', field: 'rent' },
        'Invest': { group: 'savings', field: 'stock' },
        'Xfinity': { group: 'expenses', field: 'other' }
    };

    const updateRecordValue = (recordId, group, field, value, formula) => {
        setAppData(prev => {
            const nextRecords = [...(prev.records || [])];
            let recordIdx = nextRecords.findIndex(r => r.id === recordId);

            let record;
            if (recordIdx === -1) {
                // Determine Year for structure? Standard structure.
                record = {
                    id: recordId,
                    income: { gross: 0, net: 0, other: 0 },
                    expenses: { rent: 0, car: 0, chase: 0, amex: 0, discover: 0, usbank: 0, other: 0 },
                    savings: { tax: 0, '401k': 0, stock: 0 }
                };
                nextRecords.push(record);
                recordIdx = nextRecords.length - 1;
            } else {
                record = { ...nextRecords[recordIdx] };
            }

            if (!record[group]) record[group] = {};

            record[group][field] = parseFloat(value) || 0;

            // Handle Formula Storage
            if (formula) {
                record[group][field + '_expr'] = formula;
            } else {
                delete record[group][field + '_expr'];
            }

            // Recalc Derived derived fields
            // User Request: "tax is caclulated from groos and net salary and other income"
            // Assuming: Tax = Gross - Net - 401k (Basic equation)
            // If "Other" implies Other Income is part of the equation, we'd need clarification.
            // For now, let's derive Tax, so users can enter Gross & Net.
            if (group === 'income' || group === 'savings') {
                const gross = record.income?.gross || 0;
                const net = record.income?.net || 0;
                // const other = record.income?.other || 0; // Usage unknown for tax
                const k401 = record.savings?.['401k'] || 0;

                // Derived Tax: Gross - 401k - Net = Tax
                const derivedTax = gross - k401 - net;

                // Only update if positive? Or allow negative (refunds)? Allow all.
                if (record.savings) {
                    record.savings.tax = derivedTax;
                }
            }

            nextRecords[recordIdx] = record;
            return { ...prev, records: nextRecords };
        });
    };

    const syncMonth = (data, monthId) => {
        const monthTxns = data.transactions.filter(t => t.date.startsWith(monthId));
        let nextRecords = [...(data.records || [])];
        let recordIdx = nextRecords.findIndex(r => r.id === monthId);

        let record;
        if (recordIdx === -1) {
            record = {
                id: monthId,
                income: { gross: 0, net: 0, other: 0 },
                expenses: { rent: 0, car: 0, chase: 0, amex: 0, discover: 0, usbank: 0, other: 0 },
                savings: { tax: 0, '401k': 0, stock: 0 }
            };
            nextRecords.push(record);
            recordIdx = nextRecords.length - 1;
        } else {
            record = { ...nextRecords[recordIdx] };
            // Deep copy nested objects
            record.income = { ...record.income };
            record.expenses = { ...record.expenses };
            record.savings = { ...record.savings };
        }

        // 1. Reset mapped fields to 0 (we rebuild them from transactions)
        Object.values(CategoryMap).forEach(target => {
            if (!record[target.group]) record[target.group] = {};
            record[target.group][target.field] = 0;
        });
        if (record.expenses) record.expenses.other = 0;

        // 2. Accumulate
        monthTxns.forEach(txn => {
            const amt = txn.amount || 0;
            const cat = (txn.category || '').trim();

            // Find config by checking if category *contains* key (Legacy compliant-ish) or exact match
            let config = CategoryMap[cat];

            // Fallback: Check for substring match if needed? 
            if (!config) {
                const key = Object.keys(CategoryMap).find(k => cat.toLowerCase().includes(k.toLowerCase()));
                if (key) config = CategoryMap[key];
            }

            let targetGroup = 'expenses';
            let targetField = 'other';

            if (config) {
                targetGroup = config.group;
                targetField = config.field;
            }

            if (!record[targetGroup]) record[targetGroup] = {};

            // Add Magnitude? (Spreadsheet expenses usually positive)
            record[targetGroup][targetField] = (record[targetGroup][targetField] || 0) + Math.abs(amt);

            // Clear formula for synced fields to avoid confusion
            delete record[targetGroup][targetField + '_expr'];
        });

        // 3. Derived Updates
        const gross = record.income.gross || 0;
        const tax = record.savings.tax || 0;
        const k401 = record.savings['401k'] || 0;

        if (gross > 0) {
            record.income.net = gross - tax - k401;
        }

        nextRecords[recordIdx] = record;
        return { ...data, records: nextRecords };
    };

    const setBalanceOverride = (monthId, value) => {
        // Value might be string via input
        const numVal = value === '' ? NaN : parseFloat(value);

        setAppData(prev => {
            const overrides = { ...(prev.balanceOverrides || {}) };

            if (isNaN(numVal)) {
                delete overrides[monthId];
            } else {
                overrides[monthId] = numVal;
            }

            return { ...prev, balanceOverrides: overrides };
        });
    };

    return (
        <FinanceContext.Provider value={{ appData, setAppData, saveTransaction, updateRecordValue, CategoryMap, setBalanceOverride }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => useContext(FinanceContext);
