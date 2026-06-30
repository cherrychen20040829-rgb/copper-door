"use client";

import { useEffect, useState } from "react";
import { PropertyPanel } from "@/components/panel/PropertyPanel";
import { SvgCanvas } from "@/components/canvas/SvgCanvas";
import { ExportPreviewModal } from "@/components/export/ExportPreviewModal";
import { Toolbar } from "@/components/toolbar/Toolbar";
import { useEditorStore } from "@/store/useEditorStore";

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function TabBar() {
  const [closingProjectId, setClosingProjectId] = useState<string | null>(null);
  const projects = useEditorStore((state) => state.projects);
  const activeTabId = useEditorStore((state) => state.activeTabId);
  const openProjectIds = useEditorStore((state) => state.openProjectIds);
  const dirtyProjectIds = useEditorStore((state) => state.dirtyProjectIds);
  const createProject = useEditorStore((state) => state.createProject);
  const switchToDirectory = useEditorStore((state) => state.switchToDirectory);
  const switchToProjectTab = useEditorStore((state) => state.switchToProjectTab);
  const closeProjectTab = useEditorStore((state) => state.closeProjectTab);

  const closingProject = projects.find(
    (project) => project.id === closingProjectId
  );

  const handleClose = (projectId: string) => {
    if (dirtyProjectIds.includes(projectId)) {
      setClosingProjectId(projectId);
      return;
    }

    closeProjectTab(projectId);
  };

  return (
    <>
      <div className="flex h-9 shrink-0 items-end gap-1 overflow-x-auto border-b border-slate-300 bg-slate-200 px-2 pt-1">
        <button
          type="button"
          onClick={switchToDirectory}
          className={`flex h-8 shrink-0 items-center rounded-t-md border px-3 text-xs font-medium transition ${
            activeTabId === "directory"
              ? "border-slate-300 border-b-white bg-white text-slate-800"
              : "border-transparent bg-slate-100 text-slate-600 hover:bg-white"
          }`}
        >
          项目目录
        </button>

        {openProjectIds.map((projectId) => {
          const project = projects.find((item) => item.id === projectId);
          if (!project) {
            return null;
          }

          const isDirty = dirtyProjectIds.includes(projectId);
          const isActive = activeTabId === projectId;

          return (
            <div
              key={projectId}
              className={`group flex h-8 max-w-48 shrink-0 items-center rounded-t-md border text-xs font-medium transition ${
                isActive
                  ? "border-slate-300 border-b-white bg-white text-slate-800"
                  : "border-transparent bg-slate-100 text-slate-600 hover:bg-white"
              }`}
            >
              <button
                type="button"
                onClick={() => switchToProjectTab(projectId)}
                className="flex min-w-0 items-center gap-2 px-3 py-1.5"
              >
                <span className="truncate">{project.name}</span>
                {isDirty && <span className="text-blue-600">•</span>}
              </button>
              <button
                type="button"
                title="关闭"
                onClick={(event) => {
                  event.stopPropagation();
                  handleClose(projectId);
                }}
                className="mr-1 rounded px-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700"
              >
                ×
              </button>
            </div>
          );
        })}

        <button
          type="button"
          title="新建项目"
          aria-label="新建项目"
          onClick={createProject}
          className="mb-1 flex h-7 w-8 shrink-0 items-center justify-center rounded-md border border-slate-300 bg-white text-lg leading-none text-slate-700 transition hover:bg-slate-50"
        >
          +
        </button>
      </div>

      {closingProjectId && closingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/30">
          <div className="w-80 rounded-md border border-slate-200 bg-white p-4 shadow-xl">
            <h2 className="text-sm font-semibold text-slate-800">关闭标签</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              {closingProject.name} 还有未保存修改。
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  closeProjectTab(closingProjectId, "save");
                  setClosingProjectId(null);
                }}
                className="rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
              >
                保存并关闭
              </button>
              <button
                type="button"
                onClick={() => {
                  closeProjectTab(closingProjectId, "discard");
                  setClosingProjectId(null);
                }}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                不保存关闭
              </button>
              <button
                type="button"
                onClick={() => setClosingProjectId(null)}
                className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ProjectListPage() {
  const projects = useEditorStore((state) => state.projects);
  const createProject = useEditorStore((state) => state.createProject);
  const openProject = useEditorStore((state) => state.openProject);
  const renameProject = useEditorStore((state) => state.renameProject);
  const deleteProject = useEditorStore((state) => state.deleteProject);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
      <header className="flex h-12 shrink-0 items-center border-b border-slate-200 bg-white px-4">
        <h1 className="text-sm font-semibold text-slate-800">
          Copper Door Designer
        </h1>
        <span className="ml-2 text-xs text-slate-500">项目管理</span>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">图纸项目</h2>
            <p className="mt-1 text-sm text-slate-500">
              管理本机保存的铜门施工图项目
            </p>
          </div>

          <button
            type="button"
            onClick={createProject}
            className="rounded-md bg-slate-800 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-700"
          >
            + 新建项目
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="flex h-64 items-center justify-center rounded-md border border-dashed border-slate-300 bg-white">
            <p className="text-sm text-slate-400">暂无项目</p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-md border border-slate-200 bg-white">
            <div className="grid grid-cols-[1fr_180px_180px_160px] border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <span>项目名称</span>
              <span>创建时间</span>
              <span>最后修改</span>
              <span className="text-right">操作</span>
            </div>

            {projects.map((project) => (
              <div
                key={project.id}
                className="grid grid-cols-[1fr_180px_180px_160px] items-center border-b border-slate-100 px-4 py-3 last:border-b-0"
              >
                <input
                  type="text"
                  value={project.name}
                  onChange={(event) =>
                    renameProject(project.id, event.target.value)
                  }
                  className="mr-4 rounded-md border border-transparent px-2 py-1 text-sm font-medium text-slate-800 outline-none transition hover:border-slate-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500">
                  {formatDateTime(project.createdAt)}
                </span>
                <span className="text-xs text-slate-500">
                  {formatDateTime(project.updatedAt)}
                </span>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => openProject(project.id)}
                    className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    打开
                  </button>
                  <button
                    type="button"
                    onClick={() => deleteProject(project.id)}
                    className="rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-100"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function EditorPage() {
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const projects = useEditorStore((state) => state.projects);
  const currentProjectId = useEditorStore((state) => state.currentProjectId);
  const shapes = useEditorStore((state) => state.shapes);
  const switchToDirectory = useEditorStore((state) => state.switchToDirectory);
  const saveProject = useEditorStore((state) => state.saveProject);
  const clearCanvas = useEditorStore((state) => state.clearCanvas);
  const dirtyProjectIds = useEditorStore((state) => state.dirtyProjectIds);
  const currentProject = projects.find(
    (project) => project.id === currentProjectId
  );
  const isDirty =
    currentProjectId !== null && dirtyProjectIds.includes(currentProjectId);

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-slate-100">
      <header className="shrink-0 bg-white">
        <div className="flex h-12 items-center gap-3 border-b border-slate-200 px-4">
          <button
            type="button"
            onClick={switchToDirectory}
            className="group relative rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            项目目录
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
              返回项目列表
            </span>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-sm font-semibold text-slate-800">
              {currentProject?.name ?? "未命名项目"}
              {isDirty ? " •" : ""}
            </h1>
            <p className="text-xs text-slate-500">铜门施工图 MVP</p>
          </div>
          <button
            type="button"
            onClick={saveProject}
            className="group relative rounded-md bg-slate-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-700"
          >
            保存项目
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
              保存项目
            </span>
          </button>
          <button
            type="button"
            onClick={() => setIsExportOpen(true)}
            className="group relative rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
          >
            导出
            <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded bg-slate-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow transition delay-300 group-hover:opacity-100">
              导出
            </span>
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMoreMenu((value) => !value)}
              className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-50"
              title="更多"
              aria-label="更多"
            >
              ...
            </button>
            {showMoreMenu && (
              <div className="absolute right-0 top-10 z-30 w-36 rounded-md border border-slate-200 bg-white p-2 shadow-lg">
                <button
                  type="button"
                  onClick={() => {
                    clearCanvas();
                    setShowMoreMenu(false);
                  }}
                  className="w-full rounded-md border border-red-200 bg-red-50 px-3 py-2 text-left text-xs font-medium text-red-600 transition hover:bg-red-100"
                >
                  清空画布
                </button>
              </div>
            )}
          </div>
        </div>
        <Toolbar />
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 p-4">
          <SvgCanvas />
        </main>

        <aside className="w-64 shrink-0 border-l border-slate-200 bg-white p-4">
          <PropertyPanel />
        </aside>
      </div>

      {isExportOpen && (
        <ExportPreviewModal
          projectName={currentProject?.name ?? "铜门图纸"}
          shapes={shapes}
          onClose={() => setIsExportOpen(false)}
        />
      )}
    </div>
  );
}

export default function HomePage() {
  const activeTabId = useEditorStore((state) => state.activeTabId);
  const loadProjects = useEditorStore((state) => state.loadProjects);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <TabBar />
      {activeTabId === "directory" ? <ProjectListPage /> : <EditorPage />}
    </div>
  );
}
