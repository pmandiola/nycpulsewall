/**
 * Adapted from http://bl.ocks.org/joews/9697914
 */
function WordCloud(id, dim, grp, width = 300, height = 300, n = 20) {

    /**
     *  Data
     */
    const dimension = dim,
          group = grp;

    var fill = d3.scaleOrdinal(d3.schemeCategory10);

    /**
     *  Config
     */
    const margin = { top: 20, right: 20, bottom: 20, left: 20 },
          innerHeight = height - margin.top - margin.bottom,
          innerWidth = width - margin.left - margin.right;

    /**
     *  Scales, transformers
     */
    const fontScale = d3.scaleLinear().range([30, 80])
                                      .domain([group.top(n)[n - 1].value, group.top(1)[0].value])

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
        .attr("transform", "translate(" + width/2 + "," + height/2 + ")")
        


    //Draw the word cloud
    function draw(words) {
        var cloud = body.selectAll("g text")
                        .data(words, function(d) { return d.text; })

        //Entering words
        cloud.enter()
            .append("text")
            .style("font-family", "Impact")
            .style("fill", function(d, i) { return fill(i); })
            .attr("text-anchor", "middle")
            .attr('font-size', 1)
            .text(function(d) { return d.text; })
            .transition()
            .duration(500)
            .style("font-size", function(d) { return d.size + "px"; })
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .style("fill-opacity", 1);

        //Entering and existing words
        cloud
            .transition()
            .duration(500)
            .style("font-size", function(d) { return d.size + "px"; })
            .attr("transform", function(d) {
                return "translate(" + [d.x, d.y] + ")rotate(" + d.rotate + ")";
            })
            .style("fill-opacity", 1);

        //Exiting words
        cloud.exit()
            .transition()
                .duration(500)
                .style('fill-opacity', 1e-6)
                .attr('font-size', 1)
                .remove();
    }


    /**
     *  Update Function
     */
    let prevInfo = undefined;

    function arraysEqual(arr1, arr2) {
        if(arr1 == null || arr2 == null)
            return false;
        if(arr1.length !== arr2.length)
            return false;
        for(var i = arr1.length; i--;) {
            if(arr1[i] !== arr2[i])
                return false;
        }
        
        return true;
    }

    function update() {
        data = group.top(n)

        
        if (!arraysEqual(data, prevInfo)) {
            prevInfo = data;

            fontScale.domain([data[data.length - 1].value, data[0].value]),

            words = data.map(function (d) {
                return {text: d.key, size: fontScale(d.value)}
               })

            d3.layout.cloud().size([height, width])
            .words(words)
            .padding(5)
            .rotate(function() { return ~~(Math.random() * 2) * 90; })
            .font("Impact")
            .fontSize(function(d) { return d.size })
            .on("end", draw)
            .start();
        }
    }
    update()

    return update;
}