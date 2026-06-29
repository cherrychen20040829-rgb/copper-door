"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShapeRenderer,
  type ShapeDragTarget,
} from "@/components/canvas/ShapeRenderer";
import { useEditorStore } from "@/store/useEditorStore";
import type { BoundingBox, Shape, ShapeDrawTool } from "@/types/shape";
import {
  getShapeBoundingBox,
  getShapesBoundingBox,
  NESTED_RECT_DISPLAY_SCALE,
} from "@/types/shape";

type DragMode = ShapeDragTarget;

interface DragState {
  shapeId: string;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  startBox: BoundingBox | null;
}

interface PanState {
  startClientX: number;
  startClientY: number;
}

interface DrawingDraft {
  tool: ShapeDrawTool;
  start: { x: number; y: number };
  current: { x: number; y: number };
}

interface DimensionDraft {
  start: { x: number; y: number };
  end: { x: number; y: number } | null;
  current: { x: number; y: number };
}

interface SelectionDraft {
  start: { x: number; y: number };
  current: { x: number; y: number };
}

interface SnapGuide {
  x?: number;
  y?: number;
  kind: "edge" | "center" | "grid";
}

interface SnapCandidate {
  delta: number;
  distance: number;
  kind: "edge" | "center" | "grid";
  line: number;
}

function clientToSvg(
  svg: SVGSVGElement,
  clientX: number,
  clientY: number
): { x: number; y: number } {
  const point = svg.createSVGPoint();
  point.x = clientX;
  point.y = clientY;

  const ctm = svg.getScreenCTM();
  if (!ctm) {
    return { x: 0, y: 0 };
  }

  const svgPoint = point.matrixTransform(ctm.inverse());
  return { x: svgPoint.x, y: svgPoint.y };
}

function getGridSize(zoom: number): number {
  if (zoom < 0.25) {
    return 200;
  }
  if (zoom < 0.5) {
    return 100;
  }
  if (zoom < 1) {
    return 50;
  }
  return 20;
}

function getSnapTargets(shapes: Shape[], excludeId?: string) {
  const xs: Array<{ value: number; kind: "edge" | "center" }> = [];
  const ys: Array<{ value: number; kind: "edge" | "center" }> = [];

  shapes.forEach((shape) => {
    if (shape.id === excludeId || shape.type === "dimension") {
      return;
    }

    const box = getShapeBoundingBox(shape);
    xs.push({ value: box.x, kind: "edge" });
    xs.push({ value: box.x + box.width, kind: "edge" });
    xs.push({ value: box.x + box.width / 2, kind: "center" });
    ys.push({ value: box.y, kind: "edge" });
    ys.push({ value: box.y + box.height, kind: "edge" });
    ys.push({ value: box.y + box.height / 2, kind: "center" });
  });

  return { xs, ys };
}

function nearestGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function pickSnap(
  values: number[],
  targets: Array<{ value: number; kind: "edge" | "center" }>,
  gridSize: number,
  threshold: number
): { delta: number; line?: number; kind?: "edge" | "center" | "grid" } {
  const candidates: SnapCandidate[] = [];

  const consider = (
    delta: number,
    distance: number,
    kind: "edge" | "center" | "grid",
    line: number
  ) => {
    if (distance > threshold) {
      return;
    }
    candidates.push({ delta, distance, kind, line });
  };

  values.forEach((value) => {
    targets.forEach((target) => {
      const delta = target.value - value;
      consider(delta, Math.abs(delta), target.kind, target.value);
    });

    const grid = nearestGrid(value, gridSize);
    consider(grid - value, Math.abs(grid - value), "grid", grid);
  });

  if (candidates.length === 0) {
    return { delta: 0 };
  }

  const rank = (kind: SnapCandidate["kind"]) =>
    kind === "center" ? 0 : kind === "edge" ? 1 : 2;
  const best = candidates.sort(
    (a, b) => rank(a.kind) - rank(b.kind) || a.distance - b.distance
  )[0];

  return { delta: best.delta, line: best.line, kind: best.kind };
}

function snapPointToTargets({
  point,
  shapes,
  excludeId,
  gridSize,
  threshold,
}: {
  point: { x: number; y: number };
  shapes: Shape[];
  excludeId?: string;
  gridSize: number;
  threshold: number;
}) {
  const targets = getSnapTargets(shapes, excludeId);
  const xSnap = pickSnap([point.x], targets.xs, gridSize, threshold);
  const ySnap = pickSnap([point.y], targets.ys, gridSize, threshold);
  const guides: SnapGuide[] = [];

  if (xSnap.line !== undefined && xSnap.kind) {
    guides.push({ x: xSnap.line, kind: xSnap.kind });
  }
  if (ySnap.line !== undefined && ySnap.kind) {
    guides.push({ y: ySnap.line, kind: ySnap.kind });
  }

  return {
    point: {
      x: point.x + xSnap.delta,
      y: point.y + ySnap.delta,
    },
    guides,
  };
}

function snapBoxToTargets({
  box,
  shapes,
  excludeId,
  gridSize,
  threshold,
}: {
  box: BoundingBox;
  shapes: Shape[];
  excludeId?: string;
  gridSize: number;
  threshold: number;
}) {
  const targets = getSnapTargets(shapes, excludeId);
  const xValues = [box.x, box.x + box.width, box.x + box.width / 2];
  const yValues = [box.y, box.y + box.height, box.y + box.height / 2];
  const xSnap = pickSnap(xValues, targets.xs, gridSize, threshold);
  const ySnap = pickSnap(yValues, targets.ys, gridSize, threshold);
  const guides: SnapGuide[] = [];

  if (xSnap.line !== undefined && xSnap.kind) {
    guides.push({ x: xSnap.line, kind: xSnap.kind });
  }
  if (ySnap.line !== undefined && ySnap.kind) {
    guides.push({ y: ySnap.line, kind: ySnap.kind });
  }

  return {
    dx: xSnap.delta,
    dy: ySnap.delta,
    guides,
  };
}

function getDrawingBox(
  tool: ShapeDrawTool,
  start: { x: number; y: number },
  end: { x: number; y: number }
): BoundingBox {
  const dx = end.x - start.x;
  const dy = end.y - start.y;

  if (tool === "circle") {
    const size = Math.max(Math.abs(dx), Math.abs(dy));
    return {
      x: dx < 0 ? start.x - size : start.x,
      y: dy < 0 ? start.y - size : start.y,
      width: size,
      height: size,
    };
  }

  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(dx),
    height: Math.abs(dy),
  };
}

function getBoxFromPoints(
  start: { x: number; y: number },
  end: { x: number; y: number }
): BoundingBox {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}

function boxesIntersect(a: BoundingBox, b: BoundingBox): boolean {
  return (
    a.x <= b.x + b.width &&
    a.x + a.width >= b.x &&
    a.y <= b.y + b.height &&
    a.y + a.height >= b.y
  );
}

function getPreviewSemicirclePath(box: BoundingBox): string {
  return `M ${box.x} ${box.y + box.height} A ${box.width / 2} ${
    box.height
  } 0 0 1 ${box.x + box.width} ${box.y + box.height} Z`;
}

function getPreviewArcPath(
  start: { x: number; y: number },
  current: { x: number; y: number }
): string {
  const centerX = (start.x + current.x) / 2;

  return `M ${start.x} ${start.y} Q ${centerX} ${current.y} ${current.x} ${start.y}`;
}

function getPreviewParallelogramPoints(
  start: { x: number; y: number },
  current: { x: number; y: number }
): string {
  const width = Math.abs(current.x - start.x);
  const height = Math.abs(current.y - start.y);
  const skewDirection = current.x >= start.x ? 1 : -1;
  const skew = Math.min(width * 0.2, 60) * skewDirection;
  let x = Math.min(start.x, current.x);
  const y = Math.min(start.y, current.y);

  if (current.x >= start.x && current.y >= start.y) {
    x = start.x - skew;
  }

  if (current.x < start.x && current.y >= start.y) {
    x = start.x - width - skew;
  }

  if (current.x >= start.x && current.y < start.y) {
    x = start.x;
  }

  if (current.x < start.x && current.y < start.y) {
    x = start.x - width;
  }

  return [
    `${x + skew},${y}`,
    `${x + width + skew},${y}`,
    `${x + width},${y + height}`,
    `${x},${y + height}`,
  ].join(" ");
}

function DrawingPreview({
  draft,
  color,
  strokeWidth,
}: {
  draft: DrawingDraft;
  color: string;
  strokeWidth: number;
}) {
  const box = getDrawingBox(draft.tool, draft.start, draft.current);
  const commonProps = {
    stroke: color,
    strokeWidth,
    opacity: 0.72,
    pointerEvents: "none" as const,
  };

  if (
    draft.tool !== "arc" &&
    (box.width <= 0 || box.height <= 0)
  ) {
    return null;
  }

  if (draft.tool === "rect") {
    return (
      <rect
        x={box.x}
        y={box.y}
        width={box.width}
        height={box.height}
        fill="#ffffff"
        fillOpacity={0.18}
        {...commonProps}
      />
    );
  }

  if (draft.tool === "nestedRect") {
    const offset = 80 * NESTED_RECT_DISPLAY_SCALE;
    const innerWidth = box.width - offset * 2;
    const innerHeight = box.height - offset * 2;

    return (
      <g opacity={0.72} pointerEvents="none">
        <rect
          x={box.x}
          y={box.y}
          width={box.width}
          height={box.height}
          fill="#ffffff"
          fillOpacity={0.18}
          stroke={color}
          strokeWidth={strokeWidth}
        />
        {innerWidth > 0 && innerHeight > 0 && (
          <rect
            x={box.x + offset}
            y={box.y + offset}
            width={innerWidth}
            height={innerHeight}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
          />
        )}
      </g>
    );
  }

  if (draft.tool === "parallelogram") {
    return (
      <polygon
        points={getPreviewParallelogramPoints(draft.start, draft.current)}
        fill="#ffffff"
        fillOpacity={0.18}
        {...commonProps}
      />
    );
  }

  if (draft.tool === "circle" || draft.tool === "ellipse") {
    return (
      <ellipse
        cx={box.x + box.width / 2}
        cy={box.y + box.height / 2}
        rx={box.width / 2}
        ry={box.height / 2}
        fill="#ffffff"
        fillOpacity={0.18}
        {...commonProps}
      />
    );
  }

  if (draft.tool === "arc") {
    if (
      Math.abs(draft.current.x - draft.start.x) <= 0 ||
      Math.abs(draft.current.y - draft.start.y) <= 0
    ) {
      return null;
    }

    return (
      <path
        d={getPreviewArcPath(draft.start, draft.current)}
        fill="none"
        {...commonProps}
      />
    );
  }

  return (
    <path
      d={getPreviewSemicirclePath(box)}
      fill="#ffffff"
      fillOpacity={0.18}
      {...commonProps}
    />
  );
}

function DimensionPreview({ draft }: { draft: DimensionDraft }) {
  const start = draft.start;
  const end = draft.end ?? draft.current;
  const linePoint = draft.end ? draft.current : end;
  const isHorizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const lineStart = isHorizontal
    ? { x: start.x, y: linePoint.y }
    : { x: linePoint.x, y: start.y };
  const lineEnd = isHorizontal
    ? { x: end.x, y: linePoint.y }
    : { x: linePoint.x, y: end.y };

  if (Math.abs(end.x - start.x) < 1 && Math.abs(end.y - start.y) < 1) {
    return null;
  }

  return (
    <g pointerEvents="none" opacity={0.75}>
      <line x1={start.x} y1={start.y} x2={lineStart.x} y2={lineStart.y} stroke="#111827" strokeWidth={1.5} />
      <line x1={end.x} y1={end.y} x2={lineEnd.x} y2={lineEnd.y} stroke="#111827" strokeWidth={1.5} />
      <line x1={lineStart.x} y1={lineStart.y} x2={lineEnd.x} y2={lineEnd.y} stroke="#111827" strokeWidth={1.5} />
    </g>
  );
}

export function SvgCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const shapes = useEditorStore((state) => state.shapes);
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectedLayerIndex = useEditorStore((state) => state.selectedLayerIndex);
  const pendingDrawTool = useEditorStore((state) => state.pendingDrawTool);
  const isDimensionMode = useEditorStore((state) => state.isDimensionMode);
  const showDimensions = useEditorStore((state) => state.showDimensions);
  const snapEnabled = useEditorStore((state) => state.snapEnabled);
  const dimensionFixedLength = useEditorStore(
    (state) => state.dimensionFixedLength
  );
  const brushColor = useEditorStore((state) => state.brushColor);
  const brushStrokeWidth = useEditorStore((state) => state.brushStrokeWidth);
  const selectShape = useEditorStore((state) => state.selectShape);
  const selectShapes = useEditorStore((state) => state.selectShapes);
  const toggleShapeSelection = useEditorStore(
    (state) => state.toggleShapeSelection
  );
  const selectNestedLayer = useEditorStore((state) => state.selectNestedLayer);
  const placeDrawnShape = useEditorStore((state) => state.placeDrawnShape);
  const addManualDimension = useEditorStore((state) => state.addManualDimension);
  const addFixedLengthDimension = useEditorStore(
    (state) => state.addFixedLengthDimension
  );
  const moveShapeById = useEditorStore((state) => state.moveShapeById);
  const updateDimensionTextOffset = useEditorStore(
    (state) => state.updateDimensionTextOffset
  );
  const updateLine = useEditorStore((state) => state.updateLine);
  const resizeShapeById = useEditorStore((state) => state.resizeShapeById);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const copySelected = useEditorStore((state) => state.copySelected);
  const pasteCopied = useEditorStore((state) => state.pasteCopied);
  const duplicateShapeForDrag = useEditorStore(
    (state) => state.duplicateShapeForDrag
  );
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const beginHistoryBatch = useEditorStore(
    (state) => state.beginHistoryBatch
  );
  const commitHistoryBatch = useEditorStore(
    (state) => state.commitHistoryBatch
  );
  const cancelHistoryBatch = useEditorStore(
    (state) => state.cancelHistoryBatch
  );
  const viewportCenterX = useEditorStore((state) => state.viewportCenterX);
  const viewportCenterY = useEditorStore((state) => state.viewportCenterY);
  const viewportZoom = useEditorStore((state) => state.viewportZoom);
  const viewportWidth = useEditorStore((state) => state.viewportWidth);
  const viewportHeight = useEditorStore((state) => state.viewportHeight);
  const isPanMode = useEditorStore((state) => state.isPanMode);
  const setViewportSize = useEditorStore((state) => state.setViewportSize);
  const zoomViewportAt = useEditorStore((state) => state.zoomViewportAt);
  const panViewportBy = useEditorStore((state) => state.panViewportBy);

  const [dragState, setDragState] = useState<DragState | null>(null);
  const [panState, setPanState] = useState<PanState | null>(null);
  const [drawingDraft, setDrawingDraft] = useState<DrawingDraft | null>(null);
  const [dimensionDraft, setDimensionDraft] = useState<DimensionDraft | null>(
    null
  );
  const [selectionDraft, setSelectionDraft] = useState<SelectionDraft | null>(
    null
  );
  const [snapGuides, setSnapGuides] = useState<SnapGuide[]>([]);
  const [isSpacePanActive, setIsSpacePanActive] = useState(false);
  const didPanRef = useRef(false);

  const viewBoxWidth = Math.max(viewportWidth, 1) / viewportZoom;
  const viewBoxHeight = Math.max(viewportHeight, 1) / viewportZoom;
  const viewBoxX = viewportCenterX - viewBoxWidth / 2;
  const viewBoxY = viewportCenterY - viewBoxHeight / 2;
  const gridSize = getGridSize(viewportZoom);
  const isViewingMoveMode = isPanMode || isSpacePanActive || panState !== null;
  const snapThreshold = 5 / viewportZoom;
  const selectedBox =
    selectedIds.length > 1
      ? getShapesBoundingBox(
          shapes.filter((shape) => selectedIds.includes(shape.id))
        )
      : null;
  const renderShapes = [
    ...shapes.filter((shape) => shape.type !== "dimension"),
    ...(showDimensions
      ? shapes.filter((shape) => shape.type === "dimension")
      : []),
  ];

  const snapPoint = useCallback(
    (point: { x: number; y: number }, excludeId?: string) => {
      if (!snapEnabled) {
        setSnapGuides([]);
        return point;
      }

      const snapped = snapPointToTargets({
        point,
        shapes,
        excludeId,
        gridSize,
        threshold: snapThreshold,
      });
      setSnapGuides(snapped.guides);
      return snapped.point;
    },
    [gridSize, shapes, snapEnabled, snapThreshold]
  );

  const startPan = useCallback((event: React.PointerEvent) => {
    event.preventDefault();
    svgRef.current?.setPointerCapture(event.pointerId);
    didPanRef.current = false;
    setDragState(null);
    setDrawingDraft(null);
    setDimensionDraft(null);
    setSnapGuides([]);
    setPanState({
      startClientX: event.clientX,
      startClientY: event.clientY,
    });
  }, []);

  const drawAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (!pendingDrawTool) {
        return false;
      }

      if (!drawingDraft || drawingDraft.tool !== pendingDrawTool) {
        selectShape(null);
        setDrawingDraft({
          tool: pendingDrawTool,
          start: point,
          current: point,
        });
        return true;
      }

      placeDrawnShape(drawingDraft.tool, drawingDraft.start, point);
      setDrawingDraft(null);
      setSnapGuides([]);
      return true;
    },
    [drawingDraft, pendingDrawTool, placeDrawnShape, selectShape]
  );

  const dimensionAtPoint = useCallback(
    (point: { x: number; y: number }) => {
      if (!isDimensionMode) {
        return false;
      }

      if (dimensionFixedLength !== null) {
        addFixedLengthDimension(point);
        setDimensionDraft(null);
        setSnapGuides([]);
        return true;
      }

      if (!dimensionDraft) {
        selectShape(null);
        setDimensionDraft({ start: point, end: null, current: point });
        return true;
      }

      if (!dimensionDraft.end) {
        setDimensionDraft({ ...dimensionDraft, end: point, current: point });
        return true;
      }

      addManualDimension(dimensionDraft.start, dimensionDraft.end, point);
      setDimensionDraft(null);
      setSnapGuides([]);
      return true;
    },
    [
      addManualDimension,
      addFixedLengthDimension,
      dimensionDraft,
      dimensionFixedLength,
      isDimensionMode,
      selectShape,
    ]
  );

  const handleCanvasClick = useCallback(
    (event: React.MouseEvent<SVGSVGElement>) => {
      if (didPanRef.current) {
        didPanRef.current = false;
        return;
      }

      if (selectionDraft) {
        return;
      }

      if (isViewingMoveMode) {
        return;
      }

      if ((pendingDrawTool || isDimensionMode) && svgRef.current) {
        const point = snapPoint(
          clientToSvg(svgRef.current, event.clientX, event.clientY)
        );
        if (isDimensionMode) {
          dimensionAtPoint(point);
        } else {
          drawAtPoint(point);
        }
        return;
      }

      selectShape(null);
    },
    [
      dimensionAtPoint,
      drawAtPoint,
      isDimensionMode,
      isViewingMoveMode,
      pendingDrawTool,
      selectionDraft,
      snapPoint,
      selectShape,
    ]
  );

  const handleSelectShape = useCallback(
    (id: string, event?: React.MouseEvent | React.PointerEvent) => {
      if (pendingDrawTool || isDimensionMode) {
        return;
      }

      if (didPanRef.current || isViewingMoveMode) {
        didPanRef.current = false;
        return;
      }

      if (event?.shiftKey) {
        toggleShapeSelection(id);
        return;
      }

      selectShape(id);
    },
    [
      isDimensionMode,
      isViewingMoveMode,
      pendingDrawTool,
      selectShape,
      toggleShapeSelection,
    ]
  );

  const handleShapePointerDown = useCallback(
    (
      event: React.PointerEvent,
      shapeId: string,
      dragTarget: ShapeDragTarget = "body",
      layerIndex?: number
    ) => {
      event.preventDefault();

      if (event.button === 2) {
        setDrawingDraft(null);
        setDimensionDraft(null);
        return;
      }

      if (event.button === 1 || isPanMode || isSpacePanActive) {
        startPan(event);
        return;
      }

      if ((pendingDrawTool || isDimensionMode) && svgRef.current) {
        const point = snapPoint(
          clientToSvg(svgRef.current, event.clientX, event.clientY),
          shapeId
        );
        if (isDimensionMode) {
          dimensionAtPoint(point);
        } else {
          drawAtPoint(point);
        }
        return;
      }

      if (event.shiftKey && layerIndex === undefined) {
        toggleShapeSelection(shapeId);
        didPanRef.current = true;
        return;
      }

      let activeShapeId = shapeId;
      beginHistoryBatch();

      if (event.altKey && dragTarget === "body" && layerIndex === undefined) {
        activeShapeId = duplicateShapeForDrag(shapeId) ?? shapeId;
      } else if (layerIndex !== undefined) {
        selectNestedLayer(shapeId, layerIndex);
      } else {
        selectShape(shapeId);
      }

      const target = event.currentTarget as Element;
      target.setPointerCapture(event.pointerId);
      const shape = shapes.find((item) => item.id === shapeId);
      const startBox =
        selectedIds.includes(activeShapeId) && selectedIds.length > 1 && selectedBox
          ? selectedBox
          : shape
            ? getShapeBoundingBox(shape)
            : null;

      setDragState({
        shapeId: activeShapeId,
        mode: dragTarget,
        startClientX: event.clientX,
        startClientY: event.clientY,
        startBox,
      });
    },
    [
      drawAtPoint,
      dimensionAtPoint,
      isDimensionMode,
      isPanMode,
      isSpacePanActive,
      pendingDrawTool,
      beginHistoryBatch,
      duplicateShapeForDrag,
      selectNestedLayer,
      selectShape,
      selectedBox,
      selectedIds,
      shapes,
      snapPoint,
      startPan,
      toggleShapeSelection,
    ]
  );

  const handleCanvasPointerDown = useCallback(
    (event: React.PointerEvent<SVGSVGElement>) => {
      if (event.button === 1 || isPanMode || isSpacePanActive) {
        startPan(event);
        return;
      }

      if (
        event.button === 0 &&
        !pendingDrawTool &&
        !isDimensionMode &&
        !isViewingMoveMode &&
        svgRef.current &&
        (event.target === svgRef.current ||
          (event.target as Element).getAttribute("data-canvas-bg") === "true")
      ) {
        const point = clientToSvg(svgRef.current, event.clientX, event.clientY);
        setSelectionDraft({ start: point, current: point });
        didPanRef.current = true;
      }
    },
    [
      isDimensionMode,
      isPanMode,
      isSpacePanActive,
      isViewingMoveMode,
      pendingDrawTool,
      startPan,
    ]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (panState) {
        const dx = event.clientX - panState.startClientX;
        const dy = event.clientY - panState.startClientY;

        if (dx !== 0 || dy !== 0) {
          didPanRef.current = true;
          panViewportBy(dx, dy);
          setPanState({
            startClientX: event.clientX,
            startClientY: event.clientY,
          });
        }
        return;
      }

      if (drawingDraft && svgRef.current) {
        const point = snapPoint(
          clientToSvg(svgRef.current, event.clientX, event.clientY)
        );
        setDrawingDraft({
          ...drawingDraft,
          current: point,
        });
        return;
      }

      if (dimensionDraft && svgRef.current) {
        const point = snapPoint(
          clientToSvg(svgRef.current, event.clientX, event.clientY)
        );
        setDimensionDraft({
          ...dimensionDraft,
          current: point,
        });
        return;
      }

      if (selectionDraft && svgRef.current) {
        const point = clientToSvg(svgRef.current, event.clientX, event.clientY);
        setSelectionDraft({
          ...selectionDraft,
          current: point,
        });
        return;
      }

      if (!dragState || !svgRef.current) {
        return;
      }

      if (dragState.mode === "body") {
        const ctm = svgRef.current.getScreenCTM();
        if (!ctm) {
          return;
        }

        const dx = (event.clientX - dragState.startClientX) / ctm.a;
        const dy = (event.clientY - dragState.startClientY) / ctm.d;

        if (dx !== 0 || dy !== 0) {
          const shape = shapes.find((item) => item.id === dragState.shapeId);
          if (!shape || !dragState.startBox) {
            return;
          }

          const isMovingSelection =
            selectedIds.includes(dragState.shapeId) && selectedIds.length > 1;
          const currentBox = isMovingSelection && selectedBox
            ? selectedBox
            : getShapeBoundingBox(shape);
          const desiredBox = {
            x: dragState.startBox.x + dx,
            y: dragState.startBox.y + dy,
            width: dragState.startBox.width,
            height: dragState.startBox.height,
          };
          let targetX = desiredBox.x;
          let targetY = desiredBox.y;

          if (snapEnabled) {
            const snapped = snapBoxToTargets({
              box: desiredBox,
              shapes,
              excludeId: shape.id,
              gridSize,
              threshold: snapThreshold,
            });
            targetX += snapped.dx;
            targetY += snapped.dy;
            setSnapGuides(snapped.guides);
          } else {
            setSnapGuides([]);
          }

          moveShapeById(
            dragState.shapeId,
            targetX - currentBox.x,
            targetY - currentBox.y
          );
        }
        return;
      }

      if (dragState.mode === "dimension-text") {
        const ctm = svgRef.current.getScreenCTM();
        if (!ctm) {
          return;
        }

        const dx = (event.clientX - dragState.startClientX) / ctm.a;
        const dy = (event.clientY - dragState.startClientY) / ctm.d;

        if (dx !== 0 || dy !== 0) {
          updateDimensionTextOffset(dragState.shapeId, dx, dy);
          setDragState({
            ...dragState,
            startClientX: event.clientX,
            startClientY: event.clientY,
          });
        }
        return;
      }

      const { x, y } = snapPoint(
        clientToSvg(svgRef.current, event.clientX, event.clientY),
        dragState.shapeId
      );

      if (dragState.mode === "line-start") {
        updateLine(dragState.shapeId, { x1: x, y1: y });
        return;
      }

      if (dragState.mode === "line-end") {
        updateLine(dragState.shapeId, { x2: x, y2: y });
        return;
      }

      resizeShapeById(dragState.shapeId, dragState.mode, x, y);
    },
    [
      drawingDraft,
      dimensionDraft,
      dragState,
      moveShapeById,
      panState,
      panViewportBy,
      gridSize,
      resizeShapeById,
      selectedBox,
      selectedIds,
      selectionDraft,
      shapes,
      snapEnabled,
      snapPoint,
      snapThreshold,
      updateDimensionTextOffset,
      updateLine,
    ]
  );

  const handlePointerUp = useCallback(() => {
    if (selectionDraft) {
      const box = getBoxFromPoints(selectionDraft.start, selectionDraft.current);
      const nextIds =
        box.width < 3 / viewportZoom && box.height < 3 / viewportZoom
          ? []
          : shapes
              .filter(
                (shape) =>
                  shape.type !== "dimension" &&
                  boxesIntersect(box, getShapeBoundingBox(shape))
              )
              .map((shape) => shape.id);
      selectShapes(nextIds);
      setSelectionDraft(null);
      setSnapGuides([]);
      didPanRef.current = true;
      return;
    }

    if (dragState) {
      commitHistoryBatch();
    } else {
      cancelHistoryBatch();
    }

    setDragState(null);
    setPanState(null);
    setSnapGuides([]);
  }, [
    cancelHistoryBatch,
    commitHistoryBatch,
    dragState,
    selectShapes,
    selectionDraft,
    shapes,
    viewportZoom,
  ]);

  const handleContextMenu = useCallback(
    (event: React.MouseEvent) => {
      if (drawingDraft || dimensionDraft) {
        event.preventDefault();
        setDrawingDraft(null);
        setDimensionDraft(null);
        setSnapGuides([]);
      }
    },
    [dimensionDraft, drawingDraft]
  );

  const handleWheel = useCallback(
    (event: React.WheelEvent<SVGSVGElement>) => {
      event.preventDefault();

      if (!svgRef.current) {
        return;
      }

      const rect = svgRef.current.getBoundingClientRect();
      const { x, y } = clientToSvg(
        svgRef.current,
        event.clientX,
        event.clientY
      );
      const screenRatioX = (event.clientX - rect.left) / rect.width;
      const screenRatioY = (event.clientY - rect.top) / rect.height;
      const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;

      zoomViewportAt(x, y, screenRatioX, screenRatioY, factor);
    },
    [zoomViewportAt]
  );

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      setViewportSize({
        width: Math.max(Math.round(entry.contentRect.width), 1),
        height: Math.max(Math.round(entry.contentRect.height), 1),
      });
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [setViewportSize]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.code === "Space") {
        event.preventDefault();
        setIsSpacePanActive(true);
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "c") {
        event.preventDefault();
        copySelected();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteCopied();
        return;
      }

      if (
        (event.metaKey || event.ctrlKey) &&
        event.shiftKey &&
        event.key.toLowerCase() === "z"
      ) {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }

      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }

      if (event.key === "Escape") {
        if (drawingDraft) {
          event.preventDefault();
          setDrawingDraft(null);
          setSnapGuides([]);
          return;
        }

        if (dimensionDraft) {
          event.preventDefault();
          setDimensionDraft(null);
          setSnapGuides([]);
          return;
        }

        selectShape(null);
      }
    };

    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space") {
        setIsSpacePanActive(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [
    copySelected,
    deleteSelected,
    dimensionDraft,
    drawingDraft,
    pasteCopied,
    redo,
    selectShape,
    undo,
  ]);

  return (
    <div ref={containerRef} className="h-full w-full">
      <div className="h-full w-full overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox={`${viewBoxX} ${viewBoxY} ${viewBoxWidth} ${viewBoxHeight}`}
          className={`block bg-white ${
            isViewingMoveMode
              ? "cursor-grab active:cursor-grabbing"
              : pendingDrawTool || isDimensionMode
                ? "cursor-crosshair"
                : ""
          }`}
          onClick={handleCanvasClick}
          onPointerDown={handleCanvasPointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          onContextMenu={handleContextMenu}
          onWheel={handleWheel}
        >
          <defs>
            <pattern
              id="grid-pattern"
              width={gridSize}
              height={gridSize}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${gridSize} 0 L 0 0 0 ${gridSize}`}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth={1 / viewportZoom}
              />
            </pattern>
          </defs>

          <rect
            data-canvas-bg="true"
            x={viewBoxX}
            y={viewBoxY}
            width={viewBoxWidth}
            height={viewBoxHeight}
            fill="url(#grid-pattern)"
          />

          {renderShapes.map((shape) => (
              <ShapeRenderer
                key={shape.id}
                shape={shape}
                allShapes={shapes}
                isSelected={
                  selectedIds.length > 0
                    ? selectedIds.includes(shape.id)
                    : shape.id === selectedId
                }
                selectedLayerIndex={selectedLayerIndex}
                viewportZoom={viewportZoom}
                onSelect={handleSelectShape}
                onSelectNestedLayer={selectNestedLayer}
                onPointerDown={handleShapePointerDown}
              />
            ))}

          {selectedBox && (
            <g pointerEvents="none">
              <rect
                x={selectedBox.x}
                y={selectedBox.y}
                width={selectedBox.width}
                height={selectedBox.height}
                fill="none"
                stroke="#2563eb"
                strokeWidth={1.6 / viewportZoom}
                strokeDasharray="8 4"
              />
              {[
                [selectedBox.x, selectedBox.y],
                [selectedBox.x + selectedBox.width, selectedBox.y],
                [selectedBox.x, selectedBox.y + selectedBox.height],
                [
                  selectedBox.x + selectedBox.width,
                  selectedBox.y + selectedBox.height,
                ],
              ].map(([x, y], index) => (
                <circle
                  key={`multi-handle-${index}`}
                  cx={x}
                  cy={y}
                  r={7 / viewportZoom}
                  fill="#ffffff"
                  stroke="#2563eb"
                  strokeWidth={2 / viewportZoom}
                />
              ))}
            </g>
          )}

          {drawingDraft && (
            <DrawingPreview
              draft={drawingDraft}
              color={brushColor}
              strokeWidth={brushStrokeWidth}
            />
          )}

          {dimensionDraft && <DimensionPreview draft={dimensionDraft} />}

          {selectionDraft && (
            <rect
              {...getBoxFromPoints(selectionDraft.start, selectionDraft.current)}
              fill="#60a5fa"
              fillOpacity={0.16}
              stroke="#2563eb"
              strokeWidth={1.4 / viewportZoom}
              strokeDasharray="6 4"
              pointerEvents="none"
            />
          )}

          {snapEnabled &&
            snapGuides.map((guide, index) =>
              guide.x !== undefined ? (
                <line
                  key={`snap-x-${index}`}
                  x1={guide.x}
                  y1={viewBoxY}
                  x2={guide.x}
                  y2={viewBoxY + viewBoxHeight}
                  stroke={guide.kind === "center" ? "#8b5cf6" : "#2563eb"}
                  strokeWidth={1.2 / viewportZoom}
                  strokeDasharray={guide.kind === "grid" ? "4 4" : "none"}
                  pointerEvents="none"
                />
              ) : (
                <line
                  key={`snap-y-${index}`}
                  x1={viewBoxX}
                  y1={guide.y}
                  x2={viewBoxX + viewBoxWidth}
                  y2={guide.y}
                  stroke={guide.kind === "center" ? "#8b5cf6" : "#2563eb"}
                  strokeWidth={1.2 / viewportZoom}
                  strokeDasharray={guide.kind === "grid" ? "4 4" : "none"}
                  pointerEvents="none"
                />
              )
            )}
        </svg>
      </div>
    </div>
  );
}
