import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey as d3Sankey, sankeyLinkHorizontal } from 'd3-sankey';

const IncomeFlowChart = ({ data, selectedYear, setSelectedYear, yearOptions }) => {
    const svgRef = useRef(null);
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 1000, height: 450 });

    const colorMap = {
        'Gross Income': '#268bd2',
        'Net Income': '#2aa198',
        'Tax': '#b58900',
        'Total Savings': '#6c71c4',
        '401k': '#6c71c4',
        'Stock': '#2aa198',
        'Cash': '#268bd2',
        'Expenses': '#d33682',
        'Rent': '#d33682',
        'Car': '#de5599',
        'Cards': '#a92b61',
        'Other': '#e37dae',
        'cards': '#a92b61',
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

    useEffect(() => {
        if (!data.sankeyData || !svgRef.current) return;

        const { width, height } = dimensions;
        const svg = d3.select(svgRef.current);
        svg.selectAll('*').remove();

        const margin = { top: 40, right: 40, bottom: 40, left: 40 };

        // 1. Process Nodes and Links
        const nodesSet = new Set();
        data.sankeyData.forEach(d => {
            nodesSet.add(d.from);
            nodesSet.add(d.to);
        });
        const nodes = Array.from(nodesSet).map(name => ({ name }));
        const nodeIndex = new Map(nodes.map((d, i) => [d.name, i]));

        const links = data.sankeyData.map(d => ({
            source: nodeIndex.get(d.from),
            target: nodeIndex.get(d.to),
            value: d.flow,
            fromName: d.from,
            toName: d.to
        }));

        // 2. Initialize Sankey
        const sankey = d3Sankey()
            .nodeWidth(30)
            .nodePadding(40)
            .extent([[margin.left, margin.top], [width - margin.right, height - margin.bottom]]);

        let { nodes: sankeyNodes, links: sankeyLinks } = sankey({
            nodes: nodes.map(d => ({ ...d })),
            links: links.map(d => ({ ...d }))
        });

        // 3. Custom Position Overrides
        const colWidth = (width - margin.left - margin.right) / 3;

        sankeyNodes.forEach(node => {
            if (node.name === 'Gross Income') {
                node.x0 = margin.left;
                node.x1 = margin.left + 30;
            } else if (node.name === 'Tax' || node.name === 'Net Income') {
                node.x0 = margin.left + colWidth;
                node.x1 = margin.left + colWidth + 30;
            } else if (['Total Savings', 'Expenses', 'Cash Flow', 'Cash'].includes(node.name)) {
                node.x0 = margin.left + colWidth * 2;
                node.x1 = margin.left + colWidth * 2 + 30;
            } else {
                node.x0 = width - margin.right - 30;
                node.x1 = width - margin.right;
            }
        });

        sankey.update({ nodes: sankeyNodes, links: sankeyLinks });

        const defs = svg.append('defs');

        // 4. Render Links
        const link = svg.append('g')
            .attr('fill', 'none')
            .attr('stroke-opacity', 0.5)
            .selectAll('g')
            .data(sankeyLinks)
            .join('path')
            .attr('d', sankeyLinkHorizontal())
            .attr('stroke', d => {
                const gradientId = `gradient-${d.source.index}-${d.target.index}`;
                const gradient = defs.append('linearGradient')
                    .attr('id', gradientId)
                    .attr('gradientUnits', 'userSpaceOnUse')
                    .attr('x1', d.source.x1)
                    .attr('x2', d.target.x0);
                gradient.append('stop').attr('offset', '0%').attr('stop-color', colorMap[d.source.name] || '#586e75');
                gradient.append('stop').attr('offset', '100%').attr('stop-color', colorMap[d.target.name] || '#586e75');
                return `url(#${gradientId})`;
            })
            .attr('stroke-width', d => Math.max(1, d.width))
            .on('mouseenter', function () { d3.select(this).attr('stroke-opacity', 0.8); })
            .on('mouseleave', function () { d3.select(this).attr('stroke-opacity', 0.5); });

        // 5. Render Nodes
        const node = svg.append('g')
            .selectAll('g')
            .data(sankeyNodes)
            .join('g');

        node.append('rect')
            .attr('x', d => d.x0)
            .attr('y', d => d.y0)
            .attr('height', d => d.y1 - d.y0)
            .attr('width', d => d.x1 - d.x0)
            .attr('fill', d => colorMap[d.name] || '#839496')
            .attr('rx', 3)
            .append('title')
            .text(d => `${d.name}\n$${d.value.toLocaleString()}`);

        // 6. Render Labels (Two-line labels: Name and Percentage below)
        const textNodes = node.append('text')
            .attr('x', d => (d.x0 < width / 2 ? d.x1 + 12 : d.x0 - 12))
            .attr('y', d => (d.y0 + d.y1) / 2)
            .attr('text-anchor', d => (d.x0 < width / 2 ? 'start' : 'end'))
            .attr('fill', '#fdf6e3')
            .style('font-family', 'Outfit, sans-serif')
            .style('font-weight', 'bold')
            .style('font-size', '13px');

        textNodes.append('tspan')
            .attr('x', d => (d.x0 < width / 2 ? d.x1 + 12 : d.x0 - 12))
            .attr('dy', '-0.2em')
            .text(d => d.name);

        textNodes.append('tspan')
            .attr('x', d => (d.x0 < width / 2 ? d.x1 + 12 : d.x0 - 12))
            .attr('dy', '1.2em')
            .attr('fill-opacity', 0.8)
            .style('font-weight', 'normal')
            .style('font-size', '11px')
            .text(d => {
                const total = data.sankeyGross || 1;
                const pct = ((d.value / total) * 100).toFixed(0);
                return `(${pct}%)`;
            });

        link.append('title')
            .text(d => `${d.source.name} → ${d.target.name}\n$${d.value.toLocaleString()}`);

    }, [data, dimensions]);

    return (
        <div className="chart-card wide glow" style={{ overflow: 'hidden' }}>
            <div className="card-head">
                <h3>Income Flow ({selectedYear === 'All' ? 'All Time' : selectedYear})</h3>
                <div className="year-selector" style={{ display: 'flex', gap: '8px' }}>
                    {yearOptions && yearOptions.map((year) => (
                        <button
                            key={year}
                            onClick={() => setSelectedYear(year)}
                            style={{
                                background: selectedYear === year ? 'rgba(16, 185, 129, 0.3)' : 'rgba(253, 246, 227, 0.05)',
                                color: selectedYear === year ? '#10b981' : '#839496',
                                border: `1px solid ${selectedYear === year ? '#10b981' : 'rgba(131, 148, 150, 0.2)'}`,
                                borderRadius: '4px',
                                padding: '4px 12px',
                                fontSize: '13px',
                                cursor: 'pointer',
                                fontWeight: '600',
                                transition: 'all 0.2s ease'
                            }}
                        >
                            {year}
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

export default IncomeFlowChart;
