export type SpineColor = 'blanco' | 'gris' | 'azul' | 'naranja' | 'oscuro';

export interface AdministrativeUnit {
  id: number;
  name: string;
  created_at: string;
}

export interface ProducingArea {
  id: number;
  unit_id: number | null;
  name: string;
  created_at: string;
}

export interface Cabinet {
  id: number;
  code: string;
  name: string;
  description: string;
  columns_count: number;
  rows_count: number;
  material: string;
  created_at: string;
}

export interface Section {
  id: number;
  cabinet_id: number;
  code: string;
  name: string;
  row_index: number;
  col_index: number;
  width_ratio: number;
  notes: string;
}

export interface FolderRecord {
  id: number;
  uid: string;
  consecutive_number: string;
  administrative_unit_id: number | null;
  administrative_unit_name: string;
  producing_area_id: number | null;
  producing_area_name: string;
  expediente_name: string;
  expediente_number: string;
  documentary_year: string;
  oldest_date: string;
  newest_date: string;
  folder_number: string;
  observations: string;
  spine_color: SpineColor;
  created_at: string;
  updated_at: string;
  // Joined location fields (null when unassigned)
  cabinet_id: number | null;
  cabinet_code: string | null;
  cabinet_name: string | null;
  section_id: number | null;
  section_code: string | null;
  section_name: string | null;
  position_index: number | null;
}

export interface MovementRecord {
  id: number;
  folder_id: number;
  folder_uid: string;
  expediente_name: string;
  previous_cabinet_name: string | null;
  previous_section_name: string | null;
  previous_position: number | null;
  new_cabinet_name: string | null;
  new_section_name: string | null;
  new_position: number | null;
  action_type: 'Asignación' | 'Reubicación' | 'Reordenamiento' | 'Retiro';
  notes: string;
  moved_at: string;
}

export interface ArchiveReportChecklistEntry {
  producer_yes: boolean;
  producer_no: boolean;
  producer_quantity: string;
  coordinator_yes: boolean;
  coordinator_no: boolean;
  coordinator_quantity: string;
  observations: string;
}

export interface ArchiveReportInput {
  administrative_unit_name: string;
  producing_area_name: string;
  report_date: string;
  review_date: string;
  checklist: ArchiveReportChecklistEntry[];
  producer_oldest_year: string;
  producer_newest_year: string;
  coordinator_oldest_year: string;
  coordinator_newest_year: string;
  producer_condition: 'Buenas' | 'Regulares' | 'Malas' | 'Pésimas' | '';
  coordinator_condition: 'Buenas' | 'Regulares' | 'Malas' | 'Pésimas' | '';
  digital_backup: ArchiveReportChecklistEntry;
  dcai_documentation: ArchiveReportChecklistEntry;
  dcai_clean: ArchiveReportChecklistEntry;
  producer_area_signature?: string;
  rat_signature?: string;
  coordinator_signature?: string;
  producer_area_name: string;
  producer_area_position: string;
  rat_name: string;
  rat_position: string;
  coordinator_name: string;
  coordinator_position: string;
}

export interface ArchiveReportRecord extends ArchiveReportInput {
  id: number;
  created_at: string;
  updated_at: string;
}

export interface FolderInput {
  consecutive_number?: string;
  administrative_unit_name?: string;
  producing_area_name?: string;
  expediente_name: string;
  expediente_number?: string;
  documentary_year?: string;
  oldest_date?: string;
  newest_date?: string;
  folder_number?: string;
  observations?: string;
  spine_color?: SpineColor;
  section_id?: number | null;
  position_index?: number | null;
}

export interface BootstrapPayload {
  cabinets: Cabinet[];
  sections: Section[];
  folders: FolderRecord[];
  units: AdministrativeUnit[];
  areas: ProducingArea[];
  movements: MovementRecord[];
  archiveReports: ArchiveReportRecord[];
}
