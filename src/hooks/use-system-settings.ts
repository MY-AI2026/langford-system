"use client";

import { useEffect, useState } from "react";
import {
  getSystemSettings,
  SYSTEM_SETTINGS_DEFAULTS,
  SystemSettings,
} from "@/lib/services/system-settings-service";

/**
 * Loads the admin-configured system settings once and returns them, seeded
 * with the hard-coded defaults so the UI renders instantly and never breaks
 * if the fetch fails or the doc is missing.
 */
export function useSystemSettings(): { settings: SystemSettings; loading: boolean } {
  const [settings, setSettings] = useState<SystemSettings>(SYSTEM_SETTINGS_DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getSystemSettings()
      .then((s) => {
        if (active) setSettings(s);
      })
      .catch((e) => console.error("[use-system-settings] load failed:", e))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  return { settings, loading };
}
