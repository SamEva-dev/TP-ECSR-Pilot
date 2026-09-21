import { Routes } from "@angular/router";
import { authGuard } from "./core/session/auth.guard";
import { roleGuard } from "./core/session/role.guard";

const trainingRoles = ["direction", "formateur", "stagiaire", "secretariat"] as const;
const managementRoles = ["direction", "secretariat"] as const;

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
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/home/home.component").then((m) => m.HomeComponent),
      },
      {
        path: "organisation",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/organization-dashboard/organization-dashboard.component").then(
            (m) => m.OrganizationDashboardComponent,
          ),
      },
      {
        path: "etablissements",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/sites/sites.component").then((m) => m.SitesComponent),
      },
      {
        path: "etablissements/:id",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/sites/site-detail/site-detail.component").then(
            (m) => m.SiteDetailComponent,
          ),
      },
      {
        path: "formations",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/programs/programs.component").then(
            (m) => m.ProgramsComponent,
          ),
      },
      {
        path: "formations/:id",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/programs/program-detail/program-detail.component").then(
            (m) => m.ProgramDetailComponent,
          ),
      },
      {
        path: "referentiels",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/referentials/referentials.component").then(
            (m) => m.ReferentialsComponent,
          ),
      },
      {
        path: "referentiels/:id",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/referentials/referential-detail/referential-detail.component").then(
            (m) => m.ReferentialDetailComponent,
          ),
      },
      {
        path: "planning",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/planning/planning.component").then(
            (m) => m.PlanningComponent,
          ),
      },
      {
        path: "teletravail",
        canActivate: [roleGuard],
        data: { roles: ["direction", "formateur", "secretariat"] },
        loadComponent: () =>
          import("./features/remote-work/remote-work.component").then(
            (m) => m.RemoteWorkComponent,
          ),
      },
      {
        path: "distanciel",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/distance-learning/distance-learning.component").then(
            (m) => m.DistanceLearningComponent,
          ),
      },
      {
        path: "stagiaires",
        canActivate: [roleGuard],
        data: { roles: ["direction", "formateur", "secretariat"] },
        loadComponent: () =>
          import("./features/students/students.component").then(
            (m) => m.StudentsComponent,
          ),
      },
      {
        path: "stagiaires/:id",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/students/student-detail/student-detail.component").then(
            (m) => m.StudentDetailComponent,
          ),
      },
      {
        path: "promotions",
        canActivate: [roleGuard],
        data: { roles: managementRoles },
        loadComponent: () =>
          import("./features/promotions/promotions.component").then(
            (m) => m.PromotionsComponent,
          ),
      },
      {
        path: "seances",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/sessions/sessions.component").then(
            (m) => m.SessionsComponent,
          ),
      },
      {
        path: "conduite",
        canActivate: [roleGuard],
        data: { roles: ["direction", "formateur", "stagiaire"] },
        loadComponent: () =>
          import("./features/driving/driving.component").then(
            (m) => m.DrivingComponent,
          ),
      },
      {
        path: "fiches",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/sheets/sheets.component").then(
            (m) => m.SheetsComponent,
          ),
      },
      {
        path: "competences",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/skills/skills.component").then(
            (m) => m.SkillsComponent,
          ),
      },
      {
        path: "presences",
        canActivate: [roleGuard],
        data: { roles: ["direction", "formateur", "secretariat"] },
        loadComponent: () =>
          import("./features/attendance/attendance.component").then(
            (m) => m.AttendanceComponent,
          ),
      },
      {
        path: "stages",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/internships/internships.component").then(
            (m) => m.InternshipsComponent,
          ),
      },
      {
        path: "documents",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/documents/documents.component").then(
            (m) => m.DocumentsComponent,
          ),
      },
      {
        path: "certification",
        canActivate: [roleGuard],
        data: { roles: trainingRoles },
        loadComponent: () =>
          import("./features/certification/certification.component").then(
            (m) => m.CertificationComponent,
          ),
      },
      {
        path: "certification/sessions/:id",
        canActivate: [roleGuard],
        data: { roles: managementRoles },
        loadComponent: () =>
          import("./features/certification/exam-session-detail/exam-session-detail.component").then(
            (m) => m.ExamSessionDetailComponent,
          ),
      },
      {
        path: "certification/candidats/:id",
        canActivate: [roleGuard],
        data: {
          roles: ["direction", "formateur", "secretariat", "stagiaire", "jury"],
        },
        loadComponent: () =>
          import("./features/certification/candidate-certification/candidate-certification.component").then(
            (m) => m.CandidateCertificationComponent,
          ),
      },
      {
        path: "jury",
        canActivate: [roleGuard],
        data: { roles: ["jury"] },
        loadComponent: () =>
          import("./features/jury/jury.component").then((m) => m.JuryComponent),
      },
      {
        path: "resultats",
        canActivate: [roleGuard],
        data: { roles: managementRoles },
        loadComponent: () =>
          import("./features/results/results.component").then(
            (m) => m.ResultsComponent,
          ),
      },
      {
        path: "reussites",
        canActivate: [roleGuard],
        data: { roles: managementRoles },
        loadComponent: () =>
          import("./features/success/success.component").then(
            (m) => m.SuccessComponent,
          ),
      },
      {
        path: "reussites/:promotionId",
        canActivate: [roleGuard],
        data: { roles: managementRoles },
        loadComponent: () =>
          import("./features/success/success.component").then(
            (m) => m.SuccessComponent,
          ),
      },
      {
        path: "rapports",
        canActivate: [roleGuard],
        data: { roles: managementRoles },
        loadComponent: () =>
          import("./features/reports/reports.component").then(
            (m) => m.ReportsComponent,
          ),
      },
      {
        path: "statistiques",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/statistics/statistics.component").then(
            (m) => m.StatisticsComponent,
          ),
      },
      {
        path: "acces",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/access/access.component").then(
            (m) => m.AccessComponent,
          ),
      },
      {
        path: "administration/fiches",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/administration/sheets-configuration/sheets-configuration.component").then(
            (m) => m.SheetsConfigurationComponent,
          ),
      },
      {
        path: "administration",
        canActivate: [roleGuard],
        data: { roles: ["direction"] },
        loadComponent: () =>
          import("./features/administration/administration.component").then(
            (m) => m.AdministrationComponent,
          ),
      },
    ],
  },
  { path: "**", redirectTo: "connexion" },
];
