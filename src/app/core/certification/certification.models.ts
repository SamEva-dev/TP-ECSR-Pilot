export interface CertificationUnit { id:string; code:string; title:string; sortOrder:number; }
export interface CertificationStep { id:string; unitId?:string|null; code:string; title:string; kind:string; durationMinutes:number; sortOrder:number; }
export interface CertificationScheme { id:string; referentialVersionId:string; code:string; name:string; status:string; effectiveFrom?:string|null; effectiveTo?:string|null; units:CertificationUnit[]; steps:CertificationStep[]; }
export interface CertificationExamSession { id:string; organizationId:string; siteId:string; cohortId:string; schemeId:string; title:string; startsAtUtc:string; endsAtUtc:string; venue?:string|null; status:string; }
export interface CertificationAssessment { id:string; stepDefinitionId:string; juryDisplayName:string; outcome:string; score?:number|null; comment?:string|null; recordedAtUtc:string; }
export interface CertificationCandidate { id:string; examSessionId:string; enrollmentId:string; status:string; eligible?:boolean|null; decision:string; decisionComment?:string|null; decisionAtUtc?:string|null; assessments:CertificationAssessment[]; }
