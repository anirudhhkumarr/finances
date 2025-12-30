import React, { createContext, useContext, useState, useEffect } from 'react';
import { fillDataGaps, generateMonthRecord } from '../utils/dataGapFiller';
import { CategoryMap } from '../utils/categoryConfig';
import { encryptBackup, decryptBackup } from '../utils/crypto';

const FinanceContext = createContext();

const DATA_KEY = 'financeAppData';

const defaultData = {
    records: [],
    transactions: [], // { id, date, category, amount, desc }
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

    // Password Modal State
    const [passwordRequest, setPasswordRequest] = useState(null); // { mode: 'export'|'import', onConfirm: (pass) => void, onCancel: () => void }

    // Export Data (Encrypted Backup)
    const exportData = () => {
        setPasswordRequest({
            mode: 'export',
            onConfirm: async (password) => {
                setPasswordRequest(null);
                try {
                    let payload;
                    if (!password) {
                        payload = JSON.stringify(appData, null, 2);
                    } else {
                        const encrypted = await encryptBackup(appData, password);
                        payload = JSON.stringify(encrypted);
                    }

                    let filename = `finance_backup.json`;
                    // Fallback: Standard Download Link
                    const blob = new Blob([payload], { type: "application/octet-stream" });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement("a");
                    link.href = url;
                    link.download = filename;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                } catch (e) {
                    alert("Export Failed: " + e.message);
                }
            },
            onCancel: () => setPasswordRequest(null)
        });
    };

    // Import Data (Restore)
    const importData = (file) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const json = JSON.parse(e.target.result);

                // Detect Encrypted Format
                if (json.v === 1 && json.salt && json.iv && json.data) {
                    // Trigger Password Modal
                    setPasswordRequest({
                        mode: 'import',
                        onConfirm: async (password) => {
                            setPasswordRequest(null);
                            if (!password) return; // Cannot decrypt without password
                            try {
                                const restoredData = await decryptBackup(json, password);
                                if (restoredData && restoredData.records) {
                                    setAppData(restoredData);
                                    alert("Data Restored Successfully!");
                                } else {
                                    alert("Invalid Backup Structure");
                                }
                            } catch (err) {
                                alert("Failed: Incorrect Password or File Corrupt");
                            }
                        },
                        onCancel: () => setPasswordRequest(null)
                    });
                } else {
                    // Plain JSON
                    if (json.records && Array.isArray(json.records)) {
                        setAppData(json);
                        alert("Data Restored Successfully!");
                    } else {
                        alert("Invalid Backup File");
                    }
                }
            } catch (err) {
                console.error("Import Failed", err);
                alert("Failed to parse backup file");
            }
        };
        reader.readAsText(file);
    };

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
                // Clear: Revert to System Calculation (Copy + Transactions)
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
            } else {
                // Explicit Value: Set Manual Override
                record[group][field] = parseFloat(value) || 0;

                // Mark as Manual so it sticks
                record._isAutoFilled = false;

                // Handle Formula
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

                // Derived Tax: Gross - 401k - Net
                const derivedTax = gross - k401 - net;

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

        // Regenerate the record using system logic (preferring current values over previous)
        const currentRecord = recordIdx !== -1 ? nextRecords[recordIdx] : null;
        const newRecord = generateMonthRecord(monthId, prevRecord, data.transactions || [], currentRecord);

        if (recordIdx === -1) {
            nextRecords.push(newRecord);
        } else {
            nextRecords[recordIdx] = newRecord;
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
            exportData,
            importData,
            passwordRequest, // State for Modal
            setPasswordRequest,
            syncRecord: (monthId) => setAppData(prev => syncMonth(prev, monthId)) // Wrapper to trigger state update
        }}>
            {children}
        </FinanceContext.Provider>
    );
};

export const useFinance = () => useContext(FinanceContext);

