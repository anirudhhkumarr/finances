import { legacyData } from './legacyData';

export const migrateLegacyData = () => {
    const records = legacyData.records || [];
    // User requested NO synthetic transactions for Opening Balance.
    // They will manage start balance manually or via specific manual entry.
    const newTransactions = [];
    const newRecords = [];

    records.forEach(legacyRecord => {
        // 1. Create Spreadsheet Record (Preserve exactly)
        // We do deep copy to avoid reference issues
        const newRecord = JSON.parse(JSON.stringify(legacyRecord));

        // Move Tax to Income group
        if (!newRecord.income) newRecord.income = {};

        if (newRecord.savings && newRecord.savings.tax !== undefined) {
            newRecord.income.tax = newRecord.savings.tax;
            delete newRecord.savings.tax;
        } else {
            newRecord.income.tax = 0;
        }

        // Ensure other groups exist
        if (!newRecord.income) newRecord.income = {};
        if (!newRecord.savings) newRecord.savings = {};
        if (!newRecord.expenses) newRecord.expenses = {};

        newRecords.push(newRecord);
    });

    return {
        records: newRecords,
        transactions: newTransactions
    };
};
