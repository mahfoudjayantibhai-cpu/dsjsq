import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import type { GlobalSettings } from '../types';

const DEFAULT_SETTINGS: GlobalSettings = {
  defaultPlatformFeeRate: 0.006,
  defaultReturnRate: 0.2,
  defaultMiscFeeRate: 0.05,
  defaultShippingFee: 3.5,
  defaultLossFactor: 0.5,
};

interface SettingsContextType {
  settings: GlobalSettings;
  updateSettings: (partial: Partial<GlobalSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextType>({
  settings: DEFAULT_SETTINGS,
  updateSettings: () => {},
  resetSettings: () => {},
});

export function GlobalSettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<GlobalSettings>(() => {
    try {
      const stored = localStorage.getItem('pdd_global_settings');
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch {
      return DEFAULT_SETTINGS;
    }
  });

  const updateSettings = useCallback((partial: Partial<GlobalSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...partial };
      localStorage.setItem('pdd_global_settings', JSON.stringify(next));
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(DEFAULT_SETTINGS);
    localStorage.removeItem('pdd_global_settings');
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useGlobalSettings() {
  return useContext(SettingsContext);
}