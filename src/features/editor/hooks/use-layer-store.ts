// src/store/useLayersStore.ts
import { fabric } from "fabric";
import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
import { Layer, LayerType, LayersState } from "../types";

const MAX_HISTORY = 20;

export const useLayersStore = create<LayersState>((set, get) => ({
  layers: [
    {
      id: uuidv4(),
      name: "Global Layer",
      type: LayerType.Global,
      imageDataUrl: null,
      referenceImageUrls: [],
      maskDataUrl: null,
      isVisible: true,
      prompt: "",
      objects: [],
    },
  ],
  activeLayerId: "",
  history: {},
  canvas: null,
  selectedObjects: [], 
  setSelectedObjects: (objects: fabric.Object[]) => set({ selectedObjects: objects }),

  // ========== Canvas management ==========
  setCanvas: (canvas) => set({ canvas }),

  // ========== Layer Management ==========
  addLayer: (file?: File) => {
  const fileName =
    file && file.name
      ? file.name.replace(/\.[^/.]+$/, "") // remove extension
      : `Layer ${get().layers.length}`;

  const newLayer: Layer = {
    id: uuidv4(),
    name: fileName,
    type: LayerType.Sectional,
    imageDataUrl: null,
    referenceImageUrls: [],
    maskDataUrl: null,
    isVisible: true,
    prompt: "",
    objects: [],
  };

  set((state) => ({
    layers: [...state.layers, newLayer],
    activeLayerId: newLayer.id,
  }));
},

addImageLayer: (file: File, dataUrl: string) => {
  const id = uuidv4();
  const fileName = file.name.replace(/\.[^/.]+$/, "");

  const newLayer: Layer = {
    id,
    name: fileName,
    type: LayerType.Sectional,
    imageDataUrl: dataUrl,
    referenceImageUrls: [],
    maskDataUrl: null,
    isVisible: true,
    prompt: "",
    objects: [],
  };

  set((state) => ({
    layers: [...state.layers, newLayer],
    activeLayerId: id,
  }));

  // === Optional: If canvas exists, draw image immediately ===
  const canvas = get().canvas;
  if (canvas) {
    fabric.Image.fromURL(dataUrl, (img) => {
      img.set({ left: 100, top: 100, selectable: true });
      canvas.add(img);
      canvas.renderAll();
    });
  }

  return id;
},

// 🧩 NEW — multiple upload handler
addMultipleImageLayers: async (files: File[]) => {
  for (const file of files) {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === "string") resolve(reader.result);
        else reject("Failed to read file");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

    // Reuse addImageLayer for each file
    get().addImageLayer(file, dataUrl);
  }
},

  deleteLayer: (id) =>
    set((state) => {
      const newLayers = state.layers.filter((l) => l.id !== id);
      const newHistory = { ...state.history };
      delete newHistory[id];

      const newActiveId =
        state.activeLayerId === id
          ? newLayers.find((l) => l.type === LayerType.Global)?.id ??
            newLayers[0]?.id ??
            ""
          : state.activeLayerId;

      return {
        layers: newLayers,
        history: newHistory,
        activeLayerId: newActiveId,
      };
    }),

  selectLayer: (id) => set({ activeLayerId: id }),

  reorderLayers: (reordered) => set({ layers: reordered }),

  toggleVisibility: (id) =>
    set((state) => ({
      layers: state.layers.map((l) =>
        l.id === id ? { ...l, isVisible: !l.isVisible } : l
      ),
    })),

  // ========== Update & History ==========
  updateLayer: (id, updates, addToHistory = true) => {
    set((state) => {
      const existingLayer = state.layers.find((l) => l.id === id);
      if (!existingLayer) return state;

      const newLayers = state.layers.map((l) =>
        l.id === id ? { ...l, ...updates } : l
      );

      if (addToHistory && updates.objects) {
        const layerHistory = state.history[id] ?? { past: [], future: [] };
        const prevObjects = existingLayer.objects;

        // Avoid redundant entries
        const isSame =
          JSON.stringify(layerHistory.past.at(-1)) ===
          JSON.stringify(prevObjects);

        if (!isSame) {
          const newPast =
            layerHistory.past.length >= MAX_HISTORY
              ? [...layerHistory.past.slice(1), prevObjects]
              : [...layerHistory.past, prevObjects];

          return {
            layers: newLayers,
            history: {
              ...state.history,
              [id]: { past: newPast, future: [] },
            },
          };
        }
      }

      return { layers: newLayers };
    });
  },

  // ========== Undo / Redo ==========
  undo: () => {
    const { activeLayerId, layers, history } = get();
    const layerHistory = history[activeLayerId];
    if (!layerHistory || layerHistory.past.length === 0) return;

    const previous = layerHistory.past[layerHistory.past.length - 1];
    const newPast = layerHistory.past.slice(0, -1);
    const currentObjects =
      layers.find((l) => l.id === activeLayerId)?.objects ?? [];

    set({
      layers: layers.map((l) =>
        l.id === activeLayerId ? { ...l, objects: previous } : l
      ),
      history: {
        ...history,
        [activeLayerId]: {
          past: newPast,
          future: [currentObjects, ...layerHistory.future],
        },
      },
    });
  },

  redo: () => {
    const { activeLayerId, layers, history } = get();
    const layerHistory = history[activeLayerId];
    if (!layerHistory || layerHistory.future.length === 0) return;

    const next = layerHistory.future[0];
    const newFuture = layerHistory.future.slice(1);
    const currentObjects =
      layers.find((l) => l.id === activeLayerId)?.objects ?? [];

    set({
      layers: layers.map((l) =>
        l.id === activeLayerId ? { ...l, objects: next } : l
      ),
      history: {
        ...history,
        [activeLayerId]: {
          past: [...layerHistory.past, currentObjects],
          future: newFuture,
        },
      },
    });
  },

  // ========== Layer Ordering ==========
  bringForward: () => {
    const { activeLayerId, layers } = get();
    const index = layers.findIndex((l) => l.id === activeLayerId);
    if (index === -1 || index >= layers.length - 1) return;

    const reordered = [...layers];
    const [layer] = reordered.splice(index, 1);
    reordered.splice(index + 1, 0, layer);
    set({ layers: reordered });
  },

  sendBackward: () => {
    const { activeLayerId, layers } = get();
    const index = layers.findIndex((l) => l.id === activeLayerId);
    if (index <= 1) return; // keep global at bottom

    const reordered = [...layers];
    const [layer] = reordered.splice(index, 1);
    reordered.splice(index - 1, 0, layer);
    set({ layers: reordered });
  },

  bringToFront: () => {
    const { activeLayerId, layers } = get();
    const index = layers.findIndex((l) => l.id === activeLayerId);
    if (index === -1 || index >= layers.length - 1) return;

    const reordered = [...layers];
    const [layer] = reordered.splice(index, 1);
    reordered.push(layer);
    set({ layers: reordered });
  },

  sendToBack: () => {
    const { activeLayerId, layers } = get();
    const index = layers.findIndex((l) => l.id === activeLayerId);
    if (index <= 1) return; // keep global always first

    const reordered = [...layers];
    const [layer] = reordered.splice(index, 1);
    reordered.splice(1, 0, layer);
    set({ layers: reordered });
  },
}));
