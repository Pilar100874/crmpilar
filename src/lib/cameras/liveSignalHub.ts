import { supabase } from "@/integrations/supabase/client";

type Channel = ReturnType<typeof supabase.channel>;
type MessageHandler = (payload: any) => void;
type HeartbeatHandler = (payload: any) => void;

const handlers = new Set<MessageHandler>();
const heartbeatHandlers = new Set<HeartbeatHandler>();
const channels = new Map<string, { ch: Channel; ready: Promise<void>; refs: number }>();
let requestedPingAt = 0;
let lastHeartbeat: any = null;

function ensureChannel(name: string) {
  const existing = channels.get(name);
  if (existing) {
    existing.refs += 1;
    return existing;
  }

  const ch = supabase.channel(name, { config: { broadcast: { self: false, ack: false } } });
  ch.on("broadcast", { event: "msg" }, ({ payload }: any) => {
    if (!payload) return;
    if (payload.type === "coletor-online" && payload.to === "viewers") {
      lastHeartbeat = payload;
      heartbeatHandlers.forEach((cb) => {
        try { cb(payload); } catch {}
      });
      return;
    }
    handlers.forEach((cb) => {
      try { cb(payload); } catch {}
    });
  });

  const ready = new Promise<void>((resolve) => {
    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });

  const item = { ch, ready, refs: 1 };
  channels.set(name, item);
  return item;
}

export async function acquireLiveSignalChannels(filialId?: string | null) {
  const names = new Set<string>(["webrtc-signal"]);
  if (filialId) names.add(`webrtc-signal:${filialId}`);
  const acquired = Array.from(names).map(ensureChannel);
  await Promise.all(acquired.map((item) => item.ready));

  const release = () => {
    for (const name of names) {
      const item = channels.get(name);
      if (!item) continue;
      item.refs -= 1;
      if (item.refs <= 0) {
        supabase.removeChannel(item.ch);
        channels.delete(name);
      }
    }
  };

  const sendAll = (payload: any) => {
    for (const name of names) {
      const item = channels.get(name);
      try { item?.ch.send({ type: "broadcast", event: "msg", payload }); } catch {}
    }
  };

  return { sendAll, release };
}

export function onLiveSignalMessage(handler: MessageHandler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function onLiveSignalHeartbeat(handler: HeartbeatHandler) {
  heartbeatHandlers.add(handler);
  if (lastHeartbeat && Date.now() - (lastHeartbeat.ts || 0) < 10_000) {
    try { handler(lastHeartbeat); } catch {}
  }
  return () => heartbeatHandlers.delete(handler);
}

export function requestLiveSignalHeartbeat(sendAll: (payload: any) => void, viewerId: string) {
  const now = Date.now();
  if (now - requestedPingAt < 1000) return;
  requestedPingAt = now;
  sendAll({ type: "viewer-ping", to: "coletor", viewer_id: viewerId });
}
