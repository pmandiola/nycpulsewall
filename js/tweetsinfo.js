/**
 * Adapted from https://bl.ocks.org/mbostock/3808234
 */

 /// in progress
function TweetsInfo(id, title = "Title", tweets, width = 300, height = 300, n=10){

    const margin = {top: 20, right: 20, bottom: 20, left: 20},
          bodyHeight = height -margin.top - margin.bottom,
          bodyWidth = width - margin.left - margin.right

    const yScale = d3.scaleBand()
          .range([bodyHeight, 0])
          .domain(tweets.slice(-n).map(d => d.id_str))
          .padding(0.2)

	const svg = d3.select(`#${id}`)
						.attr("width",width)
						.attr("height",height),
        body = svg.append('g')
                .style("transform",`translate(${margin.left}px,${margin.top}px)`),

        texts = body.selectAll("text")
                .data(tweets.slice(-n))
                .enter().append("text")
                .style('fill-opacity',1)
                .attr('font-size', "14px")
                .attr("y", d => yScale(d.id_str) + yScale.bandwidth()/2)
                .attr('alignment-baseline', 'middle')
                .attr('x', 0)
                .text(d => d.text)
                .call(wrap, width)

    svg.append("text")
        .attr("x", margin.left)             
        .attr("y", margin.top/2)
        .attr("text-anchor", "start")
        .attr('alignment-baseline', 'middle')
        .style("font-size", "12px") 
        .style("font-weight", "bold")  
        .text(title);

    // https://bl.ocks.org/mbostock/7555321
    function wrap(text, width) {
        text.each(function() {
          var text = d3.select(this),
              words = text.text().split(/\s+/).reverse(),
              word,
              line = [],
              lineNumber = 0,
              lineHeight = 1.1, // ems
              y = text.attr("y"),
              dy = 0,
              tspan = text.text(null).append("tspan").attr("x", 0).attr("y", y).attr("dy", dy + "em");
          while (word = words.pop()) {
            line.push(word);
            tspan.text(line.join(" "));
            if (tspan.node().getComputedTextLength() > width) {
              line.pop();
              tspan.text(line.join(" "));
              line = [word];
              tspan = text.append("tspan").attr("x", 0).attr("y", y).attr("dy", ++lineNumber * lineHeight + dy + "em").text(word);
            }
          }
        });
      }

    /**
     *  Update Function
     */
    let prevInfo = undefined;

    function update(data) {
        if (prevInfo !== data) {
            
            texts.data(data.slice(-n))
                .text(d => d.text)
                .call(wrap, bodyWidth)

            prevInfo = data;
        }
    }
    return update;
}
