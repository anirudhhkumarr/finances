import { useMemo } from 'react';
import { useFinance } from '../../../../contexts/FinanceContext';

export const useAnnualData = (selectedYear) => {
    const { appData } = useFinance();

    return useMemo(() => {
        let records = appData.records || [];

        // 1. Filter Future Months (Strictly Past/Current)
        const now = new Date();
        const currentYearStr = now.getFullYear().toString();
        const currentMonthStr = (now.getMonth() + 1).toString().padStart(2, '0');
        const currentYm = `${currentYearStr}-${currentMonthStr}`;

        records = records.filter(r => {
            if (r.id > currentYm) return false;
            return true;
        });

        // Unique Years
        const yearsSet = new Set(records.map(r => r.id.split('-')[0]));
        const years = Array.from(yearsSet).sort();

        // computeMetrics helper
        const computeMetrics = (recs, label) => {
            const safeFloat = (val) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') return parseFloat(val.replace(/,/g, '')) || 0;
                return 0;
            };

            const gross = recs.reduce((s, r) => s + safeFloat(r.income?.gross) + safeFloat(r.income?.other), 0);
            const tax = recs.reduce((s, r) => s + safeFloat(r.income?.tax), 0);
            const net = recs.reduce((s, r) => s + safeFloat(r.income?.net) + safeFloat(r.income?.other), 0);

            // Savings Breakdown
            const savings401k = recs.reduce((s, r) => s + safeFloat(r.savings?.['401k']), 0);
            const savingsStock = recs.reduce((s, r) => s + safeFloat(r.savings?.stock), 0);
            const definedSavings = savings401k + savingsStock;

            // Expenses logic
            const distinctCats = ['rent', 'car', 'other'];
            const cardCats = ['chase', 'amex', 'discover', 'usbank'];

            const catTotals = {};
            let totalExpense = 0;

            distinctCats.forEach(c => {
                const catSum = recs.reduce((s, r) => s + safeFloat(r.expenses?.[c]), 0);
                catTotals[c] = catSum;
                totalExpense += catSum;
            });

            let cardsSum = 0;
            cardCats.forEach(c => {
                cardsSum += recs.reduce((s, r) => s + safeFloat(r.expenses?.[c]), 0);
            });
            catTotals['cards'] = cardsSum;
            totalExpense += cardsSum;

            const impliedSavings = net - totalExpense;
            const cashFlow = Math.max(0, impliedSavings - definedSavings);

            // Rates
            const taxRate = gross > 0 ? (tax / gross) * 100 : 0;
            const expenseRate = gross > 0 ? (totalExpense / gross) * 100 : 0;
            const savingsRate = gross > 0 ? (definedSavings / gross) * 100 : 0;

            return {
                year: label, gross, tax, net, expense: totalExpense,
                savings: definedSavings, savings401k, savingsStock, cashFlow,
                taxRate, expenseRate, savingsRate, catTotals
            };
        };

        // Base Metrics per Year
        const baseMetrics = years.map(year => {
            const yearRecords = records.filter(r => r.id.startsWith(year));
            return computeMetrics(yearRecords, year);
        });

        // Add Growth (2nd Pass)
        const annualMetrics = baseMetrics.map((item, index) => {
            const prev = baseMetrics[index - 1];
            const safeGrowth = (curr, old) => old > 0 ? ((curr - old) / old) * 100 : 0;

            const nonRent = item.expense - (item.catTotals.rent || 0);
            const prevNonRent = prev ? (prev.expense - (prev.catTotals.rent || 0)) : 0;

            return {
                ...item,
                growth: safeGrowth(item.net, prev?.net),
                taxGrowth: safeGrowth(item.tax, prev?.tax),
                savingsGrowth: safeGrowth(item.savings, prev?.savings),
                expenseGrowth: safeGrowth(item.expense, prev?.expense),
                rentGrowth: safeGrowth(item.catTotals.rent, prev?.catTotals?.rent),
                nonRentGrowth: safeGrowth(nonRent, prevNonRent),
                // Keep minimal required
            };
        });

        // Current Sankey Logic
        let sankeyMetrics = {};
        if (selectedYear === 'All') {
            sankeyMetrics = computeMetrics(records, 'All Time');
        } else {
            const yMetrics = annualMetrics.find(m => m.year === selectedYear);
            sankeyMetrics = yMetrics || computeMetrics([], selectedYear);
        }

        const sankeyData = [];
        if (sankeyMetrics.gross > 0) {
            // Tier 1
            sankeyData.push({ from: 'Gross Income', to: 'Tax', flow: sankeyMetrics.tax });
            sankeyData.push({ from: 'Gross Income', to: 'Net Income', flow: sankeyMetrics.net });

            // Tier 2
            if (sankeyMetrics.savings > 0) sankeyData.push({ from: 'Net Income', to: 'Total Savings', flow: sankeyMetrics.savings });
            if (sankeyMetrics.expense > 0) sankeyData.push({ from: 'Net Income', to: 'Expenses', flow: sankeyMetrics.expense });
            if (sankeyMetrics.cashFlow > 0) sankeyData.push({ from: 'Net Income', to: 'Cash Flow', flow: sankeyMetrics.cashFlow });

            // Tier 3a
            if (sankeyMetrics.savings401k > 0) sankeyData.push({ from: 'Total Savings', to: '401k', flow: sankeyMetrics.savings401k });
            if (sankeyMetrics.savingsStock > 0) sankeyData.push({ from: 'Total Savings', to: 'Stock', flow: sankeyMetrics.savingsStock });

            // Tier 3b
            Object.entries(sankeyMetrics.catTotals || {}).forEach(([cat, val]) => {
                if (val > 0) {
                    const label = cat === 'usbank' ? 'US Bank' : cat === 'amex' ? 'Amex' : cat.charAt(0).toUpperCase() + cat.slice(1);
                    sankeyData.push({ from: 'Expenses', to: label, flow: val });
                }
            });
        }

        // Insights
        const totalSavings = annualMetrics.reduce((s, y) => s + y.savings, 0);
        const avgSavingsRate = annualMetrics.reduce((s, y) => s + y.savingsRate, 0) / (annualMetrics.length || 1);
        const bestYear = annualMetrics.reduce((best, curr) => curr.savings > best.savings ? curr : best, { savings: -Infinity, year: '-' });

        return {
            years,
            metrics: annualMetrics,
            insights: { totalSavings, avgSavingsRate, bestYear },
            sankeyData,
            sankeyYear: sankeyMetrics.year,
            sankeyGross: sankeyMetrics.gross
        };
    }, [appData.records, selectedYear]);
};
