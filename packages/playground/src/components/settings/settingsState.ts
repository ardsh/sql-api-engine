import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_DEMO_CODE } from '../webcontainer/files';

export type SettingsType = {
  databaseUrl: string;
  showValues: boolean;
  formatQuery: boolean;
  showCountQuery: boolean;
  moduleType: 'commonjs' | 'esm';
  saveDelay: number;
  code: string;
};
export type SettingsStore = {
  settings: SettingsType;
  setSettings: (settings: Partial<SettingsType>) => void;
};

export const useSettingsStore = create<SettingsStore>()(
  persist(
    set => ({
      settings: {
        code: DEFAULT_DEMO_CODE,
        showValues: false,
        showCountQuery: false,
        moduleType: 'esm',
        saveDelay: 200,
        formatQuery: true,
        databaseUrl: '',
      },
      setSettings: settings =>
        set(state => ({
          settings: Object.fromEntries(
            Object.entries({
              ...state.settings,
              ...settings,
            })
              .map(([key, value]) => {
                if (value === undefined) return [key, state.settings[key as keyof SettingsType]];
                return [key, value];
              })
              .filter(Boolean),
          ),
        })),
    }),
    {
      name: 'settingsStore',
    },
  ),
);

export const useDemoCode = () => useSettingsStore(state => state.settings.code);
export const useSaveDelay = () => useSettingsStore(state => state.settings.saveDelay);

export const setSettings = (settings: Partial<SettingsType>) =>
  useSettingsStore.setState(state => ({
    settings: Object.fromEntries(
      Object.entries({
        ...state.settings,
        ...settings,
      })
        .map(([key, value]) => {
          if (value === undefined) return [key, state.settings[key as keyof SettingsType]];
          return [key, value];
        })
        .filter(Boolean),
    ),
  }));
