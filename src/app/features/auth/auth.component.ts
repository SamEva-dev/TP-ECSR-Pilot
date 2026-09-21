import {
  ChangeDetectionStrategy,
  Component,
  computed,
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
import { TranslatePipe } from "../../core/i18n/translate.pipe";
import { SessionService } from "../../core/session/session.service";
@Component({
  selector: "app-auth",
  imports: [ReactiveFormsModule, TranslatePipe],
  templateUrl: "./auth.component.html",
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthComponent {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly session = inject(SessionService);
  readonly mode = signal<"login" | "register">(
    this.route.snapshot.data["mode"] === "register" ? "register" : "login",
  );
  readonly isRegister = computed(() => this.mode() === "register");
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly submitted = signal(false);
  readonly loginForm = new FormGroup({
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
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
    phone: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
    email: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
    password: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(8)],
    }),
    confirmPassword: new FormControl("", {
      nonNullable: true,
      validators: [Validators.required],
    }),
  });
  submitLogin() {
    this.submitted.set(true);
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    this.session.connectFromEmail(this.loginForm.controls.email.value);
    void this.router.navigateByUrl(
      this.session.role() === "jury" ? "/jury" : "/accueil",
    );
  }
  submitRegister() {
    this.submitted.set(true);
    if (
      this.registerForm.invalid ||
      this.registerForm.controls.password.value !==
        this.registerForm.controls.confirmPassword.value
    ) {
      this.registerForm.markAllAsTouched();
      return;
    }
    const v = this.registerForm.getRawValue();
    this.session.connectRegistration({
      email: v.email,
      firstName: v.firstName,
      lastName: v.lastName,
      organisation: v.organisation,
    });
    void this.router.navigateByUrl("/accueil");
  }
  openRegister() {
    this.submitted.set(false);
    this.mode.set("register");
    void this.router.navigateByUrl("/inscription", { replaceUrl: true });
  }
  openLogin() {
    this.submitted.set(false);
    this.mode.set("login");
    void this.router.navigateByUrl("/connexion", { replaceUrl: true });
  }
  togglePassword() {
    this.showPassword.update((v) => !v);
  }
  toggleConfirmPassword() {
    this.showConfirmPassword.update((v) => !v);
  }
  passwordMismatch() {
    return (
      this.registerForm.controls.confirmPassword.touched &&
      this.registerForm.controls.password.value !==
        this.registerForm.controls.confirmPassword.value
    );
  }
}
