import { supabase } from './supabase';
import { SecretaryMemberProfile } from './memberSecretaryRegistry';

export type GraduationCycleStatus = 'draft' | 'open' | 'closed' | 'cancelled';
export type GraduationMemberResponse = 'graduating' | 'not_graduating' | 'delayed' | 'unsure';
export type GraduationSecretaryDecision = 'pending' | 'promote' | 'keep_active' | 'defer';
export type AlumniDirectoryVisibility = 'standard' | 'limited' | 'hidden';

export interface GraduationCycle {
  id: string;
  term_label: string;
  status: GraduationCycleStatus;
  due_at: string | null;
  launched_by: string | null;
  launched_at: string | null;
  closed_by: string | null;
  closed_at: string | null;
  promoted_by: string | null;
  promoted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraduationCandidate {
  id: string;
  cycle_id: string;
  member_id: string;
  detected_reasons: string[];
  previous_status: string;
  expected_graduation_term: string | null;
  graduation_year: number | null;
  member_response: GraduationMemberResponse | null;
  response_note: string | null;
  confirmed_personal_email: string | null;
  confirmed_phone: string | null;
  confirmed_linkedin: string | null;
  alumni_city: string | null;
  alumni_directory_visibility: AlumniDirectoryVisibility;
  responded_at: string | null;
  secretary_decision: GraduationSecretaryDecision;
  secretary_note: string | null;
  decided_by: string | null;
  decided_at: string | null;
  promoted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GraduationCandidateLaunchInput {
  memberId: string;
  detectedReasons: string[];
  previousStatus: string;
  expectedGraduationTerm: string | null;
  graduationYear: number | null;
}

export interface GraduationResponseInput {
  candidateId: string;
  response: GraduationMemberResponse;
  responseNote?: string | null;
  confirmedPersonalEmail?: string | null;
  confirmedPhone?: string | null;
  confirmedLinkedin?: string | null;
  alumniCity?: string | null;
  alumniDirectoryVisibility: AlumniDirectoryVisibility;
}

export const isGraduationCandidateLaunchInput = (
  candidate: GraduationCandidateLaunchInput | null
): candidate is GraduationCandidateLaunchInput => Boolean(candidate);

const GRADUATION_CYCLE_SELECT = `
  id,
  term_label,
  status,
  due_at,
  launched_by,
  launched_at,
  closed_by,
  closed_at,
  promoted_by,
  promoted_at,
  created_at,
  updated_at
`;

const GRADUATION_CANDIDATE_SELECT = `
  id,
  cycle_id,
  member_id,
  detected_reasons,
  previous_status,
  expected_graduation_term,
  graduation_year,
  member_response,
  response_note,
  confirmed_personal_email,
  confirmed_phone,
  confirmed_linkedin,
  alumni_city,
  alumni_directory_visibility,
  responded_at,
  secretary_decision,
  secretary_note,
  decided_by,
  decided_at,
  promoted_at,
  created_at,
  updated_at
`;

export const fetchActiveGraduationCycle = async (): Promise<GraduationCycle | null> => {
  const { data, error } = await supabase
    .from('graduation_cycles')
    .select(GRADUATION_CYCLE_SELECT)
    .eq('status', 'open')
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as GraduationCycle | null;
};

export const fetchGraduationCandidates = async (cycleId: string): Promise<GraduationCandidate[]> => {
  const { data, error } = await supabase
    .from('graduation_candidates')
    .select(GRADUATION_CANDIDATE_SELECT)
    .eq('cycle_id', cycleId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as GraduationCandidate[];
};

export const fetchMyGraduationCandidate = async (memberId?: string): Promise<{
  cycle: GraduationCycle;
  candidate: GraduationCandidate;
} | null> => {
  const cycle = await fetchActiveGraduationCycle();
  if (!cycle) return null;

  let query = supabase
    .from('graduation_candidates')
    .select(GRADUATION_CANDIDATE_SELECT)
    .eq('cycle_id', cycle.id);

  if (memberId) {
    query = query.eq('member_id', memberId);
  }

  const { data, error } = await query.maybeSingle();

  if (error) throw error;
  if (!data) return null;

  return {
    cycle,
    candidate: data as GraduationCandidate
  };
};

export const launchGraduationCycle = async ({
  termLabel,
  dueAt,
  launchedBy,
  candidates
}: {
  termLabel: string;
  dueAt: string | null;
  launchedBy: string;
  candidates: GraduationCandidateLaunchInput[];
}): Promise<string> => {
  const { data: cycle, error: cycleError } = await supabase
    .from('graduation_cycles')
    .insert({
      term_label: termLabel,
      status: 'open',
      due_at: dueAt,
      launched_by: launchedBy,
      launched_at: new Date().toISOString()
    })
    .select('id')
    .single();

  if (cycleError) throw cycleError;

  const cycleId = cycle.id as string;
  if (candidates.length > 0) {
    const { error: candidatesError } = await supabase
      .from('graduation_candidates')
      .insert(candidates.map(candidate => ({
        cycle_id: cycleId,
        member_id: candidate.memberId,
        detected_reasons: candidate.detectedReasons,
        previous_status: candidate.previousStatus,
        expected_graduation_term: candidate.expectedGraduationTerm,
        graduation_year: candidate.graduationYear
      })));

    if (candidatesError) {
      await supabase.from('graduation_cycles').delete().eq('id', cycleId);
      throw candidatesError;
    }
  }

  return cycleId;
};

export const closeGraduationCycle = async (cycleId: string, closedBy: string) => {
  const { error } = await supabase
    .from('graduation_cycles')
    .update({
      status: 'closed',
      closed_by: closedBy,
      closed_at: new Date().toISOString()
    })
    .eq('id', cycleId);

  if (error) throw error;
};

export const updateGraduationCandidateDecision = async ({
  candidateId,
  decision,
  note,
  decidedBy
}: {
  candidateId: string;
  decision: GraduationSecretaryDecision;
  note?: string | null;
  decidedBy: string;
}) => {
  const { error } = await supabase
    .from('graduation_candidates')
    .update({
      secretary_decision: decision,
      secretary_note: note ?? null,
      decided_by: decidedBy,
      decided_at: new Date().toISOString()
    })
    .eq('id', candidateId);

  if (error) throw error;
};

export const submitGraduationResponse = async ({
  candidateId,
  response,
  responseNote,
  confirmedPersonalEmail,
  confirmedPhone,
  confirmedLinkedin,
  alumniCity,
  alumniDirectoryVisibility
}: GraduationResponseInput) => {
  const { error } = await supabase
    .from('graduation_candidates')
    .update({
      member_response: response,
      response_note: responseNote ?? null,
      confirmed_personal_email: confirmedPersonalEmail ?? null,
      confirmed_phone: confirmedPhone ?? null,
      confirmed_linkedin: confirmedLinkedin ?? null,
      alumni_city: alumniCity ?? null,
      alumni_directory_visibility: alumniDirectoryVisibility,
      responded_at: new Date().toISOString()
    })
    .eq('id', candidateId);

  if (error) throw error;
};

export const promoteGraduationCandidates = async (
  candidateIds: string[],
  actorMemberId: string
): Promise<number> => {
  const { data, error } = await supabase.rpc('promote_graduation_candidates', {
    candidate_ids: candidateIds,
    actor_member_id: actorMemberId
  });

  if (error) throw error;
  return Number(data ?? 0);
};

export const buildGraduationCandidateLaunchInput = (
  member: SecretaryMemberProfile,
  reviewYear = new Date().getFullYear()
): GraduationCandidateLaunchInput | null => {
  const reasons: string[] = [];
  const term = member.expected_graduation_term?.trim() ?? '';

  if (member.status === 'alumni') return null;
  if (member.graduation_year !== null && member.graduation_year <= reviewYear) {
    reasons.push(`Graduation year ${member.graduation_year}`);
  }
  if (term.toLowerCase().includes(String(reviewYear))) {
    reasons.push(term);
  }

  if (reasons.length === 0) return null;

  return {
    memberId: member.id,
    detectedReasons: reasons,
    previousStatus: member.status,
    expectedGraduationTerm: member.expected_graduation_term,
    graduationYear: member.graduation_year
  };
};
