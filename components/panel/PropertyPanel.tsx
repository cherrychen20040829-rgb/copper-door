"use client";

import { useEffect, useState } from "react";
import { useEditorStore, useSelectedShape } from "@/store/useEditorStore";
import type {
  CurvedShape,
  DimensionBindingKind,
  DimensionShape,
  DimensionStylePreset,
  GroupShape,
  Line,
  NestedRect,
  Parallelogram,
  Rect,
  SemicircleDirection,
} from "@/types/shape";
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

interface ParallelogramPropertyFields {
  width: string;
  height: string;
  skew: string;
}

const DIMENSION_STYLE_OPTIONS: Array<{
  label: string;
  value: DimensionStylePreset;
}> = [
  { label: "蓝色辅助", value: "blue-assist" },
  { label: "标准箭头", value: "standard-arrow" },
  { label: "工程斜线", value: "engineering-slash" },
  { label: "虚线标注", value: "dashed" },
];

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

function toParallelogramFields(
  parallelogram: Parallelogram
): ParallelogramPropertyFields {
  return {
    width: String(Math.round(parallelogram.width)),
    height: String(Math.round(parallelogram.height)),
    skew: String(Math.round(parallelogram.skew)),
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

function ParallelogramPropertyPanel({
  parallelogram,
}: {
  parallelogram: Parallelogram;
}) {
  const updateParallelogram = useEditorStore(
    (state) => state.updateParallelogram
  );
  const [fields, setFields] = useState<ParallelogramPropertyFields>(() =>
    toParallelogramFields(parallelogram)
  );

  useEffect(() => {
    setFields(toParallelogramFields(parallelogram));
  }, [
    parallelogram.id,
    parallelogram.width,
    parallelogram.height,
    parallelogram.skew,
  ]);

  const applyField = (
    key: keyof ParallelogramPropertyFields,
    rawValue: string
  ) => {
    const parsed = parseNumber(rawValue);
    if (parsed === null) {
      return;
    }

    if (key === "width") {
      updateParallelogram(parallelogram.id, { width: Math.max(parsed, 1) });
      return;
    }

    if (key === "height") {
      updateParallelogram(parallelogram.id, { height: Math.max(parsed, 1) });
      return;
    }

    updateParallelogram(parallelogram.id, { skew: parsed });
  };

  const handleChange =
    (key: keyof ParallelogramPropertyFields) =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFields((prev) => ({ ...prev, [key]: value }));
      applyField(key, value);
    };

  const handleBlur = (key: keyof ParallelogramPropertyFields) => () => {
    if (parseNumber(fields[key]) === null) {
      setFields(toParallelogramFields(parallelogram));
    }
  };

  return (
    <div className="space-y-3">
      <PropertyInput
        label="宽度"
        value={fields.width}
        min={1}
        onChange={handleChange("width")}
        onBlur={handleBlur("width")}
      />
      <PropertyInput
        label="高度"
        value={fields.height}
        min={1}
        onChange={handleChange("height")}
        onBlur={handleBlur("height")}
      />
      <PropertyInput
        label="倾斜量"
        value={fields.skew}
        onChange={handleChange("skew")}
        onBlur={handleBlur("skew")}
      />
    </div>
  );
}

function DimensionPropertyPanel({ dimension }: { dimension: DimensionShape }) {
  const updateDimensionStyle = useEditorStore(
    (state) => state.updateDimensionStyle
  );
  const updateDimensionLength = useEditorStore(
    (state) => state.updateDimensionLength
  );
  const currentLength =
    dimension.orientation === "vertical"
      ? Math.abs(dimension.y2 - dimension.y1)
      : Math.abs(dimension.x2 - dimension.x1);
  const [lengthValue, setLengthValue] = useState(
    String(Math.round(dimension.fixedLength ?? currentLength))
  );

  useEffect(() => {
    setLengthValue(String(Math.round(dimension.fixedLength ?? currentLength)));
  }, [dimension.fixedLength, currentLength]);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>单位</span>
          <span className="font-medium text-slate-800">{dimension.unit}</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>自动更新</span>
          <span className="font-medium text-slate-800">
            {dimension.isAuto ? "是" : "否"}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          可在画布中拖动尺寸线或尺寸文字位置。
        </p>
      </div>

      {!dimension.binding && (
        <PropertyInput
          label="标注长度"
          value={lengthValue}
          min={1}
          onChange={(event) => {
            const value = event.target.value;
            setLengthValue(value);
            const parsed = parseNumber(value);
            if (parsed !== null) {
              updateDimensionLength(dimension.id, parsed);
            }
          }}
          onBlur={() => {
            if (parseNumber(lengthValue) === null) {
              setLengthValue(String(Math.round(currentLength)));
            }
          }}
        />
      )}

      <label className="block">
        <span className="mb-1 block text-xs font-medium text-slate-500">
          标注样式
        </span>
        <select
          value={dimension.stylePreset ?? "blue-assist"}
          onChange={(event) =>
            updateDimensionStyle(
              dimension.id,
              event.target.value as DimensionStylePreset
            )
          }
          className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          {DIMENSION_STYLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      <button
        type="button"
        onClick={() =>
          updateDimensionStyle(
            dimension.id,
            dimension.stylePreset ?? "blue-assist",
            true
          )
        }
        className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
      >
        设为后续默认样式
      </button>
      </div>
  );
}

function getQuickDimensionOptions(shape: Exclude<ReturnType<typeof useSelectedShape>, null>): Array<{
  label: string;
  kind: DimensionBindingKind;
}> {
  if (shape.type === "rect") {
    return [
      { label: "标注宽度", kind: "rect-width" },
      { label: "标注高度", kind: "rect-height" },
    ];
  }

  if (shape.type === "nestedRect") {
    return [
      { label: "标注外框宽度", kind: "nested-outer-width" },
      { label: "标注外框高度", kind: "nested-outer-height" },
      { label: "标注内框宽度", kind: "nested-inner-width" },
      { label: "标注内框高度", kind: "nested-inner-height" },
    ];
  }

  if (shape.type === "parallelogram") {
    return [
      { label: "标注宽度", kind: "parallelogram-width" },
      { label: "标注高度", kind: "parallelogram-height" },
      { label: "标注倾斜量", kind: "parallelogram-skew" },
    ];
  }

  if (shape.type === "curved") {
    if (shape.kind === "circle") {
      return [
        { label: "标注半径", kind: "circle-radius" },
        { label: "标注直径", kind: "circle-diameter" },
      ];
    }

    if (shape.kind === "ellipse") {
      return [
        { label: "标注横向半径", kind: "ellipse-radius-x" },
        { label: "标注纵向半径", kind: "ellipse-radius-y" },
        { label: "标注总宽", kind: "ellipse-width" },
        { label: "标注总高", kind: "ellipse-height" },
      ];
    }

    if (shape.kind === "semicircle") {
      return [
        { label: "标注底边长度", kind: "semicircle-base" },
        { label: "标注高度", kind: "semicircle-height" },
      ];
    }

    return [
      { label: "标注底边长度", kind: "arc-base" },
      { label: "标注弧高", kind: "arc-height" },
    ];
  }

  return [];
}

function QuickDimensionButtons({
  shape,
}: {
  shape: Exclude<ReturnType<typeof useSelectedShape>, null>;
}) {
  const addQuickDimension = useEditorStore((state) => state.addQuickDimension);
  const options = getQuickDimensionOptions(shape);

  if (options.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">快捷标注</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <button
            key={option.kind}
            type="button"
            onClick={() => addQuickDimension(shape.id, option.kind)}
            className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function OrderControls() {
  const shapes = useEditorStore((state) => state.shapes);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectedId = useEditorStore((state) => state.selectedId);
  const reorderSelected = useEditorStore((state) => state.reorderSelected);
  const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];

  if (ids.length === 0) {
    return null;
  }

  const selectedIdSet = new Set(ids);
  const selectedShapes = shapes.filter((shape) => selectedIdSet.has(shape.id));
  if (selectedShapes.length === 0) {
    return null;
  }

  const selectedAreDimensions = selectedShapes.every(
    (shape) => shape.type === "dimension"
  );
  const bucket = shapes.filter((shape) =>
    selectedAreDimensions ? shape.type === "dimension" : shape.type !== "dimension"
  );
  const indexes = bucket
    .map((shape, index) => (selectedIdSet.has(shape.id) ? index : -1))
    .filter((index) => index >= 0);
  const minIndex = Math.min(...indexes);
  const maxIndex = Math.max(...indexes);
  const atBottom = minIndex <= 0;
  const atTop = maxIndex >= bucket.length - 1;

  const buttons: Array<{
    label: string;
    action: "front" | "forward" | "backward" | "back";
    disabled: boolean;
  }> = [
    { label: "移到最上", action: "front", disabled: atTop },
    { label: "上移一层", action: "forward", disabled: atTop },
    { label: "下移一层", action: "backward", disabled: atBottom },
    { label: "移到最下", action: "back", disabled: atBottom },
  ];

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-slate-500">上下顺序</p>
      <div className="grid grid-cols-2 gap-2">
        {buttons.map((button) => (
          <button
            key={button.action}
            type="button"
            disabled={button.disabled}
            onClick={() => reorderSelected(button.action)}
            className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
              button.disabled
                ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
                : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {button.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function ArrayCopyPanel({
  shape,
}: {
  shape: Exclude<ReturnType<typeof useSelectedShape>, null>;
}) {
  const arrayCopySelected = useEditorStore(
    (state) => state.arrayCopySelected
  );
  const [isOpen, setIsOpen] = useState(false);
  const [direction, setDirection] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [count, setCount] = useState("3");
  const [spacing, setSpacing] = useState("100");

  useEffect(() => {
    setIsOpen(false);
    setCount("3");
    setSpacing("100");
    setDirection("horizontal");
  }, [shape.id]);

  if (shape.type === "dimension") {
    return null;
  }

  const handleGenerate = () => {
    const parsedCount = Number(count);
    const parsedSpacing = Number(spacing);

    if (
      !Number.isFinite(parsedCount) ||
      !Number.isFinite(parsedSpacing) ||
      parsedCount < 2
    ) {
      return;
    }

    arrayCopySelected(direction, parsedCount, parsedSpacing);
    setIsOpen(false);
  };

  return (
    <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="flex w-full items-center justify-between text-sm font-semibold text-slate-700"
      >
        <span>阵列复制</span>
        <span className="text-xs text-slate-400">{isOpen ? "收起" : "展开"}</span>
      </button>

      {isOpen && (
        <div className="space-y-3">
          <div>
            <p className="mb-1 text-xs font-medium text-slate-500">方向</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "横向", value: "horizontal" },
                { label: "纵向", value: "vertical" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setDirection(option.value as "horizontal" | "vertical")
                  }
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                    direction === option.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <PropertyInput
            label="数量（含原图形）"
            value={count}
            min={2}
            onChange={(event) => setCount(event.target.value)}
            onBlur={() => {
              const parsed = Number(count);
              if (!Number.isFinite(parsed) || parsed < 2) {
                setCount("3");
              }
            }}
          />

          <PropertyInput
            label="间距 mm"
            value={spacing}
            min={0}
            onChange={(event) => setSpacing(event.target.value)}
            onBlur={() => {
              const parsed = Number(spacing);
              if (!Number.isFinite(parsed) || parsed < 0) {
                setSpacing("100");
              }
            }}
          />

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-md border border-blue-500 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            >
              生成阵列
            </button>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="rounded-md border border-slate-300 bg-white px-2 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function SelectionActionsPanel({ count }: { count: number }) {
  const arrayCopySelected = useEditorStore((state) => state.arrayCopySelected);
  const groupSelected = useEditorStore((state) => state.groupSelected);
  const [isArrayOpen, setIsArrayOpen] = useState(false);
  const [direction, setDirection] = useState<"horizontal" | "vertical">(
    "horizontal"
  );
  const [arrayCount, setArrayCount] = useState("3");
  const [spacing, setSpacing] = useState("100");

  const generateArray = () => {
    const parsedCount = Number(arrayCount);
    const parsedSpacing = Number(spacing);
    if (
      !Number.isFinite(parsedCount) ||
      !Number.isFinite(parsedSpacing) ||
      parsedCount < 2
    ) {
      return;
    }

    arrayCopySelected(direction, parsedCount, parsedSpacing);
    setIsArrayOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-blue-100 bg-blue-50 p-3">
        <p className="text-sm font-semibold text-blue-700">
          已选中 {count} 个图形
        </p>
        <p className="mt-1 text-xs text-blue-500">
          可整体移动、复制、阵列或组合。
        </p>
      </div>

      <button
        type="button"
        onClick={groupSelected}
        className="w-full rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
      >
        组合
      </button>

      <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
        <button
          type="button"
          onClick={() => setIsArrayOpen((current) => !current)}
          className="flex w-full items-center justify-between text-sm font-semibold text-slate-700"
        >
          <span>阵列复制</span>
          <span className="text-xs text-slate-400">
            {isArrayOpen ? "收起" : "展开"}
          </span>
        </button>

        {isArrayOpen && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "横向", value: "horizontal" },
                { label: "纵向", value: "vertical" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() =>
                    setDirection(option.value as "horizontal" | "vertical")
                  }
                  className={`rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                    direction === option.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>

            <PropertyInput
              label="数量（含原图形）"
              value={arrayCount}
              min={2}
              onChange={(event) => setArrayCount(event.target.value)}
            />
            <PropertyInput
              label="间距 mm"
              value={spacing}
              min={0}
              onChange={(event) => setSpacing(event.target.value)}
            />

            <button
              type="button"
              onClick={generateArray}
              className="w-full rounded-md border border-blue-500 bg-blue-50 px-2 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100"
            >
              生成阵列
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function GroupPropertyPanel({ group }: { group: GroupShape }) {
  const ungroupSelected = useEditorStore((state) => state.ungroupSelected);

  return (
    <div className="space-y-3">
      <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
        <div className="flex justify-between">
          <span>类型</span>
          <span className="font-medium text-slate-800">组合对象</span>
        </div>
        <div className="mt-2 flex justify-between">
          <span>包含</span>
          <span className="font-medium text-slate-800">
            {group.children.length} 个图形
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={ungroupSelected}
        className="w-full rounded-md border border-blue-500 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100"
      >
        取消组合
      </button>
    </div>
  );
}

function getCurvedShapeName(shape: CurvedShape): string {
  if (shape.kind === "circle") {
    return "圆形";
  }
  if (shape.kind === "ellipse") {
    return "椭圆";
  }
  if (shape.kind === "semicircle") {
    return "半圆";
  }
  return "圆弧";
}

function getSemicircleBaseLength(shape: CurvedShape): number {
  const direction = shape.direction ?? "up";
  return direction === "left" || direction === "right"
    ? shape.height
    : shape.width;
}

function getSemicircleHeight(shape: CurvedShape): number {
  const direction = shape.direction ?? "up";
  return direction === "left" || direction === "right"
    ? shape.width
    : shape.height;
}

function CurvedShapePropertyPanel({ shape }: { shape: CurvedShape }) {
  const updateCurvedShapeDirection = useEditorStore(
    (state) => state.updateCurvedShapeDirection
  );
  const updateCurvedShapeSize = useEditorStore(
    (state) => state.updateCurvedShapeSize
  );
  const [fields, setFields] = useState({
    radius: String(Math.round(shape.width / 2)),
    radiusX: String(Math.round(shape.width / 2)),
    radiusY: String(Math.round(shape.height / 2)),
    baseLength: String(
      Math.round(
        shape.kind === "semicircle" ? getSemicircleBaseLength(shape) : shape.width
      )
    ),
    height: String(
      Math.round(
        shape.kind === "semicircle" ? getSemicircleHeight(shape) : shape.height
      )
    ),
  });
  const directions: Array<{ label: string; value: SemicircleDirection }> = [
    { label: "上", value: "up" },
    { label: "下", value: "down" },
    { label: "左", value: "left" },
    { label: "右", value: "right" },
  ];

  useEffect(() => {
    setFields({
      radius: String(Math.round(shape.width / 2)),
      radiusX: String(Math.round(shape.width / 2)),
      radiusY: String(Math.round(shape.height / 2)),
      baseLength: String(
        Math.round(
          shape.kind === "semicircle"
            ? getSemicircleBaseLength(shape)
            : shape.width
        )
      ),
      height: String(
        Math.round(
          shape.kind === "semicircle" ? getSemicircleHeight(shape) : shape.height
        )
      ),
    });
  }, [
    shape.kind,
    shape.width,
    shape.height,
    shape.direction,
  ]);

  const applyField = (
    key: "radius" | "radiusX" | "radiusY" | "baseLength" | "height",
    rawValue: string
  ) => {
    const parsed = parseNumber(rawValue);
    if (parsed === null) {
      return;
    }

    updateCurvedShapeSize(shape.id, { [key]: Math.max(parsed, 1) });
  };

  const handleChange =
    (key: "radius" | "radiusX" | "radiusY" | "baseLength" | "height") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setFields((prev) => ({ ...prev, [key]: value }));
      applyField(key, value);
    };

  return (
    <div className="space-y-3">
      {shape.kind === "circle" && (
        <PropertyInput
          label="半径"
          value={fields.radius}
          min={1}
          onChange={handleChange("radius")}
        />
      )}

      {shape.kind === "ellipse" && (
        <>
          <PropertyInput
            label="横向半径"
            value={fields.radiusX}
            min={1}
            onChange={handleChange("radiusX")}
          />
          <PropertyInput
            label="纵向半径"
            value={fields.radiusY}
            min={1}
            onChange={handleChange("radiusY")}
          />
        </>
      )}

      {shape.kind === "semicircle" && (
        <>
          <PropertyInput
            label="底边长度"
            value={fields.baseLength}
            min={1}
            onChange={handleChange("baseLength")}
          />
          <PropertyInput
            label="高度"
            value={fields.height}
            min={1}
            onChange={handleChange("height")}
          />

          <p className="text-xs font-medium text-slate-500">方向</p>
          <div className="grid grid-cols-4 gap-2">
            {directions.map((direction) => (
              <button
                key={direction.value}
                type="button"
                onClick={() =>
                  updateCurvedShapeDirection(shape.id, direction.value)
                }
                className={`rounded-md border px-2 py-1.5 text-sm font-medium transition ${
                  (shape.direction ?? "up") === direction.value
                    ? "border-blue-500 bg-blue-50 text-blue-700"
                    : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {direction.label}
              </button>
            ))}
          </div>
        </>
      )}

      {(shape.kind === "arc" || shape.kind === "arch") && (
        <>
          <PropertyInput
            label="底边长度"
            value={fields.baseLength}
            min={1}
            onChange={handleChange("baseLength")}
          />
          <PropertyInput
            label="弧高"
            value={fields.height}
            min={1}
            onChange={handleChange("height")}
          />
        </>
      )}
    </div>
  );
}

export function PropertyPanel() {
  const selectedShape = useSelectedShape();
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const selectedLayerIndex = useEditorStore((state) => state.selectedLayerIndex);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);

  if (selectedIds.length > 1) {
    return (
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            属性
          </h2>
          <p className="mt-1 text-sm text-slate-600">多选</p>
        </div>

        <SelectionActionsPanel count={selectedIds.length} />

        <OrderControls />

        <button
          type="button"
          onClick={deleteSelected}
          className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
        >
          删除选中图形
        </button>
      </div>
    );
  }

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
              : selectedShape.type === "dimension"
                ? "尺寸标注"
              : selectedShape.type === "group"
                ? "组合对象"
              : selectedShape.type === "parallelogram"
                ? "平行四边形"
              : selectedShape.type === "curved"
                ? getCurvedShapeName(selectedShape)
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
      ) : selectedShape.type === "parallelogram" ? (
        <ParallelogramPropertyPanel parallelogram={selectedShape} />
      ) : selectedShape.type === "dimension" ? (
        <DimensionPropertyPanel dimension={selectedShape} />
      ) : selectedShape.type === "group" ? (
        <GroupPropertyPanel group={selectedShape} />
      ) : selectedShape.type === "curved" ? (
        <CurvedShapePropertyPanel shape={selectedShape} />
      ) : (
        <NestedRectPropertyPanel
          nested={selectedShape}
          selectedLayerIndex={selectedLayerIndex}
        />
      )}

      {selectedShape.type !== "line" &&
        selectedShape.type !== "dimension" &&
        selectedShape.type !== "group" && (
        <QuickDimensionButtons shape={selectedShape} />
      )}

      {selectedShape.type !== "dimension" && (
        <ArrayCopyPanel shape={selectedShape} />
      )}

      <OrderControls />

      <button
        type="button"
        onClick={deleteSelected}
        className="mt-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100"
      >
        删除当前图形
      </button>
    </div>
  );
}
