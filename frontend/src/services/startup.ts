import { create } from 'zustand';

interface StartupState {
  hasLoadedHome: boolean;
  streamServerConfigured: boolean;
  serverNoticeDismissed: boolean;
  markHomeLoaded: () => void;
  setStreamServerConfigured: (configured: boolean) => void;
  dismissServerNotice: () => void;
}

export const useStartupStore = create<StartupState>((set) => ({
  hasLoadedHome: false,
  streamServerConfigured: false,
  serverNoticeDismissed: false,
  markHomeLoaded: () => set({ hasLoadedHome: true }),
  setStreamServerConfigured: (streamServerConfigured) => set({ streamServerConfigured }),
  dismissServerNotice: () => set({ serverNoticeDismissed: true }),
}));
