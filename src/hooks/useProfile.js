import { useState, useEffect, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as FileSystem from "expo-file-system/legacy";
import { decode } from "base64-arraybuffer";
import { supabase } from "../lib/supabase";

export function useProfile() {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        fetchProfile(user.id);
      }
    });
  }, []);

  const fetchProfile = useCallback(async (uid) => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    if (!error) setProfile(data);
    setLoading(false);
  }, []);

  const updateProfile = async (fields) => {
    if (!userId) return { error: "Not authenticated" };
    setSaving(true);
    const { data, error } = await supabase
      .from("profiles")
      .upsert({ id: userId, ...fields, updated_at: new Date().toISOString() })
      .select()
      .single();
    if (!error) setProfile(data);
    setSaving(false);
    return { data, error };
  };

  const pickAndUploadAvatar = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return { error: "Permission to access photos was denied." };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (result.canceled) return { canceled: true };

    const asset = result.assets[0];
    const ext = asset.uri.split(".").pop().toLowerCase().replace("jpg", "jpeg");
    const path = `${userId}/avatar.${ext}`;

    // Read as base64 then decode to ArrayBuffer — works reliably on Android
    const base64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: "base64",
    });

    setSaving(true);
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, decode(base64), {
        contentType: `image/${ext}`,
        upsert: true,
      });

    if (uploadError) {
      setSaving(false);
      return { error: uploadError.message };
    }

    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    // Bust cache by appending timestamp
    const avatar_url = `${urlData.publicUrl}?t=${Date.now()}`;
    return updateProfile({ avatar_url });
  };

  const getAvatarUrl = () => profile?.avatar_url ?? null;

  return {
    profile,
    loading,
    saving,
    updateProfile,
    pickAndUploadAvatar,
    getAvatarUrl,
    refetch: () => userId && fetchProfile(userId),
  };
}
