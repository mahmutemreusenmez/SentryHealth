import type { PatientProfile, VitalEntry } from "../data/types";
import { pseudonymize } from "./security";

/**
 * HL7 FHIR (Fast Healthcare Interoperability Resources) R4 uyumluluk katmanı.
 *
 * Uygulamanın veri saklama ve backend haberleşme modelleri, uluslararası
 * birlikte çalışabilirlik (interoperability) standartlarına uygun olacak
 * şekilde FHIR "resource" şemalarına dönüştürülür:
 *
 *  - Hasta profili  -> `Patient` resource (http://hl7.org/fhir/StructureDefinition/Patient)
 *  - Vital ölçümler -> `Observation` resource'ları (LOINC kodlu)
 *
 * Kimlik verisi (T.C. Kimlik No) FHIR kaynağında ham tutulmaz; KVKK/GDPR
 * gereği SHA-256 ile pseudonimize edilerek `identifier` alanına yazılır.
 */

/** FHIR CodeableConcept — kodlu klinik kavram. */
export interface FhirCodeableConcept {
  coding: { system: string; code: string; display: string }[];
  text?: string;
}

/** FHIR Patient resource (R4, sadeleştirilmiş alt küme). */
export interface FhirPatient {
  resourceType: "Patient";
  identifier: {
    system: string;
    /** SHA-256 pseudonim (ham T.C. Kimlik No değil). */
    value: string;
  }[];
  active: boolean;
  name: { use: "official"; text: string; family: string; given: string[] }[];
  gender: "male" | "female" | "other" | "unknown";
  /** Yaş bazlı türetilmiş yaklaşık doğum yılı (YYYY). */
  birthDate?: string;
  /** Kronik tanılar (kolaylık için özet uzantı). */
  extension?: { url: string; valueString: string }[];
}

/** FHIR Observation resource (R4, sadeleştirilmiş alt küme). */
export interface FhirObservation {
  resourceType: "Observation";
  status: "final";
  category: FhirCodeableConcept[];
  code: FhirCodeableConcept;
  effectiveDateTime: string;
  /** Tekil sayısal ölçüm. */
  valueQuantity?: { value: number; unit: string; system: string; code: string };
  /** Bileşik ölçüm (ör. kan basıncı: sistolik + diyastolik). */
  component?: {
    code: FhirCodeableConcept;
    valueQuantity: { value: number; unit: string; system: string; code: string };
  }[];
}

/** FHIR transaction Bundle (Patient + Observation kaynakları). */
export interface FhirBundle {
  resourceType: "Bundle";
  type: "collection";
  timestamp: string;
  entry: { resource: FhirPatient | FhirObservation }[];
}

const LOINC = "http://loinc.org";
const UCUM = "http://unitsofmeasure.org";
const VITAL_SIGNS_CATEGORY: FhirCodeableConcept[] = [
  {
    coding: [
      {
        system: "http://terminology.hl7.org/CodeSystem/observation-category",
        code: "vital-signs",
        display: "Vital Signs",
      },
    ],
  },
];

function loincCode(code: string, display: string): FhirCodeableConcept {
  return { coding: [{ system: LOINC, code, display }], text: display };
}

function quantity(value: number, unit: string, code: string) {
  return { value, unit, system: UCUM, code };
}

const FHIR_GENDER: Record<PatientProfile["gender"], FhirPatient["gender"]> = {
  male: "male",
  female: "female",
  unspecified: "unknown",
};

/** Hasta profilini FHIR `Patient` resource'una dönüştürür. */
export function toPatientResource(profile: PatientProfile): FhirPatient {
  const parts = profile.fullName.trim().split(/\s+/);
  const family = parts.length > 1 ? parts[parts.length - 1] : "";
  const given = parts.length > 1 ? parts.slice(0, -1) : parts;
  const birthYear = new Date().getFullYear() - profile.age;

  return {
    resourceType: "Patient",
    identifier: [
      {
        system: "https://enabiz.gov.tr/identifier/tckn-pseudonym",
        value: pseudonymize(profile.nationalId),
      },
    ],
    active: true,
    name: [{ use: "official", text: profile.fullName, family, given }],
    gender: FHIR_GENDER[profile.gender],
    birthDate: String(birthYear),
    extension: [
      {
        url: "https://enabiz.gov.tr/StructureDefinition/chronic-conditions",
        valueString: profile.chronicConditions.join(", ") || "none",
      },
    ],
  };
}

/** Bir vital kaydını LOINC kodlu FHIR `Observation` kaynaklarına dönüştürür. */
export function toObservationResources(vitals: VitalEntry): FhirObservation[] {
  const when = new Date(vitals.recordedAt).toISOString();
  const observations: FhirObservation[] = [];

  // Kan basıncı — bileşik (panel) gözlem: 85354-9.
  observations.push({
    resourceType: "Observation",
    status: "final",
    category: VITAL_SIGNS_CATEGORY,
    code: loincCode("85354-9", "Blood pressure panel"),
    effectiveDateTime: when,
    component: [
      {
        code: loincCode("8480-6", "Systolic blood pressure"),
        valueQuantity: quantity(vitals.systolic, "mmHg", "mm[Hg]"),
      },
      {
        code: loincCode("8462-4", "Diastolic blood pressure"),
        valueQuantity: quantity(vitals.diastolic, "mmHg", "mm[Hg]"),
      },
    ],
  });

  const simple: [string, string, number, string, string][] = [
    ["8867-4", "Heart rate", vitals.pulse, "beats/min", "/min"],
    ["2339-0", "Glucose [Mass/volume] in Blood", vitals.glucose, "mg/dL", "mg/dL"],
    ["9279-1", "Respiratory rate", vitals.respiratoryRate, "breaths/min", "/min"],
    ["8310-5", "Body temperature", vitals.temperature, "Cel", "Cel"],
  ];

  simple.forEach(([code, display, value, unit, ucum]) => {
    if (!value || value <= 0) return;
    observations.push({
      resourceType: "Observation",
      status: "final",
      category: VITAL_SIGNS_CATEGORY,
      code: loincCode(code, display),
      effectiveDateTime: when,
      valueQuantity: quantity(value, unit, ucum),
    });
  });

  return observations;
}

/** Profil + son vital ölçümünden FHIR transaction Bundle oluşturur. */
export function toFhirBundle(
  profile: PatientProfile,
  vitals: VitalEntry | null,
): FhirBundle {
  const entry: { resource: FhirPatient | FhirObservation }[] = [
    { resource: toPatientResource(profile) },
  ];
  if (vitals) {
    toObservationResources(vitals).forEach((resource) =>
      entry.push({ resource }),
    );
  }
  return {
    resourceType: "Bundle",
    type: "collection",
    timestamp: new Date().toISOString(),
    entry,
  };
}
