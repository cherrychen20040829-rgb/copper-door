"use client";

import { useEditorStore } from "@/store/useEditorStore";

export function Toolbar() {
  const addRect = useEditorStore((state) => state.addRect);
  const addLine = useEditorStore((state) => state.addLine);
  const addNestedRect = useEditorStore((state) => state.addNestedRect);
  const deleteSelected = useEditorStore((state) => state.deleteSelected);
  const selectedId = useEditorStore((state) => state.selectedId);

  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        工具
      </h2>

      <button
        type="button"
        onClick={addRect}
        className="rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
      >
        添加矩形
      </button>

      <button
        type="button"
        onClick={addLine}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        添加直线
      </button>

      <button
        type="button"
        onClick={addNestedRect}
        className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
      >
        嵌套矩形
      </button>

      <button
        type="button"
        onClick={deleteSelected}
        disabled={!selectedId}
        className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
      >
        删除选中
      </button>

      <p className="mt-2 text-xs leading-relaxed text-slate-400">
        点击画布空白处取消选中。按 Delete 或 Backspace 删除选中元素。
      </p>
    </div>
  );
}
