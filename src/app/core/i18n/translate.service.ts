import { DOCUMENT } from "@angular/common";
import { Injectable, computed, inject, signal } from "@angular/core";
import type { Locale, TranslationDictionary } from "./translation.types";
import fr from "../../../../public/i18n/fr.json";
import en from "../../../../public/i18n/en.json";

const DICTIONARIES: Record<Locale, TranslationDictionary> = { fr, en };
const STORAGE_KEY = "tp-ecsr-pilot.locale";

@Injectable({ providedIn: "root" })
export class TranslateService {
  private readonly document = inject(DOCUMENT);
  private readonly localeSignal = signal<Locale>(this.resolveInitialLocale());

  readonly locale = this.localeSignal.asReadonly();
  readonly dictionary = computed(() => DICTIONARIES[this.localeSignal()]);

  constructor() {
    this.document.documentElement.lang = this.localeSignal();
  }

  setLocale(locale: Locale): void {
    this.localeSignal.set(locale);
    this.document.documentElement.lang = locale;
    localStorage.setItem(STORAGE_KEY, locale);
  }

  instant(key: string, params?: Record<string, string | number>): string {
    const value = key.split(".").reduce<unknown>((current, segment) => {
      if (!current || typeof current !== "object") return undefined;
      return (current as Record<string, unknown>)[segment];
    }, this.dictionary());

    const translation = typeof value === "string" ? value : key;
    if (!params) return translation;

    return Object.entries(params).reduce(
      (text, [param, replacement]) =>
        text.replaceAll(`{{${param}}}`, String(replacement)),
      translation,
    );
  }

  private resolveInitialLocale(): Locale {
    if (typeof localStorage !== "undefined") {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "fr" || saved === "en") return saved;
    }

    if (
      typeof navigator !== "undefined" &&
      navigator.language.toLowerCase().startsWith("en")
    ) {
      return "en";
    }

    return "fr";
  }
}
