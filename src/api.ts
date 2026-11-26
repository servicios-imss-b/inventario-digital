const GOOGLE_SHEETS_API_URL = 'https://script.google.com/macros/s/AKfycbwHlSZz-JFiDMHCHaGrfpY_Z6VJfywizkgcCylJl3i8q4oCq1yzE39wGw_W8fGFGpiXEA/exec';

import type {
  BootstrapPayload,
  ArchiveReportInput,
  ArchiveReportRecord,
  Cabinet,
  FolderInput,
  FolderRecord,
  Section,
} from './types';

async function handleJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || 'Error en la solicitud');
  }
  return data as T;
}

async function sheetsPost<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const res = await fetch(GOOGLE_SHEETS_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, ...payload }),
  });
  return handleJson<T>(res);
}

export async function fetchBootstrap(): Promise<BootstrapPayload> {
  const res = await fetch(GOOGLE_SHEETS_API_URL);
  return handleJson<BootstrapPayload>(res);
}

export async function saveArchiveReport(
  input: ArchiveReportInput,
  id: number | null = null
): Promise<ArchiveReportRecord> {
  return sheetsPost<ArchiveReportRecord>('saveReport', {
    report: { ...input, id: id ?? undefined },
  });
}

export async function deleteArchiveReport(id: number): Promise<void> {
  await sheetsPost<{ ok: boolean }>('deleteReport', { id });
}

export async function createFolder(input: FolderInput): Promise<FolderRecord> {
  return sheetsPost<FolderRecord>('saveFolder', { folder: input });
}

export async function updateFolder(id: number, input: FolderInput): Promise<FolderRecord> {
  return sheetsPost<FolderRecord>('saveFolder', { folder: { ...input, id } });
}

export async function deleteFolder(id: number): Promise<void> {
  await sheetsPost<{ ok: boolean }>('deleteFolder', { id });
}

export interface ExcelImportRow extends FolderInput {
  section_ref?: string;
}

export async function importFoldersBatch(rows: ExcelImportRow[]): Promise<{ imported: number }> {
  return sheetsPost<{ imported: number }>('importFolders', { rows });
}

export async function moveFolderLocation(params: {
  folder_id: number;
  target_section_id: number | null;
  target_position?: number | null;
  notes?: string;
}): Promise<{ ok: boolean; folder: FolderRecord }> {
  return sheetsPost<{ ok: boolean; folder: FolderRecord }>('moveFolder', params);
}

export async function updateSectionConfig(
  id: number,
  data: { code: string; name: string; notes: string; width_ratio: number }
): Promise<Section> {
  return sheetsPost<Section>('saveSection', { section: { id, ...data } });
}

export async function addSectionToCabinet(
  cabinetId: number,
  data: {
    code: string;
    name: string;
    row_index: number;
    col_index: number;
    width_ratio: number;
    notes: string;
  }
): Promise<Section> {
  return sheetsPost<Section>('saveSection', { section: { cabinet_id: cabinetId, ...data } });
}

export async function deleteEmptySection(id: number): Promise<void> {
  await sheetsPost<{ ok: boolean }>('deleteSection', { id });
}

export async function createCabinet(data: {
  code: string;
  name: string;
  description: string;
  material: string;
  columns_count: number;
  rows_count: number;
}): Promise<Cabinet> {
  return sheetsPost<Cabinet>('saveCabinet', { cabinet: data });
}
