export type InternshipStatus =
  "completed" | "incomplete" | "inProgress" | "planned";
export type InternshipActivityStatus = "done" | "pending";

export interface InternshipActivity {
  labelKey: string;
  status: InternshipActivityStatus;
}

export interface InternshipDocument {
  labelKey: string;
  status: "available" | "validated" | "missing";
}

export interface InternshipPeriod {
  id: string;
  studentId: string;
  studentName: string;
  company: string;
  city: string;
  tutor: string;
  startDate: string;
  endDate: string;
  plannedHours: number;
  completedHours: number;
  status: InternshipStatus;
  trainerVisible: boolean;
  activities: InternshipActivity[];
  tutorObservationKey: string;
  documents: InternshipDocument[];
}

export const INTERNSHIP_PERIODS: InternshipPeriod[] = [
  {
    id: "stage-1",
    studentId: "s1",
    studentName: "Sam Fokam",
    company: "Auto-école du Port",
    city: "Nantes",
    tutor: "Émilie Rocher",
    startDate: "08/06/2026",
    endDate: "17/07/2026",
    plannedHours: 175,
    completedHours: 175,
    status: "completed",
    trainerVisible: true,
    activities: [
      {
        labelKey: "internships.activities.observeDrivingLessons",
        status: "done",
      },
      { labelKey: "internships.activities.leadTheorySession", status: "done" },
      {
        labelKey: "internships.activities.pedagogicalAppointment",
        status: "done",
      },
      { labelKey: "internships.activities.lessonPlan", status: "done" },
      {
        labelKey: "internships.activities.studentInitialAssessment",
        status: "done",
      },
    ],
    tutorObservationKey: "internships.observations.sam",
    documents: [
      { labelKey: "internships.documents.agreement", status: "available" },
      {
        labelKey: "internships.documents.attendanceCertificate",
        status: "available",
      },
      { labelKey: "internships.documents.finalReport", status: "validated" },
    ],
  },
  {
    id: "stage-2",
    studentId: "s2",
    studentName: "Julie Moreau",
    company: "Conduite Atlantique",
    city: "Saint-Herblain",
    tutor: "Paul Nguyen",
    startDate: "08/06/2026",
    endDate: "17/07/2026",
    plannedHours: 175,
    completedHours: 132,
    status: "incomplete",
    trainerVisible: true,
    activities: [
      {
        labelKey: "internships.activities.observeDrivingLessons",
        status: "done",
      },
      { labelKey: "internships.activities.leadTheorySession", status: "done" },
      {
        labelKey: "internships.activities.pedagogicalAppointment",
        status: "done",
      },
      { labelKey: "internships.activities.lessonPlan", status: "pending" },
      {
        labelKey: "internships.activities.studentInitialAssessment",
        status: "pending",
      },
    ],
    tutorObservationKey: "internships.observations.julie",
    documents: [
      { labelKey: "internships.documents.agreement", status: "available" },
      {
        labelKey: "internships.documents.attendanceCertificate",
        status: "missing",
      },
      { labelKey: "internships.documents.finalReport", status: "missing" },
    ],
  },
  {
    id: "stage-3",
    studentId: "s5",
    studentName: "Karim Benali",
    company: "ECF Loire",
    city: "Rezé",
    tutor: "Sonia Martin",
    startDate: "07/09/2026",
    endDate: "16/10/2026",
    plannedHours: 175,
    completedHours: 42,
    status: "inProgress",
    trainerVisible: true,
    activities: [
      {
        labelKey: "internships.activities.observeDrivingLessons",
        status: "done",
      },
      {
        labelKey: "internships.activities.leadTheorySession",
        status: "pending",
      },
      {
        labelKey: "internships.activities.pedagogicalAppointment",
        status: "pending",
      },
      { labelKey: "internships.activities.lessonPlan", status: "done" },
      {
        labelKey: "internships.activities.studentInitialAssessment",
        status: "pending",
      },
    ],
    tutorObservationKey: "internships.observations.karim",
    documents: [
      { labelKey: "internships.documents.agreement", status: "available" },
      {
        labelKey: "internships.documents.attendanceCertificate",
        status: "missing",
      },
      { labelKey: "internships.documents.finalReport", status: "missing" },
    ],
  },
  {
    id: "stage-4",
    studentId: "s7",
    studentName: "Thomas Roussel",
    company: "École de conduite Erdre",
    city: "Orvault",
    tutor: "Nicolas Petit",
    startDate: "02/11/2026",
    endDate: "11/12/2026",
    plannedHours: 175,
    completedHours: 0,
    status: "planned",
    trainerVisible: false,
    activities: [
      {
        labelKey: "internships.activities.observeDrivingLessons",
        status: "pending",
      },
      {
        labelKey: "internships.activities.leadTheorySession",
        status: "pending",
      },
      {
        labelKey: "internships.activities.pedagogicalAppointment",
        status: "pending",
      },
      { labelKey: "internships.activities.lessonPlan", status: "pending" },
      {
        labelKey: "internships.activities.studentInitialAssessment",
        status: "pending",
      },
    ],
    tutorObservationKey: "internships.observations.notStarted",
    documents: [
      { labelKey: "internships.documents.agreement", status: "available" },
      {
        labelKey: "internships.documents.attendanceCertificate",
        status: "missing",
      },
      { labelKey: "internships.documents.finalReport", status: "missing" },
    ],
  },
];
