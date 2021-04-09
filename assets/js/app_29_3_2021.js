
//////////////////////  STREETVIEW  ///////////////
L.StreetView = L.Control.extend({
  options: {
    google: true,
//    bing: true,
//    yandex: true,
//    mapillary: true,
//    mapillaryId: null,
//    openstreetcam: true,
//    mosatlas: true
  },

  providers: [
    ['google', 'Street View', 'Google Street View', false,
      'https://www.google.com/maps?layer=c&cbll={lat},{lon}'],
    ['bing', 'Bing', 'Bing StreetSide',
      L.latLngBounds([[25, -168], [71.4, 8.8]]),
      'https://www.bing.com/maps?cp={lat}~{lon}&lvl=19&style=x&v=2'],
    ['yandex', 'ЯП', 'Yandex Panoramas',
      L.latLngBounds([[35.6, 18.5], [72, 180]]),
      'https://yandex.ru/maps/?panorama%5Bpoint%5D={lon},{lat}'],
    ['mapillary', 'Mplr', 'Mapillary Photos', false,
      'https://a.mapillary.com/v3/images?client_id={id}&closeto={lon},{lat}&lookat={lon},{lat}'],
    ['openstreetcam', 'OSC', 'OpenStreetCam', false,
      'lat={lat}&lng={lon}&distance=50'],
    ['mosatlas', 'Мос', 'Панорамы из Атласа Москвы',
      L.latLngBounds([[55.113, 36.708], [56.041, 38]]),
      'http://atlas.mos.ru/?lang=ru&z=9&ll={lon}%2C{lat}&pp={lon}%2C{lat}'],
  ],

  onAdd: function(map) {
    this._container = L.DomUtil.create('div', 'leaflet-bar');
    this._buttons = [];

    for (var i = 0; i < this.providers.length; i++)
      this._addProvider(this.providers[i]);

    map.on('moveend', function() {
      if (!this._fixed)
        this._update(map.getCenter());
    }, this);
    this._update(map.getCenter());
    return this._container;
  },

  fixCoord: function(latlon) {
    this._update(latlon);
    this._fixed = true;
  },

  releaseCoord: function() {
    this._fixed = false;
    this._update(this._map.getCenter());
  },

  _addProvider: function(provider) {
    if (!this.options[provider[0]])
      return;
    if (provider[0] == 'mapillary' && !this.options.mapillaryId)
      return;
    var button = L.DomUtil.create('a');
    button.innerHTML = provider[1];
    button.title = provider[2];
    button._bounds = provider[3];
    button._template = provider[4];
    button.href = '#';
    button.target = 'streetview';
    button.style.padding = '0 8px';
    button.style.width = 'auto';

    // Some buttons require complex logic
    if (provider[0] == 'mapillary') {
      button._needUrl = false;
      L.DomEvent.on(button, 'click', function(e) {
        if (button._href) {
          this._ajaxRequest(
            button._href.replace(/{id}/, this.options.mapillaryId),
            function(data) {
              if (data && data.features && data.features[0].properties) {
                var photoKey = data.features[0].properties.key,
                    url = 'https://www.mapillary.com/map/im/{key}'.replace(/{key}/, photoKey);
                window.open(url, button.target);
              }
            }
          );
        }
        return L.DomEvent.preventDefault(e);
      }, this);
    } else if (provider[0] == 'openstreetcam') {
      button._needUrl = false;
      L.DomEvent.on(button, 'click', function(e) {
        if (button._href) {
          this._ajaxRequest(
            'http://openstreetcam.org/nearby-tracks',
            function(data) {
              if (data && data.osv && data.osv.sequences) {
                var seq = data.osv.sequences[0],
                    url = 'https://www.openstreetcam.org/details/'+seq.sequence_id+'/'+seq.sequence_index;
                window.open(url, button.target);
              }
            },
            button._href
          );
        }
        return L.DomEvent.preventDefault(e);
      }, this);
    } else
      button._needUrl = true;

    // Overriding some of the leaflet styles
    button.style.display = 'inline-block';
    button.style.border = 'none';
    button.style.borderRadius = '0 0 0 0';
    this._buttons.push(button);
  },

  _update: function(center) {
    if (!center)
      return;
    var last;
    for (var i = 0; i < this._buttons.length; i++) {
      var b = this._buttons[i],
          show = !b._bounds || b._bounds.contains(center),
          vis = this._container.contains(b);

      if (show && !vis) {
        ref = last ? last.nextSibling : this._container.firstChild;
        this._container.insertBefore(b, ref);
      } else if (!show && vis) {
        this._container.removeChild(b);
        return;
      }
      last = b;

      var tmpl = b._template;
      tmpl = tmpl
        .replace(/{lon}/g, L.Util.formatNum(center.lng, 6))
        .replace(/{lat}/g, L.Util.formatNum(center.lat, 6));
      if (b._needUrl)
        b.href = tmpl;
      else
        b._href = tmpl;
    }
  },

  _ajaxRequest: function(url, callback, post_data) {
    if (window.XMLHttpRequest === undefined)
      return;
    var req = new XMLHttpRequest();
    req.open(post_data ? 'POST' : "GET", url);
    if (post_data)
      req.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
    req.onreadystatechange = function() {
      if (req.readyState === 4 && req.status == 200) {
        var data = (JSON.parse(req.responseText));
        callback(data);
      }
    };
    req.send(post_data);
  }
});

L.streetView = function(options) {
  return new L.StreetView(options);
}

////////////////////// END OF STREETVIEW///////////////

var map, featureList, boroughSearch = [], theaterSearch = [], museumSearch = [], shops21Search = [];

$(window).resize(function() {
  sizeLayerControl();
});

$(document).on("click", ".feature-row", function(e) {
  $(document).off("mouseout", ".feature-row", clearHighlight);
  sidebarClick(parseInt($(this).attr("id"), 10));
});

//$(document).on("click", ".feature-row", function(e) {
//  $(document).off("mouseout", ".feature-row", clearHighlight);
//  sidebarClick2(parseInt($(this).attr("id"), 10));
//});


if ( !("ontouchstart" in window) ) {
  $(document).on("mouseover", ".feature-row", function(e) {
    highlight.clearLayers().addLayer(L.circleMarker([$(this).attr("lat"), $(this).attr("lng")], highlightStyle));
  });
}

$(document).on("mouseout", ".feature-row", clearHighlight);

$("#about-btn").click(function() {
  $("#aboutModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#full-extent-btn").click(function() {
  map.fitBounds(WFSLayer.getBounds());
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#legend-btn").click(function() {
  $("#legendModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#login-btn").click(function() {
  $("#loginModal").modal("show");
  $(".navbar-collapse.in").collapse("hide");
  return false;
});

$("#list-btn").click(function() {
  animateSidebar();
  return false;
});

$("#nav-btn").click(function() {
  $(".navbar-collapse").collapse("toggle");
  return false;
});

$("#sidebar-toggle-btn").click(function() {
  animateSidebar();
  return false;
});

$("#sidebar-hide-btn").click(function() {
  animateSidebar();
  return false;
});

function animateSidebar() {
  $("#sidebar").animate({
    width: "toggle"
  }, 350, function() {
    map.invalidateSize();
  });
}

function sizeLayerControl() {
  $(".leaflet-control-layers").css("max-height", $("#map").height() - 50);
}

function clearHighlight() {
  highlight.clearLayers();
}

function sidebarClick(id) {
  var layer = markerClusters.getLayer(id);
  map.setView([layer.getLatLng().lat, layer.getLatLng().lng], 18);
  layer.fire("click");
 
  /* Hide sidebar and go to the map on small screens */
  if (document.body.clientWidth <= 767) {
    $("#sidebar").hide();
    map.invalidateSize();
  }
}





function syncSidebar() {
  /* Empty sidebar features */
  $("#feature-list tbody").empty();
  /* Loop through theaters layer and add only features which are in the map bounds */
//  theaters.eachLayer(function (layer) {
//    if (map.hasLayer(theaterLayer)) {
//      if (map.getBounds().contains(layer.getLatLng())) {
//        $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/theater.png"></td><td class="feature-name">' + layer.feature.properties.NAME + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
//      }
//    }
//  });
  /* Loop through museums layer and add only features which are in the map bounds */
//  museums.eachLayer(function (layer) {
//    if (map.hasLayer(museumLayer)) {
//      if (map.getBounds().contains(layer.getLatLng())) {
//        $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/museum.png"></td><td class="feature-name">' + layer.feature.properties.NAME + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
//      }
//    }
//  });
//    
    
    
    
    
    
// Pavlos 
    ////////////////////////////////////////
//  markers21.eachLayer(function (layer) {
//    if (map.hasLayer(markers21)) {
//      if (map.getBounds().contains(layer.getLatLng())) {
//        $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/shops_simple.png"></td><td class="feature-name">' + layer.feature.properties.name + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
//      }
//    }
//  }); 

    
// Edit the icons on the side based on the colors of the icons in the map.......
    
  markers21.eachLayer(function (layer) {
    if (map.hasLayer(markers21)) {
      if (map.getBounds().contains(layer.getLatLng())) {
         if ((layer.feature.properties.daysdiff  > layer.feature.properties.avg_diff_invoices + 15) && layer.feature.properties.daysdiff  < layer.feature.properties.avg_diff_invoices + 30 )
            $("#feature-list tbody").append('<tr class="feature-row" id="' +  L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/orange_60.png"></td><td class="feature-name">'+ '('+ layer.feature.properties.daysdiff +' days ago - LATE_1) '+ '<br>' +  layer.feature.properties.name + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
         else if (layer.feature.properties.daysdiff  > layer.feature.properties.avg_diff_invoices + 30 && layer.feature.properties.avg_diff_invoices != null)
            $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/shops17.png"></td><td class="feature-name">' + '('+ layer.feature.properties.daysdiff +' days ago - LATE_2) '+ '<br>' +   layer.feature.properties.name + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
          else if (layer.feature.properties.avg_diff_invoices == null)
            $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/grey_60.png"></td><td class="feature-name">'+ '('+ layer.feature.properties.daysdiff +' days ago - 1 invoice) ' + '<br>'+   layer.feature.properties.name + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>'); 
          else 
            $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/theater.png"></td><td class="feature-name">' + '('+ layer.feature.properties.daysdiff +' days ago - Normal) '+ '<br>' + layer.feature.properties.name + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');  
      }
    }
  }); 
    
    
  markers17.eachLayer(function (layer) {
    if (map.hasLayer(markers17)) {
      if (map.getBounds().contains(layer.getLatLng())) {
        $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/black_60.png"></td><td class="feature-name">' + layer.feature.properties.name + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
      }
    }
  }); 
    
    
  markers_alla_tobak.eachLayer(function (layer) {
    if (map.hasLayer(markers_alla_tobak)) {
      if (map.getBounds().contains(layer.getLatLng())) {
        $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/alla_bolagV.png"></td><td class="feature-name">' + layer.feature.properties.name + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
      }
    }
  }); 
    ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
    ///////
    
    
    
    
    
    
  /* Update list.js featureList */
  featureList = new List("features", {
    valueNames: ["feature-name"]
  });
  featureList.sort("feature-name", {
    order: "asc"
  });
}

//
//function myFunction() {
//  var checkBox = document.getElementById("myCheck");
//  if (checkBox.checked == true) {
//      alert("checked")
//  } else {
//     alert("nochecked")
//  }
//}

/* Basemap Layers */
var cartoLight = L.tileLayer("https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="https://cartodb.com/attributions">CartoDB</a>'
});
//var usgsImagery = L.layerGroup([L.tileLayer("http://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}", {
//  maxZoom: 15,
//}), L.tileLayer.wms("http://raster.nationalmap.gov/arcgis/services/Orthoimagery/USGS_EROS_Ortho_SCALE/ImageServer/WMSServer?", {
//  minZoom: 16,
//  maxZoom: 19,
//  layers: "0",
//  format: 'image/jpeg',
//  transparent: true,
//  attribution: "Aerial Imagery courtesy USGS"
//})]);

// Pavlos Basemaps
var Esri_WorldImagery = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom:20,
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community'
});

var Jawg_Dark = L.tileLayer('https://tile.jawg.io/jawg-dark/{z}/{x}/{y}.png?access-token=aSX0YlGc5n7U0VR4PnjWiknA5dTcViqkFqqFE6njEfypXg6J7k8KAjxvs4Qe9xe2', {
	attribution: false,
	minZoom: 0,
	maxZoom: 22,
	subdomains: 'abcd',
	accessToken: 'gAIVyzW5OMwANq99h8pdDZOab2IbOdQOnBEyp5q5NJEbPYZb8k7JzJIuI6OlAFcX'
});

var Stadia_AlidadeSmoothDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
	maxZoom: 20,
	attribution: false
});

var Esri_WorldStreetMap = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}', {
	attribution: 'Tiles &copy; Esri &mdash; Source: Esri, DeLorme, NAVTEQ, USGS, Intermap, iPC, NRCAN, Esri Japan, METI, Esri China (Hong Kong), Esri (Thailand), TomTom, 2012'
});

var OSM =  L.tileLayer('https://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://osm.org/copyright">OpenStreetMap</a> contributors'
      });
/* Overlay Layers */
var highlight = L.geoJson(null);
var highlightStyle = {
  stroke: false,
  fillColor: "#00FFFF",
  fillOpacity: 0.7,
  radius: 10
};

var lans = L.geoJson(null, {
  style: function (feature) {
    return {
      fillColor: "#E7FDFC",
      color: "black",
      weight: 1.5,
      fill: true,
      opacity: 0.9,
      clickable: true
    };
  },
  onEachFeature: function (feature, layer) {
    boroughSearch.push({
      name: layer.feature.properties.BoroName,
      source: "Boroughs",
      id: L.stamp(layer),
      bounds: layer.getBounds()
    });
      
      ///// Color change on mouse 
//    layer.on({
//        mouseover: function () {
//            this.setStyle({
//                'fillColor': '#34FDF3',
//            });
//        },
//        mouseout: function () {
//            this.setStyle({
//                'fillColor': '#E7FDFC',
//            });
//        },
//        
        
        
//        click: function () {
//            // TODO Link to page
//            alert('Clicked on ' + feature.properties.name)
//        }
//    });
      
       ///// end Color change on mouse 
      
      /// Lans Labels...
     
      
      
     var label = L.marker(layer.getBounds().getCenter(), {
        icon: L.divIcon({
            className: 'LansLabel',
            html: '<b style="color:red; font-size:140%;">'+feature.properties.SalesPersonName +'</b>',
            iconSize: [0, 0]
        })
    }).addTo(lans);
  },
//    			filter: function(feature, layer) {   
//				 return (feature.properties.SalesPersonName == "Jonny" );
//			}
});
$.getJSON("data/lans.geojson", function (data) {

    lans.addData(data);
    
    

});


//Create a color dictionary based off of subway route_id
var subwayColors = {"1":"#ff3135", "2":"#ff3135", "3":"ff3135", "4":"#009b2e",
    "5":"#009b2e", "6":"#009b2e", "7":"#ce06cb", "A":"#fd9a00", "C":"#fd9a00",
    "E":"#fd9a00", "SI":"#fd9a00","H":"#fd9a00", "Air":"#ffff00", "B":"#ffff00",
    "D":"#ffff00", "F":"#ffff00", "M":"#ffff00", "G":"#9ace00", "FS":"#6e6e6e",
    "GS":"#6e6e6e", "J":"#976900", "Z":"#976900", "L":"#969696", "N":"#ffff00",
    "Q":"#ffff00", "R":"#ffff00" };

//var subwayLines = L.geoJson(null, {
//  style: function (feature) {
//      return {
//        color: subwayColors[feature.properties.route_id],
//        weight: 3,
//        opacity: 1
//      };
//  },
//  onEachFeature: function (feature, layer) {
//    if (feature.properties) {
//      var content = "<table class='table table-striped table-bordered table-condensed'>" + "<tr><th>Division</th><td>" + feature.properties.Division + "</td></tr>" + "<tr><th>Line</th><td>" + feature.properties.Line + "</td></tr>" + "<table>";
//      layer.on({
//        click: function (e) {
//          $("#feature-title").html(feature.properties.Line);
//          $("#feature-info").html(content);
//          $("#featureModal").modal("show");
//
//        }
//      });
//    }
//    layer.on({
//      mouseover: function (e) {
//        var layer = e.target;
//        layer.setStyle({
//          weight: 3,
//          color: "#00FFFF",
//          opacity: 1
//        });
//        if (!L.Browser.ie && !L.Browser.opera) {
//          layer.bringToFront();
//        }
//      },
//      mouseout: function (e) {
//        subwayLines.resetStyle(e.target);
//      }
//    });
//  }
//});
//$.getJSON("data/subways.geojson", function (data) {
//  subwayLines.addData(data);
//});

/* Single marker cluster layer to hold all clusters */
var markerClusters = new L.MarkerClusterGroup({
  spiderfyOnMaxZoom: true,
  showCoverageOnHover: false,
  zoomToBoundsOnClick: true,
  disableClusteringAtZoom: 16
});

/* Empty layer placeholder to add to layer control for listening when to add/remove theaters to markerClusters layer */
//var theaterLayer = L.geoJson(null);
//var theaters = L.geoJson(null, {
//  pointToLayer: function (feature, latlng) {
//    return L.marker(latlng, {
//      icon: L.icon({
//        iconUrl: "assets/img/theater.png",
//        iconSize: [24, 28],
//        iconAnchor: [12, 28],
//        popupAnchor: [0, -25]
//      }),
//      title: feature.properties.NAME,
//      riseOnHover: true
//    });
//  },
//  onEachFeature: function (feature, layer) {
//    if (feature.properties) {
//      var content = "<table class='table table-striped table-bordered table-condensed'>" + "<tr><th>Name</th><td>" + feature.properties.NAME + "</td></tr>" + "<tr><th>Phone</th><td>" + feature.properties.TEL + "</td></tr>" + "<tr><th>Address</th><td>" + feature.properties.ADDRESS1 + "</td></tr>" + "<tr><th>Website</th><td><a class='url-break' href='" + feature.properties.URL + "' target='_blank'>" + feature.properties.URL + "</a></td></tr>" + "<table>";
//      layer.on({
//        click: function (e) {
//          $("#feature-title").html(feature.properties.NAME);
//          $("#feature-info").html(content);
//          $("#featureModal").modal("show");
//          highlight.clearLayers().addLayer(L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], highlightStyle));
//        }
//      });
//      $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/theater.png"></td><td class="feature-name">' + layer.feature.properties.NAME + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
//      theaterSearch.push({
//        name: layer.feature.properties.NAME,
//        address: layer.feature.properties.ADDRESS1,
//        source: "Theaters",
//        id: L.stamp(layer),
//        lat: layer.feature.geometry.coordinates[1],
//        lng: layer.feature.geometry.coordinates[0]
//      });
//    }
//  }
//});
//$.getJSON("data/DOITT_THEATER_01_13SEPT2010.geojson", function (data) {
//  theaters.addData(data);
//  map.addLayer(theaterLayer);
//});


///////////////  Pavlos

var greenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
var greyIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-grey.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

/////////////////////////////////////////////////////////
var shops_groups21 = L.layerGroup();    
var defaultParameters21 = {
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: 'split_shops:shops_classified_new',
    maxFeatures: 3500,
    outputFormat: 'text/javascript',
    format_options: 'callback: getJson',
    scql_filter:"no_='K01058'",
    srsName:'EPSG:4326'
};
var owsrootUrl21 = 'http://localhost:8081/geoserver/split_shops/ows';
var parameters21 = L.Util.extend(defaultParameters21);
var URL21 = owsrootUrl21 + L.Util.getParamString(parameters21);
var WFSLayer21 = null;

var markers21 = new L.MarkerClusterGroup({ 
    iconCreateFunction: function (cluster) {
        var markers221 = cluster.getAllChildMarkers();
        var html = '<div class="circle">' + markers221.length + '</div>';
        return L.divIcon({ html: html, className: 'mycluster', iconSize: L.point(32, 32) });
    },
    spiderfyOnMaxZoom: true, showCoverageOnHover: true, zoomToBoundsOnClick: true,
   disableClusteringAtZoom: 10, 
});
var ajax21 = $.ajax({
    url : URL21,
    dataType : 'jsonp',
    jsonpCallback : 'getJson',
    success : function (response) {
        WFSLayer21 = L.geoJson(response, {
            style: function (feature) {
                return {
                    stroke: true,
                    fillColor: '#FF0000',
                    fillOpacity: 0
                };
            },
            onEachFeature: function (feature, layer) {                
                if ((feature.properties.daysdiff  > feature.properties.avg_diff_invoices + 15) && feature.properties.daysdiff  < feature.properties.avg_diff_invoices + 30 )
                    layer.setIcon(orangeIcon);
                else 
                    layer.setIcon(greenIcon);
                if (feature.properties.daysdiff  > feature.properties.avg_diff_invoices + 30)
                    layer.setIcon(redIcon);
                if (feature.properties.avg_diff_invoices == null)
                    layer.setIcon(greyIcon);
                //layer.setIcon(greenIcon);
                popupOptions = {maxWidth: 250};
                var y = L.Util.formatNum(feature.properties.latitude, 9)
                var x = L.Util.formatNum(feature.properties.longtitude, 9)
                var linktoStreetView = 'https://www.google.com/maps?layer=c&cbll=' + y  +',' + x        
                var linktoGoogleMap = 'https://www.google.com/maps/place/'+ y +','+x
                
                
                
                layer.bindPopup('<h4 style="font-weight: bold">'+feature.properties.name+ '[' + feature.properties.no_ +']' +'</h4>' +
                  '<p><b> Address: '+'</b> <br>'+ feature.properties.full_address  + 
                  '<p><b> Latest Call Date: '+ '</b> <br>' +  feature.properties.latest_calldate + 
                  '<p><b> Last Invoice Date: ' +'</b> <br>'  + feature.properties.last_invoice_datetime.slice(0,-1) +', ' + '<br>'+   feature.properties.daysdiff  + ' days ago'  + '</b></p>'+        
                  '<p><b> Discount Group: '+ '</b> <br>' +  feature.properties.customer_disc_group +
                  '<p><b> SalesPerson Code: '+ '</b> <br>' +  feature.properties.salesperson_code  
                 
                 + '<p><b> Invoice Frequency: '+ '</b> <br>' +  feature.properties.avg_diff_invoices + ' days'
                                
                 +  '<p><b> Buying Frequency Category: '+ '</b> <br>' +                feature.properties.customer_class_filtered +
                                
                                 '<p><b> Go To: '+ '</b>'+        
                                
                                
                  '<br>' +'<a href=' + linktoStreetView + '>Google Street View</a>'     +
                  '<br>' +'<a href=' + linktoGoogleMap + '>Google Maps</a>'  
                                
//                   +  '<p><b> Invoices Count since 24/3/2020: '+ '</b> <br>' +                feture.properties.customer_class_filtered
                        
                    ,popupOptions);
                
                // Mouse over on points...               
//                var checkBox = document.getElementById("myCheck");
//                if (checkBox.checked == true) {
//                    cosole.log('gg')
//                    layer.bindPopup(feature.properties.name, popupOptions);
//                    layer.on('mouseover', function() { layer.openPopup(); });
//                    layer.on('mouseout', function() { layer.closePopup(); });
//                    alert("checked")
//                }
//                layer.bindPopup(feature.properties.name, {closeButton: false, offset: L.point(0, -20)});
//                layer.on('mouseover', function() { layer.openPopup(); });
//                layer.on('mouseout', function() { layer.closePopup(); });
                
            }}).addTo(markers21).addTo(markerClusters);
    }
});
markers21.addTo(shops_groups21)
    

//////// SHOPS 2017-2019
var shops_groups17 = L.layerGroup();    
var defaultParameters17 = {
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: 'shops_17:shops_17_18',
    maxFeatures: 3500,
    outputFormat: 'text/javascript',
    format_options: 'callback: getJson',
    //cql_filter:"no_ =  '16838'",
    srsName:'EPSG:4326'
};
var owsrootUrl17 = 'http://localhost:8081/geoserver/shops_17/ows';
var parameters17 = L.Util.extend(defaultParameters17);
var URL17 = owsrootUrl17 + L.Util.getParamString(parameters17);
var WFSLayer17 = null;
var redIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

var blackIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-black.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});


var markers17 = new L.MarkerClusterGroup({ 
    iconCreateFunction: function (cluster) {
        var markers117 = cluster.getAllChildMarkers();
        var html = '<div class="circleBlack">' + markers117.length + '</div>';
        return L.divIcon({ html: html, className: 'mycluster', iconSize: L.point(32, 32) });
    },
    spiderfyOnMaxZoom: true, showCoverageOnHover: true, zoomToBoundsOnClick: true, 
    disableClusteringAtZoom: 10, 
});
var ajax17 = $.ajax({
    url : URL17,
    dataType : 'jsonp',
    jsonpCallback : 'getJson',
    success : function (response) {
        WFSLayer17 = L.geoJson(response, {
            style: function (feature) {
                return {
                    stroke: true,
                    fillColor: '#FF0000',
                    fillOpacity: 0
                };

            },
//            
//            filter: function(feature) {
//                return feature.properties.no_ =! "17498";
//            },
//            
            
            onEachFeature: 
                        
            function (feature, layer) {
                layer.setIcon(blackIcon);
                popupOptions = {maxWidth: 200};
                layer.bindPopup('<h3>'+feature.properties.name+ '[' + feature.properties.no_ +']' +'</h3>' +
                  '<h4>'+'Address:'+'</h4>'+feature.properties.full_address  +
                '<h4>'+'Latest Call Date:'  + '</h4>'  + feature.properties.latest_calldate
                + '<h4>' + 'Last Invoice Date' + '</h4>'+ feature.properties.last_invo_date.slice(0,-1) +', ' +    feature.properties.daysdiff  + ' days ago'
                + '<h4>' + 'Discount Group:' + '</h4>'+ feature.properties.customer_disc_group	
                 + '<h4>' + 'Sales Person:' + '</h4>'+ feature.properties.salesperson_code                 
                    ,popupOptions);
            }
        }).addTo(markers17).addTo(markerClusters);      
    }  
}); 
markers17.addTo(shops_groups17)



///////////// allabolag - tobak  
var shops_groups_alla_tobak = L.layerGroup();    
var defaultParameters_alla_tobak = {
    service: 'WFS',
    version: '1.0.0',
    request: 'GetFeature',
    typeName: '	alla_bolag_tobak:alla_tobak_shops',
    maxFeatures: 3500,
    outputFormat: 'text/javascript',
    format_options: 'callback: getJson',
    cql_filter:"lan ='Stockholms län'",
    //cql_filter:"name = 'Handelsbolaget Guns Tobak Tegnergatan 7'",
    srsName:'EPSG:4326'
};
var owsrootUrl_alla_tobak = 'http://localhost:8081/geoserver/alla_bolag_tobak/ows';
var parameters_alla_tobak = L.Util.extend(defaultParameters_alla_tobak);
var URL_alla_tobak = owsrootUrl_alla_tobak + L.Util.getParamString(parameters_alla_tobak);
var WFSLayer_alla_tobak = null;


var orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});





var violetIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
var markers_alla_tobak = new L.MarkerClusterGroup({ 
    iconCreateFunction: function (cluster) {
        var markers = cluster.getAllChildMarkers();
        var html = '<div class="circleViolet">' + markers.length + '</div>';
        return L.divIcon({ html: html, className: 'mycluster', iconSize: L.point(32, 32) });
    },
    spiderfyOnMaxZoom: true, showCoverageOnHover: true, zoomToBoundsOnClick: true ,
    disableClusteringAtZoom: 10, 
});
var ajax_alla_tobak = $.ajax({
    url : URL_alla_tobak,
    dataType : 'jsonp',
    jsonpCallback : 'getJson',
    success : function (response) {
        WFSLayer_alla_tobak = L.geoJson(response, {
            style: function (feature) {
                return {
                    stroke: true,
                    fillColor: '#FF0000',
                    fillOpacity: 0
                };
            },
            
            
//                        
//            filter: function(feature, layer) {
//                return feature.properties.lan == "Stockholms län";
//            },
//            
            
            onEachFeature: 
            
            
            function (feature, layer) {
                layer.setIcon(violetIcon);
                popupOptions = {maxWidth: 200};
                // Find the link to Google maps...
                

                
                var y = L.Util.formatNum(feature.properties.y, 9)
                var x = L.Util.formatNum(feature.properties.x, 9)
                
                var linktoStreetView = 'https://www.google.com/maps?layer=c&cbll='
                           + y  +',' + x 
                
                var linktoGoogleMap = 'https://www.google.com/maps/place/'+ y +','+x
                
                var allabolag_link = feature.properties.url
                
                layer.bindPopup('<h4 style="font-weight: bold">'+feature.properties.name +'</h4>' +
                  '<p><b> Address: '+'</b> <br>'+ feature.properties.address +
                   
                   '<p><b> Go To: '+ '</b>'+        
                                
                  '<br>' +'<a href=' + allabolag_link + '>AllaBolag</a>' +
                                
                  '<br>' +'<a href=' + linktoStreetView + '>Google Street View</a>'     +
                  '<br>' +'<a href=' + linktoGoogleMap + '>Google Maps</a>'  
              
//                L.Util.formatNum(center.lng, 6)
                    //+'https://www.google.com/maps?layer=c&cbll={lat},{lon}'
//                  '<p><b> Latest Call Date: '+ '</b> <br>' +  feature.properties.latest_calldate + 
//                  '<p><b> Last Invoice Date: ' +'</b> <br>'  + feature.properties.last_invo_date.slice(0,-1) +', ' + '<br>'+   feature.properties.daysdiff  + ' days ago'  + '</b></p>'+        
//                  '<p><b> Discount Group: '+ '</b> <br>' +  feature.properties.customer_disc_group +
//                  '<p><b> SalesPerson Code: '+ '</b> <br>' +  feature.properties.salesperson_code                
                    ,popupOptions);
            }
            
            //            filter: function(feature, layer) {
//                return feature.properties.lan == "Stockholms län";
//            },
            
        }).addTo(markers_alla_tobak).addTo(markerClusters);     
    }    
});
markers_alla_tobak.addTo(shops_groups_alla_tobak)


/////////////// end - pavlos
////////////////////////////////////////////////////////////////


//
///* Empty layer placeholder to add to layer control for listening when to add/remove museums to markerClusters layer */
//var museumLayer = L.geoJson(null);
//var museums = L.geoJson(null, {
//  pointToLayer: function (feature, latlng) {
//    return L.marker(latlng, {
//      icon: L.icon({
//        iconUrl: "assets/img/museum.png",
//        iconSize: [24, 28],
//        iconAnchor: [12, 28],
//        popupAnchor: [0, -25]
//      }),
//      title: feature.properties.NAME,
//      riseOnHover: true
//    });
//  },
//  onEachFeature: function (feature, layer) {
//    if (feature.properties) {
//      var content = "<table class='table table-striped table-bordered table-condensed'>" + "<tr><th>Name</th><td>" + feature.properties.NAME + "</td></tr>" + "<tr><th>Phone</th><td>" + feature.properties.TEL + "</td></tr>" + "<tr><th>Address</th><td>" + feature.properties.ADRESS1 + "</td></tr>" + "<tr><th>Website</th><td><a class='url-break' href='" + feature.properties.URL + "' target='_blank'>" + feature.properties.URL + "</a></td></tr>" + "<table>";
//      layer.on({
//        click: function (e) {
//          $("#feature-title").html(feature.properties.NAME);
//          $("#feature-info").html(content);
//          $("#featureModal").modal("show");
//          highlight.clearLayers().addLayer(L.circleMarker([feature.geometry.coordinates[1], feature.geometry.coordinates[0]], highlightStyle));
//        }
//      });
//      $("#feature-list tbody").append('<tr class="feature-row" id="' + L.stamp(layer) + '" lat="' + layer.getLatLng().lat + '" lng="' + layer.getLatLng().lng + '"><td style="vertical-align: middle;"><img width="16" height="18" src="assets/img/museum.png"></td><td class="feature-name">' + layer.feature.properties.NAME + '</td><td style="vertical-align: middle;"><i class="fa fa-chevron-right pull-right"></i></td></tr>');
//      museumSearch.push({
//        name: layer.feature.properties.NAME,
//        address: layer.feature.properties.ADRESS1,
//        source: "Museums",
//        id: L.stamp(layer),
//        lat: layer.feature.geometry.coordinates[1],
//        lng: layer.feature.geometry.coordinates[0]
//      });
//    }
//  }
//});
//$.getJSON("data/DOITT_MUSEUM_01_13SEPT2010.geojson", function (data) {
//  museums.addData(data);
//});

map = L.map("map", {
  zoom: 5,
  center: [63.30631276498364, 16.792338880530966],
  layers: [Jawg_Dark, highlight],
  zoomControl: false,
  attributionControl: false
});
/* Layer control listeners that allow for a single markerClusters layer */
map.on("overlayadd", function(e) {
//  if (e.layer === theaterLayer) {
//    markerClusters.addLayer(theaters);
//    syncSidebar();
//  }
//  if (e.layer === museumLayer) {
//    markerClusters.addLayer(museums);
//    syncSidebar();
//  }
    
    //// Pavlos
  if (e.layer === shops_groups21) {
    markerClusters.addLayer(markers21);
    syncSidebar();
  }
  if (e.layer === shops_groups17) {
    markerClusters.addLayer(markers17);
    syncSidebar();
  }
  if (e.layer === shops_groups_alla_tobak) {
    markerClusters.addLayer(markers_alla_tobak);
    syncSidebar();
  }
    //// end Pavlos
});

map.on("overlayremove", function(e) {
//  if (e.layer === theaterLayer) {
//    markerClusters.removeLayer(theaters);
//    syncSidebar();
//  }
//  if (e.layer === museumLayer) {
//    markerClusters.removeLayer(museums);
//    syncSidebar();
//  }
    // Pavlos
  if (e.layer === shops_groups21) {
    markerClusters.removeLayer(markers21);
    syncSidebar();
  }
  if (e.layer === shops_groups17) {
    markerClusters.removeLayer(markers17);
    syncSidebar();
  }  
  if (e.layer === shops_groups_alla_tobak) {
    markerClusters.removeLayer(markers_alla_tobak);
    syncSidebar();
  }   
});

/* Filter sidebar feature list to only show features in current map bounds */
map.on("moveend", function (e) {
  syncSidebar();
});

/* Clear feature highlight when map is clicked */
map.on("click", function(e) {
  highlight.clearLayers();
});

/* Attribution control */
function updateAttribution(e) {
  $.each(map._layers, function(index, layer) {
    if (layer.getAttribution) {
      $("#attribution").html((layer.getAttribution()));
    }
  });
}
map.on("layeradd", updateAttribution);
map.on("layerremove", updateAttribution);

//var attributionControl = L.control({
//  position: "bottomright"
//});
//attributionControl.onAdd = function (map) {
//  var div = L.DomUtil.create("div", "leaflet-control-attribution");
//  div.innerHTML = "<span class='hidden-xs'>Developed by <a href='http://bryanmcbride.com'>bryanmcbride.com</a> | </span><a href='#' onclick='$(\"#attributionModal\").modal(\"show\"); return false;'>Attribution</a>";
//  return div;
//};
//map.addControl(attributionControl);
// Geocoder.....

var geocoder = L.Control.geocoder({
    position: "topleft",
    defaultMarkGeocode: false,
    collapsed: false
  })
  .on('markgeocode', (e) => {
    var bbox = e.geocode.bbox;
    var poly = L.polygon([
      bbox.getSouthEast(),
      bbox.getNorthEast(),
      bbox.getNorthWest(),
      bbox.getSouthWest()
    ]);
    map.fitBounds(poly.getBounds());
  })
  .addTo(map);





var zoomControl = L.control.zoom({
  position: "topleft"
}).addTo(map);

/* GPS enabled geolocation control set to follow the user's location */
var locateControl = L.control.locate({
  position: "topleft",
  drawCircle: true,
  follow: true,
  setView: true,
  keepCurrentZoomLevel: true,
  markerStyle: {
    weight: 1,
    opacity: 0.8,
    fillOpacity: 0.8
  },
  circleStyle: {
    weight: 1,
    clickable: false
  },
  icon: "fa fa-location-arrow",
  metric: false,
  strings: {
    title: "My location",
    popup: "You are within {distance} {unit} from this point",
    outsideMapBoundsMsg: "You seem located outside the boundaries of the map"
  },
  locateOptions: {
    maxZoom: 18,
    watch: true,
    enableHighAccuracy: true,
    maximumAge: 10000,
    timeout: 10000
  }
}).addTo(map);




////////////////


/* Larger screens get expanded layer control and visible sidebar */
if (document.body.clientWidth <= 767) {
  var isCollapsed = true;
} else {
  var isCollapsed = false;
}

var baseLayers = {
  
    "Street Map (White)": cartoLight,
    "Satelite Imagery" : Esri_WorldImagery,
    "Street Map (Dark)": Jawg_Dark,
//    "Stadia_AlidadeSmoothDark" : Stadia_AlidadeSmoothDark,
    //"Topo Street Map" : Esri_WorldStreetMap,
    "OSM": OSM
//    "MtbMap" : MtbMap

    
};


/// Load shops 21 initially on map
shops_groups21.addTo(map)

//markerClusters.addTo(map)

var groupedOverlays = {
  "Customers": {
    "<img src='assets/img/theater.png' width='15' height='19'>&nbsp;Shops (24/3/2020)": shops_groups21,
    "<img src='assets/img/black_60.png' width='15' height='19'>&nbsp;Shops before 2019": shops_groups17,
    "<img src='assets/img/alla_bolagV.png' width='15' height='19'>&nbsp;Allabolag Tobak Shops": shops_groups_alla_tobak,
//      "<img src='assets/img/alla_bolag.png' width='15' height='19'>&nbsp;markerClusters": markerClusters,
      //"<img src='assets/img/shops17.png' width='15' height='19'>&nbsp;Lans": lans_group, 
//    "<img src='assets/img/theater.png' width='24' height='28'>&nbsp;Theaters": theaterLayer,
//    "<img src='assets/img/museum.png' width='24' height='28'>&nbsp;Museums": museumLayer
    //"<img src='assets/img/museum.png' width='24' height='28'>&nbsp;Museums": shops_groups21 /// Pavlo/// Pavlo/// Pavlo
  },
  "Salesman Areas": {
      "Assigned Areas" :lans
//    "Boroughs": boroughs,
//    "Subway Lines": subwayLines,
//    "shops21": shops_groups21 //// Pavlos /// Pavlo
  }
};

var layerControl = L.control.groupedLayers(baseLayers, groupedOverlays, {
    collapsed: isCollapsed,
    position:"bottomright"
}).addTo(map);




/// Street View ..


// (Please get your own Client ID on https://www.mapillary.com/app/settings/developers)
L.streetView({ position: 'topleft', mapillaryId: 'RC1ZRTBfaVlhWmJmUGVqRk5CYnAxQTpmMGE3OTU0MzM0MTljZTA4' }).addTo(map);
//// Add a marker to the centre of the map
//var marker = L.marker(map.getCenter()).addTo(map);
//// Make sure the marker stays in the centre when the map is moved
//map.on('move', function() { marker.setLatLng(map.getCenter()); });



///////////////  SEARCH BOX ///////////////////


/* Highlight search box text on click */
$("#searchbox").click(function () {
  $(this).select();
});

/* Prevent hitting enter from refreshing the page */
$("#searchbox").keypress(function (e) {
  if (e.which == 13) {
    e.preventDefault();
  }
});

$("#featureModal").on("hidden.bs.modal", function (e) {
  $(document).on("mouseout", ".feature-row", clearHighlight);
});

/* Typeahead search functionality */
$(document).one("ajaxStop", function () {
  $("#loading").hide();
  sizeLayerControl();
  /* Fit map to boroughs bounds */
  map.fitBounds(WFSLayer21.getBounds());
  featureList = new List("features", {valueNames: ["feature-name"]});
  featureList.sort("feature-name", {order:"asc"});

    
   var shops21BH = new Bloodhound({
    name: "markers21",
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: shops21Search,
    limit: 10
  });
    
    
  var boroughsBH = new Bloodhound({
    name: "Boroughs",
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: boroughSearch,
    limit: 10
  });

  var theatersBH = new Bloodhound({
    name: "Theaters",
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: theaterSearch,
    limit: 10
  });

  var museumsBH = new Bloodhound({
    name: "Museums",
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    local: museumSearch,
    limit: 10
  });

  var geonamesBH = new Bloodhound({
    name: "GeoNames",
    datumTokenizer: function (d) {
      return Bloodhound.tokenizers.whitespace(d.name);
    },
    queryTokenizer: Bloodhound.tokenizers.whitespace,
    remote: {
      url: "http://api.geonames.org/searchJSON?username=bootleaf&featureClass=P&maxRows=5&countryCode=US&name_startsWith=%QUERY",
      filter: function (data) {
        return $.map(data.geonames, function (result) {
          return {
            name: result.name + ", " + result.adminCode1,
            lat: result.lat,
            lng: result.lng,
            source: "GeoNames"
          };
        });
      },
      ajax: {
        beforeSend: function (jqXhr, settings) {
          settings.url += "&east=" + map.getBounds().getEast() + "&west=" + map.getBounds().getWest() + "&north=" + map.getBounds().getNorth() + "&south=" + map.getBounds().getSouth();
          $("#searchicon").removeClass("fa-search").addClass("fa-refresh fa-spin");
        },
        complete: function (jqXHR, status) {
          $('#searchicon').removeClass("fa-refresh fa-spin").addClass("fa-search");
        }
      }
    },
    limit: 10
  });
  boroughsBH.initialize();
  theatersBH.initialize();
  museumsBH.initialize();
  geonamesBH.initialize();
    
  shops21BH.initialize();

  /* instantiate the typeahead UI */
  $("#searchbox").typeahead({
    minLength: 3,
    highlight: true,
    hint: false
  }, {
    name: "Boroughs",
    displayKey: "name",
    source: boroughsBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'>Boroughs</h4>"
    }
  }, {
    name: "Theaters",
    displayKey: "name",
    source: theatersBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><img src='assets/img/theater.png' width='24' height='28'>&nbsp;Theaters</h4>",
      suggestion: Handlebars.compile(["{{name}}<br>&nbsp;<small>{{address}}</small>"].join(""))
    }
  },{
    name: "shops21",
    displayKey: "shops21",
    source: shops21BH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><img src='assets/img/museum.png' width='24' height='28'>&nbsp;Museums</h4>",
      suggestion: Handlebars.compile(["{{name}}<br>&nbsp;<small>{{address}}</small>"].join(""))
    }
  },{
    name: "Museums",
    displayKey: "name",
    source: museumsBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><img src='assets/img/museum.png' width='24' height='28'>&nbsp;Museums</h4>",
      suggestion: Handlebars.compile(["{{name}}<br>&nbsp;<small>{{address}}</small>"].join(""))
    }
  }, {
    name: "GeoNames",
    displayKey: "name",
    source: geonamesBH.ttAdapter(),
    templates: {
      header: "<h4 class='typeahead-header'><img src='assets/img/globe.png' width='25' height='25'>&nbsp;GeoNames</h4>"
    }
  }).on("typeahead:selected", function (obj, datum) {
    if (datum.source === "Boroughs") {
      map.fitBounds(datum.bounds);
    }
    if (datum.source === "Theaters") {
      if (!map.hasLayer(theaterLayer)) {
        map.addLayer(theaterLayer);
      }
      map.setView([datum.lat, datum.lng], 17);
      if (map._layers[datum.id]) {
        map._layers[datum.id].fire("click");
      }
    }
    if (datum.source === "Museums") {
      if (!map.hasLayer(museumLayer)) {
        map.addLayer(museumLayer);
      }
      map.setView([datum.lat, datum.lng], 17);
      if (map._layers[datum.id]) {
        map._layers[datum.id].fire("click");
      }
    }
    if (datum.source === "GeoNames") {
      map.setView([datum.lat, datum.lng], 14);
    }
    if ($(".navbar-collapse").height() > 50) {
      $(".navbar-collapse").collapse("hide");
    }
  }).on("typeahead:opened", function () {
    $(".navbar-collapse.in").css("max-height", $(document).height() - $(".navbar-header").height());
    $(".navbar-collapse.in").css("height", $(document).height() - $(".navbar-header").height());
  }).on("typeahead:closed", function () {
    $(".navbar-collapse.in").css("max-height", "");
    $(".navbar-collapse.in").css("height", "");
  });
  $(".twitter-typeahead").css("position", "static");
  $(".twitter-typeahead").css("display", "block");
});



//// Create marker for routing...
/// https://github.com/perliedman/leaflet-routing-machine/issues/104
///https://gis.stackexchange.com/questions/236934/leaflet-routing-control-change-marker-icon
//




/////// view-source:https://www.liedman.net/leaflet-routing-machine/tutorials/interaction/index.js
//createMarker: function (i, start, n){
//    var marker_icon = null
//    if (i == 0) {
//        // This is the first marker, indicating start
//        marker_icon = startIcon
//    } else if (i == n -1) {
//        //This is the last marker indicating destination
//        marker_icon =destinationIcon
//    }
//    var marker = L.marker (start.latLng, {
//                draggable: true,
//                bounceOnAdd: false,
//                bounceOnAddOptions: {
//                    duration: 1000,
//                    height: 800, 
//                    function(){
//                        (bindPopup(myPopup).openOn(map))
//                    }
//                },
//                icon: marker_icon
//    })
//    return marker




///// routing with my markers....
function button(label, container) {
    var btn = L.DomUtil.create('button', '', container);
    btn.setAttribute('type', 'button');
    btn.innerHTML = label;
    return btn;
}


//window.LRM = {
//apiToken: 'pk.eyJ1IjoibGllZG1hbiIsImEiOiJjazIwZGZvOXkwemQ5M211Z3B3c2M5bmpvIn0.Q8TUG4ornnhqO9ApeU3ZUQ'
//};


// My Map BOX KEY pk.eyJ1IjoicGF2bG9zZ2lzIiwiYSI6ImNqOWo2dHp3ZjAxdDkzMXFwaTlzNjNxdDkifQ.GbdCGFAd2TfeRxdIOPEhVA

var control = L.Routing.control({
        position:"topright",
        router: L.routing.mapbox('pk.eyJ1IjoicGF2bG9zZ2lzIiwiYSI6ImNqOWo2dHp3ZjAxdDkzMXFwaTlzNjNxdDkifQ.GbdCGFAd2TfeRxdIOPEhVA'),
        routeWhileDragging: true,
        plan: new (L.Routing.Plan.extend({
            
            createGeocoders: function() {
                var container = L.Routing.Plan.prototype.createGeocoders.call(this),
                    reverseButton = button('&#8593;&#8595;', container);

                L.DomEvent.on(reverseButton, 'click', function() {
                    var waypoints = this.getWaypoints();
                    this.setWaypoints(waypoints.reverse());
                }, this);

                return container;
            }
        }))([

        ], {
            geocoder: L.Control.Geocoder.nominatim(),
            routeWhileDragging: true
        }),collapsible: true,
           show: false
    })
    .on('routingerror', function(e) {
        try {
            map.getCenter();
        } catch (e) {
            map.fitBounds(L.latLngBounds(control.getWaypoints().map(function(wp) { return wp.latLng; })));
        }

        handleError(e);
    })
    .addTo(map);

/// Routing check boxxx......
//function myFunction() {
//  var checkBox = document.getElementById("routing_on_off");
//  if (checkBox.checked) {
////alert("checked")
//    markers21.on('click', function(e) {
//    var container = L.DomUtil.create('div'),
//        startBtn = button('Start from this location', container),
//        destBtn = button('Go to this location', container);
//
//    L.DomEvent.on(startBtn, 'click', function() {
//        control.spliceWaypoints(0, 1, e.latlng);
//        map.closePopup();
//    });
//
//    L.DomEvent.on(destBtn, 'click', function() {
//        control.spliceWaypoints(control.getWaypoints().length - 1, 1, e.latlng);
//        map.closePopup();
//    });
//
//    L.popup()
//        .setContent(container)
//        .setLatLng(e.latlng)
//        .openOn(map);
//})
//  } else if (checkBox.unchecked) {
//    map.on('click', function(e) {
//    var container = L.DomUtil.create('div'),
//        startBtn = button('Start from this location', container),
//        destBtn = button('Go to this location', container);
//
//    L.DomEvent.on(startBtn, 'click', function() {
//        control.spliceWaypoints(0, 1, e.latlng);
//        map.closePopup();
//    });
//
//    L.DomEvent.on(destBtn, 'click', function() {
//        control.spliceWaypoints(control.getWaypoints().length - 1, 1, e.latlng);
//        map.closePopup();
//    });
//
//    L.popup()
//        .setContent(container)
//        .setLatLng(e.latlng)
//        .openOn(map);
//});
//  }
//};


/// Routing check boxxx 22222222......
///////////////
$(document).ready(function () {

//  $('input[id^="routing_on_off"]').click(function () {

//    if ($(this).prop('checked')) {
    markers21.on('dblclick', function(e) {
    var container = L.DomUtil.create('div'),
        startBtn = button('Start from this location', container),
        destBtn = button('Go to this location', container);

    L.DomEvent.on(startBtn, 'click', function() {
        control.spliceWaypoints(0, 1, e.latlng);
        map.closePopup();
    });

    L.DomEvent.on(destBtn, 'click', function() {
        control.spliceWaypoints(control.getWaypoints().length - 1, 1, e.latlng);
        map.closePopup();
    });

    L.popup()
        .setContent(container)
        .setLatLng(e.latlng)
        .openOn(map);
});     
//       alert("Checked");
//    }
//    else  {
//        //
//       alert("Unchecked");  
//    }
//  });

});


////////////////////////////////////////////
//map.on('click', function(e) {
//    var container = L.DomUtil.create('div'),
//        startBtn = button('Start from this location', container),
//        destBtn = button('Go to this location', container);
//
//    L.DomEvent.on(startBtn, 'click', function() {
//        control.spliceWaypoints(0, 1, e.latlng);
//        map.closePopup();
//    });
//
//    L.DomEvent.on(destBtn, 'click', function() {
//        control.spliceWaypoints(control.getWaypoints().length - 1, 1, e.latlng);
//        map.closePopup();
//    });
//
//    L.popup()
//        .setContent(container)
//        .setLatLng(e.latlng)
//        .openOn(map);
//});


///////
(function() {
    'use strict';

    L.Routing.routeToGeoJson = function(route) {
        var wpNames = [],
            wpCoordinates = [],
            i,
            wp,
            latLng;

        for (i = 0; i < route.waypoints.length; i++) {
            wp = route.waypoints[i];
            latLng = L.latLng(wp.latLng);
            wpNames.push(wp.name);
            wpCoordinates.push([latLng.lng, latLng.lat]);
        }

        return {
            type: 'FeatureCollection',
            features: [
                {
                    type: 'Feature',
                    properties: {
                        id: 'waypoints',
                        names: wpNames
                    },
                    geometry: {
                        type: 'MultiPoint',
                        coordinates: wpCoordinates
                    }
                },
                {
                    type: 'Feature',
                    properties: {
                        id: 'line',
                    },
                    geometry: L.Routing.routeToLineString(route)
                }
            ]
        };
    };

    L.Routing.routeToLineString = function(route) {
        var lineCoordinates = [],
            i,
            latLng;

        for (i = 0; i < route.coordinates.length; i++) {
            latLng = L.latLng(route.coordinates[i]);
            lineCoordinates.push([latLng.lng, latLng.lat]);
        }

        return {
            type: 'LineString',
            coordinates: lineCoordinates
        };
    };
})();


control.on('routesfound', function(e) {
    console.log(L.Routing.routeToGeoJson(e.routes[0]));
});

L.Routing.errorControl(control).addTo(map);


function handleError(e) {
    if (e.error.status === -1) {
      // HTTP error, show our error banner
      document.querySelector('#osrm-error').style.display = 'block';
      L.DomEvent.on(document.querySelector('#osrm-error-close'), 'click', function(e) {
        document.querySelector('#osrm-error').style.display = 'none';
        L.DomEvent.preventDefault(e);
      });
    }
  }

////////// legends

/*Legend specific*/
var legend = L.control({ position: "bottomleft" });

legend.onAdd = function(map) {
  var div = L.DomUtil.create("div", "legend");
  div.innerHTML += "<h4>Customer Status</h4>";
  div.innerHTML += '<i style="background: #0df25c"></i><span>In time</span><br>';
  div.innerHTML += '<i style="background: #fd9a00"></i><span>Late 1 (15+ days than usual) </span><br>';
  div.innerHTML += '<i style="background: #FF0000"></i><span>Late 2 (30+ days than usual) </span><br>';
  
  div.innerHTML += '<i style="background: #969696"></i><span>New Customer (1 invoice)</span><br>';
  div.innerHTML += '<i style="background: #a613b9"></i><span>Alla Bolag Tobak Shops</span><br>';
  div.innerHTML += '<i style="background: #000000"></i><span>Inactive</span><br>';
    
//  div.innerHTML += '<i class="icon" style="background-image: url(https://d30y9cdsu7xlg0.cloudfront.net/png/194515-200.png);background-repeat: no-repeat;"></i><span>Grænse</span><br>';
  
  

  return div;
};

legend.addTo(map);












/////////////


//// SLIDE BAR

//var slidervar = document.getElementById('slider');
//noUiSlider.create(slidervar, {
//    connect: true,
//    start: [ 1, 35676000 ],
//    range: {
//        min: 1,
//        max: 35676000
//    }
//});










//////////// routing 1 WORKING................... GOOOD
//////////////// WORKING................... GOOOD

//var control = L.Routing.control(L.extend(window.lrmConfig, {
//	waypoints: [
//
//	],
//	geocoder: L.Control.Geocoder.nominatim(),
//	routeWhileDragging: true,
//	reverseWaypoints: true,
//	showAlternatives: true,
//    lineOptions: {
//        styles: [{className: 'animate'}] // Adding animate class
//    },
//    routeWhileDragging: true,
//	altLineOptions: {
//		styles: [
//			{color: 'black', opacity: 0.15, weight: 9},
//			{color: 'white', opacity: 0.8, weight: 6},
//			{color: 'blue', opacity: 0.5, weight: 2}
//		]
//	}
//})).addTo(map);
//
//L.Routing.errorControl(control).addTo(map);






////////////////////////// TRASH //////////////////////////
////////////////////////// TRASH //////////////////////////
////////////////////////// TRASH //////////////////////////
////////////////////////// TRASH //////////////////////////
/// routing animate
//
//var control = L.Routing.control({
//    waypoints: [
//        L.latLng(57.74, 11.94),
//        L.latLng(57.6792, 11.949)
//    ],
//    lineOptions: {
//        styles: [{className: 'animate'}] // Adding animate class
//    },
//    routeWhileDragging: true
//}).addTo(map);
//
//
//L.Routing.errorControl(control).addTo(map);


///// routing 2.....



// Leaflet patch to make layer control scrollable on touch browsers
//var container = $(".leaflet-control-layers")[0];
//if (!L.Browser.touch) {
//  L.DomEvent
//  .disableClickPropagation(container)
//  .disableScrollPropagation(container);
//} else {
//  L.DomEvent.disableClickPropagation(container);
//}





///// Drawing...
//const waypoints = [
//  {
//    lat: 57.74,
//    lng: 11.94
//  },
//  {
//    lat: 57.6792,
//    lng: 11.949
//  }
//];
//
//const routingControl = L.Routing.control({
//  // router: new L.Routing.OSRMv1({
//  //   serviceUrl: ROUTER_SERVICE_URL
//  // }),
//  plan: new L.Routing.plan([], {
//    addWaypoints: false,
//    draggableWaypoints: false,
//    createMarker: () => undefined
//  }),
//  lineOptions: {
//    addWaypoints: false
//  },
//  collapsible: true,
//  show: false
//});
//
//map.addControl(routingControl);
//
//routingControl.setWaypoints(waypoints);