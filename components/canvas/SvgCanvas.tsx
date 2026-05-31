"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  ShapeRenderer,
  type LineDragTarget,
} from "@/components/canvas/ShapeRenderer";
import { useEditorStore } from "@/store/useEditorStore";

const GRID_SIZE = 20;
const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

type DragMode = "move" | "line-start" | "line-end";

interface DragState {
  shapeId: string;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
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

function toDragMode(target: LineDragTarget): DragMode {
  if (target === "line-start") {
    return "line-start";
  }
  if (target === "line-end") {
    return "line-end";
  }
  return "move";
}

export function SvgCanvas() {
  const svgRef = useRef<SVGSVGElement>(null);
  const shapes = useEditorStore((state) => state.shapes);
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectedLayerIndex = useEditorStore((state) => state.selectedLayerIndex);
  const selectShape = useEditorStore((state) => state.selectShape);
  const selectNestedLayer = useEditorStore((state) => state.selectNestedLayer);
  const moveShapeById = useEditorStore((state) => state.moveShapeById);
  const updateLine = useEditorStore((state) => state.updateLine);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);

  const [dragState, setDragState] = useState<DragState | null>(null);

  const handleCanvasClick = useCallback(() => {
    selectShape(null);
  }, [selectShape]);

  const handleShapePointerDown = useCallback(
    (
      event: React.PointerEvent,
      shapeId: string,
      dragTarget: LineDragTarget = "body",
      layerIndex?: number
    ) => {
      event.preventDefault();

      if (layerIndex !== undefined) {
        selectNestedLayer(shapeId, layerIndex);
      } else {
        selectShape(shapeId);
      }

      const target = event.currentTarget as Element;
      target.setPointerCapture(event.pointerId);

      setDragState({
        shapeId,
        mode: toDragMode(dragTarget),
        startClientX: event.clientX,
        startClientY: event.clientY,
      });
    },
    [selectNestedLayer, selectShape]
  );

  const handlePointerMove = useCallback(
    (event: React.PointerEvent) => {
      if (!dragState || !svgRef.current) {
        return;
      }

      if (dragState.mode === "move") {
        const ctm = svgRef.current.getScreenCTM();
        if (!ctm) {
          return;
        }

        const dx = (event.clientX - dragState.startClientX) / ctm.a;
        const dy = (event.clientY - dragState.startClientY) / ctm.d;

        if (dx !== 0 || dy !== 0) {
          moveShapeById(dragState.shapeId, dx, dy);
          setDragState({
            ...dragState,
            startClientX: event.clientX,
            startClientY: event.clientY,
          });
        }
        return;
      }

      const { x, y } = clientToSvg(
        svgRef.current,
        event.clientX,
        event.clientY
      );

      if (dragState.mode === "line-start") {
        updateLine(dragState.shapeId, { x1: x, y1: y });
      } else {
        updateLine(dragState.shapeId, { x2: x, y2: y });
      }
    },
    [dragState, moveShapeById, updateLine]
  );

  const handlePointerUp = useCallback(() => {
    setDragState(null);
  }, []);

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

      if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelected();
      }

      if (event.key === "Escape") {
        selectShape(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [deleteSelected, selectShape]);

  return (
    <div className="flex h-full items-center justify-center">
      <div className="overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
        <svg
          ref={svgRef}
          width={CANVAS_WIDTH}
          height={CANVAS_HEIGHT}
          viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
          className="block bg-white"
          onClick={handleCanvasClick}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          <defs>
            <pattern
              id="grid-pattern"
              width={GRID_SIZE}
              height={GRID_SIZE}
              patternUnits="userSpaceOnUse"
            >
              <path
                d={`M ${GRID_SIZE} 0 L 0 0 0 ${GRID_SIZE}`}
                fill="none"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
            </pattern>
          </defs>

          <rect
            x={0}
            y={0}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            fill="url(#grid-pattern)"
          />

          {shapes.map((shape) => (
            <ShapeRenderer
              key={shape.id}
              shape={shape}
              isSelected={shape.id === selectedId}
              selectedLayerIndex={selectedLayerIndex}
              onSelect={selectShape}
              onSelectNestedLayer={selectNestedLayer}
              onPointerDown={handleShapePointerDown}
            />
          ))}
        </svg>
      </div>
    </div>
  );
}
