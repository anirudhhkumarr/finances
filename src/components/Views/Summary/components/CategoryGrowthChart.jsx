import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';

const CategoryGrowthChart = ({ data }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 800, height: 450 });

    const colors = {
        'Net Income': '#268bd2',
        'Savings': '#2aa198',
        'Tax': '#b58900',
        'Rent': '#d33682',
        'Other Exp.': '#dc322f'
    };

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

    const formattedData = useMemo(() => {
        return data.years.map((year, i) => {
            const m = data.metrics[i];
            return {
                year,
                'Net Income': m.growth,
                'Savings': m.savingsGrowth,
                'Tax': m.taxGrowth,
                'Rent': m.rentGrowth,
                'Other Exp.': m.nonRentGrowth
            };
        });
    }, [data]);

    useEffect(() => {
        if (!svgRef.current) return;

        const { width, height } = dimensions;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 30, right: 30, bottom: 100, left: 70 };
        const seriesNames = Object.keys(colors);

        const x = d3.scalePoint()
            .domain(data.years)
            .range([margin.left, width - margin.right]);

        const y = d3.scaleLinear()
            .domain([
                d3.min(formattedData, d => d3.min(seriesNames, k => d[k])) * 1.1,
                d3.max(formattedData, d => d3.max(seriesNames, k => d[k])) * 1.1
            ])
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

        // Lines
        seriesNames.forEach(name => {
            const line = d3.line()
                .x(d => x(d.year))
                .y(d => y(d[name]))
                .curve(d3.curveMonotoneX);

            svg.append('path')
                .datum(formattedData)
                .attr('fill', 'none')
                .attr('stroke', colors[name])
                .attr('stroke-width', 3)
                .attr('d', line);

            svg.append('g')
                .selectAll('circle')
                .data(formattedData)
                .join('circle')
                .attr('cx', d => x(d.year))
                .attr('cy', d => y(d[name]))
                .attr('r', 6)
                .attr('fill', colors[name])
                .append('title')
                .text(d => `${name} (${d.year}): ${d[name].toFixed(1)}%`);
        });

        // Legend at Bottom (Responsive Grid: 4 col desktop, 3 col mobile)
        const legend = svg.append('g')
            .attr('transform', `translate(${margin.left}, ${height - margin.bottom + 50})`);

        const isMobile = width < 600;
        const numCols = isMobile ? 3 : 4;
        const wrapWidth = width - margin.left - margin.right;
        const colWidth = wrapWidth / numCols;

        seriesNames.forEach((name, i) => {
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

    }, [formattedData, dimensions]);

    return (
        <div className="chart-card">
            <div className="card-head">
                <h3>Category Growth Trends</h3>
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

export default CategoryGrowthChart;
