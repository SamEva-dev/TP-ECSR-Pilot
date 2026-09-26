export type DistancePlatform = "teams" | "zoom" | "meet" | "jitsi" | "other";
export type DistanceSessionStatus = "scheduled" | "live" | "closed";
export type DistanceAttendanceStatus = "present" | "late" | "absent" | "disconnected";
export type DistanceModuleStatus = "not-started" | "in-progress" | "completed" | "late";
export type DistanceResourceType = "document" | "video" | "link" | "exercise";
export type DistanceInteractionType = "quiz" | "poll" | "question" | "exercise";

export interface DistanceParticipant {
  id: string;
  studentId: string;
  name: string;
  attendance: DistanceAttendanceStatus;
  connectedAt?: string;
  disconnectedAt?: string;
  connectedMinutes: number;
  participation: number;
  completedActivities: number;
  activityCount: number;
}

export interface DistanceLiveSession {
  id: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortId: string;
  titleKey: string;
  trainer: string;
  date: string;
  start: string;
  end: string;
  platform: DistancePlatform;
  joinUrl: string;
  status: DistanceSessionStatus;
  expected: number;
  objectivesKey: string;
  participants: DistanceParticipant[];
  resourceIds: string[];
  interactionIds: string[];
}

export interface DistanceResource {
  id: string;
  titleKey: string;
  type: DistanceResourceType;
  durationMinutes?: number;
  viewedBy: number;
  totalStudents: number;
}

export interface DistanceInteraction {
  id: string;
  sessionId: string;
  titleKey: string;
  type: DistanceInteractionType;
  completed: number;
  expected: number;
  successRate?: number;
}

export interface DistanceModuleStep {
  id: string;
  labelKey: string;
  completed: boolean;
}

export interface DistanceAsyncModule {
  id: string;
  organizationId: string;
  siteId: string;
  programId: string;
  cohortId: string;
  titleKey: string;
  descriptionKey: string;
  estimatedMinutes: number;
  dueDate: string;
  trainer: string;
  status: DistanceModuleStatus;
  progress: number;
  completedStudents: number;
  expectedStudents: number;
  score?: number;
  steps: DistanceModuleStep[];
}

export interface DistanceSiteMetric {
  siteId: string;
  liveHours: number;
  asyncHours: number;
  activeStudents: number;
  completionRate: number;
  lateModules: number;
}

const ECSR_PARTICIPANTS: DistanceParticipant[] = [
  { id: "dp1", studentId: "s1", name: "Sam Fokam", attendance: "present", connectedAt: "13:56", disconnectedAt: "17:02", connectedMinutes: 186, participation: 92, completedActivities: 3, activityCount: 3 },
  { id: "dp2", studentId: "s2", name: "Julie Moreau", attendance: "present", connectedAt: "13:58", disconnectedAt: "17:01", connectedMinutes: 183, participation: 86, completedActivities: 3, activityCount: 3 },
  { id: "dp3", studentId: "s3", name: "Marc Girard", attendance: "present", connectedAt: "13:59", disconnectedAt: "17:00", connectedMinutes: 181, participation: 78, completedActivities: 2, activityCount: 3 },
  { id: "dp4", studentId: "s4", name: "Léa Perrin", attendance: "late", connectedAt: "14:18", disconnectedAt: "17:00", connectedMinutes: 162, participation: 70, completedActivities: 2, activityCount: 3 },
  { id: "dp5", studentId: "s5", name: "Karim Benali", attendance: "present", connectedAt: "13:55", disconnectedAt: "17:03", connectedMinutes: 188, participation: 94, completedActivities: 3, activityCount: 3 },
  { id: "dp6", studentId: "s6", name: "Nadia Chevalier", attendance: "disconnected", connectedAt: "13:57", disconnectedAt: "15:41", connectedMinutes: 104, participation: 46, completedActivities: 1, activityCount: 3 },
  { id: "dp7", studentId: "s7", name: "Thomas Roussel", attendance: "absent", connectedMinutes: 0, participation: 0, completedActivities: 0, activityCount: 3 },
  { id: "dp8", studentId: "s8", name: "Chloé Marchand", attendance: "present", connectedAt: "13:52", disconnectedAt: "17:00", connectedMinutes: 188, participation: 89, completedActivities: 3, activityCount: 3 },
  { id: "dp9", studentId: "s9", name: "Mehdi Amrani", attendance: "present", connectedAt: "13:58", disconnectedAt: "17:01", connectedMinutes: 183, participation: 82, completedActivities: 3, activityCount: 3 },
];

export const DISTANCE_RESOURCES: DistanceResource[] = [
  { id: "dr1", titleKey: "distanceLearning.demo.resources.reactionCourse", type: "document", viewedBy: 9, totalStudents: 9 },
  { id: "dr2", titleKey: "distanceLearning.demo.resources.brakingVideo", type: "video", durationMinutes: 8, viewedBy: 8, totalStudents: 9 },
  { id: "dr3", titleKey: "distanceLearning.demo.resources.distanceExercise", type: "exercise", viewedBy: 9, totalStudents: 9 },
  { id: "dr4", titleKey: "distanceLearning.demo.resources.alcoholCourse", type: "document", viewedBy: 7, totalStudents: 9 },
];

export const DISTANCE_INTERACTIONS: DistanceInteraction[] = [
  { id: "di1", sessionId: "dl-live-ecsr-1", titleKey: "distanceLearning.demo.interactions.reactionPoll", type: "poll", completed: 8, expected: 9 },
  { id: "di2", sessionId: "dl-live-ecsr-1", titleKey: "distanceLearning.demo.interactions.distanceQuiz", type: "quiz", completed: 8, expected: 9, successRate: 81 },
  { id: "di3", sessionId: "dl-live-ecsr-1", titleKey: "distanceLearning.demo.interactions.pairExercise", type: "exercise", completed: 7, expected: 9 },
];

export const DISTANCE_LIVE_SESSIONS: DistanceLiveSession[] = [
  {
    id: "dl-live-ecsr-1",
    organizationId: "org-aftral",
    siteId: "site-aftral-nice",
    programId: "program-ecsr",
    cohortId: "p1",
    titleKey: "distanceLearning.demo.sessions.reactionDistances",
    trainer: "Marc Dupont",
    date: "21/09/2026",
    start: "14:00",
    end: "17:00",
    platform: "teams",
    joinUrl: "https://teams.microsoft.com/l/meetup-join/demo",
    status: "live",
    expected: 9,
    objectivesKey: "distanceLearning.demo.sessions.reactionObjectives",
    participants: ECSR_PARTICIPANTS,
    resourceIds: ["dr1", "dr2", "dr3"],
    interactionIds: ["di1", "di2", "di3"],
  },
  {
    id: "dl-live-ecsr-2",
    organizationId: "org-aftral",
    siteId: "site-aftral-nice",
    programId: "program-ecsr",
    cohortId: "p1",
    titleKey: "distanceLearning.demo.sessions.alcohol",
    trainer: "Claire Berthier",
    date: "24/09/2026",
    start: "09:00",
    end: "12:00",
    platform: "zoom",
    joinUrl: "https://zoom.us/j/demo",
    status: "scheduled",
    expected: 9,
    objectivesKey: "distanceLearning.demo.sessions.alcoholObjectives",
    participants: ECSR_PARTICIPANTS.map((item) => ({ ...item, attendance: "present", connectedMinutes: 0, connectedAt: undefined, disconnectedAt: undefined })),
    resourceIds: ["dr4"],
    interactionIds: [],
  },
  {
    id: "dl-live-mrs-1",
    organizationId: "org-aftral",
    siteId: "site-aftral-marseille",
    programId: "program-ecsr",
    cohortId: "cohort-mrs-ecsr-2026",
    titleKey: "distanceLearning.demo.sessions.roadRisk",
    trainer: "Sophie Lemaire",
    date: "23/09/2026",
    start: "13:30",
    end: "16:30",
    platform: "meet",
    joinUrl: "https://meet.google.com/demo",
    status: "scheduled",
    expected: 16,
    objectivesKey: "distanceLearning.demo.sessions.roadRiskObjectives",
    participants: [],
    resourceIds: ["dr1"],
    interactionIds: [],
  },
  {
    id: "dl-live-pl-1",
    organizationId: "org-aftral",
    siteId: "site-aftral-nice",
    programId: "program-pl",
    cohortId: "cohort-nice-pl-2027-01",
    titleKey: "distanceLearning.demo.sessions.plRegulation",
    trainer: "Ibrahim Traoré",
    date: "18/01/2027",
    start: "09:00",
    end: "11:00",
    platform: "teams",
    joinUrl: "https://teams.microsoft.com/l/meetup-join/demo-pl",
    status: "scheduled",
    expected: 12,
    objectivesKey: "distanceLearning.demo.sessions.plObjectives",
    participants: [],
    resourceIds: [],
    interactionIds: [],
  },
];

export const DISTANCE_ASYNC_MODULES: DistanceAsyncModule[] = [
  {
    id: "dam1",
    organizationId: "org-aftral",
    siteId: "site-aftral-nice",
    programId: "program-ecsr",
    cohortId: "p1",
    titleKey: "distanceLearning.demo.modules.alcohol",
    descriptionKey: "distanceLearning.demo.modules.alcoholDescription",
    estimatedMinutes: 90,
    dueDate: "24/09/2026",
    trainer: "Marc Dupont",
    status: "in-progress",
    progress: 75,
    completedStudents: 6,
    expectedStudents: 9,
    score: 80,
    steps: [
      { id: "s1", labelKey: "distanceLearning.steps.readCourse", completed: true },
      { id: "s2", labelKey: "distanceLearning.steps.watchVideo", completed: true },
      { id: "s3", labelKey: "distanceLearning.steps.exercise", completed: true },
      { id: "s4", labelKey: "distanceLearning.steps.quiz", completed: false },
    ],
  },
  {
    id: "dam2",
    organizationId: "org-aftral",
    siteId: "site-aftral-nice",
    programId: "program-ecsr",
    cohortId: "p1",
    titleKey: "distanceLearning.demo.modules.ecoDriving",
    descriptionKey: "distanceLearning.demo.modules.ecoDrivingDescription",
    estimatedMinutes: 120,
    dueDate: "28/09/2026",
    trainer: "Claire Berthier",
    status: "not-started",
    progress: 0,
    completedStudents: 0,
    expectedStudents: 9,
    steps: [
      { id: "s1", labelKey: "distanceLearning.steps.readCourse", completed: false },
      { id: "s2", labelKey: "distanceLearning.steps.watchVideo", completed: false },
      { id: "s3", labelKey: "distanceLearning.steps.exercise", completed: false },
      { id: "s4", labelKey: "distanceLearning.steps.quiz", completed: false },
    ],
  },
  {
    id: "dam3",
    organizationId: "org-aftral",
    siteId: "site-aftral-nice",
    programId: "program-ecsr",
    cohortId: "p1",
    titleKey: "distanceLearning.demo.modules.insurance",
    descriptionKey: "distanceLearning.demo.modules.insuranceDescription",
    estimatedMinutes: 75,
    dueDate: "18/09/2026",
    trainer: "Marc Dupont",
    status: "late",
    progress: 50,
    completedStudents: 5,
    expectedStudents: 9,
    score: 70,
    steps: [
      { id: "s1", labelKey: "distanceLearning.steps.readCourse", completed: true },
      { id: "s2", labelKey: "distanceLearning.steps.watchVideo", completed: true },
      { id: "s3", labelKey: "distanceLearning.steps.exercise", completed: false },
      { id: "s4", labelKey: "distanceLearning.steps.quiz", completed: false },
    ],
  },
  {
    id: "dam-mrs-1",
    organizationId: "org-aftral",
    siteId: "site-aftral-marseille",
    programId: "program-ecsr",
    cohortId: "cohort-mrs-ecsr-2026",
    titleKey: "distanceLearning.demo.modules.roadRisk",
    descriptionKey: "distanceLearning.demo.modules.roadRiskDescription",
    estimatedMinutes: 105,
    dueDate: "30/09/2026",
    trainer: "Sophie Lemaire",
    status: "in-progress",
    progress: 62,
    completedStudents: 9,
    expectedStudents: 16,
    steps: [
      { id: "s1", labelKey: "distanceLearning.steps.readCourse", completed: true },
      { id: "s2", labelKey: "distanceLearning.steps.watchVideo", completed: true },
      { id: "s3", labelKey: "distanceLearning.steps.exercise", completed: false },
      { id: "s4", labelKey: "distanceLearning.steps.quiz", completed: false },
    ],
  },
];

export const DISTANCE_SITE_METRICS: DistanceSiteMetric[] = [
  { siteId: "site-aftral-nice", liveHours: 84, asyncHours: 41, activeStudents: 126, completionRate: 82, lateModules: 7 },
  { siteId: "site-aftral-marseille", liveHours: 72, asyncHours: 34, activeStudents: 118, completionRate: 78, lateModules: 9 },
  { siteId: "site-aftral-toulouse", liveHours: 66, asyncHours: 29, activeStudents: 94, completionRate: 85, lateModules: 4 },
];
