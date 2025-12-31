import React, { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';

const colors = {
    'Savings Rate': '#2aa198',
    'Tax Rate': '#b58900',
    'Expense Rate': '#d33682'
};

const keys = ['Savings Rate', 'Tax Rate', 'Expense Rate'];

const IncomeAllocationChart = ({ data }) => {
    const [isAllocationStacked, setIsAllocationStacked] = useState(false);
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

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

    const formattedData = useMemo(() => {
        return data.years.map((year, i) => {
            const m = data.metrics[i];
            return {
                year,
                'Savings Rate': m.savingsRate,
                'Tax Rate': m.taxRate,
                'Expense Rate': m.expenseRate
            };
        });
    }, [data]);

    useEffect(() => {
        if (!svgRef.current) return;

        const { width, height } = dimensions;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 20, right: 30, bottom: 100, left: 70 };

        const x = d3.scalePoint()
            .domain(data.years)
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([0, isAllocationStacked ? 100 : d3.max(formattedData, d => d3.max(keys, k => d[k])) * 1.1])
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
            .call(d3.axisLeft(y).ticks(5).tickFormat(d => d + '%'))
            .attr('color', '#839496')
            .call(g => g.select('.domain').remove())
            .call(g => g.selectAll('.tick line').clone()
                .attr('x2', width - margin.left - margin.right)
                .attr('stroke-opacity', 0.1)
                .attr('stroke-dasharray', '5,5'))
            .selectAll('text')
            .style('font-family', 'Outfit, sans-serif')
            .style('font-size', '16px');

        if (isAllocationStacked) {
            const stack = d3.stack().keys(keys)(formattedData);
            const area = d3.area()
                .x(d => x(d.data.year))
                .y0(d => y(d[0]))
                .y1(d => y(d[1]))
                .curve(d3.curveMonotoneX);

            svg.append('g')
                .selectAll('path')
                .data(stack)
                .join('path')
                .attr('fill', d => colors[d.key])
                .attr('fill-opacity', 0.6)
                .attr('d', area)
                .append('title')
                .text(d => d.key);
        } else {
            keys.forEach(key => {
                const line = d3.line()
                    .x(d => x(d.year))
                    .y(d => y(d[key]))
                    .curve(d3.curveMonotoneX);

                svg.append('path')
                    .datum(formattedData)
                    .attr('fill', 'none')
                    .attr('stroke', colors[key])
                    .attr('stroke-width', 4)
                    .attr('d', line);

                svg.append('g')
                    .selectAll('circle')
                    .data(formattedData)
                    .join('circle')
                    .attr('cx', d => x(d.year))
                    .attr('cy', d => y(d[key]))
                    .attr('r', 6)
                    .attr('fill', colors[key])
                    .append('title')
                    .text(d => `${key}: ${d[key].toFixed(1)}%`);
            });
        }

        // Legend at Bottom (Responsive Grid: 4 col desktop, 3 col mobile)
        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${height - margin.bottom + 50})`);

        const isMobile = width < 600;
        const numCols = isMobile ? 3 : 4;
        const wrapWidth = width - margin.left - margin.right;
        const colWidth = wrapWidth / numCols;

        keys.forEach((name, i) => {
            const col = i % numCols;
            const rowIdx = Math.floor(i / numCols);

            const row = legend.append('g')
                .attr('transform', `translate(${col * colWidth}, ${rowIdx * 25})`);

            row.append('circle')
                .attr('r', 6)
                .attr('fill', colors[name]);

            row.append('text')
                .attr('x', 15)
                .attr('y', 5)
                .text(name)
                .attr('fill', '#839496')
                .style('font-size', '14px')
                .style('font-family', 'Outfit, sans-serif');
        });

    }, [formattedData, isAllocationStacked, dimensions, data.years]);

    return (
        <div className="chart-card">
            <div className="card-head">
                <h3>Income Allocation Trends</h3>
                <div className="view-selector" style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => setIsAllocationStacked(false)}
                        style={{
                            background: !isAllocationStacked ? 'rgba(38, 139, 210, 0.3)' : 'rgba(253, 246, 227, 0.05)',
                            color: !isAllocationStacked ? '#268bd2' : '#839496',
                            border: `1px solid ${!isAllocationStacked ? '#268bd2' : 'rgba(131, 148, 150, 0.2)'}`,
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Line View
                    </button>
                    <button
                        onClick={() => setIsAllocationStacked(true)}
                        style={{
                            background: isAllocationStacked ? 'rgba(38, 139, 210, 0.3)' : 'rgba(253, 246, 227, 0.05)',
                            color: isAllocationStacked ? '#268bd2' : '#839496',
                            border: `1px solid ${isAllocationStacked ? '#268bd2' : 'rgba(131, 148, 150, 0.2)'}`,
                            borderRadius: '4px',
                            padding: '4px 12px',
                            fontSize: '13px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Stacked View
                    </button>
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

export default IncomeAllocationChart;
