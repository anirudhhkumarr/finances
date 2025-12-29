import React, { createContext, useContext, useState, useEffect } from 'react';
import { migrateLegacyData } from '../utils/migration';
import { fillDataGaps, generateMonthRecord } from '../utils/dataGapFiller';
import { CategoryMap } from '../utils/categoryConfig';

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
        let data = stored ? JSON.parse(stored) : defaultData;

        // Auto-Fill Gaps on Load (User Requested)
        // Ensures full timeline from Jan 2020 -> Present exists immediately
        if (data.records) {
            data.records = fillDataGaps(data.records, data.transactions || []);
        }

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
            // Fill gaps starting from Jan 2020
            const filledRecords = fillDataGaps(records, transactions);

            setAppData(prev => ({
                ...prev,
                records: filledRecords,
                transactions: transactions
            }));
            console.log("Migration Complete: ", filledRecords.length, "records (inc. filled)", transactions.length, "transactions");
        };

        // Expose manual clear triggers
        window.clearData = () => {
            console.log("Clearing Data...");
            localStorage.removeItem('financeAppData');

            // Even on clear, we want the structure from 2020
            const filledRecords = fillDataGaps([], []);

            setAppData({ ...defaultData, records: filledRecords, transactions: [], balanceOverrides: {} });
            console.log("Data Cleared & Re-Initialized from 2020.");
        };

        // Auto-run for easy re-import (User requested)
        // setTimeout(() => window.migrateData(), 1000); 
    }, []);

    const saveTransaction = (dateStr, id, field, val, overrides = {}) => {
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
                    category: overrides.category || '',
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

    // CategoryMap imported from utils/categoryConfig


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

            if (!record[group]) record[group] = {};

            // Value Logic
            if (value === '' || value === null) {
                // User CLEARED the value -> Remove User Override -> Revert to System Calculation
                // Find previous month record for context
                const prevMonthDate = new Date(recordId + '-15'); // Middle of month safe
                prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
                const prevId = prevMonthDate.toISOString().slice(0, 7);
                const prevRecord = nextRecords.find(r => r.id === prevId);

                // Generate system prediction
                // Helper imported from dataGapFiller
                const systemRecord = generateMonthRecord(recordId, prevRecord, prev.transactions);

                // Restore only this field
                const systemValue = systemRecord[group]?.[field] || 0;
                const systemExpr = systemRecord[group]?.[field + '_expr'];

                record[group][field] = systemValue;
                if (systemExpr) record[group][field + '_expr'] = systemExpr;
                else delete record[group][field + '_expr'];

                // Note: We don't necessarily reset _isAutoFilled to true because other fields might still be manual.
                // But we have strictly adhered to "Clearing removes override".
            } else {
                // Explicit Value (incl 0) -> Manual Override
                record[group][field] = parseFloat(value) || 0;

                // Mark as Manual so it sticks
                record._isAutoFilled = false;

                // Handle Formula Storage
                if (formula) {
                    record[group][field + '_expr'] = formula;
                } else {
                    delete record[group][field + '_expr'];
                }
            }

            // Recalc Derived Tax
            // Tax = (Gross + Other) - 401k - Net
            if (group === 'income' || group === 'savings') {
                // Ensure we have copies of groups we access/mutate
                record.income = { ...(record.income || {}) };
                record.savings = { ...(record.savings || {}) };

                const gross = parseFloat(record.income.gross) || 0;
                const net = parseFloat(record.income.net) || 0;
                const other = parseFloat(record.income.other) || 0;
                const k401 = parseFloat(record.savings['401k']) || 0;

                // Derived Tax
                const derivedTax = (gross + other) - k401 - net;

                record.income.tax = derivedTax;
            }

            nextRecords[recordIdx] = record;
            return { ...prev, records: nextRecords };
        });
    };

    const syncMonth = (data, monthId) => {
        let nextRecords = [...(data.records || [])];
        const recordIdx = nextRecords.findIndex(r => r.id === monthId);

        // Find Previous Record for "Copy" Context
        const prevMonthDate = new Date(monthId + '-15');
        prevMonthDate.setMonth(prevMonthDate.getMonth() - 1);
        const prevId = prevMonthDate.toISOString().slice(0, 7);
        const prevRecord = nextRecords.find(r => r.id === prevId);

        // Regenerate the "System Ideal" record
        const newRecord = generateMonthRecord(monthId, prevRecord, data.transactions || []);

        // Ensure manual flag is cleared because "Sync/Refresh" means "Restore to System"
        // generateMonthRecord already sets _isAutoFilled: true

        if (recordIdx === -1) {
            nextRecords.push(newRecord);
        } else {
            // Preserve ID stability if needed, but safe to replace
            nextRecords[recordIdx] = newRecord;
        }

        // Trigger context update
        // Derived Tax is safe because generateMonthRecord constructs a valid object
        // But we should verify if we need to run "update derived tax" logic?
        // generateMonthRecord copies values. Tax calculation is derived on update.
        // It copies 'tax' from previous. 
        // If we want accurate tax based on the NEW values, we should re-run derived Tax.

        // Let's re-run derived Tax for consistency
        const record = nextRecords[recordIdx !== -1 ? recordIdx : nextRecords.length - 1];
        if (record.income && record.savings) {
            const gross = parseFloat(record.income.gross) || 0;
            const net = parseFloat(record.income.net) || 0;
            const other = parseFloat(record.income.other) || 0;
            const k401 = parseFloat(record.savings['401k']) || 0;
            record.income.tax = (gross + other) - k401 - net;
        }

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
        <FinanceContext.Provider value={{
            appData,
            saveTransaction,
            updateRecordValue,
            CategoryMap,
            setBalanceOverride,
            syncRecord: (monthId) => setAppData(prev => syncMonth(prev, monthId)) // Wrapper to trigger state update
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => useContext(FinanceContext);

