import { create } from "zustand";

type SubscriptionModalState = {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
};

export const useSubscriptionModal = create<SubscriptionModalState>((set) => ({
  isOpen: false,
  onOpen: () => set({ isOpen: true }),
  onClose: () => set({ isOpen: false }),
}));
