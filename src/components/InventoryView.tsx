import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Crosshair,
  Download,
  Edit3,
  Eye,
  FolderPlus,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import type {
  AdministrativeUnit,
  FolderRecord,
  ProducingArea,
  Section,
} from '../types';
import { exportInventoryToExcel } from '../utils/excel';

interface InventoryViewProps {
  folders: FolderRecord[];
  sections: Section[];
  units: AdministrativeUnit[];
  areas: ProducingArea[];
  onOpenNew: () => void;
  onOpenImport: () => void;
  onSelectFolder: (folder: FolderRecord) => void;
  onEditFolder: (folder: FolderRecord) => void;
  onMoveFolder: (folder: FolderRecord) => void;
  onDeleteFolder: (folder: FolderRecord) => void;
  onLocateFolder: (folder: FolderRecord) => void;
}

export function InventoryView({
  folders,
  sections,
  units,
  areas,
  onOpenNew,
  onOpenImport,
  onSelectFolder,
  onEditFolder,
  onMoveFolder,
  onDeleteFolder,
  onLocateFolder,
}: InventoryViewProps) {
  const [query, setQuery] = useState('');
  const [unitFilter, setUnitFilter] = useState('');
  const [areaFilter, setAreaFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');

  const availableYears = useMemo(() => {
    const set = new Set<string>();
    for (const f of folders) {
      if (f.documentary_year) set.add(f.documentary_year);
    }
    return Array.from(set).sort().reverse();
  }, [folders]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return folders.filter((f) => {
      if (unitFilter && f.administrative_unit_name !== unitFilter) return false;
      if (areaFilter && f.producing_area_name !== areaFilter) return false;
      if (yearFilter && f.documentary_year !== yearFilter) return false;
      if (sectionFilter === 'unassigned' && f.section_id !== null) return false;
      if (sectionFilter && sectionFilter !== 'unassigned' && String(f.section_id) !== sectionFilter) return false;

      if (!q) return true;
      const haystack = [
        f.uid,
        f.consecutive_number,
        f.administrative_unit_name,
        f.producing_area_name,
        f.expediente_name,
        f.expediente_number,
        f.documentary_year,
        f.folder_number,
        f.observations,
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [folders, query, unitFilter, areaFilter, yearFilter, sectionFilter]);

  function clearFilters() {
    setQuery('');
    setUnitFilter('');
    setAreaFilter('');
    setYearFilter('');
    setSectionFilter('');
  }

  const hasFilters = Boolean(query || unitFilter || areaFilter || yearFilter || sectionFilter);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Inventario Digital de Carpetas
          </h1>
          <p className="mt-1 text-sm text-slate-500 tabular-nums">
            Total registrado: <strong className="font-semibold text-slate-900">{folders.length}</strong> carpeta(s)
            {hasFilters && ` · Mostrando ${filtered.length} coincidencia(s)`}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Upload className="h-3.5 w-3.5" />
            Importar Excel
          </button>
          <button
            type="button"
            disabled={filtered.length === 0}
            onClick={() => exportInventoryToExcel(filtered)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Exportar Excel
          </button>
          <button
            type="button"
            onClick={onOpenNew}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-4 py-2 text-xs font-medium text-white hover:bg-blue-900 whitespace-nowrap shrink-0"
          >
            <FolderPlus className="h-4 w-4" />
            Registrar carpeta
          </button>
        </div>
      </div>

      {/* Search & Filters Bar */}
      <div className="border-b border-slate-200 pb-3 space-y-3">
        <div className="grid grid-cols-1 items-center gap-x-4 gap-y-3 md:grid-cols-12">
          <div className="relative md:col-span-4">
            <Search className="pointer-events-none absolute left-1 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filtrar por expediente, número, consecutivo..."
              className="w-full border-0 border-b border-slate-300 bg-transparent py-2 pl-7 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
          </div>

          <select
            value={unitFilter}
            onChange={(e) => setUnitFilter(e.target.value)}
            className="border-0 border-b border-slate-300 bg-transparent px-1 py-2 text-xs text-slate-700 focus:border-blue-700 focus:outline-none md:col-span-3"
          >
            <option value="">Todas las unidades administrativas</option>
            {units.map((u) => (
              <option key={u.id} value={u.name}>
                {u.name}
              </option>
            ))}
          </select>

          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            className="border-0 border-b border-slate-300 bg-transparent px-1 py-2 text-xs text-slate-700 focus:border-blue-700 focus:outline-none md:col-span-2"
          >
            <option value="">Todas las áreas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.name}>
                {a.name}
              </option>
            ))}
          </select>

          <select
            value={yearFilter}
            onChange={(e) => setYearFilter(e.target.value)}
            className="border-0 border-b border-slate-300 bg-transparent px-1 py-2 text-xs text-slate-700 focus:border-blue-700 focus:outline-none md:col-span-1"
          >
            <option value="">Año</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>

          <select
            value={sectionFilter}
            onChange={(e) => setSectionFilter(e.target.value)}
            className="border-0 border-b border-slate-300 bg-transparent px-1 py-2 text-xs text-slate-700 focus:border-blue-700 focus:outline-none md:col-span-2"
          >
            <option value="">Todas las ubicaciones</option>
            <option value="unassigned">Sin ubicación asignada</option>
            {sections.map((s) => (
              <option key={s.id} value={String(s.id)}>
                {s.code} · {s.name}
              </option>
            ))}
          </select>
        </div>

        {hasFilters && (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={clearFilters}
              className="text-xs font-medium text-blue-800 hover:underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
        {folders.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-base font-semibold text-slate-900">El inventario está vacío</p>
            <p className="mt-1 text-sm text-slate-500">
              Comience registrando manualmente una carpeta física o importando su catálogo desde Excel.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={onOpenNew}
                className="inline-flex items-center gap-2 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-blue-900"
              >
                <FolderPlus className="h-4 w-4" />
                Registrar primera carpeta
              </button>
              <button
                type="button"
                onClick={onOpenImport}
                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Upload className="h-4 w-4" />
                Importar Excel
              </button>
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-medium text-slate-700">Ninguna carpeta coincide con los filtros actuales.</p>
            <button
              type="button"
              onClick={clearFilters}
              className="mt-2 text-xs font-medium text-blue-800 hover:underline"
            >
              Mostrar todas las carpetas
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">ID / Consecutivo</th>
                  <th className="px-4 py-3 font-semibold">Expediente</th>
                  <th className="px-4 py-3 font-semibold">Unidad / Área</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">No. Exp. / Carpeta</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Periodo / Fechas</th>
                  <th className="px-4 py-3 font-semibold whitespace-nowrap">Ubicación física</th>
                  <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((folder) => (
                  <tr key={folder.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      <div className="font-semibold text-slate-900">{folder.uid}</div>
                      {folder.consecutive_number && (
                        <div className="text-[11px] text-slate-500">Cons. {folder.consecutive_number}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <button
                        type="button"
                        onClick={() => onSelectFolder(folder)}
                        className="text-left text-sm font-medium text-slate-900 hover:text-blue-800"
                      >
                        {folder.expediente_name}
                      </button>
                      {folder.observations && (
                        <p className="mt-0.5 truncate text-[11px] text-slate-500">{folder.observations}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{folder.administrative_unit_name || <span className="text-slate-400">—</span>}</div>
                      {folder.producing_area_name && (
                        <div className="text-[11px] text-slate-500">{folder.producing_area_name}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      <div>{folder.expediente_number || '—'}</div>
                      {folder.folder_number && (
                        <div className="text-[11px] text-slate-500">Carpeta {folder.folder_number}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono tabular-nums text-slate-700 whitespace-nowrap">
                      <div className="font-medium">{folder.documentary_year || '—'}</div>
                      {(folder.oldest_date || folder.newest_date) && (
                        <div className="text-[11px] text-slate-500">
                          {folder.oldest_date || '?'} → {folder.newest_date || '?'}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      {folder.section_id ? (
                        <button
                          type="button"
                          onClick={() => onLocateFolder(folder)}
                          className="text-left group"
                          title="Localizar en el mobiliario"
                        >
                          <div className="font-mono font-semibold text-blue-800 group-hover:underline tabular-nums">
                            {folder.cabinet_code} · {folder.section_code} · Pos. {folder.position_index}
                          </div>
                          <div className="text-[11px] text-slate-500">{folder.section_name}</div>
                        </button>
                      ) : (
                        <span className="text-amber-700 font-medium">Sin ubicación</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {folder.section_id && (
                          <button
                            type="button"
                            onClick={() => onLocateFolder(folder)}
                            className="rounded p-1.5 text-amber-700 hover:bg-amber-50"
                            title="Iluminar en mueble"
                          >
                            <Crosshair className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onSelectFolder(folder)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Consultar carátula"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onMoveFolder(folder)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Cambiar ubicación"
                        >
                          <ArrowRightLeft className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onEditFolder(folder)}
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          title="Editar carpeta"
                        >
                          <Edit3 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteFolder(folder)}
                          className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-700"
                          title="Eliminar carpeta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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
