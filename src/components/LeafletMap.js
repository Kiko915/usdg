import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
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

    .leaflet-control-attribution {
      font-size: 9px;
      background: rgba(0,0,0,0.6) !important;
      color: #555 !important;
    }
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

    /* User location dot */
    .user-dot-outer {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-dot-ring {
      position: absolute;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(255, 93, 143, 0.25);
      animation: ring-pulse 2s ease-out infinite;
    }
    .user-dot-core {
      position: relative;
      width: 14px;
      height: 14px;
      background: #FF5D8F;
      border-radius: 50%;
      border: 2.5px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      z-index: 1;
    }
    /* Partner location dot (Blue) */
    .partner-dot-outer {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .partner-dot-ring {
      position: absolute;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      background: rgba(66, 133, 244, 0.25);
      animation: ring-pulse 2s ease-out infinite;
    }
    .partner-dot-core {
      position: relative;
      width: 14px;
      height: 14px;
      background: #4285F4;
      border-radius: 50%;
      border: 2.5px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      z-index: 1;
    }
    /* Partner avatar marker */
    .partner-avatar-outer {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .partner-avatar-ring {
      position: absolute;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: rgba(66, 133, 244, 0.25);
      animation: ring-pulse 2s ease-out infinite;
    }
    .partner-avatar-img {
      width: 30px;
      height: 30px;
      border-radius: 50%;
      border: 2.5px solid #fff;
      box-shadow: 0 2px 6px rgba(0,0,0,0.5);
      z-index: 1;
      object-fit: cover;
    }
    @keyframes ring-pulse {
      0%   { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    // Start with a world view — will fly to user location once received
    var map = L.map('map', { zoomControl: true }).setView([20, 0], 2);

    // Tiles injected via setMapTheme() after React Native sends the current theme
    var memoryMarkers = {};
    var userMarker = null;
    var partnerMarker = null;
    var accuracyCircle = null;
    var pressTimer = null;
    var didPan = false;

    // Memory pin — pink dot
    var pinIcon = L.divIcon({
      html: '<div style="width:14px;height:14px;background:#FF5D8F;border-radius:50%;border:2.5px solid #fff;box-shadow:0 2px 8px rgba(255,93,143,0.5);"></div>',
      className: '',
      iconSize: [14, 14],
      iconAnchor: [7, 7],
      popupAnchor: [0, -10]
    });

    // User location dot — pink pulsing
    var userIcon = L.divIcon({
      html: '<div class="user-dot-outer"><div class="user-dot-ring"></div><div class="user-dot-core"></div></div>',
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14]
    });

    // Partner location dot — blue pulsing (or avatar)
    var partnerIcon = L.divIcon({
      html: '<div class="partner-dot-outer"><div class="partner-dot-ring"></div><div class="partner-dot-core"></div></div>',
      className: '',
      iconSize: [22, 22],
      iconAnchor: [11, 11],
      popupAnchor: [0, -14]
    });

    // Avatar-based partner marker
    function createPartnerAvatarIcon(avatarUrl) {
      var escapedUrl = avatarUrl.replace(/'/g, "\\'").replace(/"/g, '\\"');
      return L.divIcon({
        html: '<div class="partner-avatar-outer"><div class="partner-avatar-ring"></div><img class="partner-avatar-img" src="' + escapedUrl + '" /></div>',
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        popupAnchor: [0, -20]
      });
    }

    // ── Long press detection ──
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

    // ── Set memory markers ──
    function setMarkers(data) {
      Object.values(memoryMarkers).forEach(function(m) { map.removeLayer(m); });
      memoryMarkers = {};
      data.forEach(function(m) {
        if (m.lat == null || m.lng == null) return;
        var marker = L.marker([m.lat, m.lng], { icon: pinIcon });
        var popup = '<b>' + (m.title || 'Memory') + '</b>';
        if (m.description) popup += '<br><span>' + m.description + '</span>';
        marker.bindPopup(popup);
        marker.addTo(map);
        memoryMarkers[m.id] = marker;
      });
    }

    // ── Set user location ──
    function setUserLocation(lat, lng, accuracy) {
      // Remove old layers
      if (userMarker) { map.removeLayer(userMarker); userMarker = null; }
      if (accuracyCircle) { map.removeLayer(accuracyCircle); accuracyCircle = null; }

      // Accuracy radius circle (accent semi-transparent)
      if (accuracy && accuracy > 0) {
        accuracyCircle = L.circle([lat, lng], {
          radius: accuracy,
          color: '#FF5D8F',
          fillColor: '#FF5D8F',
          fillOpacity: 0.08,
          weight: 1,
          opacity: 0.4,
        }).addTo(map);
      }

      // Pulsing pink dot
      userMarker = L.marker([lat, lng], { icon: userIcon, zIndexOffset: 1000 })
        .bindPopup('<b>You are here</b>')
        .addTo(map);

      // Only fly to location smoothly if we haven't panned yet
      if (!didPan) {
        map.flyTo([lat, lng], 16, { animate: true, duration: 1.5 });
      }
    }

    var currentPartnerAvatarUrl = null;
    var currentPartnerName = "Partner";

    // ── Set partner location ──
    function setPartnerLocation(lat, lng, avatarUrl, name) {
      currentPartnerAvatarUrl = avatarUrl || null;
      currentPartnerName = name || "Partner";
      var icon = avatarUrl ? createPartnerAvatarIcon(avatarUrl) : partnerIcon;
      var popupContent = '<b>' + currentPartnerName + '</b>';
      if (partnerMarker) {
        partnerMarker.setLatLng([lat, lng]);
        partnerMarker.setIcon(icon);
        partnerMarker.setPopupContent(popupContent);
      } else {
        partnerMarker = L.marker([lat, lng], { icon: icon, zIndexOffset: 999 })
          .bindPopup(popupContent)
          .addTo(map);
      }
    }

    // ── Recenter ──
    function recenterToUser() {
      if (userMarker) {
        var latlng = userMarker.getLatLng();
        map.flyTo(latlng, 16, { animate: true, duration: 1.2 });
      }
    }

    // ── Theme switching ──
    var tileLayer = null;
    var TILES = {
      dark:  'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      light: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    };

    function setMapTheme(t) {
      if (tileLayer) map.removeLayer(tileLayer);
      tileLayer = L.tileLayer(TILES[t] || TILES.dark, {
        attribution: '&copy; <a href="https://openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(map);

      // Update popup styles dynamically
      var isDark = t === 'dark';
      var style = document.getElementById('theme-style') || document.createElement('style');
      style.id = 'theme-style';
      style.textContent = isDark
        ? '.leaflet-popup-content-wrapper{background:#111!important;color:#eee!important;border:1px solid #2a2a2a;border-radius:10px!important;box-shadow:0 4px 16px rgba(0,0,0,.6)!important}.leaflet-popup-tip{background:#111!important}.leaflet-popup-content b{color:#fff}.leaflet-popup-content span{color:#888}.leaflet-control-zoom a{background:#1a1a1a!important;color:#aaa!important;border-color:#2a2a2a!important}.leaflet-control-attribution{background:rgba(0,0,0,.6)!important;color:#555!important}'
        : '.leaflet-popup-content-wrapper{background:#fff!important;color:#1c1c1e!important;border:1px solid #e5e5ea;border-radius:10px!important;box-shadow:0 4px 16px rgba(0,0,0,.12)!important}.leaflet-popup-tip{background:#fff!important}.leaflet-popup-content b{color:#1c1c1e}.leaflet-popup-content span{color:#6c6c70}.leaflet-control-zoom a{background:#fff!important;color:#1c1c1e!important;border-color:#e5e5ea!important}.leaflet-control-attribution{background:rgba(255,255,255,.8)!important;color:#aeaeb2!important}';
      document.head.appendChild(style);

      document.body.style.background = isDark ? '#0a0a0a' : '#f2f2f7';
    }

    // ── Message handler ──
    function handleMessage(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'setMarkers') setMarkers(msg.markers);
        if (msg.type === 'setUserLocation') setUserLocation(msg.lat, msg.lng, msg.accuracy);
        if (msg.type === 'setPartnerLocation') setPartnerLocation(msg.lat, msg.lng, msg.avatarUrl, msg.partnerName);
      } catch(e) {}
    }

    document.addEventListener('message', handleMessage);
    window.addEventListener('message', handleMessage);
  </script>
</body>
</html>
`;

const LeafletMap = forwardRef(function LeafletMap({ markers = [], userLocation = null, partnerLocation = null, partnerAvatarUrl = null, partnerName = "Partner", mapTheme = "dark", onLongPress }, ref) {
  const webViewRef = useRef(null);

  useImperativeHandle(ref, () => ({
    recenter: () => {
      if (!webViewRef.current || !isLoaded.current) return;
      webViewRef.current.injectJavaScript(`recenterToUser(); true;`);
    },
  }));
  const pendingMarkers = useRef(markers);
  const pendingUserLocation = useRef(userLocation);
  const pendingPartnerLocation = useRef(partnerLocation);
  const pendingPartnerAvatarUrl = useRef(partnerAvatarUrl);
  const pendingPartnerName = useRef(partnerName);
  const pendingTheme = useRef(mapTheme);
  const isLoaded = useRef(false);

  const pushTheme = (t) => {
    if (!webViewRef.current || !isLoaded.current) return;
    webViewRef.current.injectJavaScript(`setMapTheme(${JSON.stringify(t)}); true;`);
  };

  const pushMarkers = (list) => {
    if (!webViewRef.current || !isLoaded.current) return;
    webViewRef.current.injectJavaScript(`setMarkers(${JSON.stringify(list)}); true;`);
  };

  const pushUserLocation = (loc) => {
    if (!webViewRef.current || !isLoaded.current || !loc) return;
    webViewRef.current.injectJavaScript(
      `setUserLocation(${loc.latitude}, ${loc.longitude}, ${loc.accuracy ?? 0}); true;`
    );
  };

  const pushPartnerLocation = (loc, avatarUrl, name) => {
    if (!webViewRef.current || !isLoaded.current || !loc) return;
    webViewRef.current.injectJavaScript(
      `setPartnerLocation(${loc.latitude}, ${loc.longitude}, ${JSON.stringify(avatarUrl)}, ${JSON.stringify(name)}); true;`
    );
  };

  useEffect(() => {
    pendingMarkers.current = markers;
    pushMarkers(markers);
  }, [markers]);

  useEffect(() => {
    pendingUserLocation.current = userLocation;
    pushUserLocation(userLocation);
  }, [userLocation]);

  useEffect(() => {
    pendingPartnerLocation.current = partnerLocation;
    pendingPartnerAvatarUrl.current = partnerAvatarUrl;
    pendingPartnerName.current = partnerName;
    pushPartnerLocation(partnerLocation, partnerAvatarUrl, partnerName);
  }, [partnerLocation, partnerAvatarUrl, partnerName]);

  useEffect(() => {
    pendingTheme.current = mapTheme;
    pushTheme(mapTheme);
  }, [mapTheme]);

  const handleLoad = () => {
    isLoaded.current = true;
    pushTheme(pendingTheme.current);
    pushMarkers(pendingMarkers.current);
    pushUserLocation(pendingUserLocation.current);
    pushPartnerLocation(pendingPartnerLocation.current, pendingPartnerAvatarUrl.current, pendingPartnerName.current);
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
});

export default LeafletMap;

const styles = StyleSheet.create({
  map: { flex: 1, backgroundColor: "#0A0A0A" },
});
