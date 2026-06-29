import { create } from "zustand";
import type {
  BoundingBox,
  CurvedResizeHandle,
  CurvedShape,
  CurvedShapeKind,
  DimensionBindingKind,
  DimensionOrientation,
  DimensionShape,
  DimensionStylePreset,
  GroupShape,
  Line,
  NestedRect,
  Parallelogram,
  Rect,
  SemicircleDirection,
  Shape,
  ShapeDrawTool,
} from "@/types/shape";
import {
  getShapeBoundingBox,
  moveShape,
  normalizeLayerOffsets,
  normalizeLayerStrokeWidths,
  NESTED_RECT_DISPLAY_SCALE,
  resizeCurvedShape,
  updateShapeFromBoundingBox,
} from "@/types/shape";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  shapes: Shape[];
}

export interface ProjectTabState {
  shapes: Shape[];
  selectedId: string | null;
  selectedIds: string[];
  selectedLayerIndex: number | null;
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  pendingCurvedShapeKind: CurvedShapeKind | null;
  pendingDrawTool: ShapeDrawTool | null;
  isDimensionMode: boolean;
  showDimensions: boolean;
  dimensionFixedLength: number | null;
  dimensionFixedOrientation: DimensionOrientation;
  defaultDimensionStyle: DimensionStylePreset;
  snapEnabled: boolean;
  brushColor: string;
  brushStrokeWidth: number;
  viewportCenterX: number;
  viewportCenterY: number;
  viewportZoom: number;
  isPanMode: boolean;
}

export type TabId = "directory" | string;

interface HistorySnapshot {
  shapes: Shape[];
  selectedId: string | null;
  selectedIds: string[];
  selectedLayerIndex: number | null;
}

interface EditorState {
  projects: Project[];
  activeTabId: TabId;
  openProjectIds: string[];
  projectTabStates: Record<string, ProjectTabState>;
  dirtyProjectIds: string[];
  currentProjectId: string | null;
  shapes: Shape[];
  selectedId: string | null;
  selectedIds: string[];
  selectedLayerIndex: number | null;
  pendingCurvedShapeKind: CurvedShapeKind | null;
  pendingDrawTool: ShapeDrawTool | null;
  isDimensionMode: boolean;
  showDimensions: boolean;
  dimensionFixedLength: number | null;
  dimensionFixedOrientation: DimensionOrientation;
  defaultDimensionStyle: DimensionStylePreset;
  snapEnabled: boolean;
  brushColor: string;
  brushStrokeWidth: number;
  viewportCenterX: number;
  viewportCenterY: number;
  viewportZoom: number;
  viewportWidth: number;
  viewportHeight: number;
  isPanMode: boolean;
  copiedShape: Shape | null;
  copiedShapes: Shape[];
  copiedBoundDimensions: DimensionShape[];
  undoStack: HistorySnapshot[];
  redoStack: HistorySnapshot[];
  historyBatch: HistorySnapshot | null;
  loadProjects: () => void;
  createProject: () => void;
  openProject: (id: string) => void;
  switchToDirectory: () => void;
  returnToProjectList: () => void;
  switchToProjectTab: (id: string) => void;
  closeProjectTab: (id: string, action?: "save" | "discard") => void;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  saveProject: () => void;
  clearCanvas: () => void;
  setViewportSize: (size: ViewportSize) => void;
  zoomViewportAt: (
    worldX: number,
    worldY: number,
    screenRatioX: number,
    screenRatioY: number,
    factor: number
  ) => void;
  zoomViewportAtCenter: (factor: number) => void;
  panViewportBy: (screenDx: number, screenDy: number) => void;
  fitViewportToShapes: () => void;
  togglePanMode: () => void;
  setPanMode: (isPanMode: boolean) => void;
  selectTool: () => void;
  startDimensionTool: () => void;
  toggleShowDimensions: () => void;
  setDimensionFixedLength: (length: number | null) => void;
  setDimensionFixedOrientation: (orientation: DimensionOrientation) => void;
  setDefaultDimensionStyle: (style: DimensionStylePreset) => void;
  toggleSnapEnabled: () => void;
  setBrushColor: (color: string) => void;
  setBrushStrokeWidth: (strokeWidth: number) => void;
  addRect: () => void;
  addLine: () => void;
  addNestedRect: () => void;
  startDrawShape: (tool: ShapeDrawTool) => void;
  placeDrawnShape: (
    tool: ShapeDrawTool,
    start: { x: number; y: number },
    end: { x: number; y: number }
  ) => void;
  startAddCurvedShape: (kind: CurvedShapeKind) => void;
  placePendingCurvedShape: (x: number, y: number) => void;
  selectShape: (id: string | null) => void;
  toggleShapeSelection: (id: string) => void;
  selectShapes: (ids: string[]) => void;
  selectNestedLayer: (id: string, layerIndex: number) => void;
  deleteSelected: () => void;
  copySelected: () => void;
  pasteCopied: () => void;
  duplicateShapeForDrag: (id: string) => string | null;
  arrayCopySelected: (
    direction: "horizontal" | "vertical",
    count: number,
    spacing: number
  ) => void;
  distributeSelected: (direction: "horizontal" | "vertical") => void;
  undo: () => void;
  redo: () => void;
  beginHistoryBatch: () => void;
  commitHistoryBatch: () => void;
  cancelHistoryBatch: () => void;
  groupSelected: () => void;
  ungroupSelected: () => void;
  reorderSelected: (action: "front" | "back" | "forward" | "backward") => void;
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
  updateParallelogram: (
    id: string,
    updates: Partial<Pick<Parallelogram, "width" | "height" | "skew">>
  ) => void;
  addManualDimension: (
    start: { x: number; y: number },
    end: { x: number; y: number },
    linePoint: { x: number; y: number }
  ) => void;
  addFixedLengthDimension: (start: { x: number; y: number }) => void;
  addQuickDimension: (shapeId: string, kind: DimensionBindingKind) => void;
  updateDimensionTextOffset: (id: string, dx: number, dy: number) => void;
  updateDimensionStyle: (
    id: string,
    style: DimensionStylePreset,
    makeDefault?: boolean
  ) => void;
  updateDimensionLength: (id: string, length: number) => void;
  resizeCurvedShapeById: (
    id: string,
    handle: CurvedResizeHandle,
    x: number,
    y: number
  ) => void;
  resizeShapeById: (
    id: string,
    handle: CurvedResizeHandle,
    x: number,
    y: number
  ) => void;
  updateCurvedShapeDirection: (
    id: string,
    direction: SemicircleDirection
  ) => void;
  updateCurvedShapeSize: (
    id: string,
    updates: { radius?: number; radiusX?: number; radiusY?: number; baseLength?: number; height?: number }
  ) => void;
}

let shapeCounter = 0;
let projectCounter = 0;
const STORAGE_KEY = "copper-door-editor-state";
const DEFAULT_BRUSH_COLOR = "#111827";
const DEFAULT_BRUSH_STROKE_WIDTH = 2;
const DEFAULT_VIEW_CENTER_X = 480;
const DEFAULT_VIEW_CENTER_Y = 320;
const MIN_VIEW_ZOOM = 0.1;
const MAX_VIEW_ZOOM = 8;
const MIN_DRAW_SIZE = 10;
const DEFAULT_DIMENSION_OFFSET = 42;
const DEFAULT_DIMENSION_STYLE: DimensionStylePreset = "blue-assist";

interface BrushStyle {
  strokeColor: string;
  strokeWidth: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function nowIso(): string {
  return new Date().toISOString();
}

function createShapeId(): string {
  shapeCounter += 1;
  return `shape-${shapeCounter}`;
}

function createProjectId(): string {
  projectCounter += 1;
  return `project-${projectCounter}`;
}

function getMaxShapeIdNumber(shapes: Shape[]): number {
  return shapes.reduce((max, shape) => {
    const match = /^shape-(\d+)$/.exec(shape.id);
    const ownMax = match ? Math.max(max, Number(match[1])) : max;

    return shape.type === "group"
      ? Math.max(ownMax, getMaxShapeIdNumber(shape.children))
      : ownMax;
  }, 0);
}

function syncCounters(projects: Project[]): void {
  const maxProjectIdNumber = projects.reduce((max, project) => {
    const match = /^project-(\d+)$/.exec(project.id);
    return match ? Math.max(max, Number(match[1])) : max;
  }, 0);

  const maxShapeIdNumber = projects.reduce((max, project) => {
    return Math.max(max, getMaxShapeIdNumber(project.shapes));
  }, 0);

  projectCounter = Math.max(projectCounter, maxProjectIdNumber);
  shapeCounter = Math.max(shapeCounter, maxShapeIdNumber);
}

function saveProjects(projects: Project[]): void {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ projects }));
}

function migrateLegacyShapes(parsed: { shapes?: Shape[] }): Project[] {
  if (!Array.isArray(parsed.shapes) || parsed.shapes.length === 0) {
    return [];
  }

  const timestamp = nowIso();
  return [
    {
      id: createProjectId(),
      name: "图纸1",
      createdAt: timestamp,
      updatedAt: timestamp,
      shapes: parsed.shapes,
    },
  ];
}

function loadStoredProjects(): Project[] {
  if (!isBrowser()) {
    return [];
  }

  try {
    const rawState = window.localStorage.getItem(STORAGE_KEY);
    if (!rawState) {
      return [];
    }

    const parsed = JSON.parse(rawState) as {
      projects?: Project[];
      shapes?: Shape[];
    };
    const projects = Array.isArray(parsed.projects)
      ? parsed.projects
      : migrateLegacyShapes(parsed);

    syncCounters(projects);
    return projects;
  } catch {
    return [];
  }
}

function getNextProjectName(projects: Project[]): string {
  let index = 1;
  const names = new Set(projects.map((project) => project.name));

  while (names.has(`图纸${index}`)) {
    index += 1;
  }

  return `图纸${index}`;
}

function createDefaultProject(projects: Project[]): Project {
  const timestamp = nowIso();

  return {
    id: createProjectId(),
    name: getNextProjectName(projects),
    createdAt: timestamp,
    updatedAt: timestamp,
    shapes: [],
  };
}

function updateCurrentProject(
  projects: Project[],
  currentProjectId: string | null,
  shapes: Shape[],
  updateTimestamp = true
): Project[] {
  if (!currentProjectId) {
    return projects;
  }

  const timestamp = nowIso();
  return projects.map((project) =>
    project.id === currentProjectId
      ? {
          ...project,
          shapes,
          updatedAt: updateTimestamp ? timestamp : project.updatedAt,
        }
      : project
  );
}

function clampZoom(zoom: number): number {
  return Math.min(Math.max(zoom, MIN_VIEW_ZOOM), MAX_VIEW_ZOOM);
}

function getShapesBoundingBox(shapes: Shape[]): BoundingBox | null {
  if (shapes.length === 0) {
    return null;
  }

  return shapes.reduce<BoundingBox | null>((box, shape) => {
    const shapeBox = getShapeBoundingBox(shape);

    if (!box) {
      return shapeBox;
    }

    const minX = Math.min(box.x, shapeBox.x);
    const minY = Math.min(box.y, shapeBox.y);
    const maxX = Math.max(box.x + box.width, shapeBox.x + shapeBox.width);
    const maxY = Math.max(box.y + box.height, shapeBox.y + shapeBox.height);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }, null);
}

function createDefaultTabState(shapes: Shape[] = []): ProjectTabState {
  return {
    shapes,
    selectedId: null,
    selectedIds: [],
    selectedLayerIndex: null,
    undoStack: [],
    redoStack: [],
    pendingCurvedShapeKind: null,
    pendingDrawTool: null,
    isDimensionMode: false,
    showDimensions: true,
    dimensionFixedLength: null,
    dimensionFixedOrientation: "horizontal",
    defaultDimensionStyle: DEFAULT_DIMENSION_STYLE,
    snapEnabled: true,
    brushColor: DEFAULT_BRUSH_COLOR,
    brushStrokeWidth: DEFAULT_BRUSH_STROKE_WIDTH,
    viewportCenterX: DEFAULT_VIEW_CENTER_X,
    viewportCenterY: DEFAULT_VIEW_CENTER_Y,
    viewportZoom: 1,
    isPanMode: false,
  };
}

function createFittedTabState(
  shapes: Shape[],
  viewportWidth: number,
  viewportHeight: number
): ProjectTabState {
  const tabState = createDefaultTabState(shapes);
  const box = getShapesBoundingBox(shapes);

  if (!box) {
    return tabState;
  }

  const padding = 80;
  const fitWidth = Math.max(box.width + padding * 2, 1);
  const fitHeight = Math.max(box.height + padding * 2, 1);

  return {
    ...tabState,
    viewportCenterX: box.x + box.width / 2,
    viewportCenterY: box.y + box.height / 2,
    viewportZoom: clampZoom(
      Math.min(
        Math.max(viewportWidth, 1) / fitWidth,
        Math.max(viewportHeight, 1) / fitHeight
      )
    ),
  };
}

function getActiveProjectTabState(state: EditorState): ProjectTabState | null {
  if (!state.currentProjectId) {
    return null;
  }

  return {
    shapes: state.shapes,
    selectedId: state.selectedId,
    selectedIds: state.selectedIds,
    selectedLayerIndex: state.selectedLayerIndex,
    undoStack: state.undoStack,
    redoStack: state.redoStack,
    pendingCurvedShapeKind: state.pendingCurvedShapeKind,
    pendingDrawTool: state.pendingDrawTool,
    isDimensionMode: state.isDimensionMode,
    showDimensions: state.showDimensions,
    dimensionFixedLength: state.dimensionFixedLength,
    dimensionFixedOrientation: state.dimensionFixedOrientation,
    defaultDimensionStyle: state.defaultDimensionStyle,
    snapEnabled: state.snapEnabled,
    brushColor: state.brushColor,
    brushStrokeWidth: state.brushStrokeWidth,
    viewportCenterX: state.viewportCenterX,
    viewportCenterY: state.viewportCenterY,
    viewportZoom: state.viewportZoom,
    isPanMode: state.isPanMode,
  };
}

function persistActiveProjectTabState(state: EditorState): Record<string, ProjectTabState> {
  const tabState = getActiveProjectTabState(state);
  if (!state.currentProjectId || !tabState) {
    return state.projectTabStates;
  }

  return {
    ...state.projectTabStates,
    [state.currentProjectId]: tabState,
  };
}

function activateProjectState(
  id: string,
  tabState: ProjectTabState
): Partial<EditorState> {
  return {
    activeTabId: id,
    currentProjectId: id,
    shapes: tabState.shapes,
    selectedId: tabState.selectedId,
    selectedIds: tabState.selectedIds ?? (tabState.selectedId ? [tabState.selectedId] : []),
    selectedLayerIndex: tabState.selectedLayerIndex,
    undoStack: tabState.undoStack,
    redoStack: tabState.redoStack,
    historyBatch: null,
    pendingCurvedShapeKind: tabState.pendingCurvedShapeKind,
    pendingDrawTool: tabState.pendingDrawTool,
    isDimensionMode: tabState.isDimensionMode,
    showDimensions: tabState.showDimensions,
    dimensionFixedLength: tabState.dimensionFixedLength,
    dimensionFixedOrientation: tabState.dimensionFixedOrientation,
    defaultDimensionStyle: tabState.defaultDimensionStyle,
    snapEnabled: tabState.snapEnabled,
    brushColor: tabState.brushColor,
    brushStrokeWidth: tabState.brushStrokeWidth,
    viewportCenterX: tabState.viewportCenterX,
    viewportCenterY: tabState.viewportCenterY,
    viewportZoom: tabState.viewportZoom,
    isPanMode: tabState.isPanMode,
  };
}

function markDirty(dirtyProjectIds: string[], id: string | null): string[] {
  if (!id || dirtyProjectIds.includes(id)) {
    return dirtyProjectIds;
  }

  return [...dirtyProjectIds, id];
}

function markClean(dirtyProjectIds: string[], id: string): string[] {
  return dirtyProjectIds.filter((projectId) => projectId !== id);
}

function createDefaultRect(): Rect {
  return {
    id: createShapeId(),
    type: "rect",
    x: 100,
    y: 100,
    width: 120,
    height: 80,
  };
}

function createDefaultLine(): Line {
  return {
    id: createShapeId(),
    type: "line",
    x1: 80,
    y1: 80,
    x2: 200,
    y2: 160,
    strokeWidth: DEFAULT_BRUSH_STROKE_WIDTH,
  };
}

function createDefaultNestedRect(): NestedRect {
  const layers = 4;
  return {
    id: createShapeId(),
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

function applyBrushStyle<T extends Shape>(shape: T, style: BrushStyle): T {
  if (shape.type === "nestedRect") {
    return {
      ...shape,
      strokeColor: style.strokeColor,
      strokeWidth: style.strokeWidth,
      layerStrokeWidths: normalizeLayerStrokeWidths(
        shape.layers,
        Array.from({ length: shape.layers }, () => style.strokeWidth)
      ),
    };
  }

  return {
    ...shape,
    strokeColor: style.strokeColor,
    strokeWidth: style.strokeWidth,
  };
}

function updateShapeStyle(shape: Shape, style: Partial<BrushStyle>): Shape {
  if (shape.type === "group") {
    return {
      ...shape,
      children: shape.children.map((child) => updateShapeStyle(child, style)),
    };
  }

  if (shape.type === "nestedRect" && style.strokeWidth !== undefined) {
    return {
      ...shape,
      ...(style.strokeColor !== undefined
        ? { strokeColor: style.strokeColor }
        : {}),
      strokeWidth: style.strokeWidth,
      layerStrokeWidths: normalizeLayerStrokeWidths(
        shape.layers,
        Array.from({ length: shape.layers }, () => style.strokeWidth ?? 1)
      ),
    };
  }

  return {
    ...shape,
    ...(style.strokeColor !== undefined ? { strokeColor: style.strokeColor } : {}),
    ...(style.strokeWidth !== undefined ? { strokeWidth: style.strokeWidth } : {}),
  };
}

function createDefaultCurvedShape(
  kind: CurvedShapeKind,
  centerX: number,
  centerY: number
): CurvedShape {
  const defaults: Record<CurvedShapeKind, { width: number; height: number }> = {
    circle: { width: 120, height: 120 },
    ellipse: { width: 160, height: 100 },
    semicircle: { width: 180, height: 90 },
    arc: { width: 220, height: 140 },
    arch: { width: 220, height: 140 },
  };
  const size = defaults[kind];

  return {
    id: createShapeId(),
    type: "curved",
    kind,
    x: centerX - size.width / 2,
    y: centerY - size.height / 2,
    width: size.width,
    height: size.height,
    direction: kind === "semicircle" ? "up" : undefined,
  };
}

function normalizeDrawBox(
  tool: ShapeDrawTool,
  start: { x: number; y: number },
  end: { x: number; y: number }
): BoundingBox {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (tool === "circle") {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    const x = dx < 0 ? start.x - size : start.x;
    const y = dy < 0 ? start.y - size : start.y;
    return { x, y, width: size, height: size };
  }

  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(dx),
    height: Math.abs(dy),
  };
}

function createShapeFromDrawBox(tool: ShapeDrawTool, box: BoundingBox): Shape {
  if (tool === "rect") {
    return {
      id: createShapeId(),
      type: "rect",
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    };
  }

  if (tool === "nestedRect") {
    const layers = 4;
    return {
      id: createShapeId(),
      type: "nestedRect",
      x: box.x,
      y: box.y,
      width: box.width / NESTED_RECT_DISPLAY_SCALE,
      height: box.height / NESTED_RECT_DISPLAY_SCALE,
      layers,
      layerOffsets: [80, 80, 80],
      layerStrokeWidths: normalizeLayerStrokeWidths(layers),
    };
  }

  if (tool === "parallelogram") {
    return {
      id: createShapeId(),
      type: "parallelogram",
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      skew: Math.min(box.width * 0.2, 60),
    };
  }

  return {
    id: createShapeId(),
    type: "curved",
    kind: tool,
    x: box.x,
    y: box.y,
    width: box.width,
    height: box.height,
    direction: tool === "semicircle" ? "up" : undefined,
  };
}

function createParallelogramFromDrawPoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
): Parallelogram {
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);
  const skewDirection = end.x >= start.x ? 1 : -1;
  const skew = Math.min(width * 0.2, 60) * skewDirection;
  let x = Math.min(start.x, end.x);
  const y = Math.min(start.y, end.y);

  if (end.x >= start.x && end.y >= start.y) {
    x = start.x - skew;
  }

  if (end.x < start.x && end.y >= start.y) {
    x = start.x - width - skew;
  }

  if (end.x >= start.x && end.y < start.y) {
    x = start.x;
  }

  if (end.x < start.x && end.y < start.y) {
    x = start.x - width;
  }

  return {
    id: createShapeId(),
    type: "parallelogram",
    x,
    y,
    width,
    height,
    skew,
  };
}

function createArcFromDrawPoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
): CurvedShape {
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    id: createShapeId(),
    type: "curved",
    kind: "arc",
    x: Math.min(start.x, end.x),
    y: end.y >= start.y ? start.y : start.y - height,
    width,
    height,
    direction: end.y >= start.y ? "down" : "up",
  };
}

function resizeBoxByHandle(
  box: BoundingBox,
  handle: CurvedResizeHandle,
  x: number,
  y: number
): BoundingBox {
  const minSize = 5;
  const right = box.x + box.width;
  const bottom = box.y + box.height;
  let nextX = box.x;
  let nextY = box.y;
  let nextWidth = box.width;
  let nextHeight = box.height;

  if (handle.includes("left")) {
    nextX = Math.min(x, right - minSize);
    nextWidth = right - nextX;
  }

  if (handle.includes("right")) {
    nextWidth = Math.max(x - box.x, minSize);
  }

  if (handle.includes("top")) {
    nextY = Math.min(y, bottom - minSize);
    nextHeight = bottom - nextY;
  }

  if (handle.includes("bottom")) {
    nextHeight = Math.max(y - box.y, minSize);
  }

  return {
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
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

function getDimensionOrientation(
  start: { x: number; y: number },
  end: { x: number; y: number }
): DimensionOrientation {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);

  if (dx >= dy * 1.8) {
    return "horizontal";
  }

  if (dy >= dx * 1.8) {
    return "vertical";
  }

  return "aligned";
}

function createManualDimension(
  start: { x: number; y: number },
  end: { x: number; y: number },
  linePoint: { x: number; y: number },
  stylePreset: DimensionStylePreset
): DimensionShape {
  return {
    id: createShapeId(),
    type: "dimension",
    x1: start.x,
    y1: start.y,
    x2: end.x,
    y2: end.y,
    lineX: linePoint.x,
    lineY: linePoint.y,
    textOffsetX: 0,
    textOffsetY: 0,
    orientation: getDimensionOrientation(start, end),
    unit: "mm",
    isAuto: false,
    stylePreset,
    strokeColor: "#111827",
    strokeWidth: 1.5,
  };
}

function createFixedLengthDimension(
  start: { x: number; y: number },
  length: number,
  orientation: DimensionOrientation,
  stylePreset: DimensionStylePreset
): DimensionShape {
  const safeLength = Math.max(length, 1);
  const diagonal = safeLength / Math.sqrt(2);
  const end =
    orientation === "vertical"
      ? { x: start.x, y: start.y + safeLength }
      : orientation === "aligned"
        ? { x: start.x + diagonal, y: start.y + diagonal }
        : { x: start.x + safeLength, y: start.y };
  const linePoint =
    orientation === "vertical"
      ? { x: start.x + DEFAULT_DIMENSION_OFFSET, y: start.y + safeLength / 2 }
      : orientation === "aligned"
        ? {
            x: start.x + diagonal / 2 - DEFAULT_DIMENSION_OFFSET / Math.sqrt(2),
            y: start.y + diagonal / 2 + DEFAULT_DIMENSION_OFFSET / Math.sqrt(2),
          }
        : { x: start.x + safeLength / 2, y: start.y + DEFAULT_DIMENSION_OFFSET };

  return {
    ...createManualDimension(start, end, linePoint, stylePreset),
    orientation,
    fixedLength: safeLength,
  };
}

function createBoundDimension(
  shapeId: string,
  kind: DimensionBindingKind,
  orientation: DimensionOrientation,
  offset: number,
  stylePreset: DimensionStylePreset
): DimensionShape {
  return {
    id: createShapeId(),
    type: "dimension",
    x1: 0,
    y1: 0,
    x2: 0,
    y2: 0,
    lineX: 0,
    lineY: 0,
    textOffsetX: 0,
    textOffsetY: 0,
    orientation,
    unit: "mm",
    isAuto: true,
    stylePreset,
    binding: { shapeId, kind, offset },
    strokeColor: "#111827",
    strokeWidth: 1.5,
  };
}

function cloneShapeData<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function createShapeClone(shape: Shape, dx = 0, dy = 0): Shape {
  const cloned = {
    ...cloneShapeData(shape),
    id: createShapeId(),
  } as Shape;

  const copy =
    cloned.type === "dimension" && cloned.binding
      ? { ...cloned, binding: undefined, isAuto: false }
      : cloned;

  return dx === 0 && dy === 0 ? copy : moveShape(copy, dx, dy);
}

function cloneShapeTreeWithIds(
  shape: Shape,
  idMap: Map<string, string>
): Shape {
  const nextId = createShapeId();
  idMap.set(shape.id, nextId);
  const cloned = {
    ...cloneShapeData(shape),
    id: nextId,
  } as Shape;

  if (cloned.type === "group") {
    return {
      ...cloned,
      children: cloned.children.map((child) => cloneShapeTreeWithIds(child, idMap)),
    };
  }

  return cloned;
}

function rebindClonedShape(shape: Shape, idMap: Map<string, string>): Shape {
  if (shape.type === "group") {
    return {
      ...shape,
      children: shape.children.map((child) => rebindClonedShape(child, idMap)),
    };
  }

  if (shape.type === "dimension" && shape.binding) {
    const nextBindingShapeId = idMap.get(shape.binding.shapeId);
    return {
      ...shape,
      binding: nextBindingShapeId
        ? { ...shape.binding, shapeId: nextBindingShapeId }
        : undefined,
      isAuto: Boolean(nextBindingShapeId),
    };
  }

  return shape;
}

function cloneShapesWithNewIds(
  shapes: Shape[],
  dx = 0,
  dy = 0
): { shapes: Shape[]; ids: string[] } {
  const idMap = new Map<string, string>();
  const cloned = shapes.map((shape) => cloneShapeTreeWithIds(shape, idMap));
  const rebound = cloned.map((shape) => rebindClonedShape(shape, idMap));
  const moved = dx === 0 && dy === 0 ? rebound : rebound.map((shape) => moveShape(shape, dx, dy));

  return {
    shapes: moved,
    ids: rebound.map((shape) => shape.id),
  };
}

function getSelectedIds(state: EditorState): string[] {
  if (state.selectedIds.length > 0) {
    return state.selectedIds;
  }

  return state.selectedId ? [state.selectedId] : [];
}

function getSelectedShapes(state: EditorState): Shape[] {
  const ids = new Set(getSelectedIds(state));
  return state.shapes.filter((shape) => ids.has(shape.id));
}

function splitShapesByDimension(shapes: Shape[]): {
  normalShapes: Shape[];
  dimensionShapes: Shape[];
} {
  return {
    normalShapes: shapes.filter((shape) => shape.type !== "dimension"),
    dimensionShapes: shapes.filter((shape) => shape.type === "dimension"),
  };
}

function mergeLayerBuckets(normalShapes: Shape[], dimensionShapes: Shape[]): Shape[] {
  return [...normalShapes, ...dimensionShapes];
}

function moveSelectedInBucket(
  bucket: Shape[],
  selectedIds: Set<string>,
  action: "front" | "back" | "forward" | "backward"
): Shape[] {
  const selected = bucket.filter((shape) => selectedIds.has(shape.id));
  if (selected.length === 0 || selected.length === bucket.length) {
    return bucket;
  }

  const unselected = bucket.filter((shape) => !selectedIds.has(shape.id));

  if (action === "front") {
    return [...unselected, ...selected];
  }

  if (action === "back") {
    return [...selected, ...unselected];
  }

  const result = [...bucket];

  if (action === "forward") {
    for (let index = result.length - 2; index >= 0; index -= 1) {
      if (
        selectedIds.has(result[index].id) &&
        !selectedIds.has(result[index + 1].id)
      ) {
        [result[index], result[index + 1]] = [result[index + 1], result[index]];
      }
    }
    return result;
  }

  for (let index = 1; index < result.length; index += 1) {
    if (
      selectedIds.has(result[index].id) &&
      !selectedIds.has(result[index - 1].id)
    ) {
      [result[index - 1], result[index]] = [result[index], result[index - 1]];
    }
  }

  return result;
}

function createBoundDimensionClone(
  dimension: DimensionShape,
  shapeId: string
): DimensionShape {
  return {
    ...cloneShapeData(dimension),
    id: createShapeId(),
    binding: dimension.binding
      ? {
          ...dimension.binding,
          shapeId,
        }
      : undefined,
  };
}

function getBoundDimensions(shapes: Shape[], shapeId: string): DimensionShape[] {
  return shapes.filter(
    (shape): shape is DimensionShape =>
      shape.type === "dimension" && shape.binding?.shapeId === shapeId
  );
}

function createHistorySnapshot(state: {
  shapes: Shape[];
  selectedId: string | null;
  selectedIds?: string[];
  selectedLayerIndex: number | null;
}): HistorySnapshot {
  return {
    shapes: cloneShapeData(state.shapes),
    selectedId: state.selectedId,
    selectedIds: cloneShapeData(state.selectedIds ?? []),
    selectedLayerIndex: state.selectedLayerIndex,
  };
}

function areShapeListsEqual(a: Shape[], b: Shape[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function pushHistorySnapshot(
  stack: HistorySnapshot[],
  snapshot: HistorySnapshot
): HistorySnapshot[] {
  return [...stack, cloneShapeData(snapshot)].slice(-20);
}

function getHistoryUpdate(state: EditorState): Partial<EditorState> {
  if (state.historyBatch) {
    return {};
  }

  return {
    undoStack: pushHistorySnapshot(state.undoStack, createHistorySnapshot(state)),
    redoStack: [],
  };
}

function getQuickDimensionDefaults(
  shape: Shape,
  kind: DimensionBindingKind
): { orientation: DimensionOrientation; offset: number } | null {
  const box = getShapeBoundingBox(shape);

  if (
    kind.endsWith("height") ||
    kind === "rect-height" ||
    kind === "nested-outer-height" ||
    kind === "nested-inner-height" ||
    kind === "ellipse-height" ||
    kind === "semicircle-height" ||
    kind === "arc-height"
  ) {
    return { orientation: "vertical", offset: DEFAULT_DIMENSION_OFFSET };
  }

  if (
    kind === "circle-radius" ||
    kind === "circle-diameter" ||
    kind === "ellipse-radius-x" ||
    kind === "ellipse-radius-y"
  ) {
    return { orientation: "horizontal", offset: 0 };
  }

  if (kind === "parallelogram-skew") {
    return {
      orientation: "horizontal",
      offset: -Math.max(DEFAULT_DIMENSION_OFFSET, box.height * 0.35),
    };
  }

  return { orientation: "horizontal", offset: DEFAULT_DIMENSION_OFFSET };
}

export const useEditorStore = create<EditorState>((set, get) => ({
  projects: [],
  activeTabId: "directory",
  openProjectIds: [],
  projectTabStates: {},
  dirtyProjectIds: [],
  currentProjectId: null,
  shapes: [],
  selectedId: null,
  selectedIds: [],
  selectedLayerIndex: null,
  pendingCurvedShapeKind: null,
  pendingDrawTool: null,
  isDimensionMode: false,
  showDimensions: true,
  dimensionFixedLength: null,
  dimensionFixedOrientation: "horizontal",
  defaultDimensionStyle: DEFAULT_DIMENSION_STYLE,
  snapEnabled: true,
  brushColor: DEFAULT_BRUSH_COLOR,
  brushStrokeWidth: DEFAULT_BRUSH_STROKE_WIDTH,
  viewportCenterX: DEFAULT_VIEW_CENTER_X,
  viewportCenterY: DEFAULT_VIEW_CENTER_Y,
  viewportZoom: 1,
  viewportWidth: 960,
  viewportHeight: 640,
  isPanMode: false,
  copiedShape: null,
  copiedShapes: [],
  copiedBoundDimensions: [],
  undoStack: [],
  redoStack: [],
  historyBatch: null,

  loadProjects: () => {
    set({
      projects: loadStoredProjects(),
      activeTabId: "directory",
      openProjectIds: [],
      projectTabStates: {},
      dirtyProjectIds: [],
      currentProjectId: null,
      shapes: [],
      selectedId: null,
      selectedIds: [],
      selectedLayerIndex: null,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
      undoStack: [],
      redoStack: [],
      historyBatch: null,
    });
  },

  createProject: () => {
    set((state) => {
      const project = createDefaultProject(state.projects);
      const projects = [...state.projects, project];
      const tabState = createFittedTabState(
        project.shapes,
        state.viewportWidth,
        state.viewportHeight
      );
      saveProjects(projects);

      return {
        projects,
        activeTabId: project.id,
        openProjectIds: [...state.openProjectIds, project.id],
        projectTabStates: {
          ...persistActiveProjectTabState(state),
          [project.id]: tabState,
        },
        currentProjectId: project.id,
        shapes: tabState.shapes,
        selectedId: null,
        selectedIds: [],
        selectedLayerIndex: null,
        pendingCurvedShapeKind: null,
        pendingDrawTool: null,
        isDimensionMode: false,
        undoStack: [],
        redoStack: [],
        historyBatch: null,
      };
    });
  },

  openProject: (id) => {
    const state = get();
    const project = state.projects.find((item) => item.id === id);
    if (!project) {
      return;
    }

    const projectTabStates = persistActiveProjectTabState(state);
    const tabState =
      projectTabStates[id] ??
      createFittedTabState(project.shapes, state.viewportWidth, state.viewportHeight);

    set({
      ...activateProjectState(project.id, tabState),
      openProjectIds: state.openProjectIds.includes(id)
        ? state.openProjectIds
        : [...state.openProjectIds, id],
      projectTabStates: {
        ...projectTabStates,
        [id]: tabState,
      },
    });
  },

  switchToDirectory: () => {
    set((state) => ({
      projectTabStates: persistActiveProjectTabState(state),
      activeTabId: "directory",
      currentProjectId: null,
      shapes: [],
      selectedId: null,
      selectedIds: [],
      selectedLayerIndex: null,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
      isPanMode: false,
      undoStack: [],
      redoStack: [],
      historyBatch: null,
    }));
  },

  returnToProjectList: () => {
    get().switchToDirectory();
  },

  switchToProjectTab: (id) => {
    const state = get();
    const tabState = state.projectTabStates[id];
    if (!tabState) {
      get().openProject(id);
      return;
    }

    set({
      ...activateProjectState(id, tabState),
      projectTabStates: persistActiveProjectTabState(state),
    });
  },

  closeProjectTab: (id, action = "discard") => {
    const state = get();
    const shouldSave = action === "save";
    const currentTabState =
      state.currentProjectId === id
        ? getActiveProjectTabState(state)
        : state.projectTabStates[id];

    let projects = state.projects;
    if (shouldSave && currentTabState) {
      projects = updateCurrentProject(projects, id, currentTabState.shapes);
      saveProjects(projects);
    }

    const { [id]: _closedTabState, ...projectTabStates } =
      state.projectTabStates;
    const openProjectIds = state.openProjectIds.filter(
      (projectId) => projectId !== id
    );
    const dirtyProjectIds = markClean(state.dirtyProjectIds, id);

    if (state.currentProjectId !== id) {
      set({ projects, openProjectIds, projectTabStates, dirtyProjectIds });
      return;
    }

    const nextProjectId = openProjectIds[openProjectIds.length - 1] ?? null;
    if (nextProjectId && projectTabStates[nextProjectId]) {
      set({
        projects,
        openProjectIds,
        projectTabStates,
        dirtyProjectIds,
        ...activateProjectState(nextProjectId, projectTabStates[nextProjectId]),
      });
      return;
    }

    set({
      projects,
      openProjectIds,
      projectTabStates,
      dirtyProjectIds,
      activeTabId: "directory",
      currentProjectId: null,
      shapes: [],
      selectedId: null,
      selectedIds: [],
      selectedLayerIndex: null,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
      isPanMode: false,
    });
  },

  renameProject: (id, name) => {
    const nextName = name.trim();
    if (!nextName) {
      return;
    }

    set((state) => {
      const projects = state.projects.map((project) =>
        project.id === id
          ? { ...project, name: nextName, updatedAt: nowIso() }
          : project
      );
      saveProjects(projects);

      return { projects };
    });
  },

  deleteProject: (id) => {
    set((state) => {
      const projects = state.projects.filter((project) => project.id !== id);
      const { [id]: _deletedTabState, ...projectTabStates } =
        state.projectTabStates;
      const openProjectIds = state.openProjectIds.filter(
        (projectId) => projectId !== id
      );
      const dirtyProjectIds = markClean(state.dirtyProjectIds, id);
      saveProjects(projects);

      if (state.currentProjectId !== id) {
        return { projects, openProjectIds, projectTabStates, dirtyProjectIds };
      }

      return {
        projects,
        openProjectIds,
        projectTabStates,
        dirtyProjectIds,
        activeTabId: "directory",
        currentProjectId: null,
        shapes: [],
        selectedId: null,
        selectedIds: [],
        selectedLayerIndex: null,
        pendingCurvedShapeKind: null,
        pendingDrawTool: null,
        isDimensionMode: false,
      };
    });
  },

  saveProject: () => {
    const state = get();
    const { currentProjectId, projects, shapes } = state;
    if (!currentProjectId) {
      return;
    }

    const nextProjects = updateCurrentProject(projects, currentProjectId, shapes);
    const tabState = getActiveProjectTabState(state);
    saveProjects(nextProjects);
    set({
      projects: nextProjects,
      dirtyProjectIds: markClean(state.dirtyProjectIds, currentProjectId),
      projectTabStates:
        tabState === null
          ? state.projectTabStates
          : {
              ...state.projectTabStates,
              [currentProjectId]: tabState,
            },
    });
  },

  clearCanvas: () => {
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [],
      selectedId: null,
      selectedIds: [],
      selectedLayerIndex: null,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
      dirtyProjectIds: markDirty(state.dirtyProjectIds, state.currentProjectId),
    }));
  },

  beginHistoryBatch: () => {
    set((state) => {
      if (state.historyBatch) {
        return {};
      }

      return {
        historyBatch: createHistorySnapshot(state),
      };
    });
  },

  commitHistoryBatch: () => {
    set((state) => {
      if (!state.historyBatch) {
        return {};
      }

      const historyBatch = state.historyBatch;
      if (areShapeListsEqual(historyBatch.shapes, state.shapes)) {
        return { historyBatch: null };
      }

      return {
        undoStack: pushHistorySnapshot(state.undoStack, historyBatch),
        redoStack: [],
        historyBatch: null,
      };
    });
  },

  cancelHistoryBatch: () => {
    set({
      historyBatch: null,
    });
  },

  setViewportSize: ({ width, height }) => {
    if (width <= 0 || height <= 0) {
      return;
    }

    set({
      viewportWidth: width,
      viewportHeight: height,
    });
  },

  zoomViewportAt: (worldX, worldY, screenRatioX, screenRatioY, factor) => {
    set((state) => {
      const viewportWidth = Math.max(state.viewportWidth, 1);
      const viewportHeight = Math.max(state.viewportHeight, 1);
      const nextZoom = clampZoom(state.viewportZoom * factor);
      const nextViewWidth = viewportWidth / nextZoom;
      const nextViewHeight = viewportHeight / nextZoom;
      const nextViewX = worldX - screenRatioX * nextViewWidth;
      const nextViewY = worldY - screenRatioY * nextViewHeight;

      return {
        viewportZoom: nextZoom,
        viewportCenterX: nextViewX + nextViewWidth / 2,
        viewportCenterY: nextViewY + nextViewHeight / 2,
      };
    });
  },

  zoomViewportAtCenter: (factor) => {
    set((state) => ({
      viewportZoom: clampZoom(state.viewportZoom * factor),
    }));
  },

  panViewportBy: (screenDx, screenDy) => {
    set((state) => ({
      viewportCenterX: state.viewportCenterX - screenDx / state.viewportZoom,
      viewportCenterY: state.viewportCenterY - screenDy / state.viewportZoom,
    }));
  },

  fitViewportToShapes: () => {
    set((state) => {
      const viewportWidth = Math.max(state.viewportWidth, 1);
      const viewportHeight = Math.max(state.viewportHeight, 1);
      const box = getShapesBoundingBox(state.shapes);

      if (!box) {
        return {
          viewportCenterX: DEFAULT_VIEW_CENTER_X,
          viewportCenterY: DEFAULT_VIEW_CENTER_Y,
          viewportZoom: 1,
        };
      }

      const padding = 80;
      const fitWidth = Math.max(box.width + padding * 2, 1);
      const fitHeight = Math.max(box.height + padding * 2, 1);

      return {
        viewportCenterX: box.x + box.width / 2,
        viewportCenterY: box.y + box.height / 2,
        viewportZoom: clampZoom(
          Math.min(viewportWidth / fitWidth, viewportHeight / fitHeight)
        ),
      };
    });
  },

  togglePanMode: () => {
    set((state) => ({
      isPanMode: !state.isPanMode,
      pendingCurvedShapeKind: state.isPanMode
        ? state.pendingCurvedShapeKind
        : null,
      pendingDrawTool: state.isPanMode ? state.pendingDrawTool : null,
      isDimensionMode: state.isPanMode ? state.isDimensionMode : false,
    }));
  },

  setPanMode: (isPanMode) => {
    set({
      isPanMode,
      ...(isPanMode
        ? {
            pendingCurvedShapeKind: null,
            pendingDrawTool: null,
            isDimensionMode: false,
          }
        : {}),
    });
  },

  selectTool: () => {
    set({
      isPanMode: false,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
    });
  },

  startDimensionTool: () => {
    set({
      isDimensionMode: true,
      isPanMode: false,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      selectedId: null,
      selectedIds: [],
      selectedLayerIndex: null,
    });
  },

  toggleShowDimensions: () => {
    set((state) => ({ showDimensions: !state.showDimensions }));
  },

  setDimensionFixedLength: (length) => {
    set({ dimensionFixedLength: length === null ? null : Math.max(length, 1) });
  },

  setDimensionFixedOrientation: (orientation) => {
    set({ dimensionFixedOrientation: orientation });
  },

  setDefaultDimensionStyle: (style) => {
    set({ defaultDimensionStyle: style });
  },

  toggleSnapEnabled: () => {
    set((state) => ({ snapEnabled: !state.snapEnabled }));
  },

  setBrushColor: (color) => {
    set((state) => ({
      ...(getSelectedIds(state).length > 0 ? getHistoryUpdate(state) : {}),
      brushColor: color,
      shapes: getSelectedIds(state).length > 0
        ? state.shapes.map((shape) =>
            getSelectedIds(state).includes(shape.id)
              ? updateShapeStyle(shape, { strokeColor: color })
              : shape
          )
        : state.shapes,
    }));
  },

  setBrushStrokeWidth: (strokeWidth) => {
    const safeStrokeWidth = Math.max(strokeWidth, 1);

    set((state) => ({
      ...(getSelectedIds(state).length > 0 ? getHistoryUpdate(state) : {}),
      brushStrokeWidth: safeStrokeWidth,
      shapes: getSelectedIds(state).length > 0
        ? state.shapes.map((shape) =>
            getSelectedIds(state).includes(shape.id)
              ? updateShapeStyle(shape, { strokeWidth: safeStrokeWidth })
              : shape
          )
        : state.shapes,
    }));
  },

  addRect: () => {
    const rect = applyBrushStyle(createDefaultRect(), {
      strokeColor: get().brushColor,
      strokeWidth: get().brushStrokeWidth,
    });
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, rect],
      selectedId: rect.id,
      selectedIds: [rect.id],
      selectedLayerIndex: null,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
    }));
  },

  addLine: () => {
    const line = applyBrushStyle(createDefaultLine(), {
      strokeColor: get().brushColor,
      strokeWidth: get().brushStrokeWidth,
    });
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, line],
      selectedId: line.id,
      selectedIds: [line.id],
      selectedLayerIndex: null,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
    }));
  },

  addNestedRect: () => {
    const nestedRect = applyBrushStyle(createDefaultNestedRect(), {
      strokeColor: get().brushColor,
      strokeWidth: get().brushStrokeWidth,
    });
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, nestedRect],
      selectedId: nestedRect.id,
      selectedIds: [nestedRect.id],
      selectedLayerIndex: null,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
    }));
  },

  startDrawShape: (tool) => {
    set({
      pendingDrawTool: tool,
      pendingCurvedShapeKind:
        tool === "rect" ||
        tool === "nestedRect" ||
        tool === "parallelogram"
          ? null
          : tool,
      selectedId: null,
      selectedIds: [],
      selectedLayerIndex: null,
      isPanMode: false,
      isDimensionMode: false,
    });
  },

  placeDrawnShape: (tool, start, end) => {
    const box = normalizeDrawBox(tool, start, end);

    if (box.width < MIN_DRAW_SIZE || box.height < MIN_DRAW_SIZE) {
      return;
    }

    const rawShape =
      tool === "arc"
        ? createArcFromDrawPoints(start, end)
        : tool === "parallelogram"
          ? createParallelogramFromDrawPoints(start, end)
        : createShapeFromDrawBox(tool, box);
    const shape = applyBrushStyle(rawShape, {
      strokeColor: get().brushColor,
      strokeWidth: get().brushStrokeWidth,
    });

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, shape],
      selectedId: shape.id,
      selectedIds: [shape.id],
      selectedLayerIndex: null,
      pendingDrawTool: null,
      pendingCurvedShapeKind: null,
      isDimensionMode: false,
      isPanMode: false,
    }));
  },

  startAddCurvedShape: (kind) => {
    set({
      pendingCurvedShapeKind: kind,
      pendingDrawTool: kind,
      selectedId: null,
      selectedIds: [],
      selectedLayerIndex: null,
      isPanMode: false,
      isDimensionMode: false,
    });
  },

  placePendingCurvedShape: (x, y) => {
    const { pendingCurvedShapeKind } = get();
    if (!pendingCurvedShapeKind) {
      return;
    }

    const shape = applyBrushStyle(
      createDefaultCurvedShape(pendingCurvedShapeKind, x, y),
      {
        strokeColor: get().brushColor,
        strokeWidth: get().brushStrokeWidth,
      }
    );
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, shape],
      selectedId: shape.id,
      selectedIds: [shape.id],
      selectedLayerIndex: null,
      pendingCurvedShapeKind: null,
      pendingDrawTool: null,
      isDimensionMode: false,
    }));
  },

  selectShape: (id) => {
    set({
      selectedId: id,
      selectedIds: id ? [id] : [],
      selectedLayerIndex: null,
    });
  },

  toggleShapeSelection: (id) => {
    set((state) => {
      const exists = state.selectedIds.includes(id);
      const selectedIds = exists
        ? state.selectedIds.filter((shapeId) => shapeId !== id)
        : [...state.selectedIds, id];

      return {
        selectedIds,
        selectedId: selectedIds.length === 1 ? selectedIds[0] : null,
        selectedLayerIndex: null,
      };
    });
  },

  selectShapes: (ids) => {
    const uniqueIds = Array.from(new Set(ids));
    set({
      selectedIds: uniqueIds,
      selectedId: uniqueIds.length === 1 ? uniqueIds[0] : null,
      selectedLayerIndex: null,
    });
  },

  selectNestedLayer: (id, layerIndex) => {
    set({ selectedId: id, selectedIds: [id], selectedLayerIndex: layerIndex });
  },

  deleteSelected: () => {
    const state = get();
    const ids = getSelectedIds(state);
    if (ids.length === 0) {
      return;
    }
    const idSet = new Set(ids);

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.filter((shape) => {
        if (idSet.has(shape.id)) {
          return false;
        }

        return !(
          shape.type === "dimension" &&
          shape.binding &&
          idSet.has(shape.binding.shapeId)
        );
      }),
      selectedId: null,
      selectedIds: [],
      selectedLayerIndex: null,
    }));
  },

  copySelected: () => {
    const state = get();
    const selectedShapes = getSelectedShapes(state);
    if (selectedShapes.length === 0) {
      return;
    }

    const selectedIdSet = new Set(selectedShapes.map((shape) => shape.id));
    const selectedWithDimensions = state.shapes.filter(
      (shape) =>
        selectedIdSet.has(shape.id) ||
        (shape.type === "dimension" &&
          shape.binding &&
          selectedIdSet.has(shape.binding.shapeId))
    );

    set({
      copiedShape: cloneShapeData(selectedShapes[0]),
      copiedShapes: cloneShapeData(selectedWithDimensions),
      copiedBoundDimensions: [],
    });
  },

  pasteCopied: () => {
    const { copiedShapes, shapes } = get();
    if (copiedShapes.length === 0) {
      return;
    }

    const pasted = cloneShapesWithNewIds(copiedShapes, 20, 20);

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...shapes, ...pasted.shapes],
      selectedId: pasted.ids.length === 1 ? pasted.ids[0] : null,
      selectedIds: pasted.ids,
      selectedLayerIndex: null,
      pendingDrawTool: null,
      pendingCurvedShapeKind: null,
      isDimensionMode: false,
    }));
  },

  duplicateShapeForDrag: (id) => {
    const state = get();
    const selectedIds = getSelectedIds(state);
    const copyIds = selectedIds.includes(id) ? selectedIds : [id];
    const copyIdSet = new Set(copyIds);
    const shapesToCopy = state.shapes.filter((shape) => copyIdSet.has(shape.id));
    if (shapesToCopy.length === 0) {
      return null;
    }

    const boundDimensions = state.shapes.filter(
      (shape): shape is DimensionShape =>
        shape.type === "dimension" &&
        shape.binding !== undefined &&
        copyIdSet.has(shape.binding.shapeId) &&
        !copyIdSet.has(shape.id)
    );
    const cloned = cloneShapesWithNewIds([...shapesToCopy, ...boundDimensions]);

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, ...cloned.shapes],
      selectedId: cloned.ids.length === 1 ? cloned.ids[0] : null,
      selectedIds: cloned.ids,
      selectedLayerIndex: null,
      pendingDrawTool: null,
      pendingCurvedShapeKind: null,
      isDimensionMode: false,
    }));

    return cloned.ids[0] ?? null;
  },

  arrayCopySelected: (direction, count, spacing) => {
    const state = get();
    const sourceShapes = getSelectedShapes(state).filter(
      (shape) => shape.type !== "dimension"
    );
    if (sourceShapes.length === 0) {
      return;
    }

    const sourceIdSet = new Set(sourceShapes.map((shape) => shape.id));
    const boundDimensions = state.shapes.filter(
      (shape): shape is DimensionShape =>
        shape.type === "dimension" &&
        shape.binding !== undefined &&
        sourceIdSet.has(shape.binding.shapeId)
    );
    const unitShapes = [...sourceShapes, ...boundDimensions];

    const safeCount = Math.max(Math.round(count), 1);
    if (safeCount <= 1) {
      return;
    }

    const safeSpacing = Math.max(spacing, 0);
    const sourceBox = getShapesBoundingBox(unitShapes);
    if (!sourceBox) {
      return;
    }
    const step =
      direction === "horizontal"
        ? sourceBox.width + safeSpacing
        : sourceBox.height + safeSpacing;
    const addedShapes: Shape[] = [];
    let selectedIds = getSelectedIds(state);

    for (let index = 1; index < safeCount; index += 1) {
      const dx = direction === "horizontal" ? step * index : 0;
      const dy = direction === "vertical" ? step * index : 0;
      const cloned = cloneShapesWithNewIds(unitShapes, dx, dy);
      selectedIds = [...selectedIds, ...cloned.ids];
      addedShapes.push(...cloned.shapes);
    }

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, ...addedShapes],
      selectedId: selectedIds.length === 1 ? selectedIds[0] : null,
      selectedIds,
      selectedLayerIndex: null,
      pendingDrawTool: null,
      pendingCurvedShapeKind: null,
      isDimensionMode: false,
    }));
  },

  distributeSelected: (direction) => {
    const state = get();
    const selectedShapes = getSelectedShapes(state);
    if (selectedShapes.length < 3) {
      return;
    }

    const sorted = [...selectedShapes].sort((a, b) => {
      const aBox = getShapeBoundingBox(a);
      const bBox = getShapeBoundingBox(b);
      return direction === "horizontal" ? aBox.x - bBox.x : aBox.y - bBox.y;
    });
    const boxes = sorted.map((shape) => ({
      shape,
      box: getShapeBoundingBox(shape),
    }));
    const first = boxes[0];
    const last = boxes[boxes.length - 1];

    if (!first || !last) {
      return;
    }

    const totalSpan =
      direction === "horizontal"
        ? last.box.x + last.box.width - first.box.x
        : last.box.y + last.box.height - first.box.y;
    const totalSize = boxes.reduce(
      (sum, item) =>
        sum + (direction === "horizontal" ? item.box.width : item.box.height),
      0
    );
    const gap = (totalSpan - totalSize) / (boxes.length - 1);
    const deltas = new Map<string, { dx: number; dy: number }>();
    let cursor =
      direction === "horizontal"
        ? first.box.x + first.box.width
        : first.box.y + first.box.height;

    boxes.slice(1, -1).forEach((item) => {
      const targetStart = cursor + gap;
      const currentStart =
        direction === "horizontal" ? item.box.x : item.box.y;
      const delta = targetStart - currentStart;
      deltas.set(item.shape.id, {
        dx: direction === "horizontal" ? delta : 0,
        dy: direction === "vertical" ? delta : 0,
      });
      cursor =
        targetStart +
        (direction === "horizontal" ? item.box.width : item.box.height);
    });

    if (
      Array.from(deltas.values()).every(
        (delta) => Math.abs(delta.dx) < 0.001 && Math.abs(delta.dy) < 0.001
      )
    ) {
      return;
    }

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        const delta = deltas.get(shape.id);
        return delta ? moveShape(shape, delta.dx, delta.dy) : shape;
      }),
      selectedId: state.selectedId,
      selectedIds: state.selectedIds,
      selectedLayerIndex: state.selectedLayerIndex,
    }));
  },

  undo: () => {
    const { undoStack } = get();
    const previous = undoStack[undoStack.length - 1];
    if (!previous) {
      return;
    }

    set((state) => ({
      shapes: cloneShapeData(previous.shapes),
      selectedId: previous.selectedId,
      selectedIds: previous.selectedIds,
      selectedLayerIndex: previous.selectedLayerIndex,
      undoStack: undoStack.slice(0, -1),
      redoStack: pushHistorySnapshot(state.redoStack, createHistorySnapshot(state)),
      historyBatch: null,
    }));
  },

  redo: () => {
    const { redoStack } = get();
    const next = redoStack[redoStack.length - 1];
    if (!next) {
      return;
    }

    set((state) => ({
      shapes: cloneShapeData(next.shapes),
      selectedId: next.selectedId,
      selectedIds: next.selectedIds,
      selectedLayerIndex: next.selectedLayerIndex,
      undoStack: pushHistorySnapshot(state.undoStack, createHistorySnapshot(state)),
      redoStack: redoStack.slice(0, -1),
      historyBatch: null,
    }));
  },

  groupSelected: () => {
    const state = get();
    const ids = getSelectedIds(state);
    if (ids.length < 2) {
      return;
    }

    const idSet = new Set(ids);
    const children = state.shapes.filter(
      (shape) =>
        idSet.has(shape.id) ||
        (shape.type === "dimension" &&
          shape.binding !== undefined &&
          idSet.has(shape.binding.shapeId))
    );
    if (children.length < 2) {
      return;
    }
    const groupedIds = new Set(children.map((child) => child.id));

    const group: GroupShape = {
      id: createShapeId(),
      type: "group",
      children: cloneShapeData(children),
    };

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [
        ...state.shapes.filter((shape) => !groupedIds.has(shape.id)),
        group,
      ],
      selectedId: group.id,
      selectedIds: [group.id],
      selectedLayerIndex: null,
    }));
  },

  ungroupSelected: () => {
    const state = get();
    const ids = getSelectedIds(state);
    const groups = state.shapes.filter(
      (shape): shape is GroupShape => ids.includes(shape.id) && shape.type === "group"
    );
    if (groups.length === 0) {
      return;
    }

    const groupIds = new Set(groups.map((group) => group.id));
    const children = groups.flatMap((group) => group.children);

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [
        ...state.shapes.filter((shape) => !groupIds.has(shape.id)),
        ...children,
      ],
      selectedId: children.length === 1 ? children[0].id : null,
      selectedIds: children.map((child) => child.id),
      selectedLayerIndex: null,
    }));
  },

  reorderSelected: (action) => {
    const state = get();
    const ids = getSelectedIds(state);
    if (ids.length === 0) {
      return;
    }

    const selectedIdSet = new Set(ids);
    const selectedAreDimensions = getSelectedShapes(state).every(
      (shape) => shape.type === "dimension"
    );
    const { normalShapes, dimensionShapes } = splitShapesByDimension(state.shapes);
    const targetBucket = selectedAreDimensions ? dimensionShapes : normalShapes;
    const nextBucket = moveSelectedInBucket(targetBucket, selectedIdSet, action);

    if (nextBucket === targetBucket) {
      return;
    }

    set((state) => {
      const currentBuckets = splitShapesByDimension(state.shapes);
      const nextShapes = selectedAreDimensions
        ? mergeLayerBuckets(currentBuckets.normalShapes, nextBucket)
        : mergeLayerBuckets(nextBucket, currentBuckets.dimensionShapes);

      return {
        ...getHistoryUpdate(state),
        shapes: nextShapes,
        selectedId: state.selectedId,
        selectedIds: state.selectedIds,
        selectedLayerIndex: state.selectedLayerIndex,
      };
    });
  },

  moveShapeById: (id, dx, dy) => {
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) =>
        (state.selectedIds.includes(id) && state.selectedIds.includes(shape.id)) ||
        shape.id === id
          ? moveShape(shape, dx, dy)
          : shape
      ),
    }));
  },

  updateShapeBoundingBox: (id, box) => {
    set((state) => ({
      ...getHistoryUpdate(state),
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
      ...getHistoryUpdate(state),
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
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "nestedRect") {
          return shape;
        }

        return applyNestedRectUpdates(shape, updates);
      }),
      selectedLayerIndex:
        state.selectedId === id &&
        state.selectedLayerIndex !== null &&
        updates.layers !== undefined &&
        state.selectedLayerIndex >= Math.max(Math.round(updates.layers), 1)
          ? null
          : state.selectedLayerIndex,
    }));
  },

  updateNestedRectLayerStrokeWidth: (id, layerIndex, strokeWidth) => {
    set((state) => ({
      ...getHistoryUpdate(state),
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

  updateParallelogram: (id, updates) => {
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "parallelogram") {
          return shape;
        }

        const nextWidth = Math.max(updates.width ?? shape.width, 1);
        const nextSkew = updates.skew ?? shape.skew;

        return {
          ...shape,
          width: nextWidth,
          height: Math.max(updates.height ?? shape.height, 1),
          skew: Math.max(Math.min(nextSkew, nextWidth), -nextWidth),
        };
      }),
    }));
  },

  addManualDimension: (start, end, linePoint) => {
    const dimension = createManualDimension(
      start,
      end,
      linePoint,
      get().defaultDimensionStyle
    );

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, dimension],
      selectedId: dimension.id,
      selectedIds: [dimension.id],
      selectedLayerIndex: null,
      isDimensionMode: false,
    }));
  },

  addFixedLengthDimension: (start) => {
    const { dimensionFixedLength, dimensionFixedOrientation } = get();
    if (dimensionFixedLength === null) {
      return;
    }

    const dimension = createFixedLengthDimension(
      start,
      dimensionFixedLength,
      dimensionFixedOrientation,
      get().defaultDimensionStyle
    );

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, dimension],
      selectedId: dimension.id,
      selectedIds: [dimension.id],
      selectedLayerIndex: null,
      isDimensionMode: false,
    }));
  },

  addQuickDimension: (shapeId, kind) => {
    const shape = get().shapes.find((item) => item.id === shapeId);
    if (!shape || shape.type === "dimension") {
      return;
    }

    const defaults = getQuickDimensionDefaults(shape, kind);
    if (!defaults) {
      return;
    }

    const dimension = createBoundDimension(
      shapeId,
      kind,
      defaults.orientation,
      defaults.offset,
      get().defaultDimensionStyle
    );

    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: [...state.shapes, dimension],
      selectedId: dimension.id,
      selectedIds: [dimension.id],
      selectedLayerIndex: null,
    }));
  },

  updateDimensionTextOffset: (id, dx, dy) => {
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "dimension") {
          return shape;
        }

        return {
          ...shape,
          textOffsetX: shape.textOffsetX + dx,
          textOffsetY: shape.textOffsetY + dy,
        };
      }),
    }));
  },

  updateDimensionStyle: (id, style, makeDefault = false) => {
    set((state) => ({
      ...getHistoryUpdate(state),
      defaultDimensionStyle: makeDefault
        ? style
        : state.defaultDimensionStyle,
      shapes: state.shapes.map((shape) =>
        shape.id === id && shape.type === "dimension"
          ? { ...shape, stylePreset: style }
          : shape
      ),
    }));
  },

  updateDimensionLength: (id, length) => {
    const safeLength = Math.max(length, 1);
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "dimension" || shape.binding) {
          return shape;
        }

        if (shape.orientation === "vertical") {
          return {
            ...shape,
            y2: shape.y1 + safeLength,
            fixedLength: safeLength,
          };
        }

        if (shape.orientation === "aligned") {
          const length = Math.max(
            Math.sqrt((shape.x2 - shape.x1) ** 2 + (shape.y2 - shape.y1) ** 2),
            1
          );
          const ux = (shape.x2 - shape.x1) / length;
          const uy = (shape.y2 - shape.y1) / length;

          return {
            ...shape,
            x2: shape.x1 + ux * safeLength,
            y2: shape.y1 + uy * safeLength,
            fixedLength: safeLength,
          };
        }

        return {
          ...shape,
          x2: shape.x1 + safeLength,
          fixedLength: safeLength,
        };
      }),
    }));
  },

  resizeCurvedShapeById: (id, handle, x, y) => {
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "curved") {
          return shape;
        }

        return resizeCurvedShape(shape, handle, x, y);
      }),
    }));
  },

  resizeShapeById: (id, handle, x, y) => {
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id) {
          return shape;
        }

        if (shape.type === "curved") {
          return resizeCurvedShape(shape, handle, x, y);
        }

        if (shape.type === "rect" || shape.type === "nestedRect") {
          return updateShapeFromBoundingBox(
            shape,
            resizeBoxByHandle(getShapeBoundingBox(shape), handle, x, y)
          );
        }

        if (shape.type === "parallelogram") {
          if (handle === "skew") {
            return {
              ...shape,
              skew: Math.max(
                Math.min(x - (shape.x + shape.width / 2), shape.width),
                -shape.width
              ),
            };
          }

          return updateShapeFromBoundingBox(
            shape,
            resizeBoxByHandle(getShapeBoundingBox(shape), handle, x, y)
          );
        }

        return shape;
      }),
    }));
  },

  updateCurvedShapeDirection: (id, direction) => {
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        if (
          shape.id !== id ||
          shape.type !== "curved" ||
          shape.kind !== "semicircle"
        ) {
          return shape;
        }

        return { ...shape, direction };
      }),
    }));
  },

  updateCurvedShapeSize: (id, updates) => {
    set((state) => ({
      ...getHistoryUpdate(state),
      shapes: state.shapes.map((shape) => {
        if (shape.id !== id || shape.type !== "curved") {
          return shape;
        }

        const centerX = shape.x + shape.width / 2;
        const centerY = shape.y + shape.height / 2;
        let width = shape.width;
        let height = shape.height;

        if (shape.kind === "circle" && updates.radius !== undefined) {
          const size = Math.max(updates.radius * 2, 1);
          width = size;
          height = size;
        }

        if (shape.kind === "ellipse") {
          if (updates.radiusX !== undefined) {
            width = Math.max(updates.radiusX * 2, 1);
          }
          if (updates.radiusY !== undefined) {
            height = Math.max(updates.radiusY * 2, 1);
          }
        }

        if (shape.kind === "semicircle") {
          const direction = shape.direction ?? "up";

          if (direction === "left" || direction === "right") {
            if (updates.baseLength !== undefined) {
              height = Math.max(updates.baseLength, 1);
            }
            if (updates.height !== undefined) {
              width = Math.max(updates.height, 1);
            }
          } else {
            if (updates.baseLength !== undefined) {
              width = Math.max(updates.baseLength, 1);
            }
            if (updates.height !== undefined) {
              height = Math.max(updates.height, 1);
            }
          }
        }

        if (shape.kind === "arc" || shape.kind === "arch") {
          if (updates.baseLength !== undefined) {
            width = Math.max(updates.baseLength, 1);
          }
          if (updates.height !== undefined) {
            height = Math.max(updates.height, 1);
          }
        }

        return {
          ...shape,
          x: centerX - width / 2,
          y: centerY - height / 2,
          width,
          height,
        };
      }),
    }));
  },
}));

useEditorStore.subscribe((state) => {
  const { currentProjectId } = state;
  if (!currentProjectId) {
    return;
  }

  const prevTabState = state.projectTabStates[currentProjectId];
  const nextTabState = getActiveProjectTabState(state);
  if (!nextTabState) {
    return;
  }

  if (
    prevTabState &&
    prevTabState.shapes === nextTabState.shapes &&
    prevTabState.selectedId === nextTabState.selectedId &&
    prevTabState.selectedIds === nextTabState.selectedIds &&
    prevTabState.selectedLayerIndex === nextTabState.selectedLayerIndex &&
    prevTabState.undoStack === nextTabState.undoStack &&
    prevTabState.redoStack === nextTabState.redoStack &&
    prevTabState.pendingCurvedShapeKind === nextTabState.pendingCurvedShapeKind &&
    prevTabState.pendingDrawTool === nextTabState.pendingDrawTool &&
    prevTabState.isDimensionMode === nextTabState.isDimensionMode &&
    prevTabState.showDimensions === nextTabState.showDimensions &&
    prevTabState.dimensionFixedLength === nextTabState.dimensionFixedLength &&
    prevTabState.dimensionFixedOrientation === nextTabState.dimensionFixedOrientation &&
    prevTabState.defaultDimensionStyle === nextTabState.defaultDimensionStyle &&
    prevTabState.snapEnabled === nextTabState.snapEnabled &&
    prevTabState.brushColor === nextTabState.brushColor &&
    prevTabState.brushStrokeWidth === nextTabState.brushStrokeWidth &&
    prevTabState.viewportCenterX === nextTabState.viewportCenterX &&
    prevTabState.viewportCenterY === nextTabState.viewportCenterY &&
    prevTabState.viewportZoom === nextTabState.viewportZoom &&
    prevTabState.isPanMode === nextTabState.isPanMode
  ) {
    return;
  }

  const shouldMarkDirty = prevTabState
    ? prevTabState.shapes !== nextTabState.shapes
    : false;

  useEditorStore.setState({
    projectTabStates: {
      ...state.projectTabStates,
      [currentProjectId]: nextTabState,
    },
    dirtyProjectIds: shouldMarkDirty
      ? markDirty(state.dirtyProjectIds, currentProjectId)
      : state.dirtyProjectIds,
  });
});

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
