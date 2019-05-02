function HeatMap(id, twts, width = 600, height = 600) {

    mapboxgl.accessToken = 'pk.eyJ1IjoicG1hbmRpb2xhYiIsImEiOiJjanIyNzZndWIwMDJnNDV1NGVyMDUxbzg2In0.RQeWOCc-u8MBvg9XR2r9EQ'

    //Setup mapbox-gl map
    const map = new mapboxgl.Map({
      container: id, // container id
      style: 'mapbox://styles/mapbox/light-v9',
      center: [-73.975, 40.73],
      zoom: 11.8,
      interactive: false
    })


        //add NavigationControl & Geocoder
    map.addControl(new MapboxGeocoder({
        accessToken:mapboxgl.accessToken,
        mapboxgl:mapboxgl
    }));
    map.addControl(new mapboxgl.NavigationControl());

    const container = map.getCanvasContainer()
    const svg = d3.select(container).append("svg")
        .attr('width', '100%')
        .attr('height', '100%')
        .style('position', 'absolute')

    const cScale = d3.scaleLinear()
        .domain([-1,0,1])
        .range(['red','yellow','green'])

    function mapboxProjection(lonlat) {
        var p = map.project(new mapboxgl.LngLat(lonlat[0], lonlat[1]))
        return [p.x, p.y];
      }

    var geojson;
    var lock = false;

    map.on('load', function() {
        // Add a geojson point source.
        // Heatmap layers also work with a vector tile source.
        map.addSource('tweets', { type: 'geojson', data: geojson
        });
         
        map.addLayer({
            id: 'heat',
            type: "heatmap",
            source: "tweets",
            paint: {
                'heatmap-radius': 15,
                'heatmap-opacity': 0.8,
                'heatmap-color': [
                    "interpolate",
                    ["linear"],
                    ["heatmap-density"],
                    0,"rgba(0, 0, 255, 0)",
                    0.3,"#d0d1e6",
                    0.5,"#a6bddb",
                    0.7,"#74a9cf",
                    0.99,"#2b8cbe",
                    1,"#045a8d"]
            }
        });
    });

    function drawTweet(tweet) {
  
        proj = mapboxProjection([tweet.longitude,tweet.latitude])

        // add circles to svg
        svg.append("circle")
            .datum(tweet)
            .attr("cx", proj[0])
            .attr("cy", proj[1])
            .attr("fill", cScale(tweet.polarity))
            .attr("r", "2px")
            .transition()
            .duration(50)
            .attr("r", "20px")
            .transition()
            .duration(1000)
            .attr("r", "0px")
            .remove()
    }

    function setTweets(tweets) {

        if (!lock) {
            lock = true

            geojson = {
                type: "FeatureCollection",
                features: tweets.map(d => d.geojson)
            }
    
            twtsSrc = map.getSource('tweets')
            if (twtsSrc) {
    
                twtsSrc.setData(geojson);
            }
        }
        lock = false
    }
    setTweets(twts)

    function addTweet(tweet) {

        if (!lock && tweet.coords_source == 'Origin') {
            lock = true

            geojson.features.push(tweet.geojson)
    
            twtsSrc = map.getSource('tweets')
            if (twtsSrc) {
    
                twtsSrc.setData(geojson);
            }
        }
        drawTweet(tweet)
        lock = false
    }

    /**
     *  Update Function
     */

    function update(data) {
        if (Array.isArray(data)) {
            
            setTweets(data)
        }
        else {
            addTweet(data)
        }
    }
    return update;
}
