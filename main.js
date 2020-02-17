import {getColor, getFill, getFeatureStyle, dohighlightFeature} from './layerStyle.js';
import {makeLegend} from './legend.js';
import {tinfo} from './tweetPanel.js';
import {processData, getTimes} from './processTweets.js';
import {timeslider, cleanDate} from './timeSlider.js';


	//Generate Leaflet Map
	var map = L.map('map',{
	center: [53, -2], 
	zoom: 6
	});

	//Add roads from mapbox
	var streets = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoicnVkeWFydGh1ciIsImEiOiJjamZrem1ic3owY3k4MnhuYWt2dGxmZmk5In0.ddp6_hNhs_n9MJMrlBwTVg', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, ' +
			'<a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
			'Imagery © <a href="http://mapbox.com">Mapbox</a>',
		id: 'mapbox.streets'
	}).addTo(map);

	//define the layers for the different counts
	var number_layers = {};
	number_layers["stats"] = L.layerGroup().addTo( map );
	number_layers["count"] = L.layerGroup();
	
	//layers for the different polygons
	var poly_layers = {};
	poly_layers["county"] = L.layerGroup().addTo( map ); //This one is active
	poly_layers["coarse"] = L.layerGroup()
	poly_layers["fine"] = L.layerGroup();
	var basemapControl = { "numbers": number_layers, "polygon": poly_layers }

	//polygon outlines and counts/stats
	var polygonData = { "county" : fgsData, "coarse" : coarseData, "fine" : fineData }


	//Set defaults
	var active_number = "stats";
	var active_polys = "county";
	
	//data containers
	var geojson = {}; //Layer manager
	var tweetInfo = {}; //Input Data
	var grid_sizes = {"county":"county",  "coarse":"15", "fine":"60"}
	var processedTweetInfo = { "county" : {"stats" : {}, "count" : {}, "embed" : {}},
		"coarse" : {"stats" : {}, "count" : {}, "embed" : {}},
		"fine" : {"stats" : {}, "count" : {}, "embed" : {}},
		} //Processed input (summed over time)

	//The times in the input JSON
	var time_keys;
	var default_min = -96*60 + 1;
	var default_max = 0;
	
	//stats stuff
	var B = 1407; //countyStats["cambridgeshire"].length; //number of stats days
	var statsData = {"county":countyStats, "coarse":coarseStats, "fine":fineStats};
	
	
	//Clicked a county
	var clicked = "";
	var changed_polys = false;
	

	//bind various function arguments to default
	var colorData = { 
		stats: {values:[5, 2.5, 1, 0.5], colors:['#fee5d9', '#fcae91', '#fb6a4a', '#de2d26', '#a50f15']} , 
		count: {values:[150, 50, 20, 10], colors:['#045A8D', '#2B8CBE', '#74A9CF', '#BDC9E1', '#F1EEF6']} 
	}
	var colorFunctions = { stats:{}, count:{} }
	for( var key in colorData ){
		colorFunctions[key].getColor = getColor.bind(null, colorData[key].values, colorData[key].colors);
		colorFunctions[key].getFeatureStyle = getFeatureStyle.bind(null, colorData[key].values, colorData[key].colors, key);
	}
	
	/////////////////////////
	//React to Mouse
	/////////////////////////
	function highlightFeature(e) {
		dohighlightFeature(e.target);
		tinfo.update_header(e.target.feature);
	}
	function displayText(e) {
		tinfo.update_table(e.target.feature, processedTweetInfo[active_polys]["embed"][e.target.feature.properties.name]);
	}	
	function resetHighlight(e) {
		geojson[active_number].resetStyle(e.target);
		tinfo.update_header();
		if( clicked != "" ){ dohighlightFeature(clicked.target); } 
	}
	function zoomToFeature(e) {
		displayText(e);
		var old_clicked = clicked;
		clicked = e;
		e.target.setStyle({
			weight: 3,
			color: '#FF00FF',
			dashArray: '',
			fillOpacity: 0.4
		});
		if(old_clicked != ""){resetHighlight(old_clicked);}
	}
	function onEachFeature(feature, layer) {
		layer.on({
			mouseover: highlightFeature,
			mouseout: resetHighlight,
			click: zoomToFeature
		});
	}
	
	

	///////////////////////
	//Add the polygons
	///////////////////////
	function resetLayers(clear_click){
		for(key in basemapControl["numbers"]){
			
			number_layers[key].clearLayers();

			geojson[key] = L.geoJson( polygonData[active_polys], {
					style: colorFunctions[key].getFeatureStyle,
					onEachFeature: onEachFeature
			}).addTo( number_layers[key] );
			
			if(clear_click){
				if (clicked != ""){ geojson[active_number].resetStyle(clicked); }
				clicked = "";
			}
		}
	}
	

	////////////////////////////
	//Legend
	////////////////////////////
	var legend = L.control({position: 'bottomright'});
	legend.onAdd = function (map) {
		this._div = L.DomUtil.create('div', 'legend');
		this.update = function () { this._div.innerHTML = makeLegend(colorData[active_number].values, colorData[active_number].colors, colorFunctions[active_number].getColor); }
		this.update()
		return this._div;
	};
	legend.addTo(map);

	////////////////////////////
	//Tweet Panel define Jquery mouse handling and minimise
	////////////////////////////
	tinfo.addTo(map);
	
	$('.tinfo').on('mouseover', function(event) {
		map.touchZoom.disable();
		map.doubleClickZoom.disable();
		map.scrollWheelZoom.disable();
		map.boxZoom.disable();
		map.keyboard.disable();
		map.dragging.disable();
	});
	$('.tinfo').on('mouseleave', function(event) {
		map.touchZoom.enable();
		map.doubleClickZoom.enable();
		map.scrollWheelZoom.enable();
		map.boxZoom.enable();
		map.keyboard.enable();
		map.dragging.enable();
	});
	$(".tinfo_button").on('click', function(event){
		if($(this).html() == "-"){
			$(this).html("+");
			$(".tinfo").css({"height": "5vh", 
				"width": "5vh", 
				"transition":"all 1s", 
            }) 
			$(".tinfo_h4").hide()
			$(".tinfo_h4b").hide()
			$(".tinfo_table_wrapper").hide()
		}
		else{
			$(this).html("-");
			$(".tinfo").css({"height": "85vh", 
				"width": "41vw", 
				"transition":"all 1s"
			})
			$(".tinfo_h4").show()
			$(".tinfo_h4b").show()
			$(".tinfo_table_wrapper").show()
		}
	});	
	
	////////////////////////////
	//count / stats toggle
	////////////////////////////
	var lcontrols = {}
	for(key in basemapControl){	
		lcontrols[key] = L.control.layers( basemapControl[key], {} ).addTo( map );
		lcontrols[key].setPosition('topleft');
	}

	
	map.on('baselayerchange', function(e) {
		if( e.name in basemapControl["polygon"] ){
			active_polys = e.name;
			resetLayers(true)
		} else {
			active_number = e.name;
			legend.update()
		}
	});
	
	
	/////////////////////////////
	//get datafiles & init
	/////////////////////////////
	function read_data(){
		
			fetch("http://localhost:8080/data/live.json")
			.then(function(response) {
				return response.json();
			})
			.then(function(tweet_json) {
				tweetInfo = tweet_json
				time_keys = getTimes(tweetInfo)
				processData(tweetInfo, processedTweetInfo, polygonData,  statsData, B, time_keys.slice(-default_max, -default_min), grid_sizes); 
				resetLayers(false);	
				tinfo.update_header();
				initSlider();
			}).catch(function() {
				console.log("live.json not found");
			});
				
	}
	read_data(); //reads data and sets up map
	


	///////////////////////////
	//jQuery Slider, starup after reading JSON
	///////////////////////////
	function initSlider() {
		if (time_keys) {
			timeslider.addTo(map);
			
			//Add the initial header
			$( function() {
				$( ".timeslider_input" ).val( cleanDate(time_keys[-default_min], 0) + " - " + cleanDate(time_keys[-default_max], 1) ); 
			} );
	  	
			//how to react to moving the slider
			$( function() {
			$( ".timeslider" ).slider({
				  range: true,
				  min: -time_keys.length+1,
				  max: 0,
				  values: [ default_min, default_max ],
				  slide: function( event, ui ) {
					  
					processData(tweetInfo, processedTweetInfo, polygonData, statsData, B, time_keys.slice(-ui.values[ 1 ], -ui.values[ 0 ]), grid_sizes ); 
					resetLayers(false);	
					tinfo.update_header();
					if(clicked != ""){ displayText(clicked); }

					$( ".timeslider_input" ).val( cleanDate(time_keys[-ui.values[ 0 ]], 0) + " - " + cleanDate(time_keys[-ui.values[ 1 ]], 1) ); 
				  }
				});
			  } );
			
			//Don't interact with the map while in the slider
			$('.timeslider_container').on('mouseover', function(event) {
				map.touchZoom.disable();
				map.doubleClickZoom.disable();
				map.scrollWheelZoom.disable();
				map.boxZoom.disable();
				map.keyboard.disable();
				map.dragging.disable();
			});
			$('.timeslider_container').on('mouseleave', function(event) {
				map.touchZoom.enable();
				map.doubleClickZoom.enable();
				map.scrollWheelZoom.enable();
				map.boxZoom.enable();
				map.keyboard.enable();
				map.dragging.enable();
			});
	
		}
	}
 
	
	
	
	
  
