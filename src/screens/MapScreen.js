import { useState, useEffect, useRef } from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Location from "expo-location";
import { supabase } from "../lib/supabase";
import LeafletMap from "../components/LeafletMap";
import { useToast } from "../context/ToastContext";
import { useTheme } from "../context/ThemeContext";
import { usePartner } from "../hooks/usePartner";

export default function MapScreen() {
  const { showToast } = useToast();
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);
  const { userId, profile, partner, getAvatarUrl } = usePartner();

  const partnerAvatarUrl = partner ? getAvatarUrl(partner.avatar_url) : null;
  const partnerName = partner?.username || "Partner";

  const [memories, setMemories] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [partnerLocation, setPartnerLocation] = useState(null);
  const [selectedCoord, setSelectedCoord] = useState(null);

  const locationSubRef = useRef(null);
  const realtimeChannelRef = useRef(null);

  useEffect(() => {
    requestLocation();
    fetchAllMemories();

    const memoriesChannel = supabase
      .channel("memories-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "memories" },
        (payload) => {
          if (payload.eventType === "INSERT")
            setMemories((prev) => [...prev, { ...payload.new, memory_images: [] }]);
          else if (payload.eventType === "UPDATE")
            setMemories((prev) =>
              prev.map((m) => m.id === payload.new.id
                ? { ...payload.new, memory_images: m.memory_images } : m));
          else if (payload.eventType === "DELETE")
            setMemories((prev) => prev.filter((m) => m.id !== payload.old.id));
        })
      .subscribe();

    const imagesChannel = supabase
      .channel("memory-images-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "memory_images" },
        (payload) => {
          const memoryId = payload.eventType === "DELETE"
            ? payload.old.memory_id : payload.new.memory_id;
          if (memoryId) refetchMemory(memoryId);
        })
      .subscribe();

    return () => {
      memoriesChannel.unsubscribe();
      imagesChannel.unsubscribe();
      if (locationSubRef.current) {
        locationSubRef.current.remove();
      }
      if (realtimeChannelRef.current) {
        realtimeChannelRef.current.unsubscribe();
      }
    };
  }, []);

  // Set up live broadcast channel once we know both IDs
  useEffect(() => {
    if (!userId || !profile?.partner_id) return;

    const coupleId = [userId, profile.partner_id].sort().join(":");
    
    const channel = supabase.channel(`live-location:${coupleId}`)
      .on("broadcast", { event: "location_update" }, (payload) => {
        // Only process updates from the partner, not our own echoed back
        if (payload.payload.user_id !== userId) {
          setPartnerLocation(payload.payload.location);
        }
      })
      .subscribe();
      
    realtimeChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      realtimeChannelRef.current = null;
    };
  }, [userId, profile?.partner_id]);

  const requestLocation = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      showToast({
        type: "warning",
        title: "Location access denied",
        message: "Enable location permission to center the map on you.",
      });
      return;
    }

    // Initial position
    const loc = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });
    
    const initialLocation = {
      latitude: loc.coords.latitude,
      longitude: loc.coords.longitude,
      accuracy: loc.coords.accuracy,
    };
    setUserLocation(initialLocation);

    // Subscribe to live location updates
    locationSubRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 3000, // Update every 3 seconds minimum
        distanceInterval: 5, // Update if moved by 5 meters
      },
      (newLoc) => {
        const updatedLocation = {
          latitude: newLoc.coords.latitude,
          longitude: newLoc.coords.longitude,
          accuracy: newLoc.coords.accuracy,
        };
        setUserLocation(updatedLocation);

        // Broadcast to partner if linked
        if (realtimeChannelRef.current) {
          realtimeChannelRef.current.send({
            type: "broadcast",
            event: "location_update",
            payload: { user_id: userId, location: updatedLocation }
          });
        }
      }
    );
  };

  const handleRecenter = () => {
    mapRef.current?.recenter();
  };

  const fetchAllMemories = async () => {
    const { data, error } = await supabase
      .from("memories")
      .select("*, memory_images(id, storage_path, position)")
      .order("position", { referencedTable: "memory_images", ascending: true });
    if (!error) setMemories(data);
  };

  const refetchMemory = async (memoryId) => {
    const { data, error } = await supabase
      .from("memories")
      .select("*, memory_images(id, storage_path, position)")
      .order("position", { referencedTable: "memory_images", ascending: true })
      .eq("id", memoryId)
      .single();
    if (!error)
      setMemories((prev) => prev.map((m) => (m.id === memoryId ? data : m)));
  };

  const handleLongPress = (coordinate) => {
    setSelectedCoord(coordinate);
  };

  // Sit just above the tab bar pill
  const recenterBottom = insets.bottom + 90;

  return (
    <View style={styles.container}>
      <LeafletMap
        ref={mapRef}
        markers={memories}
        userLocation={userLocation}
        partnerLocation={partnerLocation}
        partnerAvatarUrl={partnerAvatarUrl}
        partnerName={partnerName}
        mapTheme={theme}
        onLongPress={handleLongPress}
      />

      <TouchableOpacity
        style={[
          styles.recenterBtn,
          {
            bottom: recenterBottom,
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
        ]}
        onPress={handleRecenter}
        activeOpacity={0.75}
      >
        <Ionicons name="locate" size={20} color={colors.accent} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  recenterBtn: {
    position: "absolute",
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
});
