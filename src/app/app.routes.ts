import { Routes } from "@angular/router";
import { authGuard } from "./core/session/auth.guard";
import { directionGuard } from "./core/session/direction.guard";
const placeholder = (titleKey: string) => ({
  loadComponent: () =>
    import("./features/placeholder/feature-placeholder.component").then(
      (m) => m.FeaturePlaceholderComponent,
    ),
  data: { titleKey },
});
export const routes: Routes = [
  { path: "", pathMatch: "full", redirectTo: "connexion" },
  {
    path: "connexion",
    loadComponent: () =>
      import("./features/auth/auth.component").then((m) => m.AuthComponent),
  },
  {
    path: "inscription",
    loadComponent: () =>
      import("./features/auth/auth.component").then((m) => m.AuthComponent),
    data: { mode: "register" },
  },
  {
    path: "",
    canActivate: [authGuard],
    loadComponent: () =>
      import("./layout/app-shell/app-shell.component").then(
        (m) => m.AppShellComponent,
      ),
    children: [
      {
        path: "accueil",
        loadComponent: () =>
          import("./features/home/home.component").then((m) => m.HomeComponent),
      },
      {
        path: "planning",
        loadComponent: () =>
          import("./features/planning/planning.component").then(
            (m) => m.PlanningComponent,
          ),
      },
      { path: "planning/nouveau", ...placeholder("planning.add") },
      {
        path: "stagiaires",
        loadComponent: () =>
          import("./features/students/students.component").then(
            (m) => m.StudentsComponent,
          ),
      },
      { path: "stagiaires/nouveau", ...placeholder("students.add") },
      {
        path: "stagiaires/:id",
        loadComponent: () =>
          import("./features/students/student-detail/student-detail.component").then(
            (m) => m.StudentDetailComponent,
          ),
      },
      {
        path: "promotions",
        loadComponent: () =>
          import("./features/promotions/promotions.component").then(
            (m) => m.PromotionsComponent,
          ),
      },
      { path: "promotions/nouveau", ...placeholder("promotions.create") },
      {
        path: "seances",
        loadComponent: () =>
          import("./features/sessions/sessions.component").then(
            (m) => m.SessionsComponent,
          ),
      },
      {
        path: "conduite",
        loadComponent: () =>
          import("./features/driving/driving.component").then(
            (m) => m.DrivingComponent,
          ),
      },
      {
        path: "fiches",
        loadComponent: () =>
          import("./features/sheets/sheets.component").then(
            (m) => m.SheetsComponent,
          ),
      },
      {
        path: "competences",
        loadComponent: () =>
          import("./features/skills/skills.component").then(
            (m) => m.SkillsComponent,
          ),
      },
      {
        path: "presences",
        loadComponent: () =>
          import("./features/attendance/attendance.component").then(
            (m) => m.AttendanceComponent,
          ),
      },
      {
        path: "stages",
        loadComponent: () =>
          import("./features/internships/internships.component").then(
            (m) => m.InternshipsComponent,
          ),
      },
      { path: "stages/nouveau", ...placeholder("internships.newPeriod") },
      {
        path: "documents",
        loadComponent: () =>
          import("./features/documents/documents.component").then(
            (m) => m.DocumentsComponent,
          ),
      },
      {
        path: "certification",
        loadComponent: () =>
          import("./features/certification/certification.component").then(
            (m) => m.CertificationComponent,
          ),
      },
      {
        path: "certification/sessions/:id",
        loadComponent: () =>
          import("./features/certification/exam-session-detail/exam-session-detail.component").then(
            (m) => m.ExamSessionDetailComponent,
          ),
      },
      {
        path: "certification/candidats/:id",
        loadComponent: () =>
          import("./features/certification/candidate-certification/candidate-certification.component").then(
            (m) => m.CandidateCertificationComponent,
          ),
      },
      {
        path: "jury",
        loadComponent: () =>
          import("./features/jury/jury.component").then((m) => m.JuryComponent),
      },
      {
        path: "resultats",
        loadComponent: () =>
          import("./features/results/results.component").then(
            (m) => m.ResultsComponent,
          ),
      },
      {
        path: "reussites",
        loadComponent: () =>
          import("./features/success/success.component").then(
            (m) => m.SuccessComponent,
          ),
      },
      {
        path: "reussites/:promotionId",
        loadComponent: () =>
          import("./features/success/success.component").then(
            (m) => m.SuccessComponent,
          ),
      },
      {
        path: "rapports",
        loadComponent: () =>
          import("./features/reports/reports.component").then(
            (m) => m.ReportsComponent,
          ),
      },
      {
        path: "statistiques",
        loadComponent: () =>
          import("./features/statistics/statistics.component").then(
            (m) => m.StatisticsComponent,
          ),
      },
      {
        path: "acces",
        canActivate: [directionGuard],
        loadComponent: () =>
          import("./features/access/access.component").then(
            (m) => m.AccessComponent,
          ),
      },
      {
        path: "administration/fiches",
        canActivate: [directionGuard],
        loadComponent: () =>
          import("./features/administration/sheets-configuration/sheets-configuration.component").then(
            (m) => m.SheetsConfigurationComponent,
          ),
      },
      {
        path: "administration",
        canActivate: [directionGuard],
        loadComponent: () =>
          import("./features/administration/administration.component").then(
            (m) => m.AdministrationComponent,
          ),
      },
    ],
  },
  { path: "**", redirectTo: "connexion" },
];
