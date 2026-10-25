import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  signal,
} from "@angular/core";
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from "@angular/forms";
import { ActivatedRoute, Router } from "@angular/router";
import { firstValueFrom } from "rxjs";
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { TranslateService } from "../../core/i18n/translate.service";
import type { UserRole } from "../../core/models/app.models";
import {
  AuthGateService,
  type AuthGateLoginResponse,
  type AuthGateRegistrationResponse,
} from "../../core/session/auth-gate.service";
import { AuthTokenStore } from "../../core/session/auth-token.store";
import { SessionService } from "../../core/session/session.service";
import { PublishedBrandingService } from "../../core/branding/published-branding.service";
import { environment } from "../../environments/environment";

type DemoProfile = {
  role: UserRole;
  titleKey: string;
  descriptionKey: string;
  email: string;
  password: string;
};

@Component({
  selector: "app-auth",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./auth.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authGate = inject(AuthGateService);
  private readonly tokens = inject(AuthTokenStore);
  private readonly session = inject(SessionService);
  private readonly translate = inject(TranslateService);
  readonly publishedBranding = inject(PublishedBrandingService);
  readonly publishedTheme = this.publishedBranding.configuration;
  readonly publishedLogo = computed(() => this.publishedBranding.assetUrl(this.publishedTheme()?.logoAssetId));
  readonly publishedBackground = computed(() => this.publishedBranding.assetUrl(this.publishedTheme()?.backgroundAssetId));

  constructor() {
    // Resolve the published theme whenever the login URL changes.
    // The public endpoint currently accepts organization GUIDs only.
    this.route.queryParamMap.subscribe(params => {
      void this.publishedBranding.load(params.get("org"));
    });
  }


  readonly demoLoginEnabled = environment.demoLoginEnabled;
  readonly mode = signal<"login" | "register">(
    this.route.snapshot.data["mode"] === "register" ? "register" : "login",
  );
  readonly isRegister = computed(() => this.mode() === "register");

  readonly loginStep = signal<"email" | "password" | "mfa" | "password-change">(
    "email",
  );
  readonly loading = signal(false);
  readonly message = signal("");
  readonly error = signal("");
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly submitted = signal(false);
  private pendingMfaToken = "";
  private pendingCurrentPassword = "";

  readonly demoProfiles: readonly DemoProfile[] = [
    {
      role: "direction",
      titleKey: "auth.demoProfiles.direction.title",
      descriptionKey: "auth.demoProfiles.direction.description",
      email: "",
      password: "",
    },
    {
      role: "formateur",
      titleKey: "auth.demoProfiles.trainer.title",
      descriptionKey: "auth.demoProfiles.trainer.description",
      email: "",
      password: "",
    },
    {
      role: "stagiaire",
      titleKey: "auth.demoProfiles.student.title",
      descriptionKey: "auth.demoProfiles.student.description",
      email: "",
      password: "",
    },
    {
      role: "secretariat",
      titleKey: "auth.demoProfiles.secretariat.title",
      descriptionKey: "auth.demoProfiles.secretariat.description",
      email: "",
      password: "",
    },
    {
      role: "jury",
      titleKey: "auth.demoProfiles.jury.title",
      descriptionKey: "auth.demoProfiles.jury.description",
      email: "",
      password: "",
    },
  ];

  readonly selectedDemoRole = signal<UserRole>("direction");

  readonly demoLoginForm = new FormGroup({
    email: new FormControl(this.demoProfiles[0].email, {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl(this.demoProfiles[0].password, {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  readonly loginForm = new FormGroup({
    email: new FormControl(
      this.route.snapshot.queryParamMap.get("email") ?? "",
      {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      },
    ),
    password: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    rememberMe: new FormControl(true, { nonNullable: true }),
  });

  readonly registerForm = new FormGroup({
    organisation: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    firstName: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    lastName: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    phone: new FormControl("", { nonNullable: true }),
    email: new FormControl(
      this.route.snapshot.queryParamMap.get("email") ?? "",
      {
        nonNullable: true,
        validators: [Validators.required, Validators.email],
      },
    ),
    password: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });

  selectDemoProfile(profile: DemoProfile): void {
    this.selectedDemoRole.set(profile.role);
    this.demoLoginForm.setValue({
      email: profile.email,
      password: profile.password,
    });
    this.submitted.set(false);
  }

  private signInRedirect(): string {
    const destination = this.route.snapshot.queryParamMap.get('returnUrl') ?? '';
    // Whitelist internal signing routes: never use untrusted external redirects.
    return /^\/signatures\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(destination)
      ? destination : (this.session.role() === 'jury' ? '/jury' : '/accueil');
  }

  async submitDemoLogin(): Promise<void> {
    this.submitted.set(true);
    this.error.set("");
    this.message.set("");

    if (this.demoLoginForm.invalid) {
      this.demoLoginForm.markAllAsTouched();
      return;
    }

    const credentials = this.demoLoginForm.getRawValue();
    this.loading.set(true);

    try {
      const result = await firstValueFrom(
        this.authGate.login({
          email: credentials.email,
          password: credentials.password,
          rememberMe: true,
          deviceFingerprint: this.deviceFingerprint(),
        }),
      );

      if (result.requiresMfa) {
        this.error.set(
          this.translate.instant("auth.errors.mfaNotYetSupported"),
        );
        return;
      }

      if (!result.accessToken) {
        this.error.set(this.translate.instant("auth.errors.loginFailed"));
        return;
      }

      // Demo mode uses a REAL AuthGate token and the REAL Pedagora APIs.
      // Role cards are illustrative only: credentials must be entered for a real AuthGate account.
      this.session.connectAuthenticatedToken(result.accessToken);

      await this.router.navigateByUrl(
        this.signInRedirect(),
      );
    } catch (e) {
      this.error.set(this.backendMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  simulateDemoRegister(): void {
    this.error.set("");
    this.message.set(this.translate.instant("auth.demoRegistrationDisabled"));
  }

  async submitLogin(): Promise<void> {
    this.submitted.set(true);
    this.error.set("");
    this.message.set("");

    const emailControl = this.loginForm.controls.email;
    if (emailControl.invalid) {
      emailControl.markAsTouched();
      return;
    }

    const email = emailControl.value.trim().toLowerCase();
    const step = this.loginStep();

    if (step === "email") {
      this.loading.set(true);
      try {
        const result = await firstValueFrom(this.authGate.prelogin(email));

        if (result.nextStep === "EmailConfirmationRequired") {
          await this.router.navigate(["/confirmation-email"], { queryParams: { email } });
          return;
        }

        if (result.nextStep === "ProvisioningPending") {
          await this.router.navigate(["/confirmation-email"], { queryParams: { email, provisioning: "1" } });
          return;
        }

        if (result.nextStep === "Password") {
          this.loginStep.set("password");
          this.submitted.set(false);
          return;
        }

        if (
          result.nextStep === "Register" ||
          result.nextStep === "RegisterApplication"
        ) {
          await this.router.navigate(["/register"], {
            queryParams: { email },
          });
          return;
        }

        this.error.set(
          result.error ||
            this.translate.instant("auth.errors.preloginUnavailable"),
        );
      } catch (e) {
        this.error.set(this.backendMessage(e));
      } finally {
        this.loading.set(false);
      }
      return;
    }

    const passwordControl = this.loginForm.controls.password;
    if (passwordControl.invalid) {
      passwordControl.markAsTouched();
      return;
    }

    this.loading.set(true);
    try {
      if (step === "mfa") {
        const code = passwordControl.value.trim();
        if (!/^\d{6}$/.test(code) || !this.pendingMfaToken) {
          this.error.set(this.translate.instant("auth.errors.invalidMfaCode"));
          return;
        }

        const result = await firstValueFrom(
          this.authGate.verifyMfa(
            {
              mfaToken: this.pendingMfaToken,
              code,
              rememberDevice: this.loginForm.controls.rememberMe.value,
              deviceFingerprint: this.deviceFingerprint(),
            },
            this.loginForm.controls.rememberMe.value,
          ),
        );
        await this.handleAuthenticatedLogin(
          result,
          this.pendingCurrentPassword,
        );
        return;
      }

      if (step === "password-change") {
        const newPassword = passwordControl.value;
        if (newPassword.length < 8 || !this.pendingCurrentPassword) {
          this.error.set(
            this.translate.instant("auth.errors.passwordTooShort"),
          );
          return;
        }

        const result = await firstValueFrom(
          this.authGate.changePassword(
            this.pendingCurrentPassword,
            newPassword,
            this.loginForm.controls.rememberMe.value,
          ),
        );
        this.pendingCurrentPassword = "";
        this.pendingMfaToken = "";
        this.session.connectAuthenticatedToken(result.accessToken);
        await this.router.navigateByUrl(
          this.signInRedirect(),
        );
        return;
      }

      const currentPassword = passwordControl.value;
      const result = await firstValueFrom(
        this.authGate.login({
          email,
          password: currentPassword,
          rememberMe: this.loginForm.controls.rememberMe.value,
          deviceFingerprint: this.deviceFingerprint(),
        }),
      );

      if (result.requiresMfa) {
        this.pendingMfaToken = result.mfaToken ?? "";
        this.pendingCurrentPassword = currentPassword;
        if (!this.pendingMfaToken) {
          this.error.set(this.translate.instant("auth.errors.loginFailed"));
          return;
        }
        passwordControl.reset();
        this.loginStep.set("mfa");
        this.message.set(this.translate.instant("auth.mfaPrompt"));
        this.submitted.set(false);
        return;
      }

      await this.handleAuthenticatedLogin(result, currentPassword);
    } catch (e) {
      this.error.set(this.backendMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  private async handleAuthenticatedLogin(
    result: AuthGateLoginResponse,
    currentPassword: string,
  ): Promise<void> {
    if (!result.accessToken) {
      this.error.set(this.translate.instant("auth.errors.loginFailed"));
      return;
    }

    if (result.passwordChangeRequired) {
      this.pendingCurrentPassword = currentPassword;
      this.pendingMfaToken = "";
      this.loginForm.controls.password.reset();
      this.loginStep.set("password-change");
      this.message.set(this.translate.instant("auth.passwordChangePrompt"));
      this.submitted.set(false);
      return;
    }

    this.pendingCurrentPassword = "";
    this.pendingMfaToken = "";
    this.session.connectAuthenticatedToken(result.accessToken);
    await this.router.navigateByUrl(
      this.signInRedirect(),
    );
  }

  async submitRegister(): Promise<void> {
    this.submitted.set(true);
    this.error.set("");
    this.message.set("");

    if (
      this.registerForm.invalid ||
      this.registerForm.controls.password.value !==
        this.registerForm.controls.confirmPassword.value
    ) {
      this.registerForm.markAllAsTouched();
      return;
    }

    const v = this.registerForm.getRawValue();
    this.loading.set(true);

    try {
      const result = await firstValueFrom(
        this.authGate.registerOrganization({
          email: v.email,
          password: v.password,
          organizationName: v.organisation,
          firstName: v.firstName,
          lastName: v.lastName,
          phone: v.phone || null,
        }),
      );

      await this.handleRegistrationResult(result);
    } catch (e) {
      this.error.set(this.backendMessage(e));
    } finally {
      this.loading.set(false);
    }
  }

  openRegister(): void {
    this.submitted.set(false);
    this.error.set("");

    if (this.demoLoginEnabled) {
      this.simulateDemoRegister();
      return;
    }

    this.mode.set("register");
    void this.router.navigate(["/register"], {
      queryParams: {
        email: this.loginForm.controls.email.value || undefined,
      },
    });
  }

  openLogin(): void {
    this.submitted.set(false);
    this.error.set("");
    this.loginStep.set("email");
    this.mode.set("login");
    void this.router.navigate(["/connexion"], {
      queryParams: {
        email: this.registerForm.controls.email.value || undefined,
      },
    });
  }

  changeLoginEmail(): void {
    this.loginStep.set("email");
    this.loginForm.controls.password.reset();
    this.pendingMfaToken = "";
    this.pendingCurrentPassword = "";
    this.authGate.logout();
    this.session.disconnect();
    this.error.set("");
    this.message.set("");
  }

  togglePassword(): void {
    this.showPassword.update((v) => !v);
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword.update((v) => !v);
  }

  // Referenced by the existing registration template. Keep this guard in
  // sync with the error returned by AuthGate for an existing account.
  showExistingAccountHint(): boolean {
    if (!this.isRegister()) return false;
    const message = this.error().trim().toLowerCase();
    return /invalid email or password|already exists|already registered|compte existant|d[eé]j[aà] (?:un compte|inscrit)/i.test(message);
  }

  passwordMismatch(): boolean {
    return (
      this.registerForm.controls.confirmPassword.touched &&
      this.registerForm.controls.password.value !==
        this.registerForm.controls.confirmPassword.value
    );
  }

  private async handleRegistrationResult(
    result: AuthGateRegistrationResponse,
  ): Promise<void> {
    const status = (result.status ?? "").trim().toLowerCase();

    if (result.accessToken) {
      this.tokens.setTokens(result.accessToken, result.refreshToken, true);
      this.session.connectAuthenticatedToken(result.accessToken);
      this.message.set(
        result.message || this.translate.instant("auth.registrationReady"),
      );
      await this.router.navigateByUrl("/organisation");
      return;
    }

    if (status === "application_added") {
      this.message.set(
        result.message || this.translate.instant("auth.applicationAdded"),
      );
      await this.router.navigate(["/connexion"], {
        queryParams: { email: result.email, applicationAdded: "1" },
      });
      return;
    }

    if (status === "pending_email_confirmation") {
      // AuthGate has sent a confirmation email; do not send the user to prelogin.
      await this.router.navigate(["/confirmation-email"], {
        queryParams: { email: result.email },
      });
      return;
    }

    // Other asynchronous provisioning states do not imply email confirmation.
    this.message.set(
      result.message || this.translate.instant("auth.registrationPending"),
    );
    await this.router.navigate(["/connexion"], {
      queryParams: { email: result.email },
    });
  }

  private backendMessage(error: unknown): string {
    const e = error as {
      error?: unknown;
      message?: string;
      status?: number;
    };

    const body = e?.error as
      | string
      | { error?: string; message?: string; title?: string; code?: string }
      | undefined;

    if (typeof body === "string" && body.trim()) return body;
    if (body && typeof body === "object") {
      if (typeof body.message === "string" && body.message.trim())
        return body.message;
      if (typeof body.error === "string" && body.error.trim())
        return body.error;
      if (typeof body.title === "string" && body.title.trim())
        return body.title;
      if (typeof body.code === "string" && body.code.trim()) {
        const key = `backendErrors.${body.code}`;
        const translated = this.translate.instant(key);
        if (translated !== key) return translated;
      }
    }

    if (e?.status === 401) {
      return this.translate.instant("auth.errors.invalidCredentials");
    }

    return this.translate.instant("auth.errors.technical");
  }

  private deviceFingerprint(): string {
    if (typeof navigator === "undefined") return "unknown";
    try {
      return btoa(navigator.userAgent);
    } catch {
      return navigator.userAgent;
    }
  }
}
