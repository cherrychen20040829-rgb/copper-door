"use client";

import { useMemo, useRef, useState, type Ref } from "react";
import type {
  BoundingBox,
  CurvedShape,
  DimensionShape,
  DimensionStylePreset,
  Parallelogram,
  Shape,
} from "@/types/shape";
import {
  computeNestedRectLayers,
  getShapeBoundingBox,
  getShapesBoundingBox,
} from "@/types/shape";

type PaperSize = "A4" | "A3";
type PageOrientation = "landscape" | "portrait";

const PAGE_SIZES: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 1123, height: 794 },
  A3: { width: 1587, height: 1123 },
};
const PAGE_POINTS: Record<PaperSize, { width: number; height: number }> = {
  A4: { width: 841.89, height: 595.28 },
  A3: { width: 1190.55, height: 841.89 },
};
const PAGE_MARGIN = 56;

interface ExportPreviewModalProps {
  projectName: string;
  shapes: Shape[];
  onClose: () => void;
}

function sanitizeFilename(name: string): string {
  return (name.trim() || "铜门图纸").replace(/[\\/:*?"<>|]/g, "_");
}

function getPage(size: PaperSize, orientation: PageOrientation) {
  const pixels = PAGE_SIZES[size];
  const points = PAGE_POINTS[size];
  if (orientation === "portrait") {
    return {
      width: pixels.height,
      height: pixels.width,
      pointWidth: points.height,
      pointHeight: points.width,
    };
  }

  return {
    width: pixels.width,
    height: pixels.height,
    pointWidth: points.width,
    pointHeight: points.height,
  };
}

function getSemicirclePath(shape: CurvedShape): string {
  const { x, y, width, height, direction = "up" } = shape;
  if (direction === "down") {
    return `M ${x} ${y} A ${width / 2} ${height} 0 0 0 ${x + width} ${y} Z`;
  }
  if (direction === "left") {
    return `M ${x + width} ${y} A ${width} ${height / 2} 0 0 0 ${x + width} ${y + height} Z`;
  }
  if (direction === "right") {
    return `M ${x} ${y} A ${width} ${height / 2} 0 0 1 ${x} ${y + height} Z`;
  }
  return `M ${x} ${y + height} A ${width / 2} ${height} 0 0 1 ${x + width} ${y + height} Z`;
}

function getArchPath(shape: CurvedShape): string {
  const isDown = shape.direction === "down";
  const baselineY = isDown ? shape.y : shape.y + shape.height;
  const curveY = isDown ? shape.y + shape.height : shape.y;
  const centerX = shape.x + shape.width / 2;
  return `M ${shape.x} ${baselineY} Q ${centerX} ${curveY} ${shape.x + shape.width} ${baselineY}`;
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

function getSplitDimensionLine(
  start: { x: number; y: number },
  end: { x: number; y: number },
  text: { x: number; y: number },
  gap: number
) {
  const length = Math.max(
    Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2),
    1
  );
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

function getDimensionStyle(style: DimensionStylePreset = "blue-assist") {
  if (style === "standard-arrow") {
    return { stroke: "#374151", extension: "#6b7280", dash: undefined, end: "arrow" as const };
  }
  if (style === "engineering-slash") {
    return { stroke: "#374151", extension: "#9ca3af", dash: undefined, end: "slash" as const };
  }
  if (style === "dot-end") {
    return { stroke: "#374151", extension: "#9ca3af", dash: undefined, end: "dot" as const };
  }
  if (style === "dashed") {
    return { stroke: "#475569", extension: "#94a3b8", dash: "6 4", end: "arrow" as const };
  }
  return { stroke: "#334e68", extension: "#93a4b8", dash: undefined, end: "arrow" as const };
}

function getDimensionBase(dimension: DimensionShape, allShapes: Shape[]) {
  if (!dimension.binding) {
    return {
      start: { x: dimension.x1, y: dimension.y1 },
      end: { x: dimension.x2, y: dimension.y2 },
      linePoint: { x: dimension.lineX, y: dimension.lineY },
      label: undefined as string | undefined,
    };
  }

  const target = allShapes.find((shape) => shape.id === dimension.binding?.shapeId);
  if (!target || target.type === "dimension") {
    return null;
  }

  const box = getShapeBoundingBox(target);
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  const offset = dimension.binding.offset;
  const horizontal = (y: number, startX = box.x, endX = box.x + box.width) => ({
    start: { x: startX, y },
    end: { x: endX, y },
    linePoint: { x: centerX, y: y + offset },
    label: undefined as string | undefined,
  });
  const vertical = (x: number, startY = box.y, endY = box.y + box.height) => ({
    start: { x, y: startY },
    end: { x, y: endY },
    linePoint: { x: x + offset, y: centerY },
    label: undefined as string | undefined,
  });

  if (target.type === "curved" && target.kind === "circle") {
    if (dimension.binding.kind === "circle-radius") {
      return { ...horizontal(centerY, centerX, box.x + box.width), label: `R${formatMm(box.width / 2).replace("mm", "")}` };
    }
    if (dimension.binding.kind === "circle-diameter") {
      return { ...horizontal(centerY, box.x, box.x + box.width), label: `Ø${formatMm(box.width).replace("mm", "")}` };
    }
  }

  if (target.type === "curved" && target.kind === "semicircle") {
    const direction = target.direction ?? "up";
    if (dimension.binding.kind === "semicircle-base") {
      if (direction === "left") return vertical(box.x + box.width, box.y, box.y + box.height);
      if (direction === "right") return vertical(box.x, box.y, box.y + box.height);
      if (direction === "down") return horizontal(box.y, box.x, box.x + box.width);
      return horizontal(box.y + box.height, box.x, box.x + box.width);
    }
    if (dimension.binding.kind === "semicircle-height") {
      if (direction === "left" || direction === "right") return horizontal(centerY, box.x, box.x + box.width);
      return vertical(centerX, box.y, box.y + box.height);
    }
  }

  if (target.type === "curved" && (target.kind === "arc" || target.kind === "arch")) {
    const baselineY = target.direction === "down" ? box.y : box.y + box.height;
    const curveY = target.direction === "down" ? box.y + box.height : box.y;
    if (dimension.binding.kind === "arc-base") return horizontal(baselineY, box.x, box.x + box.width);
    if (dimension.binding.kind === "arc-height") return vertical(centerX, baselineY, curveY);
  }

  if (target.type === "nestedRect") {
    const layers = computeNestedRectLayers(target);
    const inner = layers[layers.length - 1];
    if (dimension.binding.kind === "nested-inner-width" && inner) return horizontal(inner.y + inner.height, inner.x, inner.x + inner.width);
    if (dimension.binding.kind === "nested-inner-height" && inner) return vertical(inner.x + inner.width, inner.y, inner.y + inner.height);
  }

  if (dimension.binding.kind.endsWith("height")) {
    return vertical(box.x + box.width, box.y, box.y + box.height);
  }
  if (dimension.binding.kind === "ellipse-radius-y") {
    return vertical(centerX, box.y, centerY);
  }
  if (dimension.binding.kind === "parallelogram-skew" && target.type === "parallelogram") {
    return {
      ...horizontal(box.y, target.x + target.width / 2, target.x + target.width / 2 + target.skew),
      label: formatMm(Math.abs(target.skew)),
    };
  }

  if (dimension.binding.kind === "ellipse-radius-x") {
    return horizontal(centerY, centerX, box.x + box.width);
  }
  return horizontal(box.y + box.height, box.x, box.x + box.width);
}

function getDimensionRenderData(dimension: DimensionShape, allShapes: Shape[]) {
  const base = getDimensionBase(dimension, allShapes);
  if (!base) return null;
  const start = base.start;
  const end = base.end;
  const linePoint = base.linePoint;

  if (dimension.orientation === "vertical") {
    const text = { x: linePoint.x + dimension.textOffsetX, y: (start.y + end.y) / 2 + dimension.textOffsetY };
    return {
      start,
      end,
      lineStart: { x: linePoint.x, y: start.y },
      lineEnd: { x: linePoint.x, y: end.y },
      text,
      label: base.label ?? formatMm(Math.abs(end.y - start.y)),
    };
  }

  if (dimension.orientation === "aligned") {
    const length = Math.max(
      Math.sqrt((end.x - start.x) ** 2 + (end.y - start.y) ** 2),
      1
    );
    const ux = (end.x - start.x) / length;
    const uy = (end.y - start.y) / length;
    const nx = -uy;
    const ny = ux;
    const offset = (linePoint.x - start.x) * nx + (linePoint.y - start.y) * ny;
    const lineStart = {
      x: start.x + nx * offset,
      y: start.y + ny * offset,
    };
    const lineEnd = {
      x: end.x + nx * offset,
      y: end.y + ny * offset,
    };
    const text = {
      x: (lineStart.x + lineEnd.x) / 2 + dimension.textOffsetX,
      y: (lineStart.y + lineEnd.y) / 2 + dimension.textOffsetY,
    };

    return {
      start,
      end,
      lineStart,
      lineEnd,
      text,
      label: base.label ?? formatMm(length),
    };
  }

  const text = { x: (start.x + end.x) / 2 + dimension.textOffsetX, y: linePoint.y + dimension.textOffsetY };
  return {
    start,
    end,
    lineStart: { x: start.x, y: linePoint.y },
    lineEnd: { x: end.x, y: linePoint.y },
    text,
    label: base.label ?? formatMm(Math.abs(end.x - start.x)),
  };
}

function getDimensionBoundingBox(dimension: DimensionShape, allShapes: Shape[]) {
  const data = getDimensionRenderData(dimension, allShapes);
  if (!data) return getShapeBoundingBox(dimension);
  const fontSize = 14;
  const labelWidth = Math.max(data.label.length * fontSize * 0.62, 34);
  const minX = Math.min(data.start.x, data.end.x, data.lineStart.x, data.lineEnd.x, data.text.x - labelWidth / 2);
  const minY = Math.min(data.start.y, data.end.y, data.lineStart.y, data.lineEnd.y, data.text.y - fontSize * 1.5);
  const maxX = Math.max(data.start.x, data.end.x, data.lineStart.x, data.lineEnd.x, data.text.x + labelWidth / 2);
  const maxY = Math.max(data.start.y, data.end.y, data.lineStart.y, data.lineEnd.y, data.text.y + fontSize);
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
}

function getExportBoxForShape(shape: Shape, allShapes: Shape[]): BoundingBox {
  if (shape.type === "group") {
    return getExportBoundingBox(shape.children) ?? getShapeBoundingBox(shape);
  }

  if (shape.type === "dimension") {
    return getDimensionBoundingBox(shape, allShapes);
  }

  return getShapeBoundingBox(shape);
}

function getExportBoundingBox(shapes: Shape[]): BoundingBox | null {
  if (shapes.length === 0) return null;
  const boxes: BoundingBox[] = shapes.map((shape) =>
    getExportBoxForShape(shape, shapes)
  );
  return getShapesBoundingBox(
    boxes.map((box, index) => ({
      id: `box-${index}`,
      type: "rect" as const,
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
    }))
  );
}

function CleanShape({ shape, allShapes }: { shape: Shape; allShapes: Shape[] }) {
  const stroke = shape.strokeColor ?? "#111827";
  const strokeWidth = shape.strokeWidth ?? 2;

  if (shape.type === "group") {
    return (
      <g>
        {shape.children.map((child) => (
          <CleanShape key={child.id} shape={child} allShapes={shape.children} />
        ))}
      </g>
    );
  }

  if (shape.type === "rect") {
    return <rect x={shape.x} y={shape.y} width={shape.width} height={shape.height} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} />;
  }

  if (shape.type === "line") {
    return <line x1={shape.x1} y1={shape.y1} x2={shape.x2} y2={shape.y2} stroke={stroke} strokeWidth={shape.strokeWidth} strokeLinecap="round" />;
  }

  if (shape.type === "nestedRect") {
    const layers = computeNestedRectLayers(shape);
    return (
      <g>
        {layers.map((layer) => (
          <rect key={layer.layerIndex} x={layer.x} y={layer.y} width={layer.width} height={layer.height} fill="#fff" fillOpacity={0.01} stroke={stroke} strokeWidth={layer.strokeWidth} />
        ))}
      </g>
    );
  }

  if (shape.type === "parallelogram") {
    return <polygon points={getParallelogramPoints(shape)} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} />;
  }

  if (shape.type === "curved") {
    if (shape.kind === "circle" || shape.kind === "ellipse") {
      return <ellipse cx={shape.x + shape.width / 2} cy={shape.y + shape.height / 2} rx={shape.width / 2} ry={shape.height / 2} fill="#fff" stroke={stroke} strokeWidth={strokeWidth} />;
    }
    return <path d={shape.kind === "arc" || shape.kind === "arch" ? getArchPath(shape) : getSemicirclePath(shape)} fill={shape.kind === "arc" || shape.kind === "arch" ? "none" : "#fff"} stroke={stroke} strokeWidth={strokeWidth} />;
  }

  const data = getDimensionRenderData(shape, allShapes);
  if (!data) return null;
  const style = getDimensionStyle(shape.stylePreset);
  const fontSize = 14;
  const labelWidth = Math.max(data.label.length * fontSize * 0.62, 34);
  const arrowSize = 7;
  const tickSize = 8;
  const lineSegments = getSplitDimensionLine(
    data.lineStart,
    data.lineEnd,
    data.text,
    labelWidth + 12
  );
  const endMark = (x: number, y: number, sign: -1 | 1) =>
    style.end === "slash" ? (
      <line x1={x - tickSize / 2} y1={y + tickSize / 2} x2={x + tickSize / 2} y2={y - tickSize / 2} stroke={style.stroke} strokeWidth={1.3} />
    ) : style.end === "dot" ? (
      <circle cx={x} cy={y} r={3.2} fill={style.stroke} />
    ) : (
      <>
        <line x1={x} y1={y} x2={x + sign * arrowSize} y2={y - arrowSize * 0.55} stroke={style.stroke} strokeWidth={1.3} />
        <line x1={x} y1={y} x2={x + sign * arrowSize} y2={y + arrowSize * 0.55} stroke={style.stroke} strokeWidth={1.3} />
      </>
    );

  return (
    <g>
      <line x1={data.start.x} y1={data.start.y} x2={data.lineStart.x} y2={data.lineStart.y} stroke={style.extension} strokeWidth={1.2} opacity={0.72} />
      <line x1={data.end.x} y1={data.end.y} x2={data.lineEnd.x} y2={data.lineEnd.y} stroke={style.extension} strokeWidth={1.2} opacity={0.72} />
      {lineSegments.map((segment, index) => (
        <line key={`dimension-export-segment-${index}`} x1={segment.x1} y1={segment.y1} x2={segment.x2} y2={segment.y2} stroke={style.stroke} strokeWidth={1.35} strokeDasharray={style.dash} />
      ))}
      {endMark(data.lineStart.x, data.lineStart.y, 1)}
      {endMark(data.lineEnd.x, data.lineEnd.y, -1)}
      <text x={data.text.x} y={data.text.y - 6} textAnchor="middle" fontSize={fontSize} fill={style.stroke} paintOrder="stroke" stroke="#fff" strokeWidth={3}>{data.label}</text>
    </g>
  );
}

function CleanDrawingSvg({
  shapes,
  width,
  height,
  contentBox,
  svgRef,
}: {
  shapes: Shape[];
  width: number;
  height: number;
  contentBox: { x: number; y: number; width: number; height: number };
  svgRef?: Ref<SVGSVGElement>;
}) {
  const scale = Math.min(
    (width - PAGE_MARGIN * 2) / Math.max(contentBox.width, 1),
    (height - PAGE_MARGIN * 2) / Math.max(contentBox.height, 1)
  );
  const drawingWidth = contentBox.width * scale;
  const drawingHeight = contentBox.height * scale;
  const offsetX = (width - drawingWidth) / 2 - contentBox.x * scale;
  const offsetY = (height - drawingHeight) / 2 - contentBox.y * scale;
  const normalShapes = shapes.filter((shape) => shape.type !== "dimension");
  const dimensionShapes = shapes.filter((shape) => shape.type === "dimension");

  return (
    <svg ref={svgRef} xmlns="http://www.w3.org/2000/svg" width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="h-full w-full">
      <rect x={0} y={0} width={width} height={height} fill="#fff" />
      <g transform={`translate(${offsetX} ${offsetY}) scale(${scale})`}>
        {[...normalShapes, ...dimensionShapes].map((shape) => (
          <CleanShape key={shape.id} shape={shape} allShapes={shapes} />
        ))}
      </g>
    </svg>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

async function svgToCanvas(svg: SVGSVGElement, width: number, height: number, scale = 2) {
  const source = new XMLSerializer().serializeToString(svg);
  const blob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const image = new Image();
  image.decoding = "async";
  image.src = url;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * scale);
  canvas.height = Math.round(height * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  URL.revokeObjectURL(url);
  return canvas;
}

function buildPdfFromJpeg(
  dataUrl: string,
  width: number,
  height: number,
  imageWidth: number,
  imageHeight: number
) {
  const binary = atob(dataUrl.split(",")[1] ?? "");
  const imageBytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) imageBytes[i] = binary.charCodeAt(i);
  const encoder = new TextEncoder();
  const chunks: BlobPart[] = [];
  const offsets: number[] = [0];
  let length = 0;
  const addText = (text: string) => {
    const bytes = encoder.encode(text);
    chunks.push(text);
    length += bytes.length;
  };
  const addBytes = (bytes: Uint8Array) => {
    const copy = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(copy).set(bytes);
    chunks.push(copy);
    length += bytes.length;
  };
  const obj = (id: number, body: () => void) => {
    offsets[id] = length;
    addText(`${id} 0 obj\n`);
    body();
    addText("\nendobj\n");
  };

  addText("%PDF-1.4\n");
  obj(1, () => addText("<< /Type /Catalog /Pages 2 0 R >>"));
  obj(2, () => addText("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
  obj(3, () => addText(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`));
  obj(4, () => {
    addText(`<< /Type /XObject /Subtype /Image /Width ${imageWidth} /Height ${imageHeight} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.length} >>\nstream\n`);
    addBytes(imageBytes);
    addText("\nendstream");
  });
  const content = `q\n${width} 0 0 ${height} 0 0 cm\n/Im0 Do\nQ`;
  obj(5, () => addText(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  const xrefOffset = length;
  addText(`xref\n0 6\n0000000000 65535 f \n`);
  for (let i = 1; i <= 5; i += 1) addText(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  addText(`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);
  return new Blob(chunks, { type: "application/pdf" });
}

export function ExportPreviewModal({
  projectName,
  shapes,
  onClose,
}: ExportPreviewModalProps) {
  const [paperSize, setPaperSize] = useState<PaperSize>("A4");
  const [orientation, setOrientation] = useState<PageOrientation>("landscape");
  const svgRef = useRef<SVGSVGElement>(null);
  const contentBox = useMemo(() => getExportBoundingBox(shapes), [shapes]);
  const page = getPage(paperSize, orientation);
  const filename = sanitizeFilename(projectName);
  const isEmpty = !contentBox || shapes.length === 0;

  const exportPng = async () => {
    if (!svgRef.current || isEmpty) return;
    const canvas = await svgToCanvas(svgRef.current, page.width, page.height, 3);
    canvas.toBlob((blob) => {
      if (blob) downloadBlob(blob, `${filename}.png`);
    }, "image/png");
  };

  const exportPdf = async () => {
    if (!svgRef.current || isEmpty) return;
    const canvas = await svgToCanvas(svgRef.current, page.width, page.height, 2);
    const jpeg = canvas.toDataURL("image/jpeg", 0.95);
    const pdf = buildPdfFromJpeg(
      jpeg,
      page.pointWidth,
      page.pointHeight,
      canvas.width,
      canvas.height
    );
    downloadBlob(pdf, `${filename}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4">
      <div className="flex max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl">
        <div className="flex min-w-0 flex-1 items-center justify-center overflow-auto bg-slate-200 p-6">
          {isEmpty ? (
            <div className="rounded-md border border-dashed border-slate-300 bg-white px-8 py-16 text-sm text-slate-400">
              当前图纸为空，暂无可导出内容
            </div>
          ) : (
            <div className="bg-white shadow-xl" style={{ width: Math.min(page.width, 760), aspectRatio: `${page.width} / ${page.height}` }}>
              <CleanDrawingSvg
                svgRef={svgRef}
                shapes={shapes}
                width={page.width}
                height={page.height}
                contentBox={contentBox}
              />
            </div>
          )}
        </div>

        <aside className="w-64 shrink-0 border-l border-slate-200 bg-white p-4">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800">导出预览</h2>
            <button type="button" onClick={onClose} className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100">关闭</button>
          </div>

          <div className="space-y-4">
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">纸张大小</span>
              <select value={paperSize} onChange={(event) => setPaperSize(event.target.value as PaperSize)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700">
                <option value="A4">A4</option>
                <option value="A3">A3</option>
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-slate-500">页面方向</span>
              <select value={orientation} onChange={(event) => setOrientation(event.target.value as PageOrientation)} className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm text-slate-700">
                <option value="landscape">横向</option>
                <option value="portrait">纵向</option>
              </select>
            </label>
            <button type="button" disabled={isEmpty} onClick={exportPng} className="w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-300">
              导出图片 PNG
            </button>
            <button type="button" disabled={isEmpty} onClick={exportPdf} className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300">
              导出 PDF
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
