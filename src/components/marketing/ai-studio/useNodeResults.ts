import { create } from 'zustand';

interface NodeResultState {
  results: Record<string, any>;
  processing: Record<string, boolean>;
  errors: Record<string, string>;
  setResult: (nodeId: string, result: any) => void;
  setProcessing: (nodeId: string, processing: boolean) => void;
  setError: (nodeId: string, error: string) => void;
  clearError: (nodeId: string) => void;
  clearAll: () => void;
}

// We use a simple event-driven approach instead of zustand
// since zustand may not be installed

type Listener = () => void;

class NodeResultStore {
  results: Record<string, any> = {};
  processing: Record<string, boolean> = {};
  errors: Record<string, string> = {};
  private listeners: Set<Listener> = new Set();

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(l => l());
  }

  setResult(nodeId: string, result: any) {
    this.results = { ...this.results, [nodeId]: result };
    this.notify();
  }

  setProcessing(nodeId: string, isProcessing: boolean) {
    this.processing = { ...this.processing, [nodeId]: isProcessing };
    this.notify();
  }

  setError(nodeId: string, error: string) {
    this.errors = { ...this.errors, [nodeId]: error };
    this.notify();
  }

  clearError(nodeId: string) {
    const { [nodeId]: _, ...rest } = this.errors;
    this.errors = rest;
    this.notify();
  }

  clearAll() {
    this.results = {};
    this.processing = {};
    this.errors = {};
    this.notify();
  }

  getSnapshot() {
    return { results: this.results, processing: this.processing, errors: this.errors };
  }
}

export const nodeResultStore = new NodeResultStore();

// React hook
import { useSyncExternalStore } from 'react';

export function useNodeResult(nodeId: string) {
  const snapshot = useSyncExternalStore(
    (cb) => nodeResultStore.subscribe(cb),
    () => nodeResultStore.getSnapshot()
  );

  return {
    result: snapshot.results[nodeId],
    isProcessing: snapshot.processing[nodeId] || false,
    error: snapshot.errors[nodeId],
  };
}

export function useNodeResults() {
  return useSyncExternalStore(
    (cb) => nodeResultStore.subscribe(cb),
    () => nodeResultStore.getSnapshot()
  );
}
