Proj4js.defs["EPSG:3857"] = "+proj=merc +a=6378137 +b=6378137 +lat_ts=0.0 +lon_0=0.0 +x_0=0.0 +y_0=0 +k=1.0 +units=m +nadgrids=@null +wktext  +no_defs";
var osm_resolutions = [156543.03390625, 78271.516953125, 39135.7584765625,
              19567.87923828125, 9783.939619140625, 4891.9698095703125,
              2445.9849047851562, 1222.9924523925781, 611.4962261962891,
              305.74811309814453, 152.87405654907226, 76.43702827453613,
              38.218514137268066, 19.109257068634033, 9.554628534317017,
              4.777314267158508, 2.388657133579254, 1.194328566789627,
              0.5971642833948135];
var all_resolutions = osm_resolutions.concat(0.25).concat(0.125)

var center = new OpenLayers.LonLat(-67685, 6659062);
var map_bounds = new OpenLayers.Bounds([-68900, 6657782, -65924, 6660310]);

var wgs = new OpenLayers.Projection("EPSG:4326")
var web_mercator = new OpenLayers.Projection("EPSG:3857")
var map;

$(function(){
    OpenLayers.DOTS_PER_INCH = 90.7142367;
    OpenLayers.Util.onImageLoadErrorColor = 'transparent';
    map = new OpenLayers.Map('map',
      {projection: "EPSG:3857",
       displayProjection: web_mercator,
        resolutions: all_resolutions,
       units: 'm',
       controls: [
                new OpenLayers.Control.ScaleLine(),
                new OpenLayers.Control.Navigation(),
                new OpenLayers.Control.PanZoomBar({panIcons: false}),
                new OpenLayers.Control.LayerSwitcher({'ascending':false}),
                new OpenLayers.Control.Permalink({anchor: true, displayProjection: wgs}),
                new OpenLayers.Control.MousePosition({displayProjection: wgs}),
                new OpenLayers.Control.KeyboardDefaults()
              ]
    });

    base_layer = new OpenLayers.Layer.OSM("OpenStreetMap", [
          '//a.tile.openstreetmap.org/${z}/${x}/${y}.png',
          '//b.tile.openstreetmap.org/${z}/${x}/${y}.png',
          '//c.tile.openstreetmap.org/${z}/${x}/${y}.png'
        ], {
          resolutions: all_resolutions,
          serverResolutions: osm_resolutions,
          transitionEffect: 'resize'
        });

    map.addLayer(base_layer);

    $.getScript('layers.js');


    function setOpacity() {
      if (map.getZoom() < 14 || !map_bounds.containsLonLat(map.getCenter())) {
        base_layer.setOpacity(1);
      } else {
        base_layer.setOpacity(0.1);
      }
    }

    map.events.register('zoomend', map, setOpacity);
    map.events.register('moveend', map, setOpacity);
    setOpacity();

    var markers = new OpenLayers.Layer.Markers("Marker", {
        'minZoomLevel': 1, 'maxZoomLevel': 13,
        'displayInLayerSwitcher':false
        });


    map.addLayer(markers);
    var size = new OpenLayers.Size(50, 50);
    var offset = new OpenLayers.Pixel(-size.w/2, -size.h/2);
    var icon = new OpenLayers.Icon('pin.png', size, offset);
    markers.addMarker(new OpenLayers.Marker(center, icon));

    villagesLayer = new OpenLayers.Layer.Markers("Villages (Wiki)");
   $.getJSON("/villages.php", function(data) {
        villages = data["results"];
        for (key in villages) {
            (function(){
                village = villages[key]
                var name = village["fulltext"].substr(9);
                var url = village["fullurl"];
                if (village["printouts"]["Village Location"].length == 0) {
                  return;
                }
                lat = village["printouts"]["Village Location"][0]["lat"];
                lon = village["printouts"]["Village Location"][0]["lon"];
                var coordinate = new OpenLayers.LonLat(lon, lat);
                var description = village["printouts"]["Village Description"][0];
                coordinate.transform(wgs, web_mercator);
                size = new OpenLayers.Size(20,20);
                offset = new OpenLayers.Pixel(-(size.w/2), -size.h);
                if (village["printouts"]["Image"].length > 0) {
                  icon = new OpenLayers.Icon(village["printouts"]["Image"][0], size, offset);
                } else {
                  icon = new OpenLayers.Icon("pin.png", size, offset);
                }
                marker = new OpenLayers.Marker(coordinate, icon);
                marker.events.register('mousedown', marker, function (event) {
                    a = jQuery("<a/>");
                    a.attr("href", url);
                    a.text(name);
                    b = jQuery("<b/>");
                    a.appendTo(b);
                    p = jQuery("<p>");
                    p.text(description);
                    div = jQuery("<div/>");
                    b.appendTo(div);
                    p.appendTo(div);
                    popup = new OpenLayers.Popup.FramedCloud(event.id, coordinate,
                            null, div.html(), icon, true);
                    popup.autoSize = false;
                    map.addPopup(popup, true);
                    OpenLayers.Event.stop(event);
                });
                villagesLayer.addMarker(marker);
            })();
        }
    });


    map.addLayer(villagesLayer);
    villagesLayer.setZIndex(500);


    var style = {
        fillColor: '#000',
        fillOpacity: 0.1,
        strokeWidth: 0
    };

    var location_vector = new OpenLayers.Layer.Vector('vector');

    var geolocate = new OpenLayers.Control.Geolocate({
        bind: false,
        geolocationOptions: {
            enableHighAccuracy: true,
            maximumAge: 0,
            timeout: 7000
        }
    });

    map.addControl(geolocate);

    geolocate.events.register("locationupdated",geolocate,function(e) {
        location_vector.removeAllFeatures();
        var circle = new OpenLayers.Feature.Vector(
            OpenLayers.Geometry.Polygon.createRegularPolygon(
                new OpenLayers.Geometry.Point(e.point.x, e.point.y),
                e.position.coords.accuracy/2,
                40,
                0
            ),
            {},
            style
        );
        location_vector.addFeatures([
            new OpenLayers.Feature.Vector(
                e.point,
                {},
                {
                    graphicName: 'cross',
                    strokeColor: '#f00',
                    strokeWidth: 1,
                    fillOpacity: 0,
                    pointRadius: 10
                }
            ),
            circle
        ]);
    });

    map.addLayer(location_vector);


    geolocate.activate();

    if (!map.getCenter()) {
      map.setCenter(center, 16);
    }
});