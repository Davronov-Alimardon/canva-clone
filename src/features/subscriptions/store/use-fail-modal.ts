import { create } from "zustand";

type FailModalState = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useFailModal = create<FailModalState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
