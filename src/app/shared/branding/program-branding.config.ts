import type { TrainingProgram } from "../../core/models/workspace.models";

export interface ProgramBranding {
  brandName: string;
  icon: string;
  accentColor: string;
}

const BRANDING_BY_CODE: Record<string, ProgramBranding> = {
  ECSR: {
    brandName: "TP ECSR",
    icon: "ph-steering-wheel",
    accentColor: "#f8a11a",
  },
  MOTO: { brandName: "Moto", icon: "ph-motorcycle", accentColor: "#f8a11a" },
  PL: { brandName: "Groupe Lourd", icon: "ph-truck", accentColor: "#f8a11a" },
  POIDS_LOURD: {
    brandName: "Groupe Lourd",
    icon: "ph-truck",
    accentColor: "#f8a11a",
  },
  BUS: { brandName: "Bus", icon: "ph-bus", accentColor: "#f8a11a" },
  TRANSPORT_VOYAGEURS: {
    brandName: "Bus",
    icon: "ph-bus",
    accentColor: "#f8a11a",
  },
  AMBULANCE: {
    brandName: "Ambulance",
    icon: "ph-ambulance",
    accentColor: "#f8a11a",
  },
  AMBULANCIER: {
    brandName: "Ambulance",
    icon: "ph-ambulance",
    accentColor: "#f8a11a",
  },
  SECOURISME: {
    brandName: "Secourisme",
    icon: "ph-first-aid-kit",
    accentColor: "#f8a11a",
  },
  FIRST_AID: {
    brandName: "Secourisme",
    icon: "ph-first-aid-kit",
    accentColor: "#f8a11a",
  },
};

export function brandingForProgram(
  program: TrainingProgram | null,
): ProgramBranding {
  if (!program)
    return {
      brandName: "Pedagora",
      icon: "ph-graduation-cap",
      accentColor: "#f8a11a",
    };
  const code = program.code
    .toUpperCase()
    .replaceAll("-", "_")
    .replaceAll(" ", "_");
  return (
    BRANDING_BY_CODE[code] ?? {
      brandName: program.name || program.code.toUpperCase(),
      icon: program.icon || "ph-graduation-cap",
      accentColor: "#f8a11a",
    }
  );
}
