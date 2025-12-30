import React, { useState } from 'react';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    Title,
    Tooltip,
    Legend,
    Filler
} from 'chart.js';
import { SankeyController, Flow } from 'chartjs-chart-sankey';
import { useAnnualData } from './hooks/useAnnualData';
import IncomeFlowChart from './components/IncomeFlowChart';
import YearlyFinancialsChart from './components/YearlyFinancialsChart';
import IncomeAllocationChart from './components/IncomeAllocationChart';
import CategoryGrowthChart from './components/CategoryGrowthChart';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    BarElement,
    SankeyController,
    Flow,
    Title,
    Tooltip,
    Legend,
    Filler
);

const AnnualAnalytics = () => {
    const [selectedYear, setSelectedYear] = useState('2025');
    const annualData = useAnnualData(selectedYear);

    // Slider Setup
    const sliderOptions = [...annualData.years, 'All'];
    const sliderIndex = sliderOptions.indexOf(selectedYear) === -1 ? sliderOptions.length - 1 : sliderOptions.indexOf(selectedYear);

    const handleSliderChange = (e) => {
        const idx = parseInt(e.target.value);
        setSelectedYear(sliderOptions[idx]);
    };

    return (
        <div className="annual-dashboard">
            <div className="dash-header">
                <div>
                    <h1 className="title">Annual Ledger</h1>
                </div>
            </div>

            <div className="grid-layout">
                {/* 1. Sankey Flow (Latest Year) - Full Width */}
                <IncomeFlowChart
                    data={annualData}
                    selectedYear={selectedYear}
                    setSelectedYear={setSelectedYear}
                    yearOptions={sliderOptions}
                />

                {/* 2. The Annual Ledger (Detailed Stack) */}
                <YearlyFinancialsChart data={annualData} />

                {/* 3. Income Allocation Trends (Line) */}
                <IncomeAllocationChart data={annualData} />

                {/* 4. Category Growth Trends (Dedicated Line Chart) */}
                <CategoryGrowthChart data={annualData} />
            </div>
        </div>
    );
};

export default AnnualAnalytics;
