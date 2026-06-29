export type ShapeType =
  | "rect"
  | "line"
  | "nestedRect"
  | "curved"
  | "parallelogram"
  | "group"
  | "dimension";
export type CurvedShapeKind =
  | "circle"
  | "ellipse"
  | "semicircle"
  | "arc"
  | "arch";
export type ShapeDrawTool =
  | "rect"
  | "nestedRect"
  | "parallelogram"
  | CurvedShapeKind;
export type SemicircleDirection = "up" | "down" | "left" | "right";
export type CurvedResizeHandle =
  | "left"
  | "right"
  | "top"
  | "bottom"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "arch-left"
  | "arch-right"
  | "arch-top"
  | "skew"
  | "dimension-text";
export type DimensionOrientation = "horizontal" | "vertical" | "aligned";
export type DimensionStylePreset =
  | "blue-assist"
  | "standard-arrow"
  | "engineering-slash"
  | "dashed";
export type DimensionBindingKind =
  | "rect-width"
  | "rect-height"
  | "nested-outer-width"
  | "nested-outer-height"
  | "nested-inner-width"
  | "nested-inner-height"
  | "parallelogram-width"
  | "parallelogram-height"
  | "parallelogram-skew"
  | "circle-radius"
  | "circle-diameter"
  | "ellipse-radius-x"
  | "ellipse-radius-y"
  | "ellipse-width"
  | "ellipse-height"
  | "semicircle-base"
  | "semicircle-height"
  | "arc-base"
  | "arc-height";

export interface ShapeBase {
  id: string;
  type: ShapeType;
  strokeColor?: string;
  strokeWidth?: number;
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

export interface CurvedShape extends ShapeBase {
  type: "curved";
  kind: CurvedShapeKind;
  x: number;
  y: number;
  width: number;
  height: number;
  direction?: SemicircleDirection;
}

export interface Parallelogram extends ShapeBase {
  type: "parallelogram";
  x: number;
  y: number;
  width: number;
  height: number;
  skew: number;
}

export interface DimensionShape extends ShapeBase {
  type: "dimension";
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  lineX: number;
  lineY: number;
  textOffsetX: number;
  textOffsetY: number;
  orientation: DimensionOrientation;
  unit: "mm";
  isAuto: boolean;
  fixedLength?: number;
  stylePreset?: DimensionStylePreset;
  binding?: {
    shapeId: string;
    kind: DimensionBindingKind;
    offset: number;
  };
}

export interface GroupShape extends ShapeBase {
  type: "group";
  children: Shape[];
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

export type Shape =
  | Rect
  | Line
  | NestedRect
  | CurvedShape
  | Parallelogram
  | GroupShape
  | DimensionShape;

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function getShapeBoundingBox(shape: Shape): BoundingBox {
  if (shape.type === "group") {
    return getShapesBoundingBox(shape.children);
  }

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

  if (shape.type === "curved") {
    return {
      x: shape.x,
      y: shape.y,
      width: shape.width,
      height: shape.height,
    };
  }

  if (shape.type === "parallelogram") {
    const minX = Math.min(shape.x, shape.x + shape.skew);
    const maxX = Math.max(
      shape.x + shape.width,
      shape.x + shape.width + shape.skew
    );

    return {
      x: minX,
      y: shape.y,
      width: maxX - minX,
      height: shape.height,
    };
  }

  if (shape.type === "dimension") {
    const minX = Math.min(shape.x1, shape.x2, shape.lineX);
    const minY = Math.min(shape.y1, shape.y2, shape.lineY);
    const maxX = Math.max(shape.x1, shape.x2, shape.lineX);
    const maxY = Math.max(shape.y1, shape.y2, shape.lineY);

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY,
    };
  }

  const x = Math.min(shape.x1, shape.x2);
  const y = Math.min(shape.y1, shape.y2);
  const width = Math.abs(shape.x2 - shape.x1);
  const height = Math.abs(shape.y2 - shape.y1);

  return { x, y, width, height };
}

export function getShapesBoundingBox(shapes: Shape[]): BoundingBox {
  if (shapes.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
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
  }, null) ?? { x: 0, y: 0, width: 0, height: 0 };
}

export function moveShape(shape: Shape, dx: number, dy: number): Shape {
  if (shape.type === "group") {
    return {
      ...shape,
      children: shape.children.map((child) => moveShape(child, dx, dy)),
    };
  }

  if (
    shape.type === "rect" ||
    shape.type === "nestedRect" ||
    shape.type === "curved" ||
    shape.type === "parallelogram"
  ) {
    return {
      ...shape,
      x: shape.x + dx,
      y: shape.y + dy,
    };
  }

  if (shape.type === "dimension") {
    if (shape.fixedLength !== undefined && !shape.binding) {
      return {
        ...shape,
        x1: shape.x1 + dx,
        y1: shape.y1 + dy,
        x2: shape.x2 + dx,
        y2: shape.y2 + dy,
        lineX: shape.lineX + dx,
        lineY: shape.lineY + dy,
      };
    }

    if (shape.binding) {
      return {
        ...shape,
        binding: {
          ...shape.binding,
          offset: shape.binding.offset + (shape.orientation === "vertical" ? dx : dy),
        },
        lineX: shape.lineX + dx,
        lineY: shape.lineY + dy,
      };
    }

    return {
      ...shape,
      lineX: shape.lineX + dx,
      lineY: shape.lineY + dy,
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
  if (shape.type === "group") {
    const prevBox = getShapeBoundingBox(shape);
    const scaleX = prevBox.width === 0 ? 1 : box.width / prevBox.width;
    const scaleY = prevBox.height === 0 ? 1 : box.height / prevBox.height;

    return {
      ...shape,
      children: shape.children.map((child) => {
        const childBox = getShapeBoundingBox(child);
        return updateShapeFromBoundingBox(child, {
          x: box.x + (childBox.x - prevBox.x) * scaleX,
          y: box.y + (childBox.y - prevBox.y) * scaleY,
          width: childBox.width * scaleX,
          height: childBox.height * scaleY,
        });
      }),
    };
  }

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
    const scale = NESTED_RECT_DISPLAY_SCALE;
    return {
      ...shape,
      x: box.x,
      y: box.y,
      width: Math.max(box.width / scale, 1),
      height: Math.max(box.height / scale, 1),
    };
  }

  if (shape.type === "curved") {
    const width = Math.max(box.width, 1);
    const height = Math.max(box.height, 1);

    if (shape.kind === "circle") {
      const size = Math.max(width, height);
      return {
        ...shape,
        x: box.x,
        y: box.y,
        width: size,
        height: size,
      };
    }

    return {
      ...shape,
      x: box.x,
      y: box.y,
      width,
      height,
    };
  }

  if (shape.type === "parallelogram") {
    const skew = shape.skew;
    const x = skew < 0 ? box.x - skew : box.x;
    const width = Math.max(box.width - Math.abs(skew), 1);

    return {
      ...shape,
      x,
      y: box.y,
      width,
      height: Math.max(box.height, 1),
    };
  }

  if (shape.type === "dimension") {
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

export function resizeCurvedShape(
  shape: CurvedShape,
  handle: CurvedResizeHandle,
  x: number,
  y: number
): CurvedShape {
  const minSize = 20;
  const right = shape.x + shape.width;
  const bottom = shape.y + shape.height;

  if (shape.kind === "circle") {
    const centerX = shape.x + shape.width / 2;
    const centerY = shape.y + shape.height / 2;
    const size = Math.max(
      Math.abs(x - centerX) * 2,
      Math.abs(y - centerY) * 2,
      minSize
    );

    return {
      ...shape,
      x: centerX - size / 2,
      y: centerY - size / 2,
      width: size,
      height: size,
    };
  }

  if (shape.kind === "arc" || shape.kind === "arch") {
    if (handle === "arch-left") {
      const nextX = Math.min(x, right - minSize);
      return { ...shape, x: nextX, width: right - nextX };
    }

    if (handle === "arch-right") {
      return { ...shape, width: Math.max(x - shape.x, minSize) };
    }

    if (handle === "arch-top") {
      if (shape.direction === "down") {
        return { ...shape, height: Math.max(y - shape.y, minSize) };
      }

      const nextY = Math.min(y, bottom - minSize);
      return { ...shape, y: nextY, height: bottom - nextY };
    }
  }

  let nextX = shape.x;
  let nextY = shape.y;
  let nextWidth = shape.width;
  let nextHeight = shape.height;

  if (handle.includes("left")) {
    nextX = Math.min(x, right - minSize);
    nextWidth = right - nextX;
  }

  if (handle.includes("right")) {
    nextWidth = Math.max(x - shape.x, minSize);
  }

  if (handle.includes("top")) {
    nextY = Math.min(y, bottom - minSize);
    nextHeight = bottom - nextY;
  }

  if (handle.includes("bottom")) {
    nextHeight = Math.max(y - shape.y, minSize);
  }

  return {
    ...shape,
    x: nextX,
    y: nextY,
    width: nextWidth,
    height: nextHeight,
  };
}
