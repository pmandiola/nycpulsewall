/**
 * Adapted from https://bl.ocks.org/mbostock/3808234
 */

 /// in progress
function generalInfo(id,data,width = 300, height = 300){

    const margin = {top: 10, right: 10, bottom: 20, left: 10},
          bodyHeight = height -margin.top - margin.bottom,
          bodyWidth = width - margin.left - margin.right

    const svg = d3.select(`#${id}`)
                        .attr("width",width)
                        .attr("height",height),
          g = svg.append('g')
                          .style("transform",`translate(${margin.left}px,${margin.top}px)`)


    const SelectTweetsCount = data.allFiltered().length,
          TotalTweetsCount = data.all().length
    // console.log(SelectTweetsCount)
    console.log(TotalTweetsCount)

    var t = d3.transition()
              .duration(500)


    title = g.append('text')
             .attr("x", margin.left + 10)             
             .attr("y", margin.top)
             .attr("text-anchor", "start")
             .attr('alignment-baseline', 'baseline')
             .style("font-size", "12px") 
             .style("font-weight", "bold")
             .text('Tweets Infomation')


    text1 = g.append('text')
               .attr('font-size', 20)
               .attr('y', 70)
               .attr('x', 5)
               .text('Total Tweets: '+ TotalTweetsCount)
               .transition(t)
               .remove()
    text2 = g.append('text')
               .attr('font-size', 20)
               .attr('y', 100)
               .attr('x', 5)
               .text('Selected Tweets: '+ SelectTweetsCount)
               .transition(t)
               .remove()
               
}