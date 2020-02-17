function getStatsIdx(place, val, poly, B, statsData){
	for(var i=0;i<B; i++){
		if(val <= statsData[poly][place][i]){
			return i;
		}
	}
	return B;
}

export function getTimes(tweetInfo){
	var time_keys = Object.keys(tweetInfo);
	time_keys.sort();
	time_keys.reverse();
	return time_keys;
}

export function processData(tweetInfo, processedTweetInfo, polygonData, statsData, B, time_keys, grid_sizes){

	//clean dicts
	for( var poly in processedTweetInfo ){ //counties, coarse, fine
		for( var i=0; i<polygonData[poly]["features"].length; i++){
			var place = polygonData[poly]["features"][i]["properties"]["name"]
			if(place in processedTweetInfo[poly]["count"]){
				polygonData[poly]["features"][i]["properties"]["count"] = 0;
				polygonData[poly]["features"][i]["properties"]["stats"] = 0;
			}
		}
	}
	for(var k in processedTweetInfo){for(var p in processedTweetInfo[k]){processedTweetInfo[k][p] = {};}}


	for( var i in time_keys ){ //all times
		var tid = time_keys[i]
		for( var poly in processedTweetInfo ){ //counties, coarse, fine
			for( var place in tweetInfo[tid][grid_sizes[poly]] ){ //all counties/boxes
				//add the counts
				var wt = tweetInfo[tid][ grid_sizes[poly] ][place]["w"];
				if(place in processedTweetInfo[poly]["count"]){
					processedTweetInfo[poly]["count"][place] += wt;
				} else {
					processedTweetInfo[poly]["count"][place] = wt;
					processedTweetInfo[poly]["embed"][place] = ""
				}
				for(var i in tweetInfo[tid][ grid_sizes[poly] ][place]["i"]){
					var tweetcode_id = tweetInfo[tid][ grid_sizes[poly] ][place]["i"][i];
					var tweetcode = tweetInfo[tid]["tweets"][tweetcode_id]; //html of the tweet
					if( tweetcode != ""){ //should I show a max #of tweets?
						processedTweetInfo[poly]["embed"][place] += "<tr><td>" + tweetcode + "</td></tr>"
					}
				}
			}
		}
	}

	//update polys
	var tdiff = time_keys.length/1440;
	for( var poly in processedTweetInfo ){ //counties, coarse, fine
		for( var i=0; i<polygonData[poly]["features"].length; i++){
			var place = polygonData[poly]["features"][i]["properties"]["name"]
			if(place in processedTweetInfo[poly]["count"]){
				var wt = processedTweetInfo[poly]["count"][ place ];
				var stats_wt = 0;
				if(wt){ 
					stats_wt = getStatsIdx(place, wt, poly, B, statsData);
					stats_wt = 100*( 1 - Math.pow( 1 - ((B-stats_wt) / (B)) , tdiff ) );
				}
				processedTweetInfo[poly]["stats"][ place ] = stats_wt;
				polygonData[poly]["features"][i]["properties"]["count"] = wt;
				polygonData[poly]["features"][i]["properties"]["stats"] = stats_wt;
			}
		}
	}


}
