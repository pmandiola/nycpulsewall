function TopicChart(id, dim, grp, width = 300, height = 600, onBrush) {

    const dimension = dim,
          group = grp;

    const margin = {top: 60, right: 10, bottom: 50, left: 10},
          bodyHeight = height -margin.top - margin.bottom,
          bodyWidth = width - margin.left - margin.right,
          categoryIndent = 10

    const container = d3.select(`#${id}`)
            .attr("width", width)
            .attr("height", height)

    const xScale = d3.scaleLinear()
            .range([0,bodyWidth])
            .domain([0,group.top(1)[0].value]),
          yScale = d3.scaleBand()
            .range([0, bodyHeight])
            .domain(group.top(10).map(a=>a.key))
            .padding(0.2)


    const body = container.append('g')
            .style("transform",
                `translate(${margin.left}px,${margin.top}px)`),
          bars_container = body.selectAll("rect")
            .data(group.top(10))

    // change color onclick
    var toggleColor = (function(){
       var currentColor = "#dce1e5";
        
        return function(){
            currentColor = currentColor == "#dce1e5" ? "#3182bd" : "#dce1e5";
            d3.select(this).style("fill", currentColor);
        }
    })();
        
    const bars = bars_container.enter().append('rect')
            .attr('height', yScale.bandwidth())
            .attr('y',(d)=>yScale(d.key))
            .attr('width',d=>xScale(d.value))
            .attr("fill", "#dce1e5")
            .on('mouseenter',function(d){
                d3.select(this)
                    .attr("fill", "#abceea")
            })
            .on('mouseleave',function(d){
                d3.select(this)
                    .attr("fill", "#dce1e5")
            })
            .on('click',function(d){
                dimension.filter(d.key)
                d3.select(this)
                  .attr('fill',toggleColor)
            })

            .on('dblclick',function(d){
                dimension.filterAll()
                d3.selectAll()
                  .attr('fill','#dce1e5')
                d3.select(this)
                  .attr('fill',toggleColor)
            })

    
    const texts = bars_container.enter().append('text')
        .text(d=>d.key)
        .attr('y',(d)=>yScale(d.key))
        .attr('dy','1.25em')
        .attr('fill','black')

    const xAxis = d3.axisBottom(xScale).ticks(5)
    const yAxis = d3.axisLeft(yScale) // Create axis on the left for the Yscale

    const xAxisView = body.append('g')
                    .style("transform",
                        `translate($(${margin.left}px,${height-margin.bottom}px)`)
                    .attr("transform", "translate(0," + bodyHeight + ")");
    // do not need yAxisView for now
    // const yAxisView = body
    //                     .append('g')
    //                     .style("transform",
    //                     `translate($(${margin.left}px,${margin.top}px)`)

    //yAxisView.call(yAxis)
    xAxisView.call(xAxis)


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

                //update the onBrush(null) to remove filter effect
                if (d3.event.selection){
                    var s = d3.event.selection.map(xScale.invert, xScale);
                    onBrush(s);                   
                }else{
                    dimension.filterAll();
                }
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
            xScale.domain([0,group.top(1)[0].value])
            yScale.domain(group.top(10).map(a=>a.key))

            bars.data(group.top(10))
                .attr('height', yScale.bandwidth())
                .attr('y',(d)=>yScale(d.key))
                .attr('width',d=>xScale(d.value))

            texts.data(group.top(10))
                .text(d=>d.key)
                .attr('y',(d)=>yScale(d.key))

            xAxisView.call(xAxis);
            //yAxisView.call(yAxis);
            prevInfo = data;

            if (brushG && selection) {
                brushG.call(brush.move, selection.map(xScale, xScale));
            }
        }
    }
    //Repeat every 5 seconds

    return update;
}

