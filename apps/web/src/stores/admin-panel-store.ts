import { create } from "zustand";

export type AdminPanelMode = "startup" | "investor" | "admin";

type AdminPanelState = {
  mode: AdminPanelMode;
  setMode: (mode: AdminPanelMode) => void;
};

export const useAdminPanelStore = create<AdminPanelState>((set) => ({
  mode: "startup",
  setMode: (mode) => set({ mode })
}));
