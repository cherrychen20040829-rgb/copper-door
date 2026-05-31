export type ShapeType = "rect" | "line" | "nestedRect";

export interface ShapeBase {
  id: string;
  type: ShapeType;
}

export interface Rect extends ShapeBase {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Line extends ShapeBase {
  type: "line";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  strokeWidth: number;
}

export function getLineLength(line: Line): number {
  return Math.sqrt((line.x2 - line.x1) ** 2 + (line.y2 - line.y1) ** 2);
}

export function getLineAngleDeg(line: Line): number {
  return (Math.atan2(line.y2 - line.y1, line.x2 - line.x1) * 180) / Math.PI;
}

export function setLineLengthKeepStart(line: Line, length: number): Line {
  const safeLength = Math.max(length, 0);
  const angleRad = Math.atan2(line.y2 - line.y1, line.x2 - line.x1);

  return {
    ...line,
    x2: line.x1 + safeLength * Math.cos(angleRad),
    y2: line.y1 + safeLength * Math.sin(angleRad),
  };
}

export function setLineAngleKeepStart(line: Line, angleDeg: number): Line {
  const length = getLineLength(line);
  const angleRad = (angleDeg * Math.PI) / 180;

  return {
    ...line,
    x2: line.x1 + length * Math.cos(angleRad),
    y2: line.y1 + length * Math.sin(angleRad),
  };
}

export interface NestedRect extends ShapeBase {
  type: "nestedRect";
  x: number;
  y: number;
  width: number;
  height: number;
  layers: number;
  layerOffsets: number[];
  layerStrokeWidths: number[];
}

export interface NestedRectLayer {
  x: number;
  y: number;
  width: number;
  height: number;
  strokeWidth: number;
  layerIndex: number;
}

/** 逻辑尺寸（如 mm）到画布像素的显示比例 */
export const NESTED_RECT_DISPLAY_SCALE = 0.2;

export function normalizeLayerOffsets(
  layers: number,
  existing: number[] = [],
  defaultValue = 80
): number[] {
  const count = Math.max(Math.round(layers) - 1, 0);
  const result = existing.slice(0, count).map((value) => Math.max(value, 0));

  while (result.length < count) {
    result.push(defaultValue);
  }

  return result;
}

export function normalizeLayerStrokeWidths(
  count: number,
  existing: number[] = []
): number[] {
  const result = existing.slice(0, count);
  while (result.length < count) {
    result.push(1);
  }
  return result;
}

export function getNestedRectLayerLogicalSize(
  nested: NestedRect,
  index: number
): { width: number; height: number } {
  const offsets = normalizeLayerOffsets(nested.layers, nested.layerOffsets);
  let width = nested.width;
  let height = nested.height;

  for (let layerIndex = 0; layerIndex < index; layerIndex += 1) {
    const offset = offsets[layerIndex] ?? 0;
    width -= 2 * offset;
    height -= 2 * offset;
  }

  return { width, height };
}

export function computeNestedRectLayers(
  nested: NestedRect
): NestedRectLayer[] {
  const scale = NESTED_RECT_DISPLAY_SCALE;
  const layerCount = Math.max(Math.round(nested.layers), 1);
  const strokeWidths = normalizeLayerStrokeWidths(
    layerCount,
    nested.layerStrokeWidths
  );

  const centerX = nested.x + (nested.width * scale) / 2;
  const centerY = nested.y + (nested.height * scale) / 2;
  const layers: NestedRectLayer[] = [];

  for (let index = 0; index < layerCount; index += 1) {
    const { width: logicalWidth, height: logicalHeight } =
      getNestedRectLayerLogicalSize(nested, index);

    if (logicalWidth <= 0 || logicalHeight <= 0) {
      break;
    }

    const displayWidth = logicalWidth * scale;
    const displayHeight = logicalHeight * scale;

    layers.push({
      x: centerX - displayWidth / 2,
      y: centerY - displayHeight / 2,
      width: displayWidth,
      height: displayHeight,
      strokeWidth: strokeWidths[index] ?? 1,
      layerIndex: index,
    });
  }

  return layers;
}

export function getNestedRectDisplaySize(nested: NestedRect): {
  width: number;
  height: number;
} {
  return {
    width: nested.width * NESTED_RECT_DISPLAY_SCALE,
    height: nested.height * NESTED_RECT_DISPLAY_SCALE,
  };
}

export type Shape = Rect | Line | NestedRect;

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getShapeBoundingBox(shape: Shape): BoundingBox {
  if (shape.type === "rect") {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    };
  }

  if (shape.type === "nestedRect") {
    const displaySize = getNestedRectDisplaySize(shape);
    return {
      x: shape.x,
      y: shape.y,
      width: displaySize.width,
      height: displaySize.height,
    };
  }

  const x = Math.min(shape.x1, shape.x2);
  const y = Math.min(shape.y1, shape.y2);
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);

  return { x, y, width, height };
}

export function moveShape(shape: Shape, dx: number, dy: number): Shape {
  if (shape.type === "rect" || shape.type === "nestedRect") {
    return {
      ...shape,
      x: shape.x + dx,
      y: shape.y + dy,
    };
  }

  return {
    ...shape,
    x1: shape.x1 + dx,
    y1: shape.y1 + dy,
    x2: shape.x2 + dx,
    y2: shape.y2 + dy,
  };
}

export function updateShapeFromBoundingBox(
  shape: Shape,
  box: BoundingBox
): Shape {
  if (shape.type === "rect") {
    return {
      ...shape,
      x: box.x,
      y: box.y,
      width: Math.max(box.width, 1),
      height: Math.max(box.height, 1),
    };
  }

  if (shape.type === "nestedRect") {
    return shape;
  }

  const prevBox = getShapeBoundingBox(shape);
  const scaleX = prevBox.width === 0 ? 1 : box.width / prevBox.width;
  const scaleY = prevBox.height === 0 ? 1 : box.height / prevBox.height;

  return {
    ...shape,
    x1: box.x + (shape.x1 - prevBox.x) * scaleX,
    y1: box.y + (shape.y1 - prevBox.y) * scaleY,
    x2: box.x + (shape.x2 - prevBox.x) * scaleX,
    y2: box.y + (shape.y2 - prevBox.y) * scaleY,
  };
}
