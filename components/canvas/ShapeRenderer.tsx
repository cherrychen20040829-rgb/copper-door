"use client";

import type { Shape } from "@/types/shape";
import { computeNestedRectLayers } from "@/types/shape";

export type LineDragTarget = "body" | "line-start" | "line-end";

interface ShapeRendererProps {
  shape: Shape;
  isSelected: boolean;
  selectedLayerIndex: number | null;
  onSelect: (id: string) => void;
  onSelectNestedLayer: (id: string, layerIndex: number) => void;
  onPointerDown: (
    event: React.PointerEvent,
    id: string,
    dragTarget?: LineDragTarget,
    layerIndex?: number
  ) => void;
}

const ENDPOINT_HANDLE_RADIUS = 6;

export function ShapeRenderer({
  shape,
  isSelected,
  selectedLayerIndex,
  onSelect,
  onSelectNestedLayer,
  onPointerDown,
}: ShapeRendererProps) {
  if (shape.type === "rect") {
    return (
      <g
        onClick={(event) => {
          event.stopPropagation();
          onSelect(shape.id);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown(event, shape.id, "body");
        }}
        style={{ cursor: "move" }}
      >
        <rect
          x={shape.x}
          y={shape.y}
          width={shape.width}
          height={shape.height}
          fill="#ffffff"
          stroke={isSelected ? "#2563eb" : "#334155"}
          strokeWidth={isSelected ? 2 : 1}
        />
        {isSelected && (
          <rect
            x={shape.x}
            y={shape.y}
            width={shape.width}
            height={shape.height}
            fill="none"
            stroke="#93c5fd"
            strokeWidth={1}
            strokeDasharray="4 2"
            pointerEvents="none"
          />
        )}
      </g>
    );
  }

  if (shape.type === "nestedRect") {
    const layers = computeNestedRectLayers(shape);

    return (
      <g>
        {layers.map((layer) => {
          const isLayerSelected =
            isSelected && selectedLayerIndex === layer.layerIndex;

          return (
            <g key={`${shape.id}-layer-${layer.layerIndex}`}>
              <rect
                x={layer.x}
                y={layer.y}
                width={layer.width}
                height={layer.height}
                fill="#ffffff"
                fillOpacity={0.01}
                stroke={isLayerSelected ? "#2563eb" : "#334155"}
                strokeWidth={layer.strokeWidth}
                style={{ cursor: "move" }}
                onClick={(event) => {
                  event.stopPropagation();
                  onSelectNestedLayer(shape.id, layer.layerIndex);
                }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onPointerDown(
                    event,
                    shape.id,
                    "body",
                    layer.layerIndex
                  );
                }}
              />
              {isLayerSelected && (
                <rect
                  x={layer.x}
                  y={layer.y}
                  width={layer.width}
                  height={layer.height}
                  fill="none"
                  stroke="#93c5fd"
                  strokeWidth={1}
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
      </g>
    );
  }

  const hitStrokeWidth = Math.max(shape.strokeWidth, 12);

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(shape.id);
      }}
    >
      <line
        x1={shape.x1}
        y1={shape.y1}
        x2={shape.x2}
        y2={shape.y2}
        stroke="transparent"
        strokeWidth={hitStrokeWidth}
        strokeLinecap="round"
        style={{ cursor: "move" }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown(event, shape.id, "body");
        }}
      />
      <line
        x1={shape.x1}
        y1={shape.y1}
        x2={shape.x2}
        y2={shape.y2}
        stroke={isSelected ? "#2563eb" : "#334155"}
        strokeWidth={shape.strokeWidth}
        strokeLinecap="round"
        pointerEvents="none"
      />
      {isSelected && (
        <>
          <circle
            cx={shape.x1}
            cy={shape.y1}
            r={ENDPOINT_HANDLE_RADIUS}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={2}
            style={{ cursor: "crosshair" }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onPointerDown(event, shape.id, "line-start");
            }}
          />
          <circle
            cx={shape.x2}
            cy={shape.y2}
            r={ENDPOINT_HANDLE_RADIUS}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={2}
            style={{ cursor: "crosshair" }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onPointerDown(event, shape.id, "line-end");
            }}
          />
        </>
      )}
    </g>
  );
}
