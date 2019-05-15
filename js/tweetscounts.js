/**
 * Adapted from https://bl.ocks.org/mbostock/3808234
 */

 /// in progress
function TweetsCounts(id,data,width = 300, height = 300){

    const margin = {top: 10, right: 10, bottom: 20, left: 10},
          bodyHeight = height -margin.top - margin.bottom,
          bodyWidth = width - margin.left - margin.right

    const container = d3.select(`#${id}`)
                        .attr("width",width)
                        .attr("height",height),
          body = container.append('g')
                          .style("transform",`translate(${margin.left}px,${margin.top}px)`)


    const SelectTweetsCount = data.allFiltered().length,
          TotalTweetsCount = data.all().length
    // console.log(SelectTweetsCount)
    console.log(TotalTweetsCount)

    var t = d3.transition()
              .duration(500)

    title = body.append('text')
               .attr('font-size', 20)
               .attr('y', 30)
               .attr('x', 5)
               .text('Tweets Infomation')


    text1 = body.append('text')
               .attr('font-size', 20)
               .attr('y', 70)
               .attr('x', 5)
               .text('Total Tweets: '+ TotalTweetsCount)
               .transition(t)
               .remove()
    text2 = body.append('text')
               .attr('font-size', 20)
               .attr('y', 100)
               .attr('x', 5)
               .text('Selected Tweets: '+ SelectTweetsCount)
               .transition(t)
               .remove()
               
}