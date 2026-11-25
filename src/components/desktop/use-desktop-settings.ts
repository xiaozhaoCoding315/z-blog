"use client";

import { useSyncExternalStore } from "react";

export type DesktopPreset = "night" | "paper" | "blueprint";

export interface DesktopSettings {
  preset: DesktopPreset;
  objects: boolean;
}

export const SETTINGS_KEY = "z-os:settings";

export const DEFAULT_SETTINGS: DesktopSettings = {
  preset: "night",
  objects: true,
};

const PRESETS: DesktopPreset[] = ["night", "paper", "blueprint"];
const listeners = new Set<() => void>();

let cached: DesktopSettings = DEFAULT_SETTINGS;
let cachedRaw: string | null = null;
/** localStorage 写不进去时（隐私模式）用它保证本次会话仍然生效 */
let memory: DesktopSettings | null = null;

function normalize(raw: unknown): DesktopSettings {
  if (!raw || typeof raw !== "object") return DEFAULT_SETTINGS;
  const value = raw as { preset?: unknown; objects?: unknown };
  const preset = PRESETS.includes(value.preset as DesktopPreset)
    ? (value.preset as DesktopPreset)
    : DEFAULT_SETTINGS.preset;
  return {
    preset,
    objects:
      typeof value.objects === "boolean" ? value.objects : DEFAULT_SETTINGS.objects,
  };
}

function read(): DesktopSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  if (memory) return memory;
  try {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    if (raw === cachedRaw) return cached;
    cachedRaw = raw;
    cached = raw ? normalize(JSON.parse(raw)) : DEFAULT_SETTINGS;
    return cached;
  } catch {
    cached = DEFAULT_SETTINGS;
    return cached;
  }
}

function emit() {
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === SETTINGS_KEY) {
      memory = null;
      cachedRaw = null;
      read();
      emit();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function getDesktopSettings(): DesktopSettings {
  return read();
}

export function applyDesktopSettings(settings: DesktopSettings) {
  const root = document.documentElement;
  root.dataset.wallpaper = settings.preset;
  // paper 是亮色，必须移除 .dark；另两套是暗色
  root.classList.toggle("dark", settings.preset !== "paper");
  root.dataset.deskObjects = settings.objects ? "on" : "off";
  root.style.colorScheme = settings.preset === "paper" ? "light" : "dark";
}

export function writeSettings(next: DesktopSettings) {
  cached = normalize(next);
  cachedRaw = JSON.stringify(cached);
  try {
    window.localStorage.setItem(SETTINGS_KEY, cachedRaw);
    memory = null;
  } catch {
    // 隐私模式下写不进去：放进内存，本次会话仍然生效
    memory = cached;
  }
  applyDesktopSettings(cached);
  emit();
}

export function useDesktopSettings() {
  const settings = useSyncExternalStore(
    subscribe,
    read,
    () => DEFAULT_SETTINGS
  );

  return {
    ...settings,
    setPreset(preset: DesktopPreset) {
      writeSettings({ ...settings, preset });
    },
    setObjects(objects: boolean) {
      writeSettings({ ...settings, objects });
    },
  };
}
