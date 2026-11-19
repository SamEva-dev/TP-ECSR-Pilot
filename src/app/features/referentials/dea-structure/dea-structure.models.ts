/** Contract QA41-B2/B3. All source data is from the API, never seeded in the UI. */
export type DeaSection = 'blocks' | 'competencies' | 'modules' | 'stages' | 'assessments';
export const DEA_SECTIONS: readonly DeaSection[] = ['blocks','competencies','modules','stages','assessments'];
export type DeaStructureDocument = Record<string, unknown> & {
  blocks: unknown[]; competencies: unknown[]; modules: unknown[];
  stages: unknown[]; assessmentByBlock: unknown[];
};
export interface DeaStructureResponse {
  referentialVersionId: string;
  content: DeaStructureDocument;
  updatedAtUtc: string;
}
export interface DeaSectionResponse {
  referentialVersionId: string;
  section: DeaSection;
  items: unknown[];
  updatedAtUtc: string;
}
export type DeaSectionProperty = 'blocks' | 'competencies' | 'modules' | 'stages' | 'assessmentByBlock';
export const deaSectionProperty = (section: DeaSection): DeaSectionProperty =>
  section === 'assessments' ? 'assessmentByBlock' : section;
