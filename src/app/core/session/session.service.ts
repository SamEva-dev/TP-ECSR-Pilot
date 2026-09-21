import { Injectable, computed, signal } from "@angular/core";
import type { DemoSession, UserRole } from "../models/app.models";
const STORAGE_KEY = "tp-ecsr-pilot.session";
const LEGACY_KEY = "tp-ecsr-pilot.demo-session";
const DEMO: Record<UserRole, DemoSession> = {
  direction: {
    role: "direction",
    firstName: "Claire",
    lastName: "Berthier",
    promotionId: "p1",
    email: "claire@demo.tpecsrpilot.fr",
  },
  formateur: {
    role: "formateur",
    firstName: "Marc",
    lastName: "Dupont",
    promotionId: "p1",
    email: "marc@demo.tpecsrpilot.fr",
    trainerId: "f1",
  },
  stagiaire: {
    role: "stagiaire",
    firstName: "Sam",
    lastName: "Fokam",
    promotionId: "p1",
    email: "sam@demo.tpecsrpilot.fr",
    studentId: "s1",
  },
  secretariat: {
    role: "secretariat",
    firstName: "Nadia",
    lastName: "Lambert",
    promotionId: "p1",
    email: "nadia@demo.tpecsrpilot.fr",
  },
  jury: {
    role: "jury",
    firstName: "Jean",
    lastName: "Martin",
    promotionId: "p1",
    email: "jury@demo.tpecsrpilot.fr",
    juryId: "j1",
  },
};
@Injectable({ providedIn: "root" })
export class SessionService {
  private readonly sessionSignal = signal<DemoSession | null>(this.restore());
  private readonly promotionSignal = signal(
    this.sessionSignal()?.promotionId ?? "p1",
  );
  readonly session = this.sessionSignal.asReadonly();
  readonly promotionId = this.promotionSignal.asReadonly();
  readonly isConnected = computed(() => this.sessionSignal() !== null);
  readonly role = computed<UserRole>(
    () => this.sessionSignal()?.role ?? "direction",
  );
  connectFromEmail(email: string): void {
    const e = email.trim().toLowerCase();
    let role: UserRole = "direction";
    if (e.includes("marc") || e.includes("formateur") || e.includes("trainer"))
      role = "formateur";
    else if (
      e.includes("sam") ||
      e.includes("stagiaire") ||
      e.includes("student")
    )
      role = "stagiaire";
    else if (
      e.includes("nadia") ||
      e.includes("secretariat") ||
      e.includes("secretaire")
    )
      role = "secretariat";
    else if (e.includes("jury") || e.includes("juré") || e.includes("jure"))
      role = "jury";
    this.connect({ ...DEMO[role], email });
  }
  connectRegistration(v: {
    email: string;
    firstName: string;
    lastName: string;
    organisation: string;
  }): void {
    this.connect({
      role: "direction",
      firstName: v.firstName,
      lastName: v.lastName,
      promotionId: "p1",
      email: v.email,
      organisation: v.organisation,
    });
  }
  setPromotion(id: string): void {
    this.promotionSignal.set(id);
    const s = this.sessionSignal();
    if (s) {
      const n = { ...s, promotionId: id };
      this.sessionSignal.set(n);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
    }
  }
  disconnect(): void {
    this.sessionSignal.set(null);
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(LEGACY_KEY);
  }
  initials(): string {
    const s = this.sessionSignal();
    return s ? `${s.firstName[0]}${s.lastName[0]}`.toUpperCase() : "--";
  }
  private connect(s: DemoSession): void {
    this.sessionSignal.set(s);
    this.promotionSignal.set(s.promotionId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    localStorage.removeItem(LEGACY_KEY);
  }
  private restore(): DemoSession | null {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        return JSON.parse(raw) as DemoSession;
      } catch {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    const old = localStorage.getItem(LEGACY_KEY);
    if (old) {
      try {
        const e = (
          (JSON.parse(old) as { email?: string }).email ?? ""
        ).toLowerCase();
        if (e.includes("marc")) return DEMO.formateur;
        if (e.includes("sam")) return DEMO.stagiaire;
        if (e.includes("nadia")) return DEMO.secretariat;
        if (e.includes("jury") || e.includes("jure")) return DEMO.jury;
        return DEMO.direction;
      } catch {
        localStorage.removeItem(LEGACY_KEY);
      }
    }
    return null;
  }
}
