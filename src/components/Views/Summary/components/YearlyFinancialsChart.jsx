import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { catColors, formatLabel } from './ChartConfig';

const breakdownLabels = ['All', 'Tax', 'Savings', 'Expenses'];
const keysMap = [
    ['Tax', '401k', 'Stock', 'Cash Flow', 'Rent', 'Car', 'Cards', 'Other'],
    ['Tax'],
    ['401k', 'Stock', 'Cash Flow'],
    ['Rent', 'Car', 'Cards', 'Other']
];

const colorMap = {
    'Tax': '#b58900',
    '401k': '#6c71c4',
    'Stock': '#2aa198',
    'Cash Flow': '#859900',
    'Rent': catColors.rent,
    'Car': catColors.car,
    'Cards': catColors.cards,
    'Other': catColors.other
};

const YearlyFinancialsChart = ({ data }) => {
    const [breakdownMode, setBreakdownMode] = useState(0);
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

    // Responsive Logic
    useEffect(() => {
        if (!containerRef.current) return;
        const resizeObserver = new ResizeObserver((entries) => {
            if (!entries || entries.length === 0) return;
            const { width } = entries[0].contentRect;
            setDimensions({ width, height: 450 });
        });
        resizeObserver.observe(containerRef.current);
        return () => resizeObserver.disconnect();
    }, []);

    // Prepare Data for D3 Stacking
    const stackedData = useMemo(() => {
        return data.years.map((year, i) => {
            const m = data.metrics[i];
            const d = { year };

            d.Tax = m.tax;
            d['401k'] = m.savings401k;
            d.Stock = m.savingsStock;
            d['Cash Flow'] = m.cashFlow;

            d.Rent = m.catTotals.rent || 0;
            d.Car = m.catTotals.car || 0;
            d.Cards = m.catTotals.cards || 0;
            d.Other = m.catTotals.other || 0;

            return d;
        });
    }, [data]);


    useEffect(() => {
        if (!svgRef.current) return;

        const { width, height } = dimensions;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 120, left: 70 };

        const activeKeys = keysMap[breakdownMode];
        const series = d3.stack().keys(activeKeys)(stackedData);

        const x = d3.scaleBand()
            .domain(data.years)
            .range([margin.left, width - margin.right])
            .padding(0.3);

        const yMax = d3.max(series, d => d3.max(d, d => d[1]));
        const y = d3.scaleLinear()
            .domain([0, yMax || 1])
            .nice()
            .range([height - margin.bottom, margin.top]);


        // Axes (Bigger Fonts)
        svg.append('g')
            .attr('transform', `translate(0,${height - margin.bottom})`)
            .call(d3.axisBottom(x).tickSizeOuter(0))
            .attr('color', '#839496')
            .selectAll('text')
            .style('font-family', 'Outfit, sans-serif')
            .style('font-size', '16px')
            .style('font-weight', '600');

        svg.append('g')
            .attr('transform', `translate(${margin.left},0)`)
            .call(d3.axisLeft(y).ticks(5, '$.0s'))
            .attr('color', '#839496')
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').clone()
                .attr('x2', width - margin.left - margin.right)
                .attr('stroke-opacity', 0.1)
                .attr('stroke-dasharray', '5,5'))
            .selectAll('text')
            .style('font-family', 'Outfit, sans-serif')
            .style('font-size', '16px');

        // Bars
        svg.append('g')
            .selectAll('g')
            .data(series)
            .join('g')
            .attr('fill', d => colorMap[d.key] || '#586e75')
            .selectAll('rect')
            .data(d => d)
            .join('rect')
            .attr('x', d => x(d.data.year))
            .attr('y', d => y(d[1]))
            .attr('height', d => y(d[0]) - y(d[1]))
            .attr('width', x.bandwidth())
            .attr('rx', 2)
            .append('title')
            .text(d => `${d.data.year}\n$${(d[1] - d[0]).toLocaleString()}`);

        // Legend at Bottom (Responsive Grid: 4 col desktop, 3 col mobile)
        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${height - margin.bottom + 50})`);

        const isMobile = width < 600;
        const numCols = isMobile ? 3 : 4;
        const wrapWidth = width - margin.left - margin.right;
        const colWidth = wrapWidth / numCols;

        activeKeys.forEach((name, i) => {
            const col = i % numCols;
            const rowIdx = Math.floor(i / numCols);

            const row = legend.append('g')
                .attr('transform', `translate(${col * colWidth}, ${rowIdx * 25})`);

            row.append('circle')
                .attr('r', 6)
                .attr('fill', colorMap[name]);

            row.append('text')
                .attr('x', 15)
                .attr('y', 5)
                .text(name === 'Tax' ? 'Tax' : formatLabel(name))
                .attr('fill', '#839496')
                .style('font-size', '14px')
                .style('font-family', 'Outfit, sans-serif');
        });

    }, [stackedData, breakdownMode, dimensions, data.years]);

    return (
        <div className="chart-card">
            <div className="card-head">
                <h3>Yearly Financials & Breakdown</h3>
                <div className="view-selector" style={{ display: 'flex', gap: '8px' }}>
                    {breakdownLabels.map((label, idx) => (
                        <button
                            key={label}
                            onClick={() => setBreakdownMode(idx)}
                            style={{
                                background: breakdownMode === idx ? 'rgba(38, 139, 210, 0.3)' : 'rgba(253, 246, 227, 0.05)',
                                color: breakdownMode === idx ? '#268bd2' : '#839496',
                                border: `1px solid ${breakdownMode === idx ? '#268bd2' : 'rgba(131, 148, 150, 0.2)'}`,
                                borderRadius: '4px',
                                padding: '4px 12px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {label}
                        </button>
                    ))}
                </div>
            </div>
            <div ref={containerRef} style={{ height: '450px', width: '100%' }}>
                <svg
                    ref={svgRef}
                    width={dimensions.width}
                    height={dimensions.height}
                    style={{ width: '100%', height: '100%', overflow: 'visible' }}
                />
            </div>
        </div>
    );
};

export default YearlyFinancialsChart;
