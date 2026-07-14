import { z } from "zod";

/**
 * Profesyonel form doğrulama katmanı (Zod).
 *
 * - T.C. Kimlik Numarası: 11 hane + resmî kontrol basamağı (checksum) algoritması.
 * - Telefon: Türkiye cep telefonu formatı (+90 5xx ...).
 * - Vitaller: fizyolojik olarak mantıklı sınırlar (mantıksız değerleri engeller).
 */

/**
 * Resmî T.C. Kimlik Numarası doğrulama algoritması.
 *
 * Kurallar:
 * 1. 11 hane, tümü rakam, ilk hane 0 olamaz.
 * 2. 10. hane = (((1,3,5,7,9. hanelerin toplamı) * 7) - (2,4,6,8. hanelerin
 *    toplamı)) mod 10.
 * 3. 11. hane = (ilk 10 hanenin toplamı) mod 10.
 */
export function isValidTcKimlik(value: string): boolean {
  if (!/^[1-9]\d{10}$/.test(value)) return false;
  const d = value.split("").map((c) => Number.parseInt(c, 10));
  const oddSum = d[0] + d[2] + d[4] + d[6] + d[8];
  const evenSum = d[1] + d[3] + d[5] + d[7];
  const tenth = (oddSum * 7 - evenSum) % 10;
  if (tenth !== d[9]) return false;
  const eleventh = d.slice(0, 10).reduce((a, b) => a + b, 0) % 10;
  return eleventh === d[10];
}

/**
 * Test/demo amaçlı önceden tanımlı "geçerli giriş" kimlikleri.
 *
 * Bu hesaplar, genel doğrulama kuralları (11 hane + sayısal) korunarak resmî
 * checksum algoritmasından muaf tutulur; yalnızca bu iki kimlik + doğru şifre
 * kombinasyonu başarılı sayılır. Gerçek kullanıcı kimlikleri her zaman resmî
 * T.C. checksum algoritmasıyla doğrulanır.
 */
export interface TestAccount {
  nationalId: string;
  password: string;
  fullName: string;
}

export const TEST_ACCOUNTS: readonly TestAccount[] = [
  { nationalId: "11111111111", password: "1234", fullName: "Mahmut Yılmaz" },
] as const;

/** Verilen T.C. numarası tanımlı bir test hesabına ait mi? */
export function isTestNationalId(value: string): boolean {
  return TEST_ACCOUNTS.some((account) => account.nationalId === value);
}

/** Verilen T.C. numarasına karşılık gelen test hesabını döndürür (yoksa null). */
export function findTestAccount(nationalId: string): TestAccount | null {
  return TEST_ACCOUNTS.find((account) => account.nationalId === nationalId) ?? null;
}

/** Türkiye cep telefonu: +90 5xx xxx xx xx (boşluk/tire toleranslı). */
export const TR_PHONE_REGEX = /^(?:\+90|0)?\s?5\d{2}\s?\d{3}\s?\d{2}\s?\d{2}$/;

export function isValidTurkishPhone(value: string): boolean {
  return TR_PHONE_REGEX.test(value.trim());
}

/** Fizyolojik vital sınırları — bu aralık dışındaki değerler reddedilir. */
export const VITAL_LIMITS = {
  systolic: { min: 70, max: 260 },
  diastolic: { min: 40, max: 160 },
  pulse: { min: 30, max: 220 },
  glucose: { min: 40, max: 600 },
} as const;

/** e-Devlet giriş formu şeması. */
export const loginSchema = z.object({
  nationalId: z
    .string()
    .regex(/^\d{11}$/, "T.C. Kimlik Numarası 11 haneli olmalıdır.")
    .refine(
      (value) => isTestNationalId(value) || isValidTcKimlik(value),
      "Geçersiz T.C. Kimlik Numarası (kontrol hanesi tutmuyor).",
    ),
  password: z.string().min(4, "e-Devlet şifreniz en az 4 karakter olmalıdır."),
});
export type LoginFormValues = z.infer<typeof loginSchema>;

/** Günlük vital ölçüm giriş formu şeması (akıllı sınır filtreleri). */
export const vitalsSchema = z
  .object({
    systolic: z.coerce
      .number({ invalid_type_error: "Sistolik değeri sayısal olmalı." })
      .int("Tam sayı girin.")
      .min(VITAL_LIMITS.systolic.min, `Sistolik ${VITAL_LIMITS.systolic.min}-${VITAL_LIMITS.systolic.max} aralığında olmalı.`)
      .max(VITAL_LIMITS.systolic.max, `Sistolik ${VITAL_LIMITS.systolic.min}-${VITAL_LIMITS.systolic.max} aralığında olmalı.`),
    diastolic: z.coerce
      .number({ invalid_type_error: "Diyastolik değeri sayısal olmalı." })
      .int("Tam sayı girin.")
      .min(VITAL_LIMITS.diastolic.min, `Diyastolik ${VITAL_LIMITS.diastolic.min}-${VITAL_LIMITS.diastolic.max} aralığında olmalı.`)
      .max(VITAL_LIMITS.diastolic.max, `Diyastolik ${VITAL_LIMITS.diastolic.min}-${VITAL_LIMITS.diastolic.max} aralığında olmalı.`),
    pulse: z.coerce
      .number({ invalid_type_error: "Nabız değeri sayısal olmalı." })
      .int("Tam sayı girin.")
      .min(VITAL_LIMITS.pulse.min, `Nabız ${VITAL_LIMITS.pulse.min}-${VITAL_LIMITS.pulse.max} aralığında olmalı.`)
      .max(VITAL_LIMITS.pulse.max, `Nabız ${VITAL_LIMITS.pulse.min}-${VITAL_LIMITS.pulse.max} aralığında olmalı.`),
    glucose: z.coerce
      .number({ invalid_type_error: "Şeker değeri sayısal olmalı." })
      .int("Tam sayı girin.")
      .min(VITAL_LIMITS.glucose.min, `Kan şekeri ${VITAL_LIMITS.glucose.min}-${VITAL_LIMITS.glucose.max} aralığında olmalı.`)
      .max(VITAL_LIMITS.glucose.max, `Kan şekeri ${VITAL_LIMITS.glucose.min}-${VITAL_LIMITS.glucose.max} aralığında olmalı.`),
  })
  .refine((v) => v.systolic > v.diastolic, {
    message: "Sistolik değer diyastolikten büyük olmalıdır.",
    path: ["systolic"],
  });
export type VitalsFormValues = z.infer<typeof vitalsSchema>;
