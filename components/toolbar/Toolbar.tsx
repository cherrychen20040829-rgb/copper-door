"use client";

import { useEffect, useRef, useState } from "react";
import { useEditorStore } from "@/store/useEditorStore";
import type {
  DimensionOrientation,
  DimensionStylePreset,
  ShapeDrawTool,
} from "@/types/shape";

const COLOR_OPTIONS = [
  { label: "黑色", value: "#111827" },
  { label: "红色", value: "#dc2626" },
  { label: "蓝色", value: "#2563eb" },
  { label: "绿色", value: "#16a34a" },
  { label: "铜色", value: "#b45309" },
  { label: "灰色", value: "#6b7280" },
];

const STROKE_WIDTH_OPTIONS = [
  { label: "细", value: 1 },
  { label: "中", value: 2 },
  { label: "粗", value: 5 },
  { label: "加粗", value: 10 },
];

const DIMENSION_STYLE_OPTIONS: Array<{
  label: string;
  value: DimensionStylePreset;
}> = [
  { label: "蓝色辅助", value: "blue-assist" },
  { label: "标准箭头", value: "standard-arrow" },
  { label: "工程斜线", value: "engineering-slash" },
  { label: "圆点端点", value: "dot-end" },
  { label: "虚线标注", value: "dashed" },
];

type MenuName = "curved" | "color" | "stroke" | null;

function ToolIconButton({
  title,
  active = false,
  disabled = false,
  onClick,
  children,
}: {
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={title}
      disabled={disabled}
      onClick={onClick}
      className={`group relative flex h-10 min-w-10 items-center justify-center rounded-md border transition ${
        disabled
          ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-300"
          : active
          ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
          : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
      }`}
    >
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
        {title}
      </span>
    </button>
  );
}

function IconSvg({ children }: { children: React.ReactNode }) {
  return (
    <svg
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export function Toolbar() {
  const menuRef = useRef<HTMLDivElement>(null);
  const [openMenu, setOpenMenu] = useState<MenuName>(null);
  const [customStrokeWidth, setCustomStrokeWidth] = useState("2");
  const addLine = useEditorStore((state) => state.addLine);
  const startDrawShape = useEditorStore((state) => state.startDrawShape);
  const pendingDrawTool = useEditorStore((state) => state.pendingDrawTool);
  const isDimensionMode = useEditorStore((state) => state.isDimensionMode);
  const showDimensions = useEditorStore((state) => state.showDimensions);
  const startDimensionTool = useEditorStore(
    (state) => state.startDimensionTool
  );
  const toggleShowDimensions = useEditorStore(
    (state) => state.toggleShowDimensions
  );
  const snapEnabled = useEditorStore((state) => state.snapEnabled);
  const toggleSnapEnabled = useEditorStore((state) => state.toggleSnapEnabled);
  const dimensionFixedLength = useEditorStore(
    (state) => state.dimensionFixedLength
  );
  const dimensionFixedOrientation = useEditorStore(
    (state) => state.dimensionFixedOrientation
  );
  const defaultDimensionStyle = useEditorStore(
    (state) => state.defaultDimensionStyle
  );
  const setDimensionFixedLength = useEditorStore(
    (state) => state.setDimensionFixedLength
  );
  const setDimensionFixedOrientation = useEditorStore(
    (state) => state.setDimensionFixedOrientation
  );
  const setDefaultDimensionStyle = useEditorStore(
    (state) => state.setDefaultDimensionStyle
  );
  const viewportZoom = useEditorStore((state) => state.viewportZoom);
  const isPanMode = useEditorStore((state) => state.isPanMode);
  const zoomViewportAtCenter = useEditorStore(
    (state) => state.zoomViewportAtCenter
  );
  const fitViewportToShapes = useEditorStore(
    (state) => state.fitViewportToShapes
  );
  const togglePanMode = useEditorStore((state) => state.togglePanMode);
  const setPanMode = useEditorStore((state) => state.setPanMode);
  const selectTool = useEditorStore((state) => state.selectTool);
  const brushColor = useEditorStore((state) => state.brushColor);
  const brushStrokeWidth = useEditorStore((state) => state.brushStrokeWidth);
  const setBrushColor = useEditorStore((state) => state.setBrushColor);
  const setBrushStrokeWidth = useEditorStore(
    (state) => state.setBrushStrokeWidth
  );
  const selectedId = useEditorStore((state) => state.selectedId);
  const selectedIds = useEditorStore((state) => state.selectedIds);
  const copiedShape = useEditorStore((state) => state.copiedShape);
  const copySelected = useEditorStore((state) => state.copySelected);
  const pasteCopied = useEditorStore((state) => state.pasteCopied);
  const undoStack = useEditorStore((state) => state.undoStack);
  const redoStack = useEditorStore((state) => state.redoStack);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  useEffect(() => {
    setCustomStrokeWidth(String(brushStrokeWidth));
  }, [brushStrokeWidth]);

  useEffect(() => {
    const handlePointerDown = (event: PointerEvent) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setOpenMenu(null);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const applyCustomStrokeWidth = (value: string) => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      return;
    }

    setBrushStrokeWidth(parsed);
  };

  const restoreCustomStrokeWidth = () => {
    const parsed = Number(customStrokeWidth);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setCustomStrokeWidth(String(brushStrokeWidth));
    }
  };

  const handleAddShape = (addShape: () => void) => {
    setPanMode(false);
    setOpenMenu(null);
    addShape();
  };

  const handleStartDraw = (tool: ShapeDrawTool) => {
    startDrawShape(tool);
    setOpenMenu(null);
  };

  const toggleMenu = (menuName: Exclude<MenuName, null>) => {
    setOpenMenu((current) => (current === menuName ? null : menuName));
  };

  return (
    <div
      ref={menuRef}
      className="relative flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white px-4"
    >
      <ToolIconButton
        title="选择"
        active={!isPanMode && !pendingDrawTool}
        onClick={() => {
          selectTool();
          setOpenMenu(null);
        }}
      >
        <IconSvg>
          <path d="M5 4 L18 12 L12 14 L9 20 Z" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton
        title="复制"
        disabled={selectedIds.length === 0 && !selectedId}
        onClick={() => {
          copySelected();
          setOpenMenu(null);
        }}
      >
        <IconSvg>
          <rect x="8" y="8" width="10" height="10" rx="1" />
          <path d="M6 15 H5 a1 1 0 0 1-1-1 V5 a1 1 0 0 1 1-1 h9 a1 1 0 0 1 1 1 v1" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton
        title="粘贴"
        disabled={!copiedShape}
        onClick={() => {
          pasteCopied();
          setOpenMenu(null);
        }}
      >
        <IconSvg>
          <path d="M9 4 H15" />
          <path d="M10 4 a2 2 0 0 0-2 2 h8 a2 2 0 0 0-2-2" />
          <rect x="6" y="7" width="12" height="13" rx="1" />
          <path d="M9 11 H15" />
          <path d="M9 15 H14" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton
        title="撤销"
        disabled={undoStack.length === 0}
        onClick={() => {
          undo();
          setOpenMenu(null);
        }}
      >
        <IconSvg>
          <path d="M9 7 L5 11 L9 15" />
          <path d="M5 11 H15 a5 5 0 0 1 0 10 H12" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton
        title="重做"
        disabled={redoStack.length === 0}
        onClick={() => {
          redo();
          setOpenMenu(null);
        }}
      >
        <IconSvg>
          <path d="M15 7 L19 11 L15 15" />
          <path d="M19 11 H9 a5 5 0 0 0 0 10 H12" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton title="移动画布" active={isPanMode} onClick={togglePanMode}>
        <IconSvg>
          <path d="M8 11 V7 a2 2 0 0 1 4 0 v4" />
          <path d="M12 11 V6 a2 2 0 0 1 4 0 v6" />
          <path d="M16 12 V9 a2 2 0 0 1 4 0 v5 a6 6 0 0 1-6 6 h-3 a5 5 0 0 1-4-2 l-3-4 a2 2 0 0 1 3-2 l1 1" />
        </IconSvg>
      </ToolIconButton>

      <div className="mx-1 h-8 w-px bg-slate-200" />

      <ToolIconButton
        title="矩形"
        active={pendingDrawTool === "rect"}
        onClick={() => handleStartDraw("rect")}
      >
        <IconSvg>
          <rect x="5" y="6" width="14" height="12" rx="1" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton title="直线" onClick={() => handleAddShape(addLine)}>
        <IconSvg>
          <path d="M5 18 L19 6" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton
        title="嵌套矩形"
        active={pendingDrawTool === "nestedRect"}
        onClick={() => handleStartDraw("nestedRect")}
      >
        <IconSvg>
          <rect x="4" y="5" width="16" height="14" rx="1" />
          <rect x="8" y="8" width="8" height="8" rx="1" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton
        title="平行四边形"
        active={pendingDrawTool === "parallelogram"}
        onClick={() => handleStartDraw("parallelogram")}
      >
        <IconSvg>
          <path d="M8 6 H19 L16 18 H5 Z" />
        </IconSvg>
      </ToolIconButton>

      <div
        className="relative"
        onMouseEnter={() => setOpenMenu("curved")}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <ToolIconButton
          title="圆形/弧形"
          active={
            pendingDrawTool === "circle" ||
            pendingDrawTool === "ellipse" ||
            pendingDrawTool === "semicircle" ||
            pendingDrawTool === "arc"
          }
          onClick={() => toggleMenu("curved")}
        >
          <IconSvg>
            <circle cx="9" cy="10" r="4" />
            <path d="M13 18 Q17 11 21 18" />
          </IconSvg>
        </ToolIconButton>

        {openMenu === "curved" && (
          <div className="absolute left-0 top-10 z-50 pt-2">
            <div className="grid w-28 grid-cols-2 gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
            {[
              { title: "圆", value: "circle", icon: <circle cx="12" cy="12" r="6" /> },
              {
                title: "椭圆",
                value: "ellipse",
                icon: <ellipse cx="12" cy="12" rx="7" ry="4.5" />,
              },
              { title: "半圆", value: "semicircle", icon: <path d="M5 16 A7 7 0 0 1 19 16 Z" /> },
              { title: "圆弧", value: "arc", icon: <path d="M5 17 Q12 6 19 17" /> },
            ].map((item) => (
              <button
                key={item.value}
                type="button"
                aria-label={item.title}
                onClick={() => {
                  handleStartDraw(item.value as ShapeDrawTool);
                }}
                className="group relative flex h-10 w-10 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
              >
                <IconSvg>{item.icon}</IconSvg>
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
                  {item.title}
                </span>
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      <ToolIconButton
        title="尺寸标注"
        active={isDimensionMode}
        onClick={() => {
          startDimensionTool();
          setOpenMenu(null);
        }}
      >
        <IconSvg>
          <path d="M5 17 H19" />
          <path d="M7 14 L4 17 L7 20" />
          <path d="M17 14 L20 17 L17 20" />
          <path d="M5 8 V20" />
          <path d="M19 8 V20" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton
        title="吸附开关"
        active={snapEnabled}
        onClick={toggleSnapEnabled}
      >
        <IconSvg>
          <path d="M7 5 V11 a5 5 0 0 0 10 0 V5" />
          <path d="M7 5 H11" />
          <path d="M13 5 H17" />
          <path d="M7 15 H4" />
          <path d="M17 15 H20" />
        </IconSvg>
      </ToolIconButton>

      <button
        type="button"
        onClick={toggleShowDimensions}
        className={`h-10 rounded-md border px-3 text-xs font-medium transition ${
          showDimensions
            ? "border-blue-500 bg-blue-50 text-blue-700"
            : "border-slate-300 bg-white text-slate-600 hover:bg-slate-50"
        }`}
      >
        {showDimensions ? "显示尺寸" : "隐藏尺寸"}
      </button>

      {isDimensionMode && (
        <div className="flex h-10 items-center gap-1 rounded-md border border-slate-300 bg-slate-50 px-2">
          <input
            type="number"
            min={1}
            placeholder="长度"
            value={dimensionFixedLength ?? ""}
            onChange={(event) => {
              const value = event.target.value;
              const parsed = Number(value);
              setDimensionFixedLength(
                value === "" || !Number.isFinite(parsed) ? null : parsed
              );
            }}
            className="h-7 w-20 rounded border border-slate-300 px-2 text-xs outline-none focus:border-blue-500"
          />
          <span className="text-xs text-slate-500">mm</span>
          <select
            value={dimensionFixedOrientation}
            onChange={(event) =>
              setDimensionFixedOrientation(
                event.target.value as DimensionOrientation
              )
            }
            className="h-7 rounded border border-slate-300 bg-white px-1 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            <option value="horizontal">水平</option>
            <option value="vertical">垂直</option>
            <option value="aligned">对齐</option>
          </select>
          <select
            value={defaultDimensionStyle}
            onChange={(event) =>
              setDefaultDimensionStyle(
                event.target.value as DimensionStylePreset
              )
            }
            className="h-7 rounded border border-slate-300 bg-white px-1 text-xs text-slate-700 outline-none focus:border-blue-500"
          >
            {DIMENSION_STYLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="mx-1 h-8 w-px bg-slate-200" />

      <div
        className="relative"
        onMouseEnter={() => setOpenMenu("color")}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <ToolIconButton
          title="颜色"
          onClick={() => toggleMenu("color")}
        >
          <span
            className="h-6 w-6 rounded-md border border-slate-300"
            style={{ backgroundColor: brushColor }}
          />
        </ToolIconButton>

        {openMenu === "color" && (
          <div className="absolute left-0 top-10 z-50 pt-2">
            <div className="grid w-32 grid-cols-3 gap-2 rounded-md border border-slate-200 bg-white p-2 shadow-xl">
            {COLOR_OPTIONS.map((color) => (
              <button
                key={color.value}
                type="button"
                aria-label={color.label}
                onClick={() => {
                  setBrushColor(color.value);
                  setOpenMenu(null);
                }}
                className={`group relative h-8 w-8 rounded-md border transition ${
                  brushColor === color.value
                    ? "border-blue-500 ring-2 ring-blue-200"
                    : "border-slate-300 hover:border-slate-400"
                }`}
                style={{ backgroundColor: color.value }}
              >
                <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
                  {color.label}
                </span>
              </button>
            ))}
            </div>
          </div>
        )}
      </div>

      <div
        className="relative"
        onMouseEnter={() => setOpenMenu("stroke")}
        onMouseLeave={() => setOpenMenu(null)}
      >
        <button
          type="button"
          aria-label="粗细"
          onClick={() => toggleMenu("stroke")}
          className="group relative flex h-10 min-w-[64px] items-center justify-center rounded-md border border-slate-300 bg-white px-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          {brushStrokeWidth}mm
          <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
            粗细
          </span>
        </button>

        {openMenu === "stroke" && (
          <div className="absolute left-0 top-10 z-50 pt-2">
            <div className="w-56 rounded-md border border-slate-200 bg-white p-3 shadow-xl">
            <div className="grid grid-cols-2 gap-2">
              {STROKE_WIDTH_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={option.label}
                  onClick={() => {
                    setBrushStrokeWidth(option.value);
                    setOpenMenu(null);
                  }}
                  className={`group relative rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                    brushStrokeWidth === option.value
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span className="mb-1 block">{option.label}</span>
                  <span className="block h-3">
                    <span
                      className="mx-auto block rounded-full bg-current"
                      style={{
                        height: `${Math.min(option.value, 8)}px`,
                        width: "34px",
                      }}
                    />
                  </span>
                  <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
                    {option.label}
                  </span>
                </button>
              ))}
            </div>
            <label className="group relative mt-3 flex items-center gap-2 text-xs text-slate-500">
              <input
                type="number"
                min={1}
                value={customStrokeWidth}
                onChange={(event) => {
                  const value = event.target.value;
                  setCustomStrokeWidth(value);
                  applyCustomStrokeWidth(value);
                }}
                onBlur={restoreCustomStrokeWidth}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1.5 text-sm text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <span>mm</span>
              <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
                自定义粗细
              </span>
            </label>
            </div>
          </div>
        )}
      </div>

      <div className="mx-1 h-8 w-px bg-slate-200" />

      <ToolIconButton title="放大" onClick={() => zoomViewportAtCenter(1.2)}>
        <IconSvg>
          <circle cx="11" cy="11" r="6" />
          <path d="M21 21 L16 16" />
          <path d="M11 8 V14" />
          <path d="M8 11 H14" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton title="缩小" onClick={() => zoomViewportAtCenter(1 / 1.2)}>
        <IconSvg>
          <circle cx="11" cy="11" r="6" />
          <path d="M21 21 L16 16" />
          <path d="M8 11 H14" />
        </IconSvg>
      </ToolIconButton>

      <ToolIconButton title="适合屏幕" onClick={fitViewportToShapes}>
        <IconSvg>
          <path d="M5 9 V5 H9" />
          <path d="M19 9 V5 H15" />
          <path d="M5 15 V19 H9" />
          <path d="M19 15 V19 H15" />
          <rect x="8" y="8" width="8" height="8" rx="1" />
        </IconSvg>
      </ToolIconButton>

      <span className="ml-1 min-w-12 text-center text-xs font-semibold text-slate-500">
        {Math.round(viewportZoom * 100)}%
      </span>
    </div>
  );
}
