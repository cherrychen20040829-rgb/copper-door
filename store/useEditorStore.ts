import { create } from "zustand";
import type { BoundingBox, Line, NestedRect, Rect, Shape } from "@/types/shape";
import {
  getShapeBoundingBox,
  moveShape,
  normalizeLayerOffsets,
  normalizeLayerStrokeWidths,
  NESTED_RECT_DISPLAY_SCALE,
  updateShapeFromBoundingBox,
} from "@/types/shape";

interface EditorState {
  shapes: Shape[];
  selectedId: string | null;
  selectedLayerIndex: number | null;
  addRect: () => void;
  addLine: () => void;
  addNestedRect: () => void;
  selectShape: (id: string | null) => void;
  selectNestedLayer: (id: string, layerIndex: number) => void;
  deleteSelected: () => void;
  moveShapeById: (id: string, dx: number, dy: number) => void;
  updateShapeBoundingBox: (id: string, box: BoundingBox) => void;
  updateLine: (
    id: string,
    updates: Partial<Pick<Line, "x1" | "y1" | "x2" | "y2" | "strokeWidth">>
  ) => void;
  updateNestedRect: (
    id: string,
    updates: Partial<
      Pick<NestedRect, "width" | "height" | "layers" | "layerOffsets">
    >
  ) => void;
  updateNestedRectLayerStrokeWidth: (
    id: string,
    layerIndex: number,
    strokeWidth: number
  ) => void;
}

let shapeCounter = 0;

function createId(): string {
  shapeCounter += 1;
  return `shape-${shapeCounter}`;
}

function createDefaultRect(): Rect {
  return {
    id: createId(),
    type: "rect",
    x: 100,
    y: 100,
    width: 120,
    height: 80,
  };
}

function createDefaultLine(): Line {
  return {
    id: createId(),
    type: "line",
    x1: 80,
    y1: 80,
    x2: 200,
    y2: 160,
    strokeWidth: 2,
  };
}

function createDefaultNestedRect(): NestedRect {
  const layers = 4;
  return {
    id: createId(),
    type: "nestedRect",
    x: 100,
    y: 70,
    width: 1800,
    height: 2500,
    layers,
    layerOffsets: [80, 80, 80],
    layerStrokeWidths: normalizeLayerStrokeWidths(layers),
  };
}

function applyNestedRectUpdates(
  nested: NestedRect,
  updates: Partial<
    Pick<NestedRect, "width" | "height" | "layers" | "layerOffsets">
  >
): NestedRect {
  const scale = NESTED_RECT_DISPLAY_SCALE;
  const centerX = nested.x + (nested.width * scale) / 2;
  const centerY = nested.y + (nested.height * scale) / 2;

  const nextWidth = Math.max(updates.width ?? nested.width, 1);
  const nextHeight = Math.max(updates.height ?? nested.height, 1);
  const nextLayers = Math.max(Math.round(updates.layers ?? nested.layers), 1);
  const nextLayerOffsets = normalizeLayerOffsets(
    nextLayers,
    updates.layerOffsets ?? nested.layerOffsets
  );

  return {
    ...nested,
    width: nextWidth,
    height: nextHeight,
    layers: nextLayers,
    layerOffsets: nextLayerOffsets,
    layerStrokeWidths: normalizeLayerStrokeWidths(
      nextLayers,
      nested.layerStrokeWidths
    ),
    x: centerX - (nextWidth * scale) / 2,
    y: centerY - (nextHeight * scale) / 2,
  };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  shapes: [],
  selectedId: null,
  selectedLayerIndex: null,

  addRect: () => {
    const rect = createDefaultRect();
    set((state) => ({
      shapes: [...state.shapes, rect],
      selectedId: rect.id,
    }));
  },

  addLine: () => {
    const line = createDefaultLine();
    set((state) => ({
      shapes: [...state.shapes, line],
      selectedId: line.id,
    }));
  },

  addNestedRect: () => {
    const nestedRect = createDefaultNestedRect();
    set((state) => ({
      shapes: [...state.shapes, nestedRect],
      selectedId: nestedRect.id,
      selectedLayerIndex: 0,
    }));
  },

  selectShape: (id) => {
    set({ selectedId: id, selectedLayerIndex: null });
  },

  selectNestedLayer: (id, layerIndex) => {
    set({ selectedId: id, selectedLayerIndex: layerIndex });
  },

  deleteSelected: () => {
    const { selectedId, shapes } = get();
    if (!selectedId) {
      return;
    }

    set({
      shapes: shapes.filter((shape) => shape.id !== selectedId),
      selectedId: null,
      selectedLayerIndex: null,
    });
  },

  moveShapeById: (id, dx, dy) => {
    set((state) => ({
      shapes: state.shapes.map((shape) =>
        shape.id === id ? moveShape(shape, dx, dy) : shape
      ),
    }));
  },

  updateShapeBoundingBox: (id, box) => {
    set((state) => ({
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id) {
          return shape;
        }

        return updateShapeFromBoundingBox(shape, box);
      }),
    }));
  },

  updateLine: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "line") {
          return shape;
        }

        return { ...shape, ...updates };
      }),
    }));
  },

  updateNestedRect: (id, updates) => {
    set((state) => ({
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "nestedRect") {
          return shape;
        }

        return applyNestedRectUpdates(shape, updates);
      }),
    }));
  },

  updateNestedRectLayerStrokeWidth: (id, layerIndex, strokeWidth) => {
    set((state) => ({
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "nestedRect") {
          return shape;
        }

        const layerStrokeWidths = [...shape.layerStrokeWidths];
        layerStrokeWidths[layerIndex] = Math.max(strokeWidth, 1);

        return { ...shape, layerStrokeWidths };
      }),
    }));
  },
}));

export function useSelectedShape(): Shape | null {
  const shapes = useEditorStore((state) => state.shapes);
  const selectedId = useEditorStore((state) => state.selectedId);

  if (!selectedId) {
    return null;
  }

  return shapes.find((shape) => shape.id === selectedId) ?? null;
}

export function useSelectedBoundingBox(): BoundingBox | null {
  const selectedShape = useSelectedShape();

  if (!selectedShape) {
    return null;
  }

  return getShapeBoundingBox(selectedShape);
}
