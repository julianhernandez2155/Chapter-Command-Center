export type PositionSlug =
  | 'president'
  | 'ivp'
  | 'evp'
  | 'secretary'
  | 'treasurer'
  | 'saa'
  | 'recruitment_chairman'
  | 'vpmd'
  | 'hs_officer'
  | 'past_president'
  | 'housing_manager'
  | 'scholarship_chairman'
  | 'assistant_treasurer'
  | string;

export type Permission =
  | 'dashboard.view'
  | 'positions.view'
  | 'positions.manage'
  | 'events.view'
  | 'events.create'
  | 'events.edit'
  | 'events.archive'
  | 'roster.view'
  | 'roster.manage'
  | 'attendance.import'
  | 'forms.status.view'
  | 'forms.intake'
  | 'forms.builder.manage'
  | 'forms.responses.view'
  | 'reports.submit'
  | 'reports.view_all'
  | 'excusals.status.view'
  | 'excusals.review'
  | 'finance.dues.view'
  | 'archive.view'
  | 'settings.view'
  | 'support.view';

export const MEMBER_PERMISSIONS: Permission[] = [
  'dashboard.view',
  'positions.view',
  'events.view',
  'roster.view',
  'forms.status.view',
  'excusals.status.view',
  'archive.view',
  'settings.view',
  'support.view'
];

export const OFFICER_POSITION_SLUGS = [
  'president',
  'ivp',
  'evp',
  'secretary',
  'treasurer',
  'saa',
  'recruitment_chairman',
  'vpmd',
  'hs_officer',
  'past_president',
  'housing_manager',
  'scholarship_chairman',
  'assistant_treasurer'
] as const;

const OFFICER_WORKFLOW_PERMISSIONS: Permission[] = [
  'forms.intake',
  'forms.responses.view',
  'reports.submit',
  'reports.view_all'
];

const CHAIRMAN_WORKFLOW_PERMISSIONS: Permission[] = [
  'events.create',
  'forms.intake',
  'forms.responses.view',
  'reports.submit'
];

export const POSITION_PERMISSION_REGISTRY: Record<string, Permission[]> = {
  president: [
    'roster.view',
    'roster.manage',
    'positions.manage',
    'events.create',
    'events.edit',
    'events.archive',
    'attendance.import',
    'forms.builder.manage',
    'excusals.review',
    'finance.dues.view'
  ],
  secretary: [
    'roster.view',
    'roster.manage',
    'positions.manage',
    'events.create',
    'events.edit',
    'events.archive',
    'attendance.import',
    'forms.builder.manage',
    'excusals.review',
    'finance.dues.view'
  ],
  treasurer: ['finance.dues.view'],
  assistant_treasurer: ['finance.dues.view'],
  saa: ['excusals.review'],
  recruitment_chairman: ['roster.view'],
  scholarship_chairman: [],
  ivp: ['roster.view', 'excusals.review'],
  evp: ['roster.view'],
  vpmd: ['roster.view'],
  hs_officer: [],
  past_president: ['roster.view'],
  housing_manager: []
};

export const isOfficerPosition = (positionSlug: string) =>
  OFFICER_POSITION_SLUGS.includes(positionSlug as typeof OFFICER_POSITION_SLUGS[number]);

const isChairmanPosition = (positionSlug: string) =>
  positionSlug.endsWith('_chairman') || positionSlug.endsWith('_chair') || positionSlug.includes('_captain');

export const getPermissionsForPositions = (positionSlugs: string[]): Permission[] => {
  const permissions = new Set<Permission>(MEMBER_PERMISSIONS);

  for (const slug of positionSlugs) {
    if (isOfficerPosition(slug)) {
      OFFICER_WORKFLOW_PERMISSIONS.forEach(permission => permissions.add(permission));
    }

    if (isChairmanPosition(slug)) {
      CHAIRMAN_WORKFLOW_PERMISSIONS.forEach(permission => permissions.add(permission));
    }

    POSITION_PERMISSION_REGISTRY[slug]?.forEach(permission => permissions.add(permission));
  }

  return [...permissions];
};

export const hasPermission = (permissions: Permission[], permission: Permission) =>
  permissions.includes(permission);

export const hasAnyPermission = (permissions: Permission[], requiredPermissions: Permission[]) =>
  requiredPermissions.some(permission => hasPermission(permissions, permission));

export const hasAllPermissions = (permissions: Permission[], requiredPermissions: Permission[]) =>
  requiredPermissions.every(permission => hasPermission(permissions, permission));
