import { CategoryMap } from './categoryConfig';

export const generateMonthRecord = (monthId, prevRecord = null, transactions = [], currentRecord = null) => {
    // Helper to pick best value
    const pick = (group, field) => {
        // Current Record (if exists and valid)
        if (currentRecord && currentRecord[group]) {
            const val = currentRecord[group][field];
            if (val !== undefined && val !== null && val !== '') return { val: Number(val), expr: currentRecord[group][field + '_expr'] || null };
        }
        // Previous Record (Carry-over)
        if (prevRecord && prevRecord[group]) {
            const val = prevRecord[group][field];
            if (val !== undefined && val !== null && val !== '') return { val: Number(val), expr: prevRecord[group][field + '_expr'] || null };
        }
        return { val: 0, expr: null };
    };

    const incGross = pick('income', 'gross');
    const incNet = pick('income', 'net');
    const incOther = pick('income', 'other');
    const sav401k = pick('savings', '401k');
    const expRent = pick('expenses', 'rent');

    // Always Compute Tax (Gross - Net - 401k)
    // Do not copy from previous or preserve manual tax if it conflicts with formula
    const computedTax = incGross.val - incNet.val - sav401k.val;

    const newRecord = {
        id: monthId,
        month: monthId,
        _isAutoFilled: currentRecord ? (currentRecord._isAutoFilled ?? true) : true, // Preserve status if current exists
        income: {
            gross: incGross.val, gross_expr: incGross.expr,
            net: incNet.val, net_expr: incNet.expr,
            other: incOther.val, other_expr: incOther.expr,
            tax: computedTax, tax_expr: null // Tax is always derived, no partial expression
        },
        savings: {
            '401k': sav401k.val, '401k_expr': sav401k.expr,
            stock: 0
        },
        expenses: {
            rent: expRent.val, rent_expr: expRent.expr,
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
    let prevRecord = null; // Track previous record for carry-over

    let currentY = startYear;
    let currentM = startMonth;

    while (currentY < endYear || (currentY === endYear && currentM <= endMonth)) {
        const yStr = currentY.toString();
        const mStr = (currentM + 1).toString().padStart(2, '0');
        const id = `${yStr}-${mStr}`;

        let record = recordMap.get(id);

        if (record && !record._isAutoFilled) {
            // User Data: Preserve and use as context for next iteration
            filledRecords.push(record);
            prevRecord = record;
        } else {
            // Gap or Auto-Filled: Regenerate from System Logic
            // Pass 'record' as currentRecord to preserve any sticky values/overrides that exist on it
            const newRecord = generateMonthRecord(id, prevRecord, transactions, record);
            filledRecords.push(newRecord);
            prevRecord = newRecord;
        }

        currentM++;
        if (currentM > 11) { currentM = 0; currentY++; }
    }

    return filledRecords;
};
