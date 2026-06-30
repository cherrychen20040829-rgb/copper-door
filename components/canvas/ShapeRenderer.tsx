"use client";

import type {
  CurvedResizeHandle,
  CurvedShape,
  DimensionBindingKind,
  DimensionShape,
  DimensionStylePreset,
  Parallelogram,
  Shape,
} from "@/types/shape";
import {
  computeNestedRectLayers,
  getNestedRectLayerLogicalSize,
  getShapeBoundingBox,
} from "@/types/shape";

export type LineDragTarget = "body" | "line-start" | "line-end";
export type ShapeDragTarget = LineDragTarget | CurvedResizeHandle;

interface ShapeRendererProps {
  shape: Shape;
  allShapes: Shape[];
  isSelected: boolean;
  selectedLayerIndex: number | null;
  viewportZoom: number;
  onSelect: (id: string, event?: React.MouseEvent | React.PointerEvent) => void;
  onSelectNestedLayer: (id: string, layerIndex: number) => void;
  onPointerDown: (
    event: React.PointerEvent,
    id: string,
    dragTarget?: ShapeDragTarget,
    layerIndex?: number
  ) => void;
}

const ENDPOINT_HANDLE_RADIUS = 6;
const CURVED_HANDLE_RADIUS = 9;
const DEFAULT_STROKE_COLOR = "#111827";
const DEFAULT_STROKE_WIDTH = 2;

function getStrokeColor(shape: Shape): string {
  return shape.strokeColor ?? DEFAULT_STROKE_COLOR;
}

function getStrokeWidth(shape: Shape): number {
  return shape.strokeWidth ?? DEFAULT_STROKE_WIDTH;
}

function getSemicirclePath(shape: CurvedShape): string {
  const { x, y, width, height, direction = "up" } = shape;

  if (direction === "down") {
    return `M ${x} ${y} A ${width / 2} ${height} 0 0 0 ${x + width} ${y} Z`;
  }

  if (direction === "left") {
    return `M ${x + width} ${y} A ${width} ${height / 2} 0 0 0 ${x + width} ${
      y + height
    } Z`;
  }

  if (direction === "right") {
    return `M ${x} ${y} A ${width} ${height / 2} 0 0 1 ${x} ${
      y + height
    } Z`;
  }

  return `M ${x} ${y + height} A ${width / 2} ${height} 0 0 1 ${x + width} ${
    y + height
  } Z`;
}

function getArchPath(shape: CurvedShape): string {
  const isDown = shape.direction === "down";
  const baselineY = isDown ? shape.y : shape.y + shape.height;
  const curveY = isDown ? shape.y + shape.height : shape.y;
  const centerX = shape.x + shape.width / 2;

  return `M ${shape.x} ${baselineY} Q ${centerX} ${curveY} ${
    shape.x + shape.width
  } ${baselineY}`;
}

function getParallelogramPoints(shape: Parallelogram): string {
  return [
    `${shape.x + shape.skew},${shape.y}`,
    `${shape.x + shape.width + shape.skew},${shape.y}`,
    `${shape.x + shape.width},${shape.y + shape.height}`,
    `${shape.x},${shape.y + shape.height}`,
  ].join(" ");
}

function formatMm(value: number): string {
  const rounded = Number(value.toFixed(1));
  return Number.isInteger(rounded) ? `${rounded}mm` : `${rounded.toFixed(1)}mm`;
}

function getDimensionStyle(style: DimensionStylePreset = "blue-assist") {
  if (style === "standard-arrow") {
    return {
      stroke: "#374151",
      extension: "#6b7280",
      dash: undefined,
      end: "arrow" as const,
      strokeWidth: 1.4,
    };
  }

  if (style === "engineering-slash") {
    return {
      stroke: "#374151",
      extension: "#9ca3af",
      dash: undefined,
      end: "slash" as const,
      strokeWidth: 1.4,
    };
  }

  if (style === "dot-end") {
    return {
      stroke: "#374151",
      extension: "#9ca3af",
      dash: undefined,
      end: "dot" as const,
      strokeWidth: 1.4,
    };
  }

  if (style === "dashed") {
    return {
      stroke: "#475569",
      extension: "#94a3b8",
      dash: "6 4",
      end: "arrow" as const,
      strokeWidth: 1.25,
    };
  }

  return {
    stroke: "#334e68",
    extension: "#93a4b8",
    dash: undefined,
    end: "arrow" as const,
    strokeWidth: 1.35,
  };
}

function distance(
  start: { x: number; y: number },
  end: { x: number; y: number }
): number {
  return Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2);
}

function dimensionLineFromPoints(
  dimension: DimensionShape,
  start: { x: number; y: number },
  end: { x: number; y: number },
  linePoint: { x: number; y: number }
) {
  if (dimension.orientation === "horizontal") {
    return {
      start,
      end,
      lineStart: { x: start.x, y: linePoint.y },
      lineEnd: { x: end.x, y: linePoint.y },
      text: { x: (start.x + end.x) / 2, y: linePoint.y },
      value: Math.abs(end.x - start.x),
    };
  }

  if (dimension.orientation === "vertical") {
    return {
      start,
      end,
      lineStart: { x: linePoint.x, y: start.y },
      lineEnd: { x: linePoint.x, y: end.y },
      text: { x: linePoint.x, y: (start.y + end.y) / 2 },
      value: Math.abs(end.y - start.y),
    };
  }

  const length = Math.max(distance(start, end), 1);
  const ux = (end.x - start.x) / length;
  const uy = (end.y - start.y) / length;
  const nx = -uy;
  const ny = ux;
  const offset = (linePoint.x - start.x) * nx + (linePoint.y - start.y) * ny;
  const lineStart = { x: start.x + nx * offset, y: start.y + ny * offset };
  const lineEnd = { x: end.x + nx * offset, y: end.y + ny * offset };

  return {
    start,
    end,
    lineStart,
    lineEnd,
    text: { x: (lineStart.x + lineEnd.x) / 2, y: (lineStart.y + lineEnd.y) / 2 },
    value: length,
  };
}

function getBoundDimensionBase(
  dimension: DimensionShape,
  allShapes: Shape[]
): {
  start: { x: number; y: number };
  end: { x: number; y: number };
  linePoint: { x: number; y: number };
  label?: string;
} | null {
  const binding = dimension.binding;
  if (!binding) {
    return null;
  }

  const target = allShapes.find((item) => item.id === binding.shapeId);
  if (!target || target.type === "dimension") {
    return null;
  }

  const box = getShapeBoundingBox(target);
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const horizontal = (y: number, startX = box.x, endX = box.x + box.width) => ({
    start: { x: startX, y },
    end: { x: endX, y },
    linePoint: { x: centerX, y: y + binding.offset },
  });
  const vertical = (x: number, startY = box.y, endY = box.y + box.height) => ({
    start: { x, y: startY },
    end: { x, y: endY },
    linePoint: { x: x + binding.offset, y: centerY },
  });

  if (target.type === "nestedRect") {
    const layers = computeNestedRectLayers(target);
    const inner = layers[layers.length - 1];
    if (binding.kind === "nested-inner-width" && inner) {
      return horizontal(inner.y + inner.height, inner.x, inner.x + inner.width);
    }
    if (binding.kind === "nested-inner-height" && inner) {
      return vertical(inner.x + inner.width, inner.y, inner.y + inner.height);
    }
  }

  if (target.type === "curved" && target.kind === "semicircle") {
    const direction = target.direction ?? "up";
    if (binding.kind === "semicircle-base") {
      if (direction === "left") {
        return vertical(box.x + box.width, box.y, box.y + box.height);
      }
      if (direction === "right") {
        return vertical(box.x, box.y, box.y + box.height);
      }
      if (direction === "down") {
        return horizontal(box.y, box.x, box.x + box.width);
      }
      return horizontal(box.y + box.height, box.x, box.x + box.width);
    }

    if (binding.kind === "semicircle-height") {
      if (direction === "left") {
        return horizontal(centerY, box.x, box.x + box.width);
      }
      if (direction === "right") {
        return horizontal(centerY, box.x, box.x + box.width);
      }
      return vertical(centerX, box.y, box.y + box.height);
    }
  }

  if (
    target.type === "curved" &&
    (target.kind === "arc" || target.kind === "arch")
  ) {
    const baselineY = target.direction === "down" ? box.y : box.y + box.height;
    const curveY = target.direction === "down" ? box.y + box.height : box.y;

    if (binding.kind === "arc-base") {
      return horizontal(baselineY, box.x, box.x + box.width);
    }

    if (binding.kind === "arc-height") {
      return vertical(centerX, baselineY, curveY);
    }
  }

  if (
    binding.kind.endsWith("height") ||
    binding.kind === "rect-height" ||
    binding.kind === "nested-outer-height" ||
    binding.kind === "ellipse-height" ||
    binding.kind === "semicircle-height" ||
    binding.kind === "arc-height"
  ) {
    return vertical(box.x + box.width, box.y, box.y + box.height);
  }

  if (binding.kind === "circle-radius") {
    return {
      ...horizontal(centerY, centerX, box.x + box.width),
      label: `R${formatMm(box.width / 2).replace("mm", "")}`,
    };
  }

  if (binding.kind === "circle-diameter") {
    return {
      ...horizontal(centerY, box.x, box.x + box.width),
      label: `Ø${formatMm(box.width).replace("mm", "")}`,
    };
  }

  if (binding.kind === "ellipse-radius-x") {
    return horizontal(centerY, centerX, box.x + box.width);
  }

  if (binding.kind === "ellipse-radius-y") {
    return vertical(centerX, box.y, centerY);
  }

  if (binding.kind === "parallelogram-skew" && target.type === "parallelogram") {
    return {
      ...horizontal(
        box.y,
        target.x + target.width / 2,
        target.x + target.width / 2 + target.skew
      ),
      label: formatMm(Math.abs(target.skew)),
    };
  }

  return horizontal(box.y + box.height, box.x, box.x + box.width);
}

function getDimensionRenderData(
  dimension: DimensionShape,
  allShapes: Shape[]
) {
  const bound = getBoundDimensionBase(dimension, allShapes);
  const base = bound ?? {
    start: { x: dimension.x1, y: dimension.y1 },
    end: { x: dimension.x2, y: dimension.y2 },
    linePoint: { x: dimension.lineX, y: dimension.lineY },
  };
  const line = dimensionLineFromPoints(
    dimension,
    base.start,
    base.end,
    base.linePoint
  );
  const text = {
    x: line.text.x + dimension.textOffsetX,
    y: line.text.y + dimension.textOffsetY,
  };

  return {
    ...line,
    text,
    label: bound?.label ?? formatMm(line.value),
  };
}

function getSplitDimensionLine(
  start: { x: number; y: number },
  end: { x: number; y: number },
  text: { x: number; y: number },
  gap: number
) {
  const length = Math.max(distance(start, end), 1);
  const ux = (end.x - start.x) / length;
  const uy = (end.y - start.y) / length;
  const projection = (text.x - start.x) * ux + (text.y - start.y) * uy;
  const gapStart = Math.max(0, projection - gap / 2);
  const gapEnd = Math.min(length, projection + gap / 2);

  return [
    {
      x1: start.x,
      y1: start.y,
      x2: start.x + ux * gapStart,
      y2: start.y + uy * gapStart,
    },
    {
      x1: start.x + ux * gapEnd,
      y1: start.y + uy * gapEnd,
      x2: end.x,
      y2: end.y,
    },
  ];
}

function ControlPoint({
  x,
  y,
  title,
  cursor,
  handle,
  shapeId,
  viewportZoom,
  onPointerDown,
}: {
  x: number;
  y: number;
  title: string;
  cursor: string;
  handle: ShapeDragTarget;
  shapeId: string;
  viewportZoom: number;
  onPointerDown: ShapeRendererProps["onPointerDown"];
}) {
  return (
    <circle
      cx={x}
      cy={y}
      r={CURVED_HANDLE_RADIUS / viewportZoom}
      fill="#ffffff"
      stroke="#2563eb"
      strokeWidth={2.5 / viewportZoom}
      style={{ cursor }}
      onPointerDown={(event) => {
        event.stopPropagation();
        onPointerDown(event, shapeId, handle);
      }}
    >
      <title>{title}</title>
    </circle>
  );
}

function RectangleControlPoints({
  box,
  shapeId,
  viewportZoom,
  onPointerDown,
}: {
  box: { x: number; y: number; width: number; height: number };
  shapeId: string;
  viewportZoom: number;
  onPointerDown: ShapeRendererProps["onPointerDown"];
}) {
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const right = box.x + box.width;
  const bottom = box.y + box.height;

  return (
    <>
      <ControlPoint
        x={box.x}
        y={box.y}
        title="拖动调整大小"
        cursor="nwse-resize"
        handle="top-left"
        shapeId={shapeId}
        viewportZoom={viewportZoom}
        onPointerDown={onPointerDown}
      />
      <ControlPoint
        x={centerX}
        y={box.y}
        title="拖动调整高度"
        cursor="ns-resize"
        handle="top"
        shapeId={shapeId}
        viewportZoom={viewportZoom}
        onPointerDown={onPointerDown}
      />
      <ControlPoint
        x={right}
        y={box.y}
        title="拖动调整大小"
        cursor="nesw-resize"
        handle="top-right"
        shapeId={shapeId}
        viewportZoom={viewportZoom}
        onPointerDown={onPointerDown}
      />
      <ControlPoint
        x={box.x}
        y={centerY}
        title="拖动调整宽度"
        cursor="ew-resize"
        handle="left"
        shapeId={shapeId}
        viewportZoom={viewportZoom}
        onPointerDown={onPointerDown}
      />
      <ControlPoint
        x={right}
        y={centerY}
        title="拖动调整宽度"
        cursor="ew-resize"
        handle="right"
        shapeId={shapeId}
        viewportZoom={viewportZoom}
        onPointerDown={onPointerDown}
      />
      <ControlPoint
        x={box.x}
        y={bottom}
        title="拖动调整大小"
        cursor="nesw-resize"
        handle="bottom-left"
        shapeId={shapeId}
        viewportZoom={viewportZoom}
        onPointerDown={onPointerDown}
      />
      <ControlPoint
        x={centerX}
        y={bottom}
        title="拖动调整高度"
        cursor="ns-resize"
        handle="bottom"
        shapeId={shapeId}
        viewportZoom={viewportZoom}
        onPointerDown={onPointerDown}
      />
      <ControlPoint
        x={right}
        y={bottom}
        title="拖动调整大小"
        cursor="nwse-resize"
        handle="bottom-right"
        shapeId={shapeId}
        viewportZoom={viewportZoom}
        onPointerDown={onPointerDown}
      />
    </>
  );
}

export function ShapeRenderer({
  shape,
  allShapes,
  isSelected,
  selectedLayerIndex,
  viewportZoom,
  onSelect,
  onSelectNestedLayer,
  onPointerDown,
}: ShapeRendererProps) {
  const selectionStrokeWidth = 1 / viewportZoom;
  const endpointHandleRadius = ENDPOINT_HANDLE_RADIUS / viewportZoom;

  if (shape.type === "group") {
    const box = getShapeBoundingBox(shape);

    return (
      <g
        onClick={(event) => {
          event.stopPropagation();
          onSelect(shape.id, event);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown(event, shape.id, "body");
        }}
        style={{ cursor: "move" }}
      >
        {shape.children.map((child) => (
          <ShapeRenderer
            key={child.id}
            shape={child}
            allShapes={shape.children}
            isSelected={false}
            selectedLayerIndex={null}
            viewportZoom={viewportZoom}
            onSelect={(_id, event) => onSelect(shape.id, event)}
            onSelectNestedLayer={() => onSelect(shape.id)}
            onPointerDown={(event) => {
              event.stopPropagation();
              onPointerDown(event, shape.id, "body");
            }}
          />
        ))}
        {isSelected && (
          <>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill="none"
              stroke="#2563eb"
              strokeWidth={1.4 / viewportZoom}
              strokeDasharray="6 3"
              pointerEvents="none"
            />
            <RectangleControlPoints
              box={box}
              shapeId={shape.id}
              viewportZoom={viewportZoom}
              onPointerDown={onPointerDown}
            />
          </>
        )}
      </g>
    );
  }

  if (shape.type === "dimension") {
    const data = getDimensionRenderData(shape, allShapes);
    const style = getDimensionStyle(shape.stylePreset);
    const stroke = style.stroke;
    const strokeWidth = style.strokeWidth / viewportZoom;
    const tickSize = 8 / viewportZoom;
    const fontSize = Math.max(12 / viewportZoom, 8);
    const labelWidth = Math.max(data.label.length * fontSize * 0.62, 34 / viewportZoom);
    const arrowSize = 7 / viewportZoom;
    const lineSegments = getSplitDimensionLine(
      data.lineStart,
      data.lineEnd,
      data.text,
      labelWidth + 12 / viewportZoom
    );
    const renderEndMark = (x: number, y: number, sign: -1 | 1) => {
      if (style.end === "slash") {
        return (
          <line
            x1={x - tickSize / 2}
            y1={y + tickSize / 2}
            x2={x + tickSize / 2}
            y2={y - tickSize / 2}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        );
      }

      if (style.end === "dot") {
        return <circle cx={x} cy={y} r={3.2 / viewportZoom} fill={stroke} />;
      }

      return (
        <>
          <line
            x1={x}
            y1={y}
            x2={x + sign * arrowSize}
            y2={y - arrowSize * 0.55}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
          <line
            x1={x}
            y1={y}
            x2={x + sign * arrowSize}
            y2={y + arrowSize * 0.55}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        </>
      );
    };

    return (
      <g
        onClick={(event) => {
          event.stopPropagation();
          onSelect(shape.id, event);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown(event, shape.id, "body");
        }}
        style={{ cursor: "move" }}
      >
        <line
          x1={data.start.x}
          y1={data.start.y}
          x2={data.lineStart.x}
          y2={data.lineStart.y}
          stroke={style.extension}
          strokeWidth={strokeWidth}
          opacity={0.72}
        />
        <line
          x1={data.end.x}
          y1={data.end.y}
          x2={data.lineEnd.x}
          y2={data.lineEnd.y}
          stroke={style.extension}
          strokeWidth={strokeWidth}
          opacity={0.72}
        />
        {lineSegments.map((segment, index) => (
          <line
            key={`dimension-segment-${index}`}
            x1={segment.x1}
            y1={segment.y1}
            x2={segment.x2}
            y2={segment.y2}
            stroke={stroke}
            strokeWidth={strokeWidth}
            strokeDasharray={style.dash}
          />
        ))}
        {renderEndMark(data.lineStart.x, data.lineStart.y, 1)}
        {renderEndMark(data.lineEnd.x, data.lineEnd.y, -1)}
        <text
          x={data.text.x}
          y={data.text.y - 6 / viewportZoom}
          textAnchor="middle"
          fontSize={fontSize}
          fill={stroke}
          paintOrder="stroke"
          stroke="#ffffff"
          strokeWidth={3 / viewportZoom}
          style={{ cursor: "grab", userSelect: "none" }}
          onPointerDown={(event) => {
            event.stopPropagation();
            onPointerDown(event, shape.id, "dimension-text");
          }}
        >
          {data.label}
        </text>
        {isSelected && (
          <ControlPoint
            x={data.text.x}
            y={data.text.y}
            title="拖动文字位置"
            cursor="grab"
            handle="dimension-text"
            shapeId={shape.id}
            viewportZoom={viewportZoom}
            onPointerDown={onPointerDown}
          />
        )}
      </g>
    );
  }

  if (shape.type === "rect") {
    const strokeColor = getStrokeColor(shape);
    const strokeWidth = getStrokeWidth(shape);

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
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        {isSelected && (
          <>
            <rect
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              fill="none"
              stroke="#93c5fd"
              strokeWidth={selectionStrokeWidth}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
            <RectangleControlPoints
              box={shape}
              shapeId={shape.id}
              viewportZoom={viewportZoom}
              onPointerDown={onPointerDown}
            />
          </>
        )}
      </g>
    );
  }

  if (shape.type === "nestedRect") {
    const layers = computeNestedRectLayers(shape);
    const strokeColor = getStrokeColor(shape);

    const outerLayer = layers[0];

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
                stroke={strokeColor}
                strokeWidth={layer.strokeWidth}
                style={{ cursor: "move" }}
                onClick={(event) => {
                  event.stopPropagation();
                  if (event.shiftKey) {
                    onSelect(shape.id, event);
                  } else {
                    onSelectNestedLayer(shape.id, layer.layerIndex);
                  }
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
                  strokeWidth={selectionStrokeWidth}
                  strokeDasharray="4 2"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}
        {isSelected && outerLayer && (
          <>
            <rect
              x={outerLayer.x}
              y={outerLayer.y}
              width={outerLayer.width}
              height={outerLayer.height}
              fill="none"
              stroke="#93c5fd"
              strokeWidth={selectionStrokeWidth}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
            <RectangleControlPoints
              box={outerLayer}
              shapeId={shape.id}
              viewportZoom={viewportZoom}
              onPointerDown={onPointerDown}
            />
          </>
        )}
      </g>
    );
  }

  if (shape.type === "parallelogram") {
    const strokeColor = getStrokeColor(shape);
    const strokeWidth = getStrokeWidth(shape);
    const box = getShapeBoundingBox(shape);
    const skewHandleX = shape.x + shape.width / 2 + shape.skew;

    return (
      <g
        onClick={(event) => {
          event.stopPropagation();
          onSelect(shape.id, event);
        }}
        onPointerDown={(event) => {
          event.stopPropagation();
          onPointerDown(event, shape.id, "body");
        }}
        style={{ cursor: "move" }}
      >
        <polygon
          points={getParallelogramPoints(shape)}
          fill="#ffffff"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
        />
        {isSelected && (
          <>
            <rect
              x={box.x}
              y={box.y}
              width={box.width}
              height={box.height}
              fill="none"
              stroke="#93c5fd"
              strokeWidth={selectionStrokeWidth}
              strokeDasharray="4 2"
              pointerEvents="none"
            />
            <RectangleControlPoints
              box={box}
              shapeId={shape.id}
              viewportZoom={viewportZoom}
              onPointerDown={onPointerDown}
            />
            <ControlPoint
              x={skewHandleX}
              y={shape.y}
              title="拖动调整倾斜量"
              cursor="ew-resize"
              handle="skew"
              shapeId={shape.id}
              viewportZoom={viewportZoom}
              onPointerDown={onPointerDown}
            />
          </>
        )}
      </g>
    );
  }

  if (shape.type === "curved") {
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    const right = shape.x + shape.width;
    const bottom = shape.y + shape.height;
    const arcBaselineY = shape.direction === "down" ? shape.y : bottom;
    const arcCurveY = shape.direction === "down" ? bottom : shape.y;
    const stroke = getStrokeColor(shape);
    const strokeWidth = getStrokeWidth(shape);

    return (
      <g
        onClick={(event) => {
          event.stopPropagation();
          onSelect(shape.id, event);
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
          fillOpacity={0.01}
          stroke="none"
        />

        {shape.kind === "circle" || shape.kind === "ellipse" ? (
          <ellipse
            cx={centerX}
            cy={centerY}
            rx={shape.width / 2}
            ry={shape.height / 2}
            fill="#ffffff"
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        ) : (
          <path
            d={
              shape.kind === "arc" || shape.kind === "arch"
                ? getArchPath(shape)
                : getSemicirclePath(shape)
            }
            fill={shape.kind === "arc" || shape.kind === "arch" ? "none" : "#ffffff"}
            stroke={stroke}
            strokeWidth={strokeWidth}
          />
        )}

        {isSelected && (
          <>
            <rect
              x={shape.x}
              y={shape.y}
              width={shape.width}
              height={shape.height}
              fill="none"
              stroke="#93c5fd"
              strokeWidth={selectionStrokeWidth}
              strokeDasharray="4 2"
              pointerEvents="none"
            />

            {shape.kind === "arc" || shape.kind === "arch" ? (
              <>
                <ControlPoint
                  x={shape.x}
                  y={arcBaselineY}
                  title="拖动调整宽度"
                  cursor="ew-resize"
                  handle="arch-left"
                  shapeId={shape.id}
                  viewportZoom={viewportZoom}
                  onPointerDown={onPointerDown}
                />
                <ControlPoint
                  x={right}
                  y={arcBaselineY}
                  title="拖动调整宽度"
                  cursor="ew-resize"
                  handle="arch-right"
                  shapeId={shape.id}
                  viewportZoom={viewportZoom}
                  onPointerDown={onPointerDown}
                />
                <ControlPoint
                  x={centerX}
                  y={arcCurveY}
                  title="拖动调整弧度"
                  cursor="ns-resize"
                  handle="arch-top"
                  shapeId={shape.id}
                  viewportZoom={viewportZoom}
                  onPointerDown={onPointerDown}
                />
              </>
            ) : (
              <>
                <ControlPoint
                  x={shape.x}
                  y={centerY}
                  title={
                    shape.kind === "circle" ? "拖动调整大小" : "拖动调整宽度"
                  }
                  cursor="ew-resize"
                  handle="left"
                  shapeId={shape.id}
                  viewportZoom={viewportZoom}
                  onPointerDown={onPointerDown}
                />
                <ControlPoint
                  x={right}
                  y={centerY}
                  title={
                    shape.kind === "circle" ? "拖动调整大小" : "拖动调整宽度"
                  }
                  cursor="ew-resize"
                  handle="right"
                  shapeId={shape.id}
                  viewportZoom={viewportZoom}
                  onPointerDown={onPointerDown}
                />
                <ControlPoint
                  x={centerX}
                  y={shape.y}
                  title={
                    shape.kind === "circle" ? "拖动调整大小" : "拖动调整高度"
                  }
                  cursor="ns-resize"
                  handle="top"
                  shapeId={shape.id}
                  viewportZoom={viewportZoom}
                  onPointerDown={onPointerDown}
                />
                <ControlPoint
                  x={centerX}
                  y={bottom}
                  title={
                    shape.kind === "circle" ? "拖动调整大小" : "拖动调整高度"
                  }
                  cursor="ns-resize"
                  handle="bottom"
                  shapeId={shape.id}
                  viewportZoom={viewportZoom}
                  onPointerDown={onPointerDown}
                />

                {shape.kind === "ellipse" && (
                  <>
                    <ControlPoint
                      x={shape.x}
                      y={shape.y}
                      title="拖动调整大小"
                      cursor="nwse-resize"
                      handle="top-left"
                      shapeId={shape.id}
                      viewportZoom={viewportZoom}
                      onPointerDown={onPointerDown}
                    />
                    <ControlPoint
                      x={right}
                      y={shape.y}
                      title="拖动调整大小"
                      cursor="nesw-resize"
                      handle="top-right"
                      shapeId={shape.id}
                      viewportZoom={viewportZoom}
                      onPointerDown={onPointerDown}
                    />
                    <ControlPoint
                      x={shape.x}
                      y={bottom}
                      title="拖动调整大小"
                      cursor="nesw-resize"
                      handle="bottom-left"
                      shapeId={shape.id}
                      viewportZoom={viewportZoom}
                      onPointerDown={onPointerDown}
                    />
                    <ControlPoint
                      x={right}
                      y={bottom}
                      title="拖动调整大小"
                      cursor="nwse-resize"
                      handle="bottom-right"
                      shapeId={shape.id}
                      viewportZoom={viewportZoom}
                      onPointerDown={onPointerDown}
                    />
                  </>
                )}
              </>
            )}
          </>
        )}
      </g>
    );
  }

  const strokeColor = getStrokeColor(shape);
  const strokeWidth = getStrokeWidth(shape);
  const hitStrokeWidth = Math.max(strokeWidth, 12);

  return (
    <g
      onClick={(event) => {
        event.stopPropagation();
        onSelect(shape.id, event);
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
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        pointerEvents="none"
      />
      {isSelected && (
        <>
          <circle
            cx={shape.x1}
            cy={shape.y1}
            r={endpointHandleRadius}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={2 / viewportZoom}
            style={{ cursor: "crosshair" }}
            onPointerDown={(event) => {
              event.stopPropagation();
              onPointerDown(event, shape.id, "line-start");
            }}
          />
          <circle
            cx={shape.x2}
            cy={shape.y2}
            r={endpointHandleRadius}
            fill="#ffffff"
            stroke="#2563eb"
            strokeWidth={2 / viewportZoom}
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
