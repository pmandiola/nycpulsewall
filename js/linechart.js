function LineChart(id, title="Title", grp, width = 300, height = 300, onBrush, scale) {
    
    /**
     *  Data
     */
    const group = grp;

    /**
     *  Config
     */
    const margin = { top: 20, right: 20, bottom: 20, left: 40 },
          innerHeight = height - margin.top - margin.bottom,
          innerWidth = width - margin.left - margin.right;

    /**
     *  Scales, transformers
     */
    const xScale = scale.range([0, innerWidth])
                                 .domain([group.all()[0].key, group.all()[group.size()-1].key]),
          yScale = d3.scaleLinear().range([innerHeight, 0])
                                   .domain([0, group.top(1)[0].value]);

    const area = d3
        .area()
        .curve(d3.curveMonotoneX)
        .x(function(d) {
            return xScale(d.key);
        })
        .y0(innerHeight)
        .y1(function(d) {
            return yScale(d.value);
        });
    const xAxis = d3.axisBottom(xScale);
    const yAxis = d3.axisLeft(yScale).ticks(5);

    /**
     *  Create Elements
     */
    const svg = d3
        .select(`#${id}`)
        .attr("height", height)
        .attr("width", width);

    const body = svg
        .append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    const path = body.append("path")
        .datum(group.all())
        .attr("class", "area")
        .attr("d", area);

    const xAxisView = body
        .append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + innerHeight + ")");

    const yAxisView = body.append("g").attr("class", "axis axis--y");

    xAxisView.call(xAxis);
    yAxisView.call(yAxis);

    svg.append("text")
        .attr("x", margin.left + 10)             
        .attr("y", margin.top)
        .attr("text-anchor", "start")
        .attr('alignment-baseline', 'baseline')
        .style("font-size", "12px") 
        .style("font-weight", "bold")  
        .text(title);

    let brush = undefined;
    let brushG = undefined;
    if (onBrush) {
        brush = d3
            .brushX()
            .extent([[0, 0], [innerWidth, innerHeight]])
            .on("brush end", b => {
                if (!d3.event.sourceEvent) return;

                if (
                    d3.event.sourceEvent &&
                    d3.event.sourceEvent.type === "zoom"
                )
                    return; // ignore brush-by-zoom
                if (d3.event.selection) {

                    var s = d3.event.selection.map(xScale.invert, xScale);
                    onBrush(s);
                }
                else onBrush(null)
            });
        brushG = body
            .append("g")
            .attr("class", "brush")
            .call(brush);
    }

    /**
     *  Update Function
     */
    let prevInfo = undefined;

    function update(data, clear) {
        if (prevInfo !== data) {
            xScale.domain([group.all()[0].key, group.all()[group.size()-1].key])
            yScale.domain([0, Math.max(group.top(1)[0].value, 5)]);

            path.datum(group.all())
                .attr("d", area);

            xAxisView.call(xAxis);
            yAxisView.call(yAxis);
            prevInfo = data;

            if (brushG && clear) {
                brushG.call(brush.move, null);
            }
        }
    }

    return update;
}
