function BarChart2(id, dim, grp, width = 300, height = 600, onBrush) {
    const dimension = dim,
          data = grp.top(10);


    function getTopicChartConfig(){
        let width = 300;
        let height = 600;
        let margin = {top: 60, right: 10, bottom: 50, left: 10};
        let bodyHeight = height -margin.top - margin.bottom 
        let bodyWidth = width - margin.left - margin.right
        let categoryIndent = 10

        let container = d3.select('#topicView')
        container.attr("width", width)
                 .attr("height", height)

        return { width, height, margin, bodyHeight, bodyWidth, container, categoryIndent}

    }

    function getTopicChartScale(data,config){
        let { bodyWidth, bodyHeight } = config;
        let maximumCount = d3.max(data, d => d.value)
        ///let maximumCount = data[0].value

        console.log('1')



        let xScale = d3.scaleLinear()
            .range([0,bodyWidth])
            .domain([0,maximumCount])

        let yScale = d3.scaleBand()
            .range([0, bodyHeight])
            .domain(data.map(a=>a.key))
            .padding(0.2)
        console.log(data.map(a=>a.key))
        console.log(data.map(a=>a.value))
        return { xScale, yScale}
    }

    function drawBarsTopicChart(data,scales,config){
        let {margin, container} = config
        // this is equivalent to 'let maring = config.margin; let container = config.container'
        let {xScale, yScale} = scales

        let body = container.append('g')
                .style("transform",
                    `translate(${margin.left}px,${margin.top}px)`)
        let bars = body.selectAll("rect")
                .data(data)


        bars.enter().append('rect')
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
        bars.enter().append('text')
            .text(d=>d.key)
            .attr('y',(d)=>yScale(d.key))
            .attr('dy','1.25em')
            .attr('fill','black')


    }

    function drawAxesTopicChart(data, scales, config){
        let {xScale, yScale} = scales
        let {container, margin, height} = config
        let axisX = d3.axisBottom(xScale).ticks(5)

        container.append('g')
            .style("transform",
                `translate($(${margin.left}px,${height-margin.bottom}px)`)
            .call(axisX)

        let axisY = d3.axisLeft(yScale) // Create axis on the left for the Yscale

        container.append('g')
            .style("transform",
                `translate($(${margin.left}px,${margin.top}px)`)
            .call(axisY)

    }
    function drawTopicChart(data){
        let config = getTopicChartConfig();
        let scales = getTopicChartScale(data,config);
        drawBarsTopicChart(data,scales, config)
        ///drawAxesTopicChart(data,scales, config)

    }
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
    drawTopicChart(data);
    function update(data, selection) {
        if (prevInfo !== data) {
            yScale.domain([0, data[0].value]);

            bars.data(group.all());

            yAxisView.call(yAxis);
            prevInfo = data;

            if (brushG && selection) {
                brushG.call(brush.move, selection.map(xScale, xScale));
            }
        }
    }
    //Repeat every 5 seconds

    // next step will need to add rect shifting effect
    setInterval(function(){
        drawTopicChart(data);
    }, 3000);
}

