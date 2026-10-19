import { create } from 'zustand';

interface StartupState {
  streamServerConfigured: boolean;
  serverNoticeDismissed: boolean;
  setStreamServerConfigured: (configured: boolean) => void;
  dismissServerNotice: () => void;
}

export const useStartupStore = create<StartupState>((set) => ({
  streamServerConfigured: false,
  serverNoticeDismissed: false,
  setStreamServerConfigured: (streamServerConfigured) => set({ streamServerConfigured }),
  dismissServerNotice: () => set({ serverNoticeDismissed: true }),
}));
