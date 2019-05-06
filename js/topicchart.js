function TopicChart(id, dim, grp, width = 300, height = 600, n = 10) {

    const dimension = dim,
          group = grp,
          topN = n;
    
    let selected = null;

    const margin = {top: 10, right: 10, bottom: 20, left: 10},
          bodyHeight = height -margin.top - margin.bottom,
          bodyWidth = width - margin.left - margin.right

    const container = d3.select(`#${id}`)
            .attr("width", width)
            .attr("height", height)

    const xScale = d3.scaleLinear()
            .range([0,bodyWidth])
            .domain([0,group.top(1)[0].value]),
          yScale = d3.scaleBand()
            .range([0, bodyHeight])
            .domain(group.top(topN).map(a=>a.key))
            .padding(0.2)


    const body = container.append('g')
            .style("transform",
                `translate(${margin.left}px,${margin.top}px)`),

          bars_container = body.selectAll("g")
            .data(group.top(topN))
            .enter().append("g")
            .on('mouseenter',function(d){
                if (selected != d.key) {
                    d3.select(this).select('rect')
                    .attr("fill", "#abceea")
                }
            })
            .on('mouseleave',function(d){
                if (selected != d.key) {
                    d3.select(this).select('rect')
                    .attr("fill", "#dce1e5")
                }
            })
            .on('click',function(d){
                if (selected != d.key && d.value) {
                    selected = d.key
                    dimension.filter(d.key)
                    bars_container.selectAll('rect')
                        .attr('fill','#dce1e5')
                    d3.select(this).select('rect')
                        .attr('fill',"#3182bd")
                }
                else if (d.value) {
                    selected = null
                    dimension.filter(null)
                    d3.select(this).select('rect')
                        .attr("fill", "#dce1e5")
                }
            })
        
    const bars = bars_container.append('rect')
            .attr('height', yScale.bandwidth())
            .attr('y',(d)=>yScale(d.key))
            .attr('width',d=>xScale(d.value))
            .attr("fill", "#dce1e5")

    const texts = bars_container.append('text')
        .text(d=>d.key)
        .attr('y',d => yScale(d.key)+yScale.bandwidth()/2)
        .attr('x', 5)
        .attr('fill',d => d.value ? 'black': 'white')
        .attr('alignment-baseline', 'central')

    const xAxis = d3.axisBottom(xScale).ticks(5)

    const xAxisView = body.append('g')
                    .style("transform",
                        `translate($(${margin.left}px,${height-margin.bottom}px)`)
                    .attr("transform", "translate(0," + bodyHeight + ")");
    xAxisView.call(xAxis)

    /**
     *  Update Function
     */
    let prevInfo = undefined;
    function update(data) {
        if (prevInfo !== data) {
            xScale.domain([0,Math.max(group.top(1)[0].value, 5)])
            yScale.domain(group.top(topN).map(a=>a.key))

            bars_container.data(group.top(topN))

            bars.data(group.top(topN))
                .attr('height', yScale.bandwidth())
                .attr('y',d => yScale(d.key))
                .attr('width',d => xScale(d.value))
                .attr("fill", d=> selected == d.key ? "#3182bd" : "#dce1e5")

            texts.data(group.top(topN))
                .text(d => d.key)
                .attr('y',(d)=>yScale(d.key)+yScale.bandwidth()/2)
                .attr('fill',d => d.value ? 'black': 'white')

            xAxisView.call(xAxis);
            prevInfo = data;
        }
    }

    return update;
}

