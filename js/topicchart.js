function TopicChart(id, title="Title", dim, grp, width = 300, height = 600, n = 10) {

    const dimension = dim,
          group = grp,
          topN = n;
    
    let selected = null;

    const margin = {top: 20, right: 20, bottom: 20, left: 20},
          bodyHeight = height - margin.top - margin.bottom,
          bodyWidth = width - margin.left - margin.right

    const svg = d3.select(`#${id}`)
            .attr("width", width)
            .attr("height", height)
            .on('click', function(){
                if (!d3.select(d3.event.target).classed('clickable') && selected){
                    selected = null
                    dimension.filter(null)
                    bars_container.selectAll('rect')
                        .attr('fill','#dce1e5')
                }
            })

    const xScale = d3.scaleLinear()
            .range([0,bodyWidth])
            .domain([0,group.top(1)[0].value]),
          yScale = d3.scaleBand()
            .range([0, bodyHeight])
            .domain(group.top(topN).map(a=>a.key))
            .padding(0.2)

    const body = svg.append('g')
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
        .classed('clickable', true)
        .attr('height', yScale.bandwidth())
        .attr('y',(d)=>yScale(d.key))
        .attr('width',d=>xScale(d.value))
        .attr("fill", "#dce1e5")

    const texts = bars_container.append('text')
        .classed('clickable', true)
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

    svg.append("text")
        .attr("x", margin.left)             
        .attr("y", margin.top/2)
        .attr("text-anchor", "start")
        .attr('alignment-baseline', 'middle')
        .style("font-size", "12px") 
        .style("font-weight", "bold")  
        .text(title);

    /**
     *  Update Function
     */
    let prevInfo = undefined;
    function update(data, clear) {
        if (prevInfo !== data) {
            if (clear) {
                selected = null;
            }

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

