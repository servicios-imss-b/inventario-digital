import React from 'react';
import {
  ArrowRight,
  FolderOpen,
  FolderPlus,
  History,
  LayoutGrid,
  Search,
} from 'lucide-react';
import type { Cabinet, FolderRecord, MovementRecord, Section } from '../types';

export type AppView = 'dashboard' | 'inventory' | 'reports' | 'search' | 'history';

interface DashboardViewProps {
  cabinets: Cabinet[];
  sections: Section[];
  folders: FolderRecord[];
  movements: MovementRecord[];
  onNavigate: (view: AppView) => void;
  onOpenNewFolder: () => void;
  onSelectFolder: (folder: FolderRecord) => void;
  onLocateFolder: (folder: FolderRecord) => void;
}

export function DashboardView({
  cabinets,
  sections,
  folders,
  movements,
  onNavigate,
  onOpenNewFolder,
  onSelectFolder,
  onLocateFolder,
}: DashboardViewProps) {
  const totalFolders = folders.length;
  const totalSections = sections.length;
  const unassignedCount = folders.filter((f) => !f.section_id).length;
  const locatedCount = totalFolders - unassignedCount;

  const latestFolders = folders.slice(0, 6);
  const latestMovements = movements.slice(0, 6);

  const sectionCounts = sections.map((sec) => {
    const cab = cabinets.find((c) => c.id === sec.cabinet_id);
    const count = folders.filter((f) => f.section_id === sec.id).length;
    return { section: sec, cabinet: cab, count };
  });

  const maxSectionCount = Math.max(1, ...sectionCounts.map((s) => s.count));

  return (
    <div className="space-y-6">
      {/* Header + Quick Actions */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Panel de Control del Archivo
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Resumen operativo del inventario físico, distribución en mobiliario y movimientos recientes.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenNewFolder}
            className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900 whitespace-nowrap shrink-0"
          >
            <FolderPlus className="h-4 w-4" />
            Registrar carpeta
          </button>
          <button
            type="button"
            onClick={() => onNavigate('search')}
            className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Search className="h-4 w-4" />
            Buscar y localizar
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Total de carpetas registradas</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900">{totalFolders}</p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">{locatedCount} ubicadas en mueble</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Secciones disponibles</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900">{totalSections}</p>
          <p className="mt-1 text-xs text-slate-500 tabular-nums">{cabinets.length} mueble(s) configurado(s)</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Carpetas sin ubicación asignada</p>
          <p
            className={`mt-2 font-mono text-3xl font-semibold tabular-nums ${
              unassignedCount > 0 ? 'text-amber-700' : 'text-slate-900'
            }`}
          >
            {unassignedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Pendientes de asignar a sección</p>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <p className="text-xs font-medium text-slate-500">Movimientos registrados</p>
          <p className="mt-2 font-mono text-3xl font-semibold tabular-nums text-slate-900">{movements.length}</p>
          <p className="mt-1 text-xs text-slate-500">Historial de ubicaciones</p>
        </div>
      </div>

      {/* Direct Shortcuts */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <button
          type="button"
          onClick={() => onNavigate('inventory')}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-700 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <FolderOpen className="h-4 w-4 text-blue-800 shrink-0" />
            <span className="text-sm font-medium text-slate-800">Inventario</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('search')}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-700 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <LayoutGrid className="h-4 w-4 text-blue-800 shrink-0" />
            <span className="text-sm font-medium text-slate-800">Mobiliario y localización</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={onOpenNewFolder}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-700 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <FolderPlus className="h-4 w-4 text-blue-800 shrink-0" />
            <span className="text-sm font-medium text-slate-800">Registrar carpeta</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>

        <button
          type="button"
          onClick={() => onNavigate('history')}
          className="flex items-center justify-between rounded-lg border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-blue-700 hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <History className="h-4 w-4 text-blue-800 shrink-0" />
            <span className="text-sm font-medium text-slate-800">Historial</span>
          </div>
          <ArrowRight className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Middle Row: Carpetas por sección + Últimas carpetas registradas */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Carpetas por sección */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Carpetas por sección</h2>
            <button
              type="button"
              onClick={() => onNavigate('search')}
              className="text-xs font-medium text-blue-800 hover:underline"
            >
              Abrir mobiliario y localización
            </button>
          </div>

          <div className="space-y-3.5">
            {sectionCounts.map(({ section, cabinet, count }) => {
              const widthPct = totalFolders === 0 ? 0 : Math.round((count / maxSectionCount) * 100);
              return (
                <div key={section.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-800">
                      <span className="font-mono text-slate-500">
                        {cabinet?.code} · {section.code}
                      </span>{' '}
                      · {section.name}
                    </span>
                    <span className="font-mono font-semibold tabular-nums text-slate-900">{count}</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-800 transition-all"
                      style={{ width: `${widthPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Últimas carpetas registradas */}
        <div className="rounded-lg border border-slate-200 bg-white p-5 lg:col-span-7">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">Últimas carpetas registradas</h2>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="text-xs font-medium text-blue-800 hover:underline"
            >
              Ver inventario completo
            </button>
          </div>

          {latestFolders.length === 0 ? (
            <div className="rounded-md border border-dashed border-slate-200 p-8 text-center">
              <p className="text-sm font-medium text-slate-700">Aún no hay carpetas registradas</p>
              <p className="mt-1 text-xs text-slate-500">
                Registre la primera carpeta física manualmente o importe su archivo Excel.
              </p>
              <button
                type="button"
                onClick={onOpenNewFolder}
                className="mt-4 inline-flex items-center gap-2 rounded-md bg-blue-800 px-4 py-2 text-xs font-medium text-white hover:bg-blue-900"
              >
                <FolderPlus className="h-3.5 w-3.5" />
                Registrar primera carpeta
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {latestFolders.map((folder) => (
                <div key={folder.id} className="flex items-center justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <button
                      type="button"
                      onClick={() => onSelectFolder(folder)}
                      className="truncate text-left text-sm font-medium text-slate-900 hover:text-blue-800"
                    >
                      {folder.expediente_name}
                    </button>
                    <p className="mt-0.5 truncate text-xs text-slate-500">
                      <span className="font-mono">{folder.uid}</span>
                      {folder.administrative_unit_name ? ` · ${folder.administrative_unit_name}` : ''}
                      {folder.documentary_year ? ` · ${folder.documentary_year}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {folder.section_id ? (
                      <button
                        type="button"
                        onClick={() => onLocateFolder(folder)}
                        className="font-mono text-xs font-medium text-blue-800 hover:underline tabular-nums"
                      >
                        {folder.cabinet_code} · {folder.section_code} · P{folder.position_index}
                      </button>
                    ) : (
                      <span className="text-xs text-amber-700">Sin ubicación</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Últimos movimientos realizados */}
      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-900">Últimos movimientos realizados</h2>
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="text-xs font-medium text-blue-800 hover:underline"
          >
            Ver historial completo
          </button>
        </div>

        {latestMovements.length === 0 ? (
          <p className="text-sm text-slate-500">
            No se han registrado movimientos de ubicación todavía.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 text-slate-500">
                <tr>
                  <th className="pb-2 font-medium">Fecha</th>
                  <th className="pb-2 font-medium">Carpeta</th>
                  <th className="pb-2 font-medium">Tipo</th>
                  <th className="pb-2 font-medium">Ubicación anterior</th>
                  <th className="pb-2 font-medium">Nueva ubicación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {latestMovements.map((mov) => (
                  <tr key={mov.id}>
                    <td className="py-2.5 pr-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                      {new Date(mov.moved_at).toLocaleString('es-MX', {
                        dateStyle: 'short',
                        timeStyle: 'short',
                      })}
                    </td>
                    <td className="py-2.5 pr-4 font-medium text-slate-900">
                      <span className="font-mono text-slate-500">{mov.folder_uid}</span> · {mov.expediente_name}
                    </td>
                    <td className="py-2.5 pr-4 text-slate-700">{mov.action_type}</td>
                    <td className="py-2.5 pr-4 text-slate-500">
                      {mov.previous_section_name
                        ? `${mov.previous_cabinet_name} · ${mov.previous_section_name} (Pos. ${mov.previous_position})`
                        : 'Sin ubicación'}
                    </td>
                    <td className="py-2.5 text-slate-900 font-medium">
                      {mov.new_section_name
                        ? `${mov.new_cabinet_name} · ${mov.new_section_name} (Pos. ${mov.new_position})`
                        : 'Sin ubicación'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
