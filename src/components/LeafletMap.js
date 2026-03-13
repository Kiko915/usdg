import { useRef, useEffect } from "react";
import { StyleSheet } from "react-native";
import { WebView } from "react-native-webview";

const MAP_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; background: #0a0a0a; }
    .leaflet-control-attribution { font-size: 9px; background: rgba(0,0,0,0.6) !important; color: #555 !important; }
    .leaflet-control-attribution a { color: #666 !important; }
    .leaflet-control-zoom a {
      background: #1a1a1a !important;
      color: #aaa !important;
      border-color: #2a2a2a !important;
    }
    .leaflet-popup-content-wrapper {
      background: #111 !important;
      color: #eee !important;
      border: 1px solid #2a2a2a;
      border-radius: 10px !important;
      box-shadow: 0 4px 16px rgba(0,0,0,0.6) !important;
    }
    .leaflet-popup-tip { background: #111 !important; }
    .leaflet-popup-content b { color: #fff; font-size: 13px; }
    .leaflet-popup-content span { color: #888; font-size: 12px; }
    .leaflet-container { font-family: sans-serif; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var map = L.map('map', { zoomControl: true }).setView([37.7749, -122.4194], 13);

    // CartoDB Dark Matter — free, no API key needed
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 20
    }).addTo(map);

    var activeMarkers = {};
    var pressTimer = null;
    var didPan = false;

    var pinIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#FF5D8F;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(255,93,143,0.5);"></div>',
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10]
    });

    map.on('mousedown touchstart', function(e) {
      didPan = false;
      pressTimer = setTimeout(function() {
        if (!didPan) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'longPress',
            lat: e.latlng.lat,
            lng: e.latlng.lng
          }));
        }
      }, 600);
    });
    map.on('dragstart', function() { didPan = true; clearTimeout(pressTimer); });
    map.on('mouseup touchend touchcancel', function() { clearTimeout(pressTimer); });

    function setMarkers(data) {
      Object.values(activeMarkers).forEach(function(m) { map.removeLayer(m); });
      activeMarkers = {};
      data.forEach(function(m) {
        if (m.lat == null || m.lng == null) return;
        var marker = L.marker([m.lat, m.lng], { icon: pinIcon });
        var popup = '<b>' + (m.title || 'Memory') + '</b>';
        if (m.description) popup += '<br><span>' + m.description + '</span>';
        marker.bindPopup(popup);
        marker.addTo(map);
        activeMarkers[m.id] = marker;
      });
    }

    function handleMessage(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'setMarkers') setMarkers(msg.markers);
        if (msg.type === 'flyTo') map.flyTo([msg.lat, msg.lng], msg.zoom || 15);
      } catch(e) {}
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
  </script>
</body>
</html>
`;

export default function LeafletMap({ markers = [], onLongPress }) {
  const webViewRef = useRef(null);
  const pendingMarkers = useRef(markers);

  const pushMarkers = (list) => {
    if (!webViewRef.current) return;
    webViewRef.current.injectJavaScript(`
      setMarkers(${JSON.stringify(list)});
      true;
    `);
  };

  // Keep ref up-to-date so onLoad can inject immediately after first render
  useEffect(() => {
    pendingMarkers.current = markers;
    pushMarkers(markers);
  }, [markers]);

  const handleLoad = () => {
    pushMarkers(pendingMarkers.current);
  };

  const handleMessage = (event) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === "longPress" && onLongPress) {
        onLongPress({ latitude: msg.lat, longitude: msg.lng });
      }
    } catch (e) {}
  };

  return (
    <WebView
      ref={webViewRef}
      source={{ html: MAP_HTML }}
      style={styles.map}
      onLoad={handleLoad}
      onMessage={handleMessage}
      javaScriptEnabled
      domStorageEnabled
      originWhitelist={["*"]}
      scrollEnabled={false}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: "#0A0A0A" },
});
