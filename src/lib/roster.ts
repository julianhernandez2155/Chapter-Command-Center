import { supabase } from './supabase';

export type PositionGroup =
  | 'exec'
  | 'internal'
  | 'external'
  | 'health_safety'
  | 'housing'
  | 'membership_development'
  | 'judicial'
  | 'recruitment'
  | 'treasury'
  | string;

export interface LivePosition {
  id: string;
  slug: string;
  display_name: string;
  position_group: PositionGroup;
  supervised_by: string | null;
  is_active: boolean;
  sort_order: number;
}

export interface LiveMemberSummary {
  id: string;
  google_email: string;
  legal_first_name: string;
  legal_last_name: string;
  preferred_name: string | null;
  status: string;
}

export interface LivePositionAssignment {
  id: string;
  semester: string;
  assigned_at: string;
  removed_at: string | null;
  member: LiveMemberSummary | null;
  position: LivePosition;
}

export interface PositionWithAssignment extends LivePosition {
  assignment: LivePositionAssignment | null;
}

export interface PositionGroupSummary {
  key: PositionGroup;
  title: string;
  oversight: string;
  positions: PositionWithAssignment[];
}

type PositionAssignmentRow = Omit<LivePositionAssignment, 'member' | 'position'> & {
  member: LiveMemberSummary | LiveMemberSummary[] | null;
  position: LivePosition | LivePosition[] | null;
};

const POSITION_SELECT = 'id, slug, display_name, position_group, supervised_by, is_active, sort_order';

export const fetchCurrentMemberPositions = async (positionSlugs: string[]): Promise<LivePosition[]> => {
  if (positionSlugs.length === 0) return [];

  const { data, error } = await supabase
    .from('positions')
    .select(POSITION_SELECT)
    .in('slug', positionSlugs)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const fetchActivePositions = async (): Promise<LivePosition[]> => {
  const { data, error } = await supabase
    .from('positions')
    .select(POSITION_SELECT)
    .eq('is_active', true)
    .order('sort_order');

  if (error) {
    throw error;
  }

  return data ?? [];
};

export const fetchActivePositionAssignments = async (): Promise<LivePositionAssignment[]> => {
  const { data, error } = await supabase
    .from('member_positions')
    .select(`
      id,
      semester,
      assigned_at,
      removed_at,
      member:members (
        id,
        google_email,
        legal_first_name,
        legal_last_name,
        preferred_name,
        status
      ),
      position:positions (
        ${POSITION_SELECT}
      )
    `)
    .is('removed_at', null)
    .order('assigned_at', { ascending: false });

  if (error) {
    throw error;
  }

  return ((data ?? []) as PositionAssignmentRow[]).flatMap(row => {
    const position = Array.isArray(row.position) ? row.position[0] : row.position;
    if (!position) return [];

    return [{
      ...row,
      member: Array.isArray(row.member) ? row.member[0] ?? null : row.member,
      position
    }];
  });
};

export const fetchPositionDashboard = async (): Promise<PositionGroupSummary[]> => {
  const [positions, assignments] = await Promise.all([
    fetchActivePositions(),
    fetchActivePositionAssignments()
  ]);

  const assignmentByPositionId = new Map(
    assignments.map(assignment => [assignment.position.id, assignment])
  );

  const grouped = positions.reduce<Map<PositionGroup, PositionWithAssignment[]>>((acc, position) => {
    const groupPositions = acc.get(position.position_group) ?? [];
    groupPositions.push({
      ...position,
      assignment: assignmentByPositionId.get(position.id) ?? null
    });
    acc.set(position.position_group, groupPositions);
    return acc;
  }, new Map());

  return [...grouped.entries()].map(([key, groupPositions]) => ({
    key,
    title: POSITION_GROUP_LABELS[key] ?? toTitleCase(key),
    oversight: POSITION_GROUP_OVERSIGHT[key] ?? 'Chapter Oversight',
    positions: groupPositions
  }));
};

const POSITION_GROUP_LABELS: Record<string, string> = {
  exec: 'Executive Board',
  internal: 'Internal Branch',
  external: 'External Branch',
  health_safety: 'Health & Safety',
  housing: 'Housing',
  membership_development: 'Membership Development',
  judicial: 'Judicial Board',
  recruitment: 'Recruitment',
  treasury: 'Treasury'
};

const POSITION_GROUP_OVERSIGHT: Record<string, string> = {
  exec: 'Chapter Officer Protocol',
  internal: 'Internal Vice President Oversight',
  external: 'External Vice President Oversight',
  health_safety: 'Health & Safety Oversight',
  housing: 'Housing Manager Oversight',
  membership_development: 'Membership Development Oversight',
  judicial: 'Judicial Board Oversight',
  recruitment: 'Recruitment Chairman Oversight',
  treasury: 'Treasurer Oversight'
};

const toTitleCase = (value: string) =>
  value
    .split('_')
    .filter(Boolean)
    .map(segment => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
