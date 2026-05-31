"use client";

import { useEffect, useState } from "react";
import { useEditorStore, useSelectedShape } from "@/store/useEditorStore";
import type { Line, NestedRect, Rect } from "@/types/shape";
import {
  computeNestedRectLayers,
  getLineAngleDeg,
  getLineLength,
  getNestedRectLayerLogicalSize,
  normalizeLayerOffsets,
  setLineAngleKeepStart,
  setLineLengthKeepStart,
} from "@/types/shape";

interface RectPropertyFields {
  x: string;
  y: string;
  width: string;
  height: string;
}

interface LinePropertyFields {
  x1: string;
  y1: string;
  x2: string;
  y2: string;
  length: string;
  angle: string;
  strokeWidth: string;
}

interface NestedRectPropertyFields {
  width: string;
  height: string;
  layers: string;
  layerOffsets: string[];
}

interface NestedRectLayerPropertyFields {
  x: string;
  y: string;
  width: string;
  height: string;
  strokeWidth: string;
  layerIndex: string;
}

function parseNumber(value: string): number | null {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return parsed;
}

function formatNumber(value: number, digits = 1): string {
  return String(Number(value.toFixed(digits)));
}

function toRectFields(rect: Rect): RectPropertyFields {
  return {
    x: String(Math.round(rect.x)),
    y: String(Math.round(rect.y)),
    width: String(Math.round(rect.width)),
    height: String(Math.round(rect.height)),
  };
}

function toLineFields(line: Line): LinePropertyFields {
  return {
    x1: String(Math.round(line.x1)),
    y1: String(Math.round(line.y1)),
    x2: String(Math.round(line.x2)),
    y2: String(Math.round(line.y2)),
    length: formatNumber(getLineLength(line)),
    angle: formatNumber(getLineAngleDeg(line)),
    strokeWidth: formatNumber(line.strokeWidth, 0),
  };
}

function toNestedRectFields(nested: NestedRect): NestedRectPropertyFields {
  const offsets = normalizeLayerOffsets(nested.layers, nested.layerOffsets);

  return {
    width: String(Math.round(nested.width)),
    height: String(Math.round(nested.height)),
    layers: String(nested.layers),
    layerOffsets: offsets.map((value) => String(Math.round(value))),
  };
}

function PropertyInput({
  label,
  value,
  min,
  readOnly = false,
  onChange,
  onBlur,
}: {
  label: string;
  value: string;
  min?: number;
  readOnly?: boolean;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBlur?: () => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-slate-500">
        {label}
      </span>
      <input
        type="number"
        min={min}
        value={value}
        readOnly={readOnly}
        onChange={onChange}
        onBlur={onBlur}
        className={`w-full rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
          readOnly ? "cursor-default bg-slate-50 text-slate-500" : ""
        }`}
      />
    </label>
  );
}

function RectPropertyPanel({ rect }: { rect: Rect }) {
  const updateShapeBoundingBox = useEditorStore(
    (state) => state.updateShapeBoundingBox
  );
  const [fields, setFields] = useState<RectPropertyFields>(() =>
    toRectFields(rect)
  );

  useEffect(() => {
    setFields(toRectFields(rect));
  }, [rect.id, rect.x, rect.y, rect.width, rect.height]);

  const applyField = (key: keyof RectPropertyFields, rawValue: string) => {
    const parsed = parseNumber(rawValue);
    if (parsed === null) {
      return;
    }

    const nextBox = {
      x: key === "x" ? parsed : rect.x,
      y: key === "y" ? parsed : rect.y,
      width: key === "width" ? Math.max(parsed, 1) : rect.width,
      height: key === "height" ? Math.max(parsed, 1) : rect.height,
    };

    updateShapeBoundingBox(rect.id, nextBox);
  };

  const handleChange =
    (key: keyof RectPropertyFields) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFields((prev) => ({ ...prev, [key]: value }));
      applyField(key, value);
    };

  const handleBlur = (key: keyof RectPropertyFields) => () => {
    if (parseNumber(fields[key]) === null) {
      setFields(toRectFields(rect));
    }
  };

  return (
    <div className="space-y-3">
      <PropertyInput
        label="X"
        value={fields.x}
        onChange={handleChange("x")}
        onBlur={handleBlur("x")}
      />
      <PropertyInput
        label="Y"
        value={fields.y}
        onChange={handleChange("y")}
        onBlur={handleBlur("y")}
      />
      <PropertyInput
        label="Width"
        value={fields.width}
        min={1}
        onChange={handleChange("width")}
        onBlur={handleBlur("width")}
      />
      <PropertyInput
        label="Height"
        value={fields.height}
        min={1}
        onChange={handleChange("height")}
        onBlur={handleBlur("height")}
      />
    </div>
  );
}

function LinePropertyPanel({ line }: { line: Line }) {
  const updateLine = useEditorStore((state) => state.updateLine);
  const [fields, setFields] = useState<LinePropertyFields>(() =>
    toLineFields(line)
  );

  useEffect(() => {
    setFields(toLineFields(line));
  }, [
    line.id,
    line.x1,
    line.y1,
    line.x2,
    line.y2,
    line.strokeWidth,
  ]);

  const applyField = (key: keyof LinePropertyFields, rawValue: string) => {
    const parsed = parseNumber(rawValue);
    if (parsed === null) {
      return;
    }

    if (key === "x1") {
      updateLine(line.id, { x1: parsed });
      return;
    }
    if (key === "y1") {
      updateLine(line.id, { y1: parsed });
      return;
    }
    if (key === "x2") {
      updateLine(line.id, { x2: parsed });
      return;
    }
    if (key === "y2") {
      updateLine(line.id, { y2: parsed });
      return;
    }
    if (key === "strokeWidth") {
      updateLine(line.id, { strokeWidth: Math.max(parsed, 1) });
      return;
    }
    if (key === "length") {
      const nextLine = setLineLengthKeepStart(line, Math.max(parsed, 0));
      updateLine(line.id, { x2: nextLine.x2, y2: nextLine.y2 });
      return;
    }
    if (key === "angle") {
      const nextLine = setLineAngleKeepStart(line, parsed);
      updateLine(line.id, { x2: nextLine.x2, y2: nextLine.y2 });
    }
  };

  const handleChange =
    (key: keyof LinePropertyFields) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFields((prev) => ({ ...prev, [key]: value }));
      applyField(key, value);
    };

  const handleBlur = (key: keyof LinePropertyFields) => () => {
    if (parseNumber(fields[key]) === null) {
      setFields(toLineFields(line));
    }
  };

  return (
    <div className="space-y-3">
      <PropertyInput
        label="X1"
        value={fields.x1}
        onChange={handleChange("x1")}
        onBlur={handleBlur("x1")}
      />
      <PropertyInput
        label="Y1"
        value={fields.y1}
        onChange={handleChange("y1")}
        onBlur={handleBlur("y1")}
      />
      <PropertyInput
        label="X2"
        value={fields.x2}
        onChange={handleChange("x2")}
        onBlur={handleBlur("x2")}
      />
      <PropertyInput
        label="Y2"
        value={fields.y2}
        onChange={handleChange("y2")}
        onBlur={handleBlur("y2")}
      />
      <PropertyInput
        label="Length"
        value={fields.length}
        min={0}
        onChange={handleChange("length")}
        onBlur={handleBlur("length")}
      />
      <PropertyInput
        label="Angle"
        value={fields.angle}
        onChange={handleChange("angle")}
        onBlur={handleBlur("angle")}
      />
      <PropertyInput
        label="Stroke Width"
        value={fields.strokeWidth}
        min={1}
        onChange={handleChange("strokeWidth")}
        onBlur={handleBlur("strokeWidth")}
      />
    </div>
  );
}

function NestedRectGroupPropertyPanel({ nested }: { nested: NestedRect }) {
  const updateNestedRect = useEditorStore((state) => state.updateNestedRect);
  const [fields, setFields] = useState<NestedRectPropertyFields>(() =>
    toNestedRectFields(nested)
  );

  useEffect(() => {
    setFields(toNestedRectFields(nested));
  }, [
    nested.id,
    nested.width,
    nested.height,
    nested.layers,
    nested.layerOffsets.join(","),
  ]);

  const layers = computeNestedRectLayers(nested);
  const layerCount = Math.max(Math.round(parseNumber(fields.layers) ?? nested.layers), 1);

  const applyField = (key: "width" | "height" | "layers", rawValue: string) => {
    const parsed = parseNumber(rawValue);
    if (parsed === null) {
      return;
    }

    if (key === "width") {
      updateNestedRect(nested.id, { width: Math.max(parsed, 1) });
      return;
    }
    if (key === "height") {
      updateNestedRect(nested.id, { height: Math.max(parsed, 1) });
      return;
    }
    if (key === "layers") {
      updateNestedRect(nested.id, { layers: Math.max(Math.round(parsed), 1) });
    }
  };

  const applyLayerOffset = (index: number, rawValue: string) => {
    const parsed = parseNumber(rawValue);
    if (parsed === null) {
      return;
    }

    const nextOffsets = normalizeLayerOffsets(
      layerCount,
      nested.layerOffsets
    );
    nextOffsets[index] = Math.max(parsed, 0);
    updateNestedRect(nested.id, { layerOffsets: nextOffsets });
  };

  const handleChange =
    (key: "width" | "height" | "layers") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFields((prev) => ({ ...prev, [key]: value }));
      applyField(key, value);
    };

  const handleLayerOffsetChange =
    (index: number) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFields((prev) => {
        const layerOffsets = [...prev.layerOffsets];
        layerOffsets[index] = value;
        return { ...prev, layerOffsets };
      });
      applyLayerOffset(index, value);
    };

  const handleBlur = (key: "width" | "height" | "layers") => () => {
    if (parseNumber(fields[key]) === null) {
      setFields(toNestedRectFields(nested));
    }
  };

  const handleLayerOffsetBlur = (index: number) => () => {
    if (parseNumber(fields.layerOffsets[index] ?? "") === null) {
      setFields(toNestedRectFields(nested));
    }
  };

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-500">整体参数</p>
      <PropertyInput
        label="Width"
        value={fields.width}
        min={1}
        onChange={handleChange("width")}
        onBlur={handleBlur("width")}
      />
      <PropertyInput
        label="Height"
        value={fields.height}
        min={1}
        onChange={handleChange("height")}
        onBlur={handleBlur("height")}
      />
      <PropertyInput
        label="Layers"
        value={fields.layers}
        min={1}
        onChange={handleChange("layers")}
        onBlur={handleBlur("layers")}
      />

      {layerCount > 1 && (
        <div className="space-y-3">
          <p className="text-xs font-medium text-slate-500">层间距</p>
          {Array.from({ length: layerCount - 1 }, (_, index) => (
            <PropertyInput
              key={`layer-offset-${index}`}
              label={`第${index + 1}层到第${index + 2}层间距`}
              value={fields.layerOffsets[index] ?? "80"}
              min={0}
              onChange={handleLayerOffsetChange(index)}
              onBlur={handleLayerOffsetBlur(index)}
            />
          ))}
        </div>
      )}

      <div className="rounded-md border border-slate-200 bg-slate-50 p-3">
        <p className="mb-2 text-xs font-medium text-slate-500">各层尺寸</p>
        <ul className="space-y-1 text-xs text-slate-600">
          {layers.map((layer) => {
            const logicalSize = getNestedRectLayerLogicalSize(
              nested,
              layer.layerIndex
            );

            return (
              <li key={`layer-preview-${layer.layerIndex}`}>
                第{layer.layerIndex + 1}层 {Math.round(logicalSize.width)}×
                {Math.round(logicalSize.height)}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function NestedRectLayerPropertyPanel({
  nested,
  layerIndex,
}: {
  nested: NestedRect;
  layerIndex: number;
}) {
  const updateNestedRectLayerStrokeWidth = useEditorStore(
    (state) => state.updateNestedRectLayerStrokeWidth
  );
  const layers = computeNestedRectLayers(nested);
  const layer = layers.find((item) => item.layerIndex === layerIndex);
  const logicalSize = getNestedRectLayerLogicalSize(nested, layerIndex);
  const strokeWidth = nested.layerStrokeWidths[layerIndex] ?? 1;

  const [fields, setFields] = useState<NestedRectLayerPropertyFields>(() => ({
    x: layer ? String(Math.round(layer.x)) : "0",
    y: layer ? String(Math.round(layer.y)) : "0",
    width: String(Math.round(logicalSize.width)),
    height: String(Math.round(logicalSize.height)),
    strokeWidth: String(Math.round(strokeWidth)),
    layerIndex: String(layerIndex + 1),
  }));

  useEffect(() => {
    if (!layer) {
      return;
    }

    setFields({
      x: String(Math.round(layer.x)),
      y: String(Math.round(layer.y)),
      width: String(Math.round(logicalSize.width)),
      height: String(Math.round(logicalSize.height)),
      strokeWidth: String(Math.round(strokeWidth)),
      layerIndex: String(layerIndex + 1),
    });
  }, [
    layer?.x,
    layer?.y,
    logicalSize.width,
    logicalSize.height,
    strokeWidth,
    layerIndex,
    layer,
  ]);

  const handleStrokeWidthChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const value = event.target.value;
    setFields((prev) => ({ ...prev, strokeWidth: value }));

    const parsed = parseNumber(value);
    if (parsed === null) {
      return;
    }

    updateNestedRectLayerStrokeWidth(
      nested.id,
      layerIndex,
      Math.max(parsed, 1)
    );
  };

  const handleStrokeWidthBlur = () => {
    if (parseNumber(fields.strokeWidth) === null) {
      setFields((prev) => ({
        ...prev,
        strokeWidth: String(Math.round(strokeWidth)),
      }));
    }
  };

  if (!layer) {
    return null;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs font-medium text-slate-500">当前图层</p>
      <PropertyInput label="X" value={fields.x} readOnly />
      <PropertyInput label="Y" value={fields.y} readOnly />
      <PropertyInput label="Width" value={fields.width} readOnly />
      <PropertyInput label="Height" value={fields.height} readOnly />
      <PropertyInput
        label="Stroke Width"
        value={fields.strokeWidth}
        min={1}
        onChange={handleStrokeWidthChange}
        onBlur={handleStrokeWidthBlur}
      />
      <PropertyInput label="Layer Index" value={fields.layerIndex} readOnly />
    </div>
  );
}

function NestedRectPropertyPanel({
  nested,
  selectedLayerIndex,
}: {
  nested: NestedRect;
  selectedLayerIndex: number | null;
}) {
  return (
    <div className="space-y-5">
      {selectedLayerIndex !== null ? (
        <NestedRectLayerPropertyPanel
          nested={nested}
          layerIndex={selectedLayerIndex}
        />
      ) : (
        <p className="text-xs text-slate-400">点击某一层以编辑该层属性</p>
      )}
      <NestedRectGroupPropertyPanel nested={nested} />
    </div>
  );
}

export function PropertyPanel() {
  const selectedShape = useSelectedShape();
  const selectedLayerIndex = useEditorStore((state) => state.selectedLayerIndex);

  if (!selectedShape) {
    return (
      <div className="flex h-full flex-col">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          属性
        </h2>
        <p className="mt-4 text-sm text-slate-400">未选中任何元素</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          属性
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          {selectedShape.type === "rect"
            ? "矩形"
            : selectedShape.type === "line"
              ? "直线"
              : selectedLayerIndex !== null
                ? `嵌套矩形 · 第${selectedLayerIndex + 1}层`
                : "嵌套矩形"}
        </p>
        <p className="text-xs text-slate-400">ID: {selectedShape.id}</p>
      </div>

      {selectedShape.type === "rect" ? (
        <RectPropertyPanel rect={selectedShape} />
      ) : selectedShape.type === "line" ? (
        <LinePropertyPanel line={selectedShape} />
      ) : (
        <NestedRectPropertyPanel
          nested={selectedShape}
          selectedLayerIndex={selectedLayerIndex}
        />
      )}
    </div>
  );
}
