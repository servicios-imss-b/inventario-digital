import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowRightLeft,
  Camera,
  Crosshair,
  Eye,
  FolderPlus,
  Image as ImageIcon,
  Layers,
  MapPinOff,
  Settings2,
  X,
} from 'lucide-react';
import type { Cabinet, FolderRecord, Section, SpineColor } from '../types';

interface InteractiveCabinetProps {
  cabinets: Cabinet[];
  sections: Section[];
  folders: FolderRecord[];
  highlightedFolderId: number | null;
  onClearHighlight?: () => void;
  onSelectFolder: (folder: FolderRecord) => void;
  onMoveFolder: (params: {
    folder_id: number;
    target_section_id: number | null;
    target_position?: number | null;
    notes?: string;
  }) => Promise<void>;
  onOpenMoveModal: (folder: FolderRecord) => void;
  onRegisterInSection: (sectionId: number) => void;
  onOpenConfig?: () => void;
  compactMode?: boolean;
}

const SPINE_STYLES: Record<
  SpineColor,
  { body: string; text: string; accent: string; ring: string }
> = {
  blanco: {
    body: 'bg-gradient-to-r from-slate-100 via-white to-slate-200 border-slate-300',
    text: 'text-slate-900',
    accent: 'bg-slate-800 text-white',
    ring: 'border-slate-400 bg-slate-200',
  },
  gris: {
    body: 'bg-gradient-to-r from-slate-300 via-slate-200 to-slate-300 border-slate-400',
    text: 'text-slate-900',
    accent: 'bg-slate-700 text-white',
    ring: 'border-slate-500 bg-slate-400',
  },
  azul: {
    body: 'bg-gradient-to-r from-sky-500 via-sky-400 to-sky-500 border-sky-600',
    text: 'text-slate-950',
    accent: 'bg-sky-900 text-white',
    ring: 'border-sky-800 bg-sky-200',
  },
  naranja: {
    body: 'bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 border-orange-500',
    text: 'text-slate-950',
    accent: 'bg-orange-900 text-white',
    ring: 'border-orange-700 bg-orange-100',
  },
  oscuro: {
    body: 'bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 border-slate-900',
    text: 'text-slate-100',
    accent: 'bg-slate-950 text-slate-100',
    ring: 'border-slate-500 bg-slate-900',
  },
};

export function InteractiveCabinet({
  cabinets,
  sections,
  folders,
  highlightedFolderId,
  onClearHighlight,
  onSelectFolder,
  onMoveFolder,
  onOpenMoveModal,
  onRegisterInSection,
  onOpenConfig,
  compactMode = false,
}: InteractiveCabinetProps) {
  const [activeCabinetId, setActiveCabinetId] = useState<number>(cabinets[0]?.id ?? 1);
  const [selectedSectionId, setSelectedSectionId] = useState<number | null>(sections[0]?.id ?? null);
  const [draggedFolderId, setDraggedFolderId] = useState<number | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [showReferenceModal, setShowReferenceModal] = useState(false);
  const [assignPickerOpen, setAssignPickerOpen] = useState(false);
  const [movingBusy, setMovingBusy] = useState(false);

  const highlightedRef = useRef<HTMLButtonElement | null>(null);

  const highlightedFolder = useMemo(
    () => (highlightedFolderId ? folders.find((f) => f.id === highlightedFolderId) ?? null : null),
    [highlightedFolderId, folders]
  );

  // Sync active cabinet & selected section when a folder is highlighted via search
  useEffect(() => {
    if (highlightedFolder && highlightedFolder.cabinet_id && highlightedFolder.section_id) {
      setActiveCabinetId(highlightedFolder.cabinet_id);
      setSelectedSectionId(highlightedFolder.section_id);
      setTimeout(() => {
        highlightedRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      }, 120);
    }
  }, [highlightedFolder]);

  // Keep valid cabinet/section selection
  useEffect(() => {
    if (cabinets.length > 0 && !cabinets.some((c) => c.id === activeCabinetId)) {
      setActiveCabinetId(cabinets[0].id);
    }
  }, [cabinets, activeCabinetId]);

  const activeCabinet = cabinets.find((c) => c.id === activeCabinetId) || cabinets[0];
  const cabinetSections = useMemo(
    () => sections.filter((s) => s.cabinet_id === activeCabinet?.id),
    [sections, activeCabinet]
  );

  useEffect(() => {
    if (cabinetSections.length > 0 && !cabinetSections.some((s) => s.id === selectedSectionId)) {
      setSelectedSectionId(cabinetSections[0].id);
    }
  }, [cabinetSections, selectedSectionId]);

  // Group sections by row_index for realistic shelf structure
  const rowsGrouped = useMemo(() => {
    const map = new Map<number, Section[]>();
    for (const sec of cabinetSections) {
      const list = map.get(sec.row_index) || [];
      list.push(sec);
      map.set(sec.row_index, list);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([rowIndex, cols]) => ({
        rowIndex,
        cols: cols.sort((a, b) => a.col_index - b.col_index),
      }));
  }, [cabinetSections]);

  const foldersBySection = useMemo(() => {
    const map = new Map<number, FolderRecord[]>();
    for (const f of folders) {
      if (f.section_id) {
        const arr = map.get(f.section_id) || [];
        arr.push(f);
        map.set(f.section_id, arr);
      }
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => (a.position_index ?? 999) - (b.position_index ?? 999));
    }
    return map;
  }, [folders]);

  const unassignedFolders = useMemo(
    () => folders.filter((f) => !f.section_id),
    [folders]
  );

  const selectedSection = cabinetSections.find((s) => s.id === selectedSectionId) || cabinetSections[0] || null;
  const selectedSectionFolders = selectedSection ? foldersBySection.get(selectedSection.id) || [] : [];

  function handleDragStart(e: React.DragEvent, folderId: number) {
    setDraggedFolderId(folderId);
    e.dataTransfer.setData('text/plain', String(folderId));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragEnd() {
    setDraggedFolderId(null);
    setDragOverTarget(null);
  }

  async function handleDropOnSection(e: React.DragEvent, sectionId: number) {
    e.preventDefault();
    setDragOverTarget(null);
    const idStr = e.dataTransfer.getData('text/plain');
    const folderId = Number(idStr || draggedFolderId);
    setDraggedFolderId(null);
    if (!Number.isInteger(folderId) || movingBusy) return;

    const folder = folders.find((f) => f.id === folderId);
    if (!folder || folder.section_id === sectionId) return;

    setMovingBusy(true);
    try {
      await onMoveFolder({
        folder_id: folderId,
        target_section_id: sectionId,
        notes: 'Reubicación mediante arrastrar y soltar en mobiliario',
      });
      setSelectedSectionId(sectionId);
    } finally {
      setMovingBusy(false);
    }
  }

  async function handleDropOnUnassigned(e: React.DragEvent) {
    e.preventDefault();
    setDragOverTarget(null);
    const idStr = e.dataTransfer.getData('text/plain');
    const folderId = Number(idStr || draggedFolderId);
    setDraggedFolderId(null);
    if (!Number.isInteger(folderId) || movingBusy) return;

    const folder = folders.find((f) => f.id === folderId);
    if (!folder || folder.section_id === null) return;

    setMovingBusy(true);
    try {
      await onMoveFolder({
        folder_id: folderId,
        target_section_id: null,
        notes: 'Retirada mediante arrastrar y soltar',
      });
    } finally {
      setMovingBusy(false);
    }
  }

  async function handleReorder(folder: FolderRecord, delta: number) {
    if (!folder.section_id || !folder.position_index || movingBusy) return;
    const newPos = folder.position_index + delta;
    if (newPos < 1) return;
    setMovingBusy(true);
    try {
      await onMoveFolder({
        folder_id: folder.id,
        target_section_id: folder.section_id,
        target_position: newPos,
        notes: 'Ajuste de orden en sección',
      });
    } finally {
      setMovingBusy(false);
    }
  }

  async function handleAssignExistingToSection(folderId: number, sectionId: number) {
    setMovingBusy(true);
    try {
      await onMoveFolder({
        folder_id: folderId,
        target_section_id: sectionId,
        notes: 'Asignada a sección desde mapa del archivo',
      });
      setAssignPickerOpen(false);
    } finally {
      setMovingBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Toolbar above cabinet */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {cabinets.map((cab) => (
            <button
              key={cab.id}
              type="button"
              onClick={() => setActiveCabinetId(cab.id)}
              className={`inline-flex items-center gap-2 rounded-md border px-3.5 py-2 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeCabinet?.id === cab.id
                  ? 'border-blue-800 bg-blue-800 text-white'
                  : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              {cab.code} · {cab.name}
            </button>
          ))}
          {activeCabinet && (
            <span className="text-xs text-slate-500">
              {activeCabinet.material} · {cabinetSections.length} secciones
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {highlightedFolder && onClearHighlight && (
            <button
              type="button"
              onClick={onClearHighlight}
              className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 whitespace-nowrap shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar iluminación
            </button>
          )}
          <button
            type="button"
            onClick={() => setShowReferenceModal(true)}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
          >
            <Camera className="h-3.5 w-3.5" />
            Fotografía real del mueble
          </button>
          {onOpenConfig && (
            <button
              type="button"
              onClick={onOpenConfig}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Configurar distribución
            </button>
          )}
        </div>
      </div>

      {/* Highlighted folder banner when locating */}
      {highlightedFolder && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm">
          <div className="flex items-center gap-3">
            <Crosshair className="h-5 w-5 text-amber-700 shrink-0" />
            <div>
              <p className="font-semibold text-amber-950">
                Carpeta localizada: {highlightedFolder.expediente_name}
              </p>
              <p className="text-xs text-amber-900">
                {highlightedFolder.section_id ? (
                  <>
                    Ubicación exacta: <strong>{highlightedFolder.cabinet_name}</strong> →{' '}
                    <strong>
                      {highlightedFolder.section_code} ({highlightedFolder.section_name})
                    </strong>{' '}
                    → <strong className="font-mono">Posición {highlightedFolder.position_index}</strong>
                  </>
                ) : (
                  'Esta carpeta se encuentra actualmente sin ubicación asignada en el mobiliario.'
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onSelectFolder(highlightedFolder)}
            className="rounded-md bg-amber-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-800 whitespace-nowrap shrink-0"
          >
            Ver carátula completa
          </button>
        </div>
      )}

      {/* Main layout: Physical Bookcase + Section Inspector */}
      <div className={`grid grid-cols-1 gap-6 ${compactMode ? 'xl:grid-cols-12' : 'lg:grid-cols-12'}`}>
        {/* Physical Wooden Cabinet Representation */}
        <div className={compactMode ? 'xl:col-span-8' : 'lg:col-span-8'}>
          <div className="rounded-xl border border-slate-300 bg-slate-200/70 p-2 sm:p-3">
            {/* Wooden Cabinet Frame */}
            <div className="wood-frame rounded-lg p-3 sm:p-4 shadow-lg">
              {/* Top surface trim */}
              <div className="mb-3 flex items-center justify-between border-b border-black/30 pb-2 text-xs text-amber-100/90">
                <span className="font-semibold tracking-wide">
                  {activeCabinet?.code} — {activeCabinet?.name}
                </span>
                <span className="font-mono text-[11px] text-amber-200/80">
                  Arrastra carpetas entre compartimentos para reubicar
                </span>
              </div>

              {/* Shelf Levels (Rows) */}
              <div className="space-y-3">
                {rowsGrouped.map((row) => {
                  const totalRatio = row.cols.reduce((acc, s) => acc + (s.width_ratio || 50), 0) || 100;
                  return (
                    <div key={row.rowIndex} className="space-y-0">
                      <div className="grid grid-cols-1 gap-3 md:flex md:gap-3">
                        {row.cols.map((sec) => {
                          const secFolders = foldersBySection.get(sec.id) || [];
                          const isSelected = selectedSection?.id === sec.id;
                          const isTargetHighlight = highlightedFolder?.section_id === sec.id;
                          const isDimmed =
                            highlightedFolder?.section_id != null && highlightedFolder.section_id !== sec.id;
                          const isDropActive = dragOverTarget === `sec-${sec.id}`;
                          const pct = Math.round(((sec.width_ratio || 50) / totalRatio) * 100);

                          return (
                            <div
                              key={sec.id}
                              style={{ flexBasis: `${pct}%` }}
                              onClick={() => setSelectedSectionId(sec.id)}
                              onDragOver={(e) => {
                                e.preventDefault();
                                setDragOverTarget(`sec-${sec.id}`);
                              }}
                              onDragLeave={() => {
                                if (dragOverTarget === `sec-${sec.id}`) setDragOverTarget(null);
                              }}
                              onDrop={(e) => handleDropOnSection(e, sec.id)}
                              className={`cabinet-recess relative flex min-h-[168px] flex-col justify-between rounded-sm p-2.5 transition-all cursor-pointer ${
                                isTargetHighlight
                                  ? 'ring-3 ring-amber-400 bg-amber-950/35'
                                  : isDropActive
                                    ? 'ring-2 ring-sky-400'
                                    : isSelected
                                      ? 'ring-2 ring-amber-200/75'
                                      : 'ring-1 ring-black/50 hover:ring-amber-200/40'
                              } ${isDimmed ? 'opacity-45' : 'opacity-100'}`}
                            >
                              {/* Compartment Label Bar */}
                              <div className="mb-2 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span
                                    className={`rounded px-1.5 py-0.5 font-mono text-[11px] font-semibold ${
                                      isTargetHighlight
                                        ? 'bg-amber-400 text-slate-950'
                                        : 'bg-black/45 text-amber-100'
                                    }`}
                                  >
                                    {sec.code}
                                  </span>
                                  <span className="truncate text-xs font-medium text-amber-50/90">
                                    {sec.name}
                                  </span>
                                </div>
                                <span className="font-mono tabular-nums text-[11px] text-amber-200/80 shrink-0">
                                  {secFolders.length} {secFolders.length === 1 ? 'carpeta' : 'carpetas'}
                                </span>
                              </div>

                              {/* Binders Row standing on shelf */}
                              <div className="flex flex-1 items-end gap-1.5 overflow-x-auto pb-1 pt-2">
                                {secFolders.length === 0 ? (
                                  <div className="flex h-24 w-full items-center justify-center rounded border border-dashed border-amber-200/20 text-[11px] text-amber-100/50">
                                    {isDropActive ? 'Suelte aquí para ubicar' : 'Compartimento vacío'}
                                  </div>
                                ) : (
                                  secFolders.map((folder) => {
                                    const spine = SPINE_STYLES[folder.spine_color] || SPINE_STYLES.blanco;
                                    const isHighlighted = highlightedFolderId === folder.id;
                                    const topCode =
                                      folder.documentary_year ||
                                      folder.consecutive_number ||
                                      folder.folder_number ||
                                      folder.uid;

                                    return (
                                      <button
                                        key={folder.id}
                                        ref={isHighlighted ? highlightedRef : null}
                                        type="button"
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, folder.id)}
                                        onDragEnd={handleDragEnd}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedSectionId(sec.id);
                                          onSelectFolder(folder);
                                        }}
                                        title={`Pos. ${folder.position_index} · ${folder.uid} · ${folder.expediente_name}`}
                                        className={`group relative flex h-28 w-11 shrink-0 flex-col items-center justify-between rounded-t-sm border px-1 py-1.5 text-center transition-transform ${spine.body} ${
                                          isHighlighted
                                            ? 'folder-spotlight z-20 -translate-y-2 scale-105 ring-2 ring-amber-400'
                                            : 'hover:-translate-y-1 shadow-md'
                                        }`}
                                      >
                                        {/* Top year/code label like real folders in photo */}
                                        <span
                                          className={`w-full truncate rounded-[2px] px-0.5 py-0.5 font-mono text-[9px] font-semibold leading-none tabular-nums ${spine.accent}`}
                                        >
                                          {topCode}
                                        </span>

                                        {/* Vertical title */}
                                        <span
                                          className={`my-1 flex-1 overflow-hidden text-[9px] font-semibold leading-tight tracking-tight ${spine.text}`}
                                          style={{
                                            writingMode: 'vertical-rl',
                                            transform: 'rotate(180deg)',
                                            maxHeight: '56px',
                                          }}
                                        >
                                          {folder.expediente_name}
                                        </span>

                                        {/* Bottom metal finger-pull ring like real 3-ring binders */}
                                        <span
                                          className={`h-3 w-3 rounded-full border-2 ${spine.ring}`}
                                          aria-hidden="true"
                                        />

                                        {/* Position indicator at bottom corner */}
                                        <span className="sr-only">Posición {folder.position_index}</span>
                                      </button>
                                    );
                                  })
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      {/* Wooden shelf plank */}
                      <div className="wood-shelf-plank h-3 w-full rounded-b-sm" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Unassigned folders drop-tray */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOverTarget('unassigned');
            }}
            onDragLeave={() => {
              if (dragOverTarget === 'unassigned') setDragOverTarget(null);
            }}
            onDrop={handleDropOnUnassigned}
            className={`mt-4 rounded-lg border p-4 transition-colors ${
              dragOverTarget === 'unassigned'
                ? 'border-blue-600 bg-blue-50/70'
                : 'border-slate-200 bg-white'
            }`}
          >
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">
                  Carpetas sin ubicación asignada ({unassignedFolders.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Arrastre una carpeta hacia cualquier sección del mueble, o suelte aquí una carpeta para retirarla.
                </p>
              </div>
            </div>

            {unassignedFolders.length === 0 ? (
              <p className="text-xs text-slate-400">
                Todas las carpetas registradas tienen una ubicación física asignada.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {unassignedFolders.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    draggable
                    onDragStart={(e) => handleDragStart(e, f.id)}
                    onDragEnd={handleDragEnd}
                    onClick={() => onSelectFolder(f)}
                    className={`inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-xs transition-colors ${
                      highlightedFolderId === f.id
                        ? 'border-amber-500 bg-amber-50 font-semibold text-amber-950 ring-2 ring-amber-400'
                        : 'border-slate-200 bg-slate-50 text-slate-800 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="font-mono text-[11px] text-slate-500">{f.uid}</span>
                    <span className="max-w-[220px] truncate font-medium">{f.expediente_name}</span>
                    {f.documentary_year && (
                      <span className="font-mono text-[11px] text-slate-500">{f.documentary_year}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Selected Section Inspector */}
        <div className={compactMode ? 'xl:col-span-4' : 'lg:col-span-4'}>
          <div className="rounded-lg border border-slate-200 bg-white">
            {selectedSection ? (
              <>
                <div className="border-b border-slate-200 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono text-xs font-semibold text-blue-800">
                        {activeCabinet?.code} · {selectedSection.code}
                      </span>
                      <h3 className="text-base font-semibold text-slate-900">{selectedSection.name}</h3>
                      {selectedSection.notes && (
                        <p className="mt-0.5 text-xs text-slate-500">{selectedSection.notes}</p>
                      )}
                    </div>
                    <span className="font-mono tabular-nums text-xs text-slate-500">
                      {selectedSectionFolders.length} carpeta(s)
                    </span>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => onRegisterInSection(selectedSection.id)}
                      className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-900 whitespace-nowrap shrink-0"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      Nueva carpeta aquí
                    </button>
                    {unassignedFolders.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setAssignPickerOpen((v) => !v)}
                        className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0"
                      >
                        Asignar existente ({unassignedFolders.length})
                      </button>
                    )}
                  </div>

                  {assignPickerOpen && unassignedFolders.length > 0 && (
                    <div className="mt-3 rounded-md border border-slate-200 bg-slate-50 p-2.5 space-y-1.5">
                      <p className="text-[11px] font-medium text-slate-600">
                        Seleccione una carpeta sin ubicación para colocarla en {selectedSection.code}:
                      </p>
                      <div className="max-h-40 overflow-y-auto space-y-1">
                        {unassignedFolders.map((uf) => (
                          <button
                            key={uf.id}
                            type="button"
                            disabled={movingBusy}
                            onClick={() => handleAssignExistingToSection(uf.id, selectedSection.id)}
                            className="flex w-full items-center justify-between rounded border border-slate-200 bg-white px-2.5 py-1.5 text-left text-xs hover:bg-blue-50"
                          >
                            <span className="truncate font-medium text-slate-800">{uf.expediente_name}</span>
                            <span className="ml-2 font-mono text-[11px] text-blue-800 shrink-0">Ubicar</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Ordered folder list inside selected section */}
                <div className="divide-y divide-slate-100 max-h-[520px] overflow-y-auto">
                  {selectedSectionFolders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      Esta sección no tiene carpetas asignadas. Agregue una nueva o arrastre una carpeta aquí.
                    </div>
                  ) : (
                    selectedSectionFolders.map((folder, idx) => {
                      const isHighlighted = highlightedFolderId === folder.id;
                      return (
                        <div
                          key={folder.id}
                          className={`p-3.5 transition-colors ${
                            isHighlighted ? 'bg-amber-50' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => onSelectFolder(folder)}
                              className="min-w-0 text-left"
                            >
                              <div className="flex items-center gap-1.5 text-[11px] font-mono tabular-nums text-slate-500">
                                <span className="font-semibold text-slate-800">Pos. {folder.position_index}</span>
                                <span aria-hidden="true">·</span>
                                <span>{folder.uid}</span>
                                {folder.documentary_year && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{folder.documentary_year}</span>
                                  </>
                                )}
                              </div>
                              <p className="mt-0.5 text-sm font-medium text-slate-900 hover:text-blue-800">
                                {folder.expediente_name}
                              </p>
                              {(folder.administrative_unit_name || folder.folder_number) && (
                                <p className="mt-0.5 truncate text-xs text-slate-500">
                                  {[folder.administrative_unit_name, folder.folder_number ? `Carpeta ${folder.folder_number}` : '']
                                    .filter(Boolean)
                                    .join(' · ')}
                                </p>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => onSelectFolder(folder)}
                              className="rounded p-1.5 text-slate-400 hover:bg-slate-200/70 hover:text-slate-800"
                              title="Ver ficha completa"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>

                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                disabled={idx === 0 || movingBusy}
                                onClick={() => handleReorder(folder, -1)}
                                className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-35"
                                title="Mover a la izquierda"
                              >
                                <ArrowLeft className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === selectedSectionFolders.length - 1 || movingBusy}
                                onClick={() => handleReorder(folder, 1)}
                                className="rounded border border-slate-200 bg-white p-1 text-slate-600 hover:bg-slate-100 disabled:opacity-35"
                                title="Mover a la derecha"
                              >
                                <ArrowRight className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => onOpenMoveModal(folder)}
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                              >
                                <ArrowRightLeft className="h-3 w-3" />
                                Cambiar ubicación
                              </button>
                              <button
                                type="button"
                                disabled={movingBusy}
                                onClick={() =>
                                  onMoveFolder({
                                    folder_id: folder.id,
                                    target_section_id: null,
                                    notes: 'Retirada desde el panel de sección',
                                  })
                                }
                                className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-red-50 hover:text-red-700"
                                title="Retirar del mueble"
                              >
                                <MapPinOff className="h-3 w-3" />
                                Retirar
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            ) : (
              <div className="p-6 text-center text-sm text-slate-500">Seleccione una sección del mueble.</div>
            )}
          </div>
        </div>
      </div>

      {/* Reference Photographs Modal */}
      {showReferenceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-slate-700" />
                <h3 className="text-base font-semibold text-slate-900">
                  Referencias físicas del archivo (mobiliario y formato de reporte)
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowReferenceModal(false)}
                className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-2">
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Mueble físico real (2 columnas × 3 niveles = 6 secciones)
                </p>
                <img
                  src="/assets/aistudio/4f430cc2-e374-44c5-8928-e979fdf406fc_7476bbb4.jpg"
                  alt="Fotografía del mueble físico de madera con 6 secciones"
                  className="w-full rounded-md border border-slate-200 object-cover"
                  referrerPolicy="no-referrer"
                />
              </div>
              <div>
                <p className="mb-2 text-xs font-semibold text-slate-700">
                  Referencia documental de archivos de trámite
                </p>
                <img
                  src="/assets/aistudio/d5dd3a95-5931-4a85-908c-403f0ee33b2b_b830dd07.jpg"
                  alt="Formato de Reporte de Archivos de Trámite"
                  className="w-full rounded-md border border-slate-200 object-contain bg-slate-50"
                  referrerPolicy="no-referrer"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
