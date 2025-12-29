import { CategoryMap } from './categoryConfig';

export const generateMonthRecord = (monthId, prevRecord = null, transactions = []) => {
    // 1. Base: Copy Previous or Defaults
    let lastValues = {
        income: { gross: 0, gross_expr: null, net: 0, net_expr: null, other: 0, other_expr: null, tax: 0, tax_expr: null },
        savings: { '401k': 0, '401k_expr': null },
        expenses: { rent: 0, rent_expr: null }
    };

    if (prevRecord) {
        lastValues = {
            income: {
                gross: Number(prevRecord.income?.gross) || 0,
                gross_expr: prevRecord.income?.gross_expr || null,
                net: Number(prevRecord.income?.net) || 0,
                net_expr: prevRecord.income?.net_expr || null,
                other: Number(prevRecord.income?.other) || 0,
                other_expr: prevRecord.income?.other_expr || null,
                tax: Number(prevRecord.income?.tax) || 0,
                tax_expr: prevRecord.income?.tax_expr || null
            },
            savings: {
                '401k': Number(prevRecord.savings?.['401k']) || 0,
                '401k_expr': prevRecord.savings?.['401k_expr'] || null
            },
            expenses: {
                rent: Number(prevRecord.expenses?.rent) || 0,
                rent_expr: prevRecord.expenses?.rent_expr || null
            }
        };
    }

    const newRecord = {
        id: monthId,
        month: monthId,
        _isAutoFilled: true,
        income: {
            gross: lastValues.income.gross,
            gross_expr: lastValues.income.gross_expr,
            net: lastValues.income.net,
            net_expr: lastValues.income.net_expr,
            other: lastValues.income.other,
            other_expr: lastValues.income.other_expr,
            tax: lastValues.income.tax,
            tax_expr: lastValues.income.tax_expr
        },
        savings: {
            '401k': lastValues.savings['401k'],
            '401k_expr': lastValues.savings['401k_expr'],
            stock: 0
        },
        expenses: {
            rent: lastValues.expenses.rent,
            rent_expr: lastValues.expenses.rent_expr,
            car: 0, discover: 0, amex: 0, usbank: 0, chase: 0, other: 0, others: 0
        }
    };

    // 2. Transaction Override
    const monthTxns = transactions.filter(t => t.date.startsWith(monthId));
    if (monthTxns.length > 0) {
        const overrides = {};
        const formulas = {};

        monthTxns.forEach(txn => {
            const amt = parseFloat(txn.amount) || 0;
            const cat = (txn.category || '').trim();

            let config = CategoryMap[cat];
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

            const fieldKey = `${targetGroup}_${targetField}`;
            if (!overrides[fieldKey]) overrides[fieldKey] = 0;
            if (!formulas[fieldKey]) formulas[fieldKey] = [];

            // Add amount directly (Transactions are source of truth for sign)
            overrides[fieldKey] += amt;
            formulas[fieldKey].push(amt);
        });

        Object.keys(overrides).forEach(key => {
            const [group, field] = key.split('_');
            if (newRecord[group]) {
                newRecord[group][field] = overrides[key];
                if (formulas[key].length > 0) {
                    newRecord[group][field + '_expr'] = formulas[key].join(' + ');
                }
            }
        });
    }

    return newRecord;
};

export const fillDataGaps = (existingRecords = [], transactions = []) => {
    // 1. Determine Range
    const startYear = 2020;
    const startMonth = 0; // Jan

    const now = new Date();
    if (now.getDate() > 25) now.setMonth(now.getMonth() + 1);
    const endYear = now.getFullYear();
    const endMonth = now.getMonth();

    const recordMap = new Map();
    existingRecords.forEach(r => recordMap.set(r.id, r));

    const filledRecords = [];
    let prevRecord = null; // Track literally the previous record object processed/created

    let currentY = startYear;
    let currentM = startMonth;

    while (currentY < endYear || (currentY === endYear && currentM <= endMonth)) {
        const yStr = currentY.toString();
        const mStr = (currentM + 1).toString().padStart(2, '0');
        const id = `${yStr}-${mStr}`;

        let record = recordMap.get(id);

        if (record && !record._isAutoFilled) {
            // User Data: Use it as truth, and it becomes the PrevRecord for next iteration
            filledRecords.push(record);
            prevRecord = record;
        } else {
            // Gap or Auto-Filled: Regenerate
            const newRecord = generateMonthRecord(id, prevRecord, transactions);

            // If we had a stale record, we might want to preserve non-overridden fields?
            // But logic says: "Override Hierarchy". System Calc is truth unless User explicitly overrode.
            // Since we established this is NOT a user record (!record || _isAutoFilled), regeneration is safe.
            filledRecords.push(newRecord);
            prevRecord = newRecord;
        }

        currentM++;
        if (currentM > 11) { currentM = 0; currentY++; }
    }

    return filledRecords;
};
