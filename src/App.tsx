import React, { useCallback, useEffect, useState } from 'react';
import {
  FolderOpen,
  FolderPlus,
  FileText,
  History,
  LayoutDashboard,
  LayoutGrid,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
} from 'lucide-react';
import {
  addSectionToCabinet,
  createCabinet,
  createFolder,
  deleteEmptySection,
  deleteFolder,
  fetchBootstrap,
  importFoldersBatch,
  moveFolderLocation,
  saveArchiveReport,
  updateFolder,
  updateSectionConfig,
  type ExcelImportRow,
} from './api';
import { CabinetConfigModal } from './components/CabinetConfigModal';
import { ArchiveReportView } from './components/ArchiveReportView';
import { DashboardView, type AppView } from './components/DashboardView';
import { DeleteConfirmModal } from './components/DeleteConfirmModal';
import { ExcelImportModal } from './components/ExcelImportModal';
import { FolderDetailDrawer } from './components/FolderDetailDrawer';
import { FolderFormModal } from './components/FolderFormModal';
import { HistoryView } from './components/HistoryView';
import { InventoryView } from './components/InventoryView';
import { MoveLocationModal } from './components/MoveLocationModal';
import { SearchLocationView } from './components/SearchLocationView';
import type {
  AdministrativeUnit,
  ArchiveReportInput,
  ArchiveReportRecord,
  Cabinet,
  FolderInput,
  FolderRecord,
  MovementRecord,
  ProducingArea,
  Section,
} from './types';

const NAV_ITEMS: Array<{ id: AppView; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'dashboard', label: 'Panel principal', icon: LayoutDashboard },
  { id: 'reports', label: 'Reportes de archivo', icon: FileText },
  { id: 'inventory', label: 'Inventario digital', icon: FolderOpen },
  { id: 'search', label: 'Mobiliario y localización', icon: LayoutGrid },
  { id: 'history', label: 'Historial de movimientos', icon: History },
];

export default function App() {
  const [activeView, setActiveView] = useState<AppView>('dashboard');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [desktopNavCollapsed, setDesktopNavCollapsed] = useState(false);

  const [cabinets, setCabinets] = useState<Cabinet[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [folders, setFolders] = useState<FolderRecord[]>([]);
  const [units, setUnits] = useState<AdministrativeUnit[]>([]);
  const [areas, setAreas] = useState<ProducingArea[]>([]);
  const [movements, setMovements] = useState<MovementRecord[]>([]);
  const [archiveReports, setArchiveReports] = useState<ArchiveReportRecord[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  // Selection & spotlight state
  const [detailFolderId, setDetailFolderId] = useState<number | null>(null);
  const [highlightedFolderId, setHighlightedFolderId] = useState<number | null>(null);
  const [quickSearchText, setQuickSearchText] = useState('');

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<FolderRecord | null>(null);
  const [defaultSectionForNew, setDefaultSectionForNew] = useState<number | null>(null);
  const [moveModalFolder, setMoveModalFolder] = useState<FolderRecord | null>(null);
  const [deleteModalFolder, setDeleteModalFolder] = useState<FolderRecord | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => {
      setToast((prev) => (prev === message ? null : prev));
    }, 3500);
  }, []);

  const refreshData = useCallback(async () => {
    try {
      const data = await fetchBootstrap();
      setCabinets(data.cabinets);
      setSections(data.sections);
      setFolders(data.folders);
      setUnits(data.units);
      setAreas(data.areas);
      setMovements(data.movements);
      setArchiveReports(data.archiveReports);
      setLoadError('');
    } catch (err: unknown) {
      setLoadError(err instanceof Error ? err.message : 'No se pudo cargar la base de datos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const detailFolder = detailFolderId ? folders.find((f) => f.id === detailFolderId) ?? null : null;

  function handleNavigate(view: AppView) {
    setActiveView(view);
    setMobileNavOpen(false);
  }

  function handleOpenNewFolder(sectionId: number | null = null) {
    setEditingFolder(null);
    setDefaultSectionForNew(sectionId);
    setFormOpen(true);
  }

  function handleOpenEditFolder(folder: FolderRecord) {
    setEditingFolder(folder);
    setDefaultSectionForNew(null);
    setFormOpen(true);
  }

  async function handleSaveFolder(input: FolderInput) {
    if (editingFolder) {
      await updateFolder(editingFolder.id, input);
      await refreshData();
      showToast(`Carpeta ${editingFolder.uid} actualizada correctamente.`);
    } else {
      const created = await createFolder(input);
      await refreshData();
      showToast(`Carpeta ${created.uid} registrada en el inventario.`);
    }
  }

  async function handleDeleteFolder(id: number) {
    await deleteFolder(id);
    if (detailFolderId === id) setDetailFolderId(null);
    if (highlightedFolderId === id) setHighlightedFolderId(null);
    await refreshData();
    showToast('Carpeta eliminada del inventario.');
  }

  async function handleMoveFolder(params: {
    folder_id: number;
    target_section_id: number | null;
    target_position?: number | null;
    notes?: string;
  }) {
    await moveFolderLocation(params);
    await refreshData();
    showToast('Ubicación física actualizada y registrada en el historial.');
  }

  async function handleImportExcel(rows: ExcelImportRow[]) {
    const res = await importFoldersBatch(rows);
    await refreshData();
    showToast(`Se importaron ${res.imported} carpeta(s) desde Excel.`);
    return res.imported;
  }

  async function handleSaveArchiveReport(input: ArchiveReportInput, id: number | null) {
    const saved = await saveArchiveReport(input, id);
    await refreshData();
    showToast(id ? 'Reporte actualizado correctamente.' : 'Reporte guardado correctamente.');
    return saved;
  }

  function handleLocateInCabinet(folder: FolderRecord) {
    setDetailFolderId(null);
    setHighlightedFolderId(folder.id);
    setActiveView('search');
  }

  function handleQuickSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quickSearchText.trim()) return;
    setActiveView('search');
  }

  const currentNavLabel = NAV_ITEMS.find((item) => item.id === activeView)?.label || 'Archivo';

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className={`hidden shrink-0 flex-col border-r border-slate-200 bg-white lg:flex ${desktopNavCollapsed ? 'w-16' : 'w-64'}`}>
        <div className={`flex h-16 items-center border-b border-slate-200 ${desktopNavCollapsed ? 'justify-center px-2' : 'gap-2.5 px-5'}`}>
          <img
            src="/archive-logo.jpeg"
            alt="Archivo Administrativo"
            className="h-14 w-14 shrink-0 rounded-full object-cover"
          />
          {!desktopNavCollapsed && (
            <span className="font-display text-[13px] font-bold leading-tight text-slate-900 whitespace-nowrap">
              Archivo Administrativo
            </span>
          )}
        </div>

        <nav className="flex-1 space-y-1 p-3" aria-label="Navegación principal">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeView === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? 'bg-blue-50 text-blue-900'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-blue-800' : 'text-slate-400'}`} />
                {!desktopNavCollapsed && <span className="truncate">{item.label}</span>}
              </button>
            );
          })}
        </nav>

        {!desktopNavCollapsed && <div className="border-t border-slate-200 p-4 text-xs text-slate-500">
          <div className="flex items-center justify-between">
            <span>Carpetas totales</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">{folders.length}</span>
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span>Secciones activas</span>
            <span className="font-mono font-semibold tabular-nums text-slate-900">{sections.length}</span>
          </div>
        </div>}
        <button
          type="button"
          onClick={() => setDesktopNavCollapsed((collapsed) => !collapsed)}
          className="m-3 flex h-9 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          aria-label={desktopNavCollapsed ? 'Abrir menú lateral' : 'Cerrar menú lateral'}
          title={desktopNavCollapsed ? 'Abrir menú lateral' : 'Cerrar menú lateral'}
        >
          {desktopNavCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </button>
      </aside>

      {/* Mobile / Tablet Navigation Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true">
          <div className="fixed inset-0 bg-slate-900/45" onClick={() => setMobileNavOpen(false)} />
          <aside className="relative flex w-64 flex-col bg-white shadow-xl">
            <div className="flex h-16 items-center justify-between border-b border-slate-200 px-5">
              <span className="font-display text-sm font-bold text-slate-900">Archivo Administrativo</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="rounded p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Cerrar menú"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeView === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium ${
                      active ? 'bg-blue-50 text-blue-900' : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top Bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white px-4 sm:px-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              className="rounded-md p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menú"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="flex items-center gap-2 text-sm text-slate-500 truncate">
              <span className="hidden sm:inline">Archivo</span>
              <span className="hidden sm:inline" aria-hidden="true">/</span>
              <span className="font-medium text-slate-900 truncate">{currentNavLabel}</span>
            </div>
          </div>

          <form onSubmit={handleQuickSearchSubmit} className="hidden md:flex flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={quickSearchText}
                onChange={(e) => setQuickSearchText(e.target.value)}
                placeholder="Buscar expediente, año o número y presionar Enter..."
                className="w-full border-0 border-b border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 focus:border-blue-700 focus:outline-none"
              />
            </div>
          </form>

          <button
            type="button"
            onClick={() => handleOpenNewFolder(null)}
            className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-3.5 py-2 text-xs font-medium text-white hover:bg-blue-900 whitespace-nowrap shrink-0"
          >
            <FolderPlus className="h-4 w-4" />
            <span className="hidden sm:inline">Registrar carpeta</span>
            <span className="sm:hidden">Nueva</span>
          </button>
        </header>

        {/* Main Viewport */}
        <main className="mx-auto w-full max-w-[1440px] flex-1 p-4 sm:p-6">
          {loadError && (
            <div className="mb-6 flex items-center justify-between rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span>{loadError}</span>
              <button
                type="button"
                onClick={refreshData}
                className="rounded border border-red-300 bg-white px-3 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                Reintentar
              </button>
            </div>
          )}

          {loading ? (
            <div className="space-y-4">
              <div className="h-8 w-64 animate-pulse rounded bg-slate-200" />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white" />
                ))}
              </div>
              <div className="h-72 animate-pulse rounded-lg border border-slate-200 bg-white" />
            </div>
          ) : (
            <>
              {activeView === 'dashboard' && (
                <DashboardView
                  cabinets={cabinets}
                  sections={sections}
                  folders={folders}
                  movements={movements}
                  onNavigate={handleNavigate}
                  onOpenNewFolder={() => handleOpenNewFolder(null)}
                  onSelectFolder={(f) => setDetailFolderId(f.id)}
                  onLocateFolder={handleLocateInCabinet}
                />
              )}

              {activeView === 'inventory' && (
                <InventoryView
                  folders={folders}
                  sections={sections}
                  units={units}
                  areas={areas}
                  onOpenNew={() => handleOpenNewFolder(null)}
                  onOpenImport={() => setImportOpen(true)}
                  onSelectFolder={(f) => setDetailFolderId(f.id)}
                  onEditFolder={handleOpenEditFolder}
                  onMoveFolder={(f) => setMoveModalFolder(f)}
                  onDeleteFolder={(f) => setDeleteModalFolder(f)}
                  onLocateFolder={handleLocateInCabinet}
                />
              )}

              {activeView === 'reports' && (
                <ArchiveReportView
                  reports={archiveReports}
                  units={units}
                  areas={areas}
                  onSave={handleSaveArchiveReport}
                />
              )}

              {activeView === 'search' && (
                <SearchLocationView
                  key={quickSearchText}
                  cabinets={cabinets}
                  sections={sections}
                  folders={folders}
                  initialQuery={quickSearchText}
                  highlightedFolderId={highlightedFolderId}
                  onHighlightFolder={setHighlightedFolderId}
                  onSelectFolder={(f) => setDetailFolderId(f.id)}
                  onMoveFolder={handleMoveFolder}
                  onOpenMoveModal={(f) => setMoveModalFolder(f)}
                  onRegisterInSection={(secId) => handleOpenNewFolder(secId)}
                  onOpenConfig={() => setConfigOpen(true)}
                />
              )}

              {activeView === 'history' && <HistoryView movements={movements} />}
            </>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed bottom-5 right-5 z-50 rounded-md border border-slate-800 bg-slate-900 px-4 py-2.5 text-xs font-medium text-white shadow-lg"
        >
          {toast}
        </div>
      )}

      {/* Modals & Drawers */}
      <FolderFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSubmit={handleSaveFolder}
        editingFolder={editingFolder}
        defaultSectionId={defaultSectionForNew}
        cabinets={cabinets}
        sections={sections}
        units={units}
        areas={areas}
      />

      <FolderDetailDrawer
        folder={detailFolder}
        movements={movements}
        onClose={() => setDetailFolderId(null)}
        onLocateInCabinet={handleLocateInCabinet}
        onEdit={(f) => {
          setDetailFolderId(null);
          handleOpenEditFolder(f);
        }}
        onMove={(f) => setMoveModalFolder(f)}
        onDelete={(f) => setDeleteModalFolder(f)}
      />

      <MoveLocationModal
        folder={moveModalFolder}
        cabinets={cabinets}
        sections={sections}
        folders={folders}
        onClose={() => setMoveModalFolder(null)}
        onConfirm={handleMoveFolder}
      />

      <DeleteConfirmModal
        folder={deleteModalFolder}
        onClose={() => setDeleteModalFolder(null)}
        onConfirm={handleDeleteFolder}
      />

      <ExcelImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImportConfirm={handleImportExcel}
      />

      <CabinetConfigModal
        isOpen={configOpen}
        onClose={() => setConfigOpen(false)}
        cabinets={cabinets}
        sections={sections}
        folders={folders}
        onUpdateSection={async (id, data) => {
          await updateSectionConfig(id, data);
          await refreshData();
          showToast('Sección actualizada.');
        }}
        onAddSection={async (cabId, data) => {
          await addSectionToCabinet(cabId, data);
          await refreshData();
          showToast('Sección agregada al mueble.');
        }}
        onDeleteSection={async (id) => {
          await deleteEmptySection(id);
          await refreshData();
          showToast('Sección eliminada.');
        }}
        onCreateCabinet={async (data) => {
          await createCabinet(data);
          await refreshData();
          showToast('Nuevo mueble agregado al archivo.');
        }}
      />
    </div>
  );
}
