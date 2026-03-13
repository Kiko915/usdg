import { useState, useEffect } from "react";
import { View, StyleSheet } from "react-native";
import { supabase } from "../lib/supabase";
import LeafletMap from "../components/LeafletMap";

export default function MapScreen() {
  const [memories, setMemories] = useState([]);
  const [selectedCoord, setSelectedCoord] = useState(null);

  useEffect(() => {
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
    };
  }, []);

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
    console.log("Long press at:", coordinate);
  };

  return (
    <View style={styles.container}>
      <LeafletMap markers={memories} onLongPress={handleLongPress} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A" },
});
