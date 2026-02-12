import { useSyncExternalStore, useCallback } from 'react';

type Listener = () => void;

interface Snapshot {
  results: Record<string, any>;
  processing: Record<string, boolean>;
  errors: Record<string, string>;
}

class NodeResultStore {
  private _results: Record<string, any> = {};
  private _processing: Record<string, boolean> = {};
  private _errors: Record<string, string> = {};
  private _listeners: Set<Listener> = new Set();
  private _snapshot: Snapshot;

  constructor() {
    this._snapshot = { results: this._results, processing: this._processing, errors: this._errors };
  }

  subscribe = (listener: Listener) => {
    this._listeners.add(listener);
    return () => { this._listeners.delete(listener); };
  };

  private _updateSnapshot() {
    this._snapshot = { results: this._results, processing: this._processing, errors: this._errors };
    this._listeners.forEach(l => l());
  }

  setResult(nodeId: string, result: any) {
    this._results = { ...this._results, [nodeId]: result };
    this._updateSnapshot();
  }

  setProcessing(nodeId: string, isProcessing: boolean) {
    this._processing = { ...this._processing, [nodeId]: isProcessing };
    this._updateSnapshot();
  }

  setError(nodeId: string, error: string) {
    this._errors = { ...this._errors, [nodeId]: error };
    this._updateSnapshot();
  }

  clearError(nodeId: string) {
    const { [nodeId]: _, ...rest } = this._errors;
    this._errors = rest;
    this._updateSnapshot();
  }

  clearAll() {
    this._results = {};
    this._processing = {};
    this._errors = {};
    this._updateSnapshot();
  }

  getSnapshot = (): Snapshot => {
    return this._snapshot;
  };
}

export const nodeResultStore = new NodeResultStore();

export function useNodeResult(nodeId: string) {
  const snapshot = useSyncExternalStore(
    nodeResultStore.subscribe,
    nodeResultStore.getSnapshot
  );

  return {
    result: snapshot.results[nodeId],
    isProcessing: snapshot.processing[nodeId] || false,
    error: snapshot.errors[nodeId],
  };
}

export function useNodeResults() {
  return useSyncExternalStore(
    nodeResultStore.subscribe,
    nodeResultStore.getSnapshot
  );
}
