/**
 * Adapted from https://bl.ocks.org/mbostock/3808234
 */

 /// in progress
function TweetsInfo(id,data,width = 300, height = 300, n=5){

    const margin = {top: 10, right: 10, bottom: 20, left: 10},
          bodyHeight = height -margin.top - margin.bottom,
          bodyWidth = width - margin.left - margin.right

	const svg = d3.select(`#${id}`)
						.attr("width",width)
						.attr("height",height),
		  g = svg.append('g')
		  		 .style("transform",`translate(${margin.left}px,${margin.top}px)`)

	var SelectTweetsCount = data.allFiltered().length
	//console.log(SelectTweetsCount)

	var lastestTweets = data.all().slice(-1)[0].text
	// console.log(lastestTweets)


    title = g.append('text')
             .attr('font-size', 20)
             .attr('y', 30)
             .attr('x', 5)
             .text('The Lastest 10 Tweets')

    function wrapText(text, maxChars) {
            var ret = [];
            var words = text.split(/\b/);

            var currentLine = '';
            var lastWhite = '';
            words.forEach(function(d) {
                var prev = currentLine;
                currentLine += lastWhite + d;

                var l = currentLine.length;

                if (l > maxChars) {
                    ret.push(prev.trim());
                    currentLine = d;
                    lastWhite = '';
                } else {
                    var m = currentLine.match(/(.*)(\s+)$/);
                    lastWhite = (m && m.length === 3 && m[2]) || '';
                    currentLine = (m && m.length === 3 && m[1]) || currentLine;
                }
            });

            if (currentLine) {
                ret.push(currentLine.trim());
            }
            return ret.join("<br>\n");
            
        }

    let topTweets =[]

    for (i = -1; i >(0-(n+1)); i--) {   
        topTweets.push(wrapText((data.all().slice(i)[0].text),40))
        
    }
    // console.log(topTweets)
    // console.log(topTweets.length)

    var t = d3.transition()
              .duration(500)
    var p = d3.transition()
              .duration(500)

    for (i=0; i<topTweets.length;i++){
        var text = g.append('text')
                    .style('fill-opacity',1)
                    .attr('font-size', 15)
                    .attr("y",(i*100+100))
                    .attr('x', 5)
                    .text(topTweets[i])
                    .transition(t)
                    .style('fill-opacity',1)
                    .transition(p)
                    .style('fill-opacity',0.1)
                    .remove()
    }
}
