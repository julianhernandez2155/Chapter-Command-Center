import {
  APPAREL_SIZE_OPTIONS,
  GRADUATION_TERM_OPTIONS,
  GUARDIAN_RELATIONSHIP_OPTIONS,
  HOUSING_TYPE_OPTIONS,
  US_STATE_OPTIONS
} from './profileOptions';

export class NormalizationError extends Error {
  constructor(
    public readonly field: string,
    message: string
  ) {
    super(message);
    this.name = 'NormalizationError';
  }
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TERM_PATTERN = /^(spring|summer|fall|winter)(?:\s+(\d{4}))?$/i;
const STATE_NAME_TO_CODE = new Map(
  US_STATE_OPTIONS.flatMap(option => [
    [option.value.toLowerCase(), option.value],
    [option.label.toLowerCase(), option.value]
  ])
);

export const normalizeNullableText = (value: string | null | undefined): string | null => {
  const normalized = value?.replace(/\s+/g, ' ').trim() ?? '';
  return normalized.length > 0 ? normalized : null;
};

export const normalizeName = (value: string | null | undefined, field = 'name'): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  if (!/[A-Za-z]/.test(normalized)) {
    throw new NormalizationError(field, 'Enter a valid name.');
  }
  return normalized;
};

export const normalizeEmail = (value: string | null | undefined, field = 'email'): string | null => {
  const normalized = normalizeNullableText(value)?.toLowerCase() ?? null;
  if (!normalized) return null;
  if (!EMAIL_PATTERN.test(normalized)) {
    throw new NormalizationError(field, 'Enter a valid email.');
  }
  return normalized;
};

export const normalizeSchoolEmail = (value: string | null | undefined, field = 'school_email'): string | null => {
  const email = normalizeEmail(value, field);
  if (!email) return null;
  const normalized = email.endsWith('@g.syr.edu')
    ? `${email.slice(0, -'@g.syr.edu'.length)}@syr.edu`
    : email;

  if (!normalized.endsWith('@syr.edu')) {
    throw new NormalizationError(field, 'Use a syr.edu school email.');
  }

  return normalized;
};

export const normalizePhone = (value: string | null | undefined, field = 'phone'): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;

  if (normalized.startsWith('+')) {
    const digits = normalized.replace(/[^\d]/g, '');
    const phone = `+${digits}`;
    if (/^\+[1-9]\d{7,14}$/.test(phone)) return phone;
    throw new NormalizationError(field, 'Enter a valid phone number.');
  }

  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  throw new NormalizationError(field, 'Enter a 10-digit US phone number.');
};

export const normalizeSuid = (value: string | null | undefined, field = 'suid'): string => {
  const normalized = normalizeNullableText(value)?.replace(/\s/g, '') ?? '';
  if (!/^\d{9}$/.test(normalized)) {
    throw new NormalizationError(field, 'SUID must be exactly 9 digits.');
  }
  return normalized;
};

export const normalizeState = (value: string | null | undefined, field = 'state'): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  const code = STATE_NAME_TO_CODE.get(normalized.toLowerCase());
  if (!code) {
    throw new NormalizationError(field, 'Select a valid state.');
  }
  return code;
};

export const normalizeInstagram = (value: string | null | undefined): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  return normalized
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^instagram\.com\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .trim() || null;
};

export const normalizeSnapchat = (value: string | null | undefined): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  return normalized
    .replace(/^https?:\/\/(www\.)?snapchat\.com\/add\//i, '')
    .replace(/^snapchat\.com\/add\//i, '')
    .replace(/^@/, '')
    .split(/[/?#]/)[0]
    .trim() || null;
};

export const normalizeLinkedIn = (value: string | null | undefined): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  return normalized
    .replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, '')
    .replace(/^www\.linkedin\.com\/in\//i, '')
    .replace(/^linkedin\.com\/in\//i, '')
    .replace(/^@/, '')
    .replace(/\/$/, '')
    .split(/[?#]/)[0]
    .trim() || null;
};

export const normalizeGraduationYear = (
  value: string | number | null | undefined,
  field = 'graduation_year'
): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed < 2020 || parsed > 2040) {
    throw new NormalizationError(field, 'Enter a valid graduation year.');
  }
  return parsed;
};

export const normalizeTerm = (
  value: string | null | undefined,
  field = 'term',
  fallbackYear?: string | number | null
): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  const match = normalized.match(TERM_PATTERN);
  if (!match) {
    throw new NormalizationError(field, 'Use Spring, Summer, Fall, or Winter.');
  }

  const term = GRADUATION_TERM_OPTIONS.find(option => option.toLowerCase() === match[1].toLowerCase());
  const year = match[2] ?? (fallbackYear ? String(fallbackYear) : null);
  return year ? `${term} ${year}` : term ?? null;
};

export const normalizeAddressText = (value: string | null | undefined): string | null =>
  normalizeNullableText(value);

export const normalizeGuardianRelationship = (
  value: string | null | undefined,
  field = 'relationship'
): string | null => {
  const normalized = normalizeNullableText(value)?.replace(/\s*\/\s*/g, '/') ?? null;
  if (!normalized) return null;
  const canonical = GUARDIAN_RELATIONSHIP_OPTIONS.find(option => option.toLowerCase() === normalized.toLowerCase());
  if (canonical) return canonical;
  if (['parent/guardian', 'parent', 'parents'].includes(normalized.toLowerCase())) return 'Guardian';
  if (['mom', 'mother'].includes(normalized.toLowerCase())) return 'Mother';
  if (['dad', 'father'].includes(normalized.toLowerCase())) return 'Father';
  throw new NormalizationError(field, 'Select a valid relationship.');
};

export const normalizeHousingType = (value: string | null | undefined, field = 'housing_type'): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  const option = HOUSING_TYPE_OPTIONS.find(item => item.value === normalized);
  if (!option) {
    throw new NormalizationError(field, 'Select a valid housing type.');
  }
  return option.value;
};

export const normalizeApparelSize = (value: string | null | undefined, field = 'apparel_size'): string | null => {
  const normalized = normalizeNullableText(value);
  if (!normalized) return null;
  const canonical = APPAREL_SIZE_OPTIONS.find(option => option.toLowerCase() === normalized.toLowerCase());
  if (!canonical) {
    throw new NormalizationError(field, 'Select a valid size.');
  }
  return canonical;
};
