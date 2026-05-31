import { PropertyPanel } from "@/components/panel/PropertyPanel";
import { SvgCanvas } from "@/components/canvas/SvgCanvas";
import { Toolbar } from "@/components/toolbar/Toolbar";

export default function HomePage() {
  return (
    <div className="flex h-screen flex-col bg-slate-100">
      <header className="flex h-12 shrink-0 items-center border-b border-slate-200 bg-white px-4">
        <h1 className="text-sm font-semibold text-slate-800">
          Copper Door Designer
        </h1>
        <span className="ml-2 text-xs text-slate-500">铜门施工图 MVP</span>
      </header>

      <div className="flex min-h-0 flex-1">
        <aside className="w-48 shrink-0 border-r border-slate-200 bg-white p-4">
          <Toolbar />
        </aside>

        <main className="min-w-0 flex-1 p-4">
          <SvgCanvas />
        </main>

        <aside className="w-64 shrink-0 border-l border-slate-200 bg-white p-4">
          <PropertyPanel />
        </aside>
      </div>
    </div>
  );
}
