import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  cacheData,
  getCachedData,
  addToSyncQueue,
  getSyncQueue,
  removeFromSyncQueue,
  getPhotoQueue,
  removeFromPhotoQueue,
  base64ToBlob,
} from "@/lib/operacional-hub/offlineDb";
import { useToast } from "@/hooks/use-toast";
import { opSignedUrl } from "@/lib/operacional-hub/storage";

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return isOnline;
}

export function useOfflineSync() {
  const isOnline = useOnlineStatus();
  const { toast } = useToast();
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const syncingRef = useRef(false);

  // Check pending count (actions + photos)
  const refreshPendingCount = useCallback(async () => {
    try {
      const queue = await getSyncQueue();
      const photos = await getPhotoQueue();
      setPendingCount(queue.length + photos.length);
    } catch {
      // ignore
    }
  }, []);

  // Upload queued photos
  const syncPhotos = useCallback(async (): Promise<number> => {
    const photos = await getPhotoQueue();
    if (photos.length === 0) return 0;

    let uploaded = 0;
    for (const photo of photos) {
      try {
        const blob = base64ToBlob(photo.base64Data);
        const { error: uploadError } = await supabase.storage
          .from(photo.bucket)
          .upload(photo.fileName, blob);
        if (uploadError) throw uploadError;

        const publicUrl = await opSignedUrl(photo.bucket, photo.fileName);

        // Update the task execution with the photo URL
        const { error: updateError } = await (supabase as any)
          .from("op_task_executions")
          .update({ [photo.fieldName]: publicUrl })
          .eq("id", photo.taskExecutionId);
        if (updateError) throw updateError;

        await removeFromPhotoQueue(photo.id);
        uploaded++;
      } catch (err) {
        console.error("Photo sync error:", photo.id, err);
      }
    }
    return uploaded;
  }, []);

  // Sync queued actions when online
  const syncQueue = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    syncingRef.current = true;
    setSyncing(true);

    try {
      // Sync data actions first
      const queue = await getSyncQueue();
      let successCount = 0;
      let errorCount = 0;

      for (const action of queue) {
        try {
          if (action.operation === "update" && action.matchColumn && action.matchValue) {
            const { error } = await (supabase as any)
              .from(action.table)
              .update(action.data)
              .eq(action.matchColumn, action.matchValue);
            if (error) throw error;
          } else if (action.operation === "insert") {
            const { error } = await (supabase as any)
              .from(action.table)
              .insert(action.data);
            if (error) throw error;
          }
          await removeFromSyncQueue(action.id);
          successCount++;
        } catch (err) {
          console.error("Sync error for action:", action.id, err);
          errorCount++;
        }
      }

      // Then sync photos
      const photosUploaded = await syncPhotos();
      successCount += photosUploaded;

      if (successCount > 0) {
        toast({
          title: "Sincronização concluída",
          description: `${successCount} ação(ões) sincronizada(s)${photosUploaded > 0 ? ` (${photosUploaded} foto(s))` : ""}.${errorCount > 0 ? ` ${errorCount} erro(s).` : ""}`,
        });
      }
    } catch (err) {
      console.error("Sync queue error:", err);
    } finally {
      setSyncing(false);
      syncingRef.current = false;
      await refreshPendingCount();
    }
  }, [toast, refreshPendingCount, syncPhotos]);

  // Auto-sync when coming back online
  useEffect(() => {
    if (isOnline) {
      syncQueue();
    }
    refreshPendingCount();
  }, [isOnline, syncQueue, refreshPendingCount]);

  // Queue an offline action
  const queueAction = useCallback(
    async (
      table: string,
      operation: "update" | "insert",
      data: Record<string, unknown>,
      matchColumn?: string,
      matchValue?: string
    ) => {
      const action = {
        id: crypto.randomUUID(),
        table,
        operation,
        data,
        matchColumn,
        matchValue,
        createdAt: new Date().toISOString(),
      };
      await addToSyncQueue(action);
      await refreshPendingCount();
      return action;
    },
    [refreshPendingCount]
  );

  return {
    isOnline,
    pendingCount,
    syncing,
    queueAction,
    syncQueue,
    cacheData,
    getCachedData,
  };
}
