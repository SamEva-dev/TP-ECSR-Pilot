import { Routes } from "@angular/router";
import { authGuard } from "./core/session/auth.guard";
import { roleGuard } from "./core/session/role.guard";

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
        canActivate: [roleGuard],
        data: { permission: "home.view" },
        loadComponent: () =>
          import("./features/home/home.component").then((m) => m.HomeComponent),
      },
      {
        path: "organisation",
        canActivate: [roleGuard],
        data: { permission: "organization.dashboard" },
        loadComponent: () =>
          import("./features/organization-dashboard/organization-dashboard.component").then(
            (m) => m.OrganizationDashboardComponent,
          ),
      },
      {
        path: "etablissements",
        canActivate: [roleGuard],
        data: { permission: "sites.view" },
        loadComponent: () =>
          import("./features/sites/sites.component").then((m) => m.SitesComponent),
      },
      {
        path: "etablissements/:id",
        canActivate: [roleGuard],
        data: { permission: "sites.view" },
        loadComponent: () =>
          import("./features/sites/site-detail/site-detail.component").then(
            (m) => m.SiteDetailComponent,
          ),
      },
      {
        path: "formations",
        canActivate: [roleGuard],
        data: { permission: "programs.view" },
        loadComponent: () =>
          import("./features/programs/programs.component").then(
            (m) => m.ProgramsComponent,
          ),
      },
      {
        path: "formations/:id",
        canActivate: [roleGuard],
        data: { permission: "programs.view" },
        loadComponent: () =>
          import("./features/programs/program-detail/program-detail.component").then(
            (m) => m.ProgramDetailComponent,
          ),
      },
      {
        path: "referentiels",
        canActivate: [roleGuard],
        data: { permission: "referentials.view" },
        loadComponent: () =>
          import("./features/referentials/referentials.component").then(
            (m) => m.ReferentialsComponent,
          ),
      },
      {
        path: "referentiels/:id",
        canActivate: [roleGuard],
        data: { permission: "referentials.view" },
        loadComponent: () =>
          import("./features/referentials/referential-detail/referential-detail.component").then(
            (m) => m.ReferentialDetailComponent,
          ),
      },
      {
        path: "planning",
        canActivate: [roleGuard],
        data: { permission: "planning.view" },
        loadComponent: () =>
          import("./features/planning/planning.component").then(
            (m) => m.PlanningComponent,
          ),
      },
      {
        path: "teletravail",
        canActivate: [roleGuard],
        data: { permission: "remoteWork.view" },
        loadComponent: () =>
          import("./features/remote-work/remote-work.component").then(
            (m) => m.RemoteWorkComponent,
          ),
      },
      {
        path: "distanciel",
        canActivate: [roleGuard],
        data: { permission: "distanceLearning.view" },
        loadComponent: () =>
          import("./features/distance-learning/distance-learning.component").then(
            (m) => m.DistanceLearningComponent,
          ),
      },
      {
        path: "stagiaires",
        canActivate: [roleGuard],
        data: { permission: "students.view" },
        loadComponent: () =>
          import("./features/students/students.component").then(
            (m) => m.StudentsComponent,
          ),
      },
      {
        path: "stagiaires/:id",
        canActivate: [roleGuard],
        data: { permission: "studentDetail.view" },
        loadComponent: () =>
          import("./features/students/student-detail/student-detail.component").then(
            (m) => m.StudentDetailComponent,
          ),
      },
      {
        path: "promotions",
        canActivate: [roleGuard],
        data: { permission: "promotions.view" },
        loadComponent: () =>
          import("./features/promotions/promotions.component").then(
            (m) => m.PromotionsComponent,
          ),
      },
      {
        path: "seances",
        canActivate: [roleGuard],
        data: { permission: "sessions.view" },
        loadComponent: () =>
          import("./features/sessions/sessions.component").then(
            (m) => m.SessionsComponent,
          ),
      },
      {
        path: "conduite",
        canActivate: [roleGuard],
        data: { permission: "driving.view" },
        loadComponent: () =>
          import("./features/driving/driving.component").then(
            (m) => m.DrivingComponent,
          ),
      },
      {
        path: "fiches",
        canActivate: [roleGuard],
        data: { permission: "sheets.view" },
        loadComponent: () =>
          import("./features/sheets/sheets.component").then(
            (m) => m.SheetsComponent,
          ),
      },
      {
        path: "competences",
        canActivate: [roleGuard],
        data: { permission: "skills.view" },
        loadComponent: () =>
          import("./features/skills/skills.component").then(
            (m) => m.SkillsComponent,
          ),
      },
      {
        path: "presences",
        canActivate: [roleGuard],
        data: { permission: "attendance.view" },
        loadComponent: () =>
          import("./features/attendance/attendance.component").then(
            (m) => m.AttendanceComponent,
          ),
      },
      {
        path: "stages",
        canActivate: [roleGuard],
        data: { permission: "internships.view" },
        loadComponent: () =>
          import("./features/internships/internships.component").then(
            (m) => m.InternshipsComponent,
          ),
      },
      {
        path: "documents",
        canActivate: [roleGuard],
        data: { permission: "documents.view" },
        loadComponent: () =>
          import("./features/documents/documents.component").then(
            (m) => m.DocumentsComponent,
          ),
      },
      {
        path: "certification",
        canActivate: [roleGuard],
        data: { permission: "certification.view" },
        loadComponent: () =>
          import("./features/certification/certification.component").then(
            (m) => m.CertificationComponent,
          ),
      },
      {
        path: "certification/sessions/:id",
        canActivate: [roleGuard],
        data: { permission: "certification.manage" },
        loadComponent: () =>
          import("./features/certification/exam-session-detail/exam-session-detail.component").then(
            (m) => m.ExamSessionDetailComponent,
          ),
      },
      {
        path: "certification/candidats/:id",
        canActivate: [roleGuard],
        data: { permission: "candidateCertification.view" },
        loadComponent: () =>
          import("./features/certification/candidate-certification/candidate-certification.component").then(
            (m) => m.CandidateCertificationComponent,
          ),
      },
      {
        path: "jury",
        canActivate: [roleGuard],
        data: { permission: "jury.view" },
        loadComponent: () =>
          import("./features/jury/jury.component").then((m) => m.JuryComponent),
      },
      {
        path: "resultats",
        canActivate: [roleGuard],
        data: { permission: "results.view" },
        loadComponent: () =>
          import("./features/results/results.component").then(
            (m) => m.ResultsComponent,
          ),
      },
      {
        path: "reussites",
        canActivate: [roleGuard],
        data: { permission: "success.view" },
        loadComponent: () =>
          import("./features/success/success.component").then(
            (m) => m.SuccessComponent,
          ),
      },
      {
        path: "reussites/:promotionId",
        canActivate: [roleGuard],
        data: { permission: "success.view" },
        loadComponent: () =>
          import("./features/success/success.component").then(
            (m) => m.SuccessComponent,
          ),
      },
      {
        path: "rapports",
        canActivate: [roleGuard],
        data: { permission: "reports.view" },
        loadComponent: () =>
          import("./features/reports/reports.component").then(
            (m) => m.ReportsComponent,
          ),
      },
      {
        path: "statistiques",
        canActivate: [roleGuard],
        data: { permission: "statistics.view" },
        loadComponent: () =>
          import("./features/statistics/statistics.component").then(
            (m) => m.StatisticsComponent,
          ),
      },
      {
        path: "acces",
        canActivate: [roleGuard],
        data: { permission: "access.manage" },
        loadComponent: () =>
          import("./features/access/access.component").then(
            (m) => m.AccessComponent,
          ),
      },
      {
        path: "administration/fiches",
        canActivate: [roleGuard],
        data: { permission: "administration.manage" },
        loadComponent: () =>
          import("./features/administration/sheets-configuration/sheets-configuration.component").then(
            (m) => m.SheetsConfigurationComponent,
          ),
      },
      {
        path: "administration",
        canActivate: [roleGuard],
        data: { permission: "administration.manage" },
        loadComponent: () =>
          import("./features/administration/administration.component").then(
            (m) => m.AdministrationComponent,
          ),
      },
    ],
  },
  { path: "**", redirectTo: "connexion" },
];
