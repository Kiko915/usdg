import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function usePartner() {
  const [userId, setUserId] = useState(null);
  const [profile, setProfile] = useState(null);
  const [partner, setPartner] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let partnerSub = null;

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
        const { data: partnerData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", p.partner_id)
          .single();
        setPartner(partnerData);

        // Real-time mood sync — subscribe to partner's profile changes
        partnerSub = supabase
          .channel(`partner-profile:${p.partner_id}`)
          .on("postgres_changes", {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `id=eq.${p.partner_id}`,
          }, (payload) => {
            setPartner((prev) => prev ? { ...prev, ...payload.new } : payload.new);
          })
          .subscribe();
      }

      setLoading(false);
    };

    init();
    return () => { partnerSub?.unsubscribe(); };
  }, []);

  const updateStatus = async (emoji) => {
    if (!userId) return;
    // Toggle off if same emoji tapped again
    const next = profile?.status === emoji ? null : emoji;
    setProfile((prev) => prev ? { ...prev, status: next } : prev);
    await supabase.from("profiles").update({ status: next }).eq("id", userId);
  };

  const getAvatarUrl = (avatarPath) => {
    if (!avatarPath) return null;
    const { data } = supabase.storage.from("avatars").getPublicUrl(avatarPath);
    return `${data.publicUrl}?t=${Date.now()}`;
  };

  return { userId, profile, partner, loading, updateStatus, getAvatarUrl };
}
