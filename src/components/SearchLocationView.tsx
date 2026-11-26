import React, { useMemo, useState } from 'react';
import { Crosshair, Eye, MapPin, Search, X } from 'lucide-react';
import type { Cabinet, FolderRecord, Section } from '../types';
import { InteractiveCabinet } from './InteractiveCabinet';

interface SearchLocationViewProps {
  cabinets: Cabinet[];
  sections: Section[];
  folders: FolderRecord[];
  initialQuery?: string;
  highlightedFolderId: number | null;
  onHighlightFolder: (id: number | null) => void;
  onSelectFolder: (folder: FolderRecord) => void;
  onMoveFolder: (params: {
    folder_id: number;
    target_section_id: number | null;
    target_position?: number | null;
    notes?: string;
  }) => Promise<void>;
  onOpenMoveModal: (folder: FolderRecord) => void;
  onRegisterInSection: (sectionId: number) => void;
  onOpenConfig: () => void;
}

export function SearchLocationView({
  cabinets,
  sections,
  folders,
  initialQuery = '',
  highlightedFolderId,
  onHighlightFolder,
  onSelectFolder,
  onMoveFolder,
  onOpenMoveModal,
  onRegisterInSection,
  onOpenConfig,
}: SearchLocationViewProps) {
  const [query, setQuery] = useState(initialQuery);
  const [fieldScope, setFieldScope] = useState<'all' | 'expediente' | 'unit' | 'area' | 'exp_num' | 'year' | 'folder_num'>('all');

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return folders.filter((f) => {
      switch (fieldScope) {
        case 'expediente':
          return f.expediente_name.toLowerCase().includes(q);
        case 'unit':
          return f.administrative_unit_name.toLowerCase().includes(q);
        case 'area':
          return f.producing_area_name.toLowerCase().includes(q);
        case 'exp_num':
          return f.expediente_number.toLowerCase().includes(q);
        case 'year':
          return f.documentary_year.toLowerCase().includes(q);
        case 'folder_num':
          return f.folder_number.toLowerCase().includes(q);
        default:
          return [
            f.uid,
            f.consecutive_number,
            f.expediente_name,
            f.administrative_unit_name,
            f.producing_area_name,
            f.expediente_number,
            f.documentary_year,
            f.folder_number,
          ]
            .join(' ')
            .toLowerCase()
            .includes(q);
      }
    });
  }, [folders, query, fieldScope]);

  const activeMatch = useMemo(
    () => (highlightedFolderId ? folders.find((f) => f.id === highlightedFolderId) ?? null : null),
    [highlightedFolderId, folders]
  );

  function handleSelectMatch(folder: FolderRecord) {
    onHighlightFolder(folder.id);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Mobiliario y localización
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Busque carpetas, consulte su ubicación y reorganice el mobiliario desde una sola vista.
        </p>
      </div>

      {/* Search Box */}
      <div className="border-b border-slate-200 pb-3 space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-1 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                if (!e.target.value.trim()) onHighlightFolder(null);
              }}
              placeholder="Escriba nombre del expediente, unidad administrativa, área, número de expediente, año o carpeta..."
              className="w-full border-0 border-b border-slate-300 bg-transparent py-2.5 pl-7 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('');
                  onHighlightFolder(null);
                }}
                className="absolute right-2.5 top-2.5 rounded p-1 text-slate-400 hover:text-slate-700"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <select
            value={fieldScope}
            onChange={(e) => setFieldScope(e.target.value as typeof fieldScope)}
            className="border-0 border-b border-slate-300 bg-transparent px-1 py-2.5 text-xs font-medium text-slate-700 focus:border-blue-700 focus:outline-none sm:w-56"
          >
            <option value="all">Buscar en todos los campos</option>
            <option value="expediente">Nombre del expediente</option>
            <option value="unit">Unidad administrativa</option>
            <option value="area">Área productora</option>
            <option value="exp_num">Número de expediente</option>
            <option value="year">Año o periodo</option>
            <option value="folder_num">Número de carpeta</option>
          </select>
        </div>

        {/* Results list when query is present */}
        {query.trim() !== '' && (
          <div className="border-t border-slate-100 pt-3">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>
                {matches.length === 0
                  ? 'Sin coincidencias para esta búsqueda.'
                  : `${matches.length} coincidencia(s) encontrada(s). Seleccione una carpeta para iluminarla en el mueble:`}
              </span>
            </div>

            {matches.length > 0 && (
              <div className="grid max-h-64 grid-cols-1 gap-2 overflow-y-auto md:grid-cols-2">
                {matches.map((folder) => {
                  const isSelected = highlightedFolderId === folder.id;
                  return (
                    <div
                      key={folder.id}
                      className={`flex items-start justify-between gap-3 rounded-md border p-3 transition-colors ${
                        isSelected
                          ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-400'
                          : 'border-slate-200 bg-slate-50/70 hover:border-blue-600 hover:bg-white'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectMatch(folder)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                          <span className="font-semibold text-slate-800">{folder.uid}</span>
                          {folder.consecutive_number && <span>· Cons. {folder.consecutive_number}</span>}
                          {folder.documentary_year && <span>· {folder.documentary_year}</span>}
                          {folder.folder_number && <span>· Carpeta {folder.folder_number}</span>}
                        </div>
                        <p className="mt-0.5 text-sm font-semibold text-slate-900 truncate">
                          {folder.expediente_name}
                        </p>
                        <p className="mt-0.5 text-xs text-slate-600 truncate">
                          {[folder.administrative_unit_name, folder.producing_area_name, folder.expediente_number]
                            .filter(Boolean)
                            .join(' · ') || 'Sin unidad/número registrado'}
                        </p>
                        <p className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium">
                          <MapPin className="h-3.5 w-3.5 text-blue-800 shrink-0" />
                          {folder.section_id ? (
                            <span className="text-blue-900">
                              {folder.cabinet_name} → {folder.section_code} ({folder.section_name}) → Pos.{' '}
                              {folder.position_index}
                            </span>
                          ) : (
                            <span className="text-amber-700">Sin ubicación asignada</span>
                          )}
                        </p>
                      </button>

                      <div className="flex flex-col gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleSelectMatch(folder)}
                          className={`inline-flex items-center gap-1 rounded px-2.5 py-1 text-xs font-medium ${
                            isSelected
                              ? 'bg-amber-600 text-white'
                              : 'bg-blue-800 text-white hover:bg-blue-900'
                          }`}
                        >
                          <Crosshair className="h-3 w-3" />
                          {isSelected ? 'Iluminada' : 'Localizar'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onSelectFolder(folder)}
                          className="inline-flex items-center justify-center gap-1 rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-3 w-3" />
                          Carátula
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Selected match quick summary card if highlighted */}
      {activeMatch && (
        <div className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-mono text-slate-500">
                Ficha rápida · {activeMatch.uid}
                {activeMatch.expediente_number ? ` · Exp. ${activeMatch.expediente_number}` : ''}
              </p>
              <h2 className="text-base font-semibold text-slate-900">{activeMatch.expediente_name}</h2>
              <p className="text-xs text-slate-600">
                {[
                  activeMatch.administrative_unit_name,
                  activeMatch.producing_area_name,
                  activeMatch.documentary_year ? `Año: ${activeMatch.documentary_year}` : '',
                  activeMatch.oldest_date || activeMatch.newest_date
                    ? `Fechas: ${activeMatch.oldest_date || '?'} – ${activeMatch.newest_date || '?'}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onSelectFolder(activeMatch)}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Abrir ficha completa
            </button>
          </div>
        </div>
      )}

      {/* Visual Cabinet Map */}
      <InteractiveCabinet
        cabinets={cabinets}
        sections={sections}
        folders={folders}
        highlightedFolderId={highlightedFolderId}
        onClearHighlight={() => onHighlightFolder(null)}
        onSelectFolder={onSelectFolder}
        onMoveFolder={onMoveFolder}
        onOpenMoveModal={onOpenMoveModal}
        onRegisterInSection={onRegisterInSection}
        onOpenConfig={onOpenConfig}
      />
    </div>
  );
}
