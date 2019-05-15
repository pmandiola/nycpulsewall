/**
 * Adapted from https://bl.ocks.org/mbostock/3808234
 */

 /// in progress
function GeneralInfo(id, title="Title", data, width = 300, height = 300){

    const margin = {top: 10, right: 10, bottom: 20, left: 10},
          bodyHeight = height -margin.top - margin.bottom,
          bodyWidth = width - margin.left - margin.right

    const svg = d3.select(`#${id}`)
                        .attr("width",width)
                        .attr("height",height),
          g = svg.append('g')
                          .style("transform",`translate(${margin.left}px,${margin.top}px)`)


    var t = d3.transition()
              .duration(500)


    title = g.append('text')
             .attr("x", margin.left)             
             .attr("y", margin.top)
             .attr("text-anchor", "start")
             .attr('alignment-baseline', 'baseline')
             .style("font-size", "12px") 
             .style("font-weight", "bold")
             .text(title)


    text_total = g.append('text')
               .attr('font-size', "14px")
               .attr('y', 40)
               .attr('x', margin.left)
               .text('Total Tweets: '+ data.all().length)

    text_filtered = g.append('text')
               .attr('font-size', "14px")
               .attr('y', 70)
               .attr('x', margin.left)
               .text('Selected Tweets: '+ data.allFiltered().length)

      /**
     *  Update Function
     */
    function update(data) {
            
      text_total.text('Total Tweets: '+ data.all().length)
      text_filtered.text('Selected Tweets: '+ data.allFiltered().length)
    }
    return update;
}