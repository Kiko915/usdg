import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { useToast } from "../context/ToastContext";

const ERROR_MESSAGES = {
  user_not_found:          "No account with that username",
  cannot_request_self:     "You can't link yourself",
  already_linked:          "You're already linked",
  target_already_linked:   "They're already linked to someone",
  request_already_sent:    "You already have a pending request",
  incoming_request_exists: "They already sent you a request — check above!",
};

export function usePartnerRequest(userId) {
  const { showToast } = useToast();
  const [incomingRequest, setIncomingRequest] = useState(null); // pending row where user is receiver
  const [outgoingRequest, setOutgoingRequest] = useState(null); // pending row where user is sender
  const [requestLoading, setRequestLoading]   = useState(true);
  const [requestBusy, setRequestBusy]         = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!userId) { setRequestLoading(false); return; }

    const load = async () => {
      setRequestLoading(true);

      // Fetch pending incoming (user is receiver)
      const { data: incoming } = await supabase
        .from("partner_requests")
        .select("id, sender_id, created_at, profiles!partner_requests_sender_id_fkey(username, avatar_url)")
        .eq("receiver_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (incoming) {
        setIncomingRequest({
          id: incoming.id,
          senderId: incoming.sender_id,
          senderUsername: incoming.profiles?.username ?? "Unknown",
          senderAvatarUrl: incoming.profiles?.avatar_url ?? null,
          createdAt: incoming.created_at,
        });
      } else {
        setIncomingRequest(null);
      }

      // Fetch pending outgoing (user is sender)
      const { data: outgoing } = await supabase
        .from("partner_requests")
        .select("id, receiver_id, created_at, profiles!partner_requests_receiver_id_fkey(username, avatar_url)")
        .eq("sender_id", userId)
        .eq("status", "pending")
        .maybeSingle();

      if (outgoing) {
        setOutgoingRequest({
          id: outgoing.id,
          receiverId: outgoing.receiver_id,
          receiverUsername: outgoing.profiles?.username ?? "Unknown",
          receiverAvatarUrl: outgoing.profiles?.avatar_url ?? null,
          createdAt: outgoing.created_at,
        });
      } else {
        setOutgoingRequest(null);
      }

      setRequestLoading(false);
    };

    load();

    // Realtime: one channel, two postgres_changes subscriptions
    const channel = supabase
      .channel(`partner-requests:${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partner_requests", filter: `receiver_id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === "INSERT" && payload.new.status === "pending") {
            // Fetch sender username
            const { data: sender } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", payload.new.sender_id)
              .single();
            setIncomingRequest({
              id: payload.new.id,
              senderId: payload.new.sender_id,
              senderUsername: sender?.username ?? "Unknown",
              senderAvatarUrl: sender?.avatar_url ?? null,
              createdAt: payload.new.created_at,
            });
          } else if (payload.eventType === "UPDATE" || payload.eventType === "DELETE") {
            setIncomingRequest(null);
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "partner_requests", filter: `sender_id=eq.${userId}` },
        async (payload) => {
          if (payload.eventType === "INSERT" && payload.new.status === "pending") {
            const { data: receiver } = await supabase
              .from("profiles")
              .select("username, avatar_url")
              .eq("id", payload.new.receiver_id)
              .single();
            setOutgoingRequest({
              id: payload.new.id,
              receiverId: payload.new.receiver_id,
              receiverUsername: receiver?.username ?? "Unknown",
              receiverAvatarUrl: receiver?.avatar_url ?? null,
              createdAt: payload.new.created_at,
            });
          } else if (payload.eventType === "UPDATE") {
            if (payload.new.status === "declined") {
              showToast({ type: "info", title: "Request declined", message: "Your partner request was declined." });
            }
            setOutgoingRequest(null);
          } else if (payload.eventType === "DELETE") {
            setOutgoingRequest(null);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); channelRef.current = null; };
  }, [userId]);

  const sendRequest = async (username) => {
    if (requestBusy) return null;
    setRequestBusy(true);
    const { data, error } = await supabase.rpc("send_partner_request", { target_username: username.trim() });
    setRequestBusy(false);
    if (error) return { error: error.message };
    if (data?.error) return { error: ERROR_MESSAGES[data.error] ?? data.error };
    return { ok: true };
  };

  const acceptRequest = async (id) => {
    if (requestBusy) return;
    setRequestBusy(true);
    const { data, error } = await supabase.rpc("accept_partner_request", { request_id: id });
    setRequestBusy(false);
    if (error || data?.error) {
      showToast({ type: "error", title: "Failed to accept", message: error?.message ?? (ERROR_MESSAGES[data?.error] ?? data?.error) });
    }
  };

  const declineRequest = async (id) => {
    if (requestBusy) return;
    setRequestBusy(true);
    const { data, error } = await supabase.rpc("decline_partner_request", { request_id: id });
    setRequestBusy(false);
    if (error || data?.error) {
      showToast({ type: "error", title: "Failed to decline", message: error?.message ?? (ERROR_MESSAGES[data?.error] ?? data?.error) });
    }
  };

  const cancelOutgoingRequest = async () => {
    if (requestBusy || !outgoingRequest) return;
    setRequestBusy(true);
    await supabase.from("partner_requests").delete().eq("id", outgoingRequest.id);
    setOutgoingRequest(null);
    setRequestBusy(false);
  };

  const unlinkPartner = async () => {
    if (requestBusy) return;
    setRequestBusy(true);
    const { data, error } = await supabase.rpc("unlink_partner");
    setRequestBusy(false);
    if (error || data?.error) {
      showToast({ type: "error", title: "Failed to unlink", message: error?.message ?? (ERROR_MESSAGES[data?.error] ?? data?.error) });
      return { error: true };
    }
    return { ok: true };
  };

  return {
    incomingRequest,
    outgoingRequest,
    requestLoading,
    requestBusy,
    sendRequest,
    acceptRequest,
    declineRequest,
    cancelOutgoingRequest,
    unlinkPartner,
  };
}
