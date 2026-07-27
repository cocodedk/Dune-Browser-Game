// src/EventBus.ts — Simple typed event bus connecting Phaser ↔ React

type Callback<T> = T extends void ? () => void : (payload: T) => void;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
class TypedEventBus<Events extends Record<string, any>> {
  private listeners = new Map<string, Set<(...args: unknown[]) => void>>();

  on<K extends keyof Events>(event: K, cb: Callback<Events[K]>): void {
    if (!this.listeners.has(event as string)) {
      this.listeners.set(event as string, new Set());
    }
    this.listeners.get(event as string)!.add(cb as (...args: unknown[]) => void);
  }

  off<K extends keyof Events>(event: K, cb: Callback<Events[K]>): void {
    this.listeners.get(event as string)?.delete(cb as (...args: unknown[]) => void);
  }

  emit<K extends keyof Events>(
    event: K,
    ...args: Events[K] extends void ? [] : [Events[K]]
  ): void {
    this.listeners.get(event as string)?.forEach(cb => cb(...args));
  }
}

import type { BusEvents } from './types';
export const EventBus = new TypedEventBus<BusEvents>();
