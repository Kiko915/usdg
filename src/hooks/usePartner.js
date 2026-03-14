import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";

export function usePartner() {
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);
  const partnerSubRef = useRef(null);

  const loadPartner = async (partnerId) => {
    if (!partnerId) { setPartner(null); return; }
    const { data } = await supabase.from("profiles").select("*").eq("id", partnerId).single();
    setPartner(data ?? null);

    // Subscribe to partner profile changes (mood sync)
    partnerSubRef.current?.unsubscribe();
    partnerSubRef.current = supabase
      .channel(`partner-profile:${partnerId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "profiles",
        filter: `id=eq.${partnerId}`,
      }, (payload) => {
        setPartner((prev) => prev ? { ...prev, ...payload.new } : payload.new);
      })
      .subscribe();
  };

  useEffect(() => {
    let selfSub = null;

    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setUserId(user.id);

      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(p);

      if (p?.partner_id) {
        await loadPartner(p.partner_id);
      }

      // Subscribe to own profile row so partner_id changes (set by RPC) reload partner
      selfSub = supabase
        .channel(`self-profile:${user.id}`)
        .on("postgres_changes", {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        }, async (payload) => {
          const updated = payload.new;
          setProfile((prev) => prev ? { ...prev, ...updated } : updated);
          // partner_id changed
          if (updated.partner_id !== undefined) {
            await loadPartner(updated.partner_id ?? null);
          }
        })
        .subscribe();

      setLoading(false);
    };

    init();
    return () => {
      selfSub?.unsubscribe();
      partnerSubRef.current?.unsubscribe();
    };
  }, []);

  const updateStatus = async (emoji) => {
    if (!userId) return;
    const next = profile?.status === emoji ? null : emoji;
    setProfile((prev) => prev ? { ...prev, status: next } : prev);
    await supabase.from("profiles").update({ status: next }).eq("id", userId);
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  const refetchProfile = async () => {
    if (!userId) return;
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    if (data) setProfile(data);
  };

  return { userId, profile, partner, loading, updateStatus, getAvatarUrl, refetchProfile };
}
