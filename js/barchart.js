function BarChart(id, dim, grp, width = 300, height = 300, onBrush) {
    
    /**
     *  Data
     */
    const dimension = dim,
          group = grp;

    /**
     *  Config
     */
    const margin = { top: 20, right: 20, bottom: 20, left: 40 },
          innerHeight = height - margin.top - margin.bottom,
          innerWidth = width - margin.left - margin.right;

    /**
     *  Scales, transformers
     */
    const xScale = d3.scaleLinear().range([0, innerWidth])
                                   .domain([-1, 1]),
          yScale = d3.scaleLinear().range([innerHeight, 0])
                                   .domain([0, group.top(2)[1].value]),
          cScale = d3.scaleLinear().range(['red','yellow','green'])
                                   .domain([-1,0,1])

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
    const xAxis = d3.axisBottom(xScale).ticks(7);
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
    const bars = body.selectAll("rect")
        .data(group.all())
        .enter().append("rect")
        .attr("height", d => innerHeight - yScale(d.value))
        .attr("y", d => yScale(d.value))
        .attr("x", (d) => xScale(d.key))
        .attr("width", innerWidth/group.size())
        .attr("fill", d => cScale(d.key))
    const xAxisView = body
        .append("g")
        .attr("class", "axis axis--x")
        .attr("transform", "translate(0," + innerHeight + ")");

    const yAxisView = body.append("g").attr("class", "axis axis--y");
    xAxisView.call(xAxis);
    yAxisView.call(yAxis);
    let brush = undefined;
    let brushG = undefined;
    if (onBrush) {
        brush = d3
            .brushX()
            .extent([[0, 0], [innerWidth, innerHeight]])
            .on("brush end", b => {
                if (
                    d3.event.sourceEvent &&
                    d3.event.sourceEvent.type === "zoom"
                )
                    return; // ignore brush-by-zoom
                var s = d3.event.selection.map(xScale.invert, xScale);
                onBrush(s);
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

    function update(data, selection) {
        if (prevInfo !== data) {
            yScale.domain([0, group.top(2)[1].value]);

            bars.data(group.all());

            yAxisView.call(yAxis);
            prevInfo = data;

            if (brushG && selection) {
                brushG.call(brush.move, selection.map(xScale, xScale));
            }
        }
    }
    return update;
}
