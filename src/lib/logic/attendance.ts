export type AttendanceRecordInput = {
  eventId: string;
  memberId: string;
  checkedInAt: Date;
  lateCutoffTime: Date;
  method: "qr" | "manual" | "csv";
};

export function attendanceStatus(checkedInAt: Date, lateCutoffTime: Date) {
  return checkedInAt < lateCutoffTime ? "on_time" : "late";
}

export function dedupeAttendance<T extends { eventId: string; memberId: string; checkedInAt: Date }>(records: T[]) {
  const byKey = new Map<string, T>();
  for (const record of records) {
    const key = `${record.eventId}:${record.memberId}`;
    const existing = byKey.get(key);
    if (!existing || record.checkedInAt < existing.checkedInAt) byKey.set(key, record);
  }
  return [...byKey.values()];
}

export type CsvMember = { id: string; name: string; suid: string; googleEmail?: string };
export type CsvAttendanceIdentity = {
  rawValue: string;
  suid: string | null;
  email: string | null;
  rowNumber: number;
};
export type CsvMatch = {
  rawValue: string;
  rowNumber: number;
  memberId: string | null;
  memberName: string | null;
  suid: string | null;
  email: string | null;
  confidence: "high" | "low";
  reason: "suid" | "email" | "missing_identity" | "no_match" | "duplicate_identity";
};

export function normalizeAttendanceEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function normalizeAttendanceSuid(value: string): string | null {
  const digits = value.replace(/\D/g, "");
  return digits.length >= 6 && digits.length <= 9 ? digits : null;
}

function parseCsvLine(row: string): string[] {
  const cells: string[] = [];
  let currentCell = "";
  let inQuotes = false;

  for (let charIndex = 0; charIndex < row.length; charIndex += 1) {
    const char = row[charIndex];
    const nextChar = row[charIndex + 1];

    if (char === '"' && inQuotes && nextChar === '"') {
      currentCell += '"';
      charIndex += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      cells.push(currentCell.trim().replace(/^["']|["']$/g, ""));
      currentCell = "";
    } else {
      currentCell += char;
    }
  }

  cells.push(currentCell.trim().replace(/^["']|["']$/g, ""));
  return cells;
}

export function parseAttendanceCsv(csv: string): CsvAttendanceIdentity[] {
  const lines = csv.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = parseCsvLine(lines[0]).map(header => header.trim().toLowerCase());
  const suidIndex = headers.findIndex(header => ["suid", "student id", "student_id"].includes(header));
  const emailIndex = headers.findIndex(header => ["email", "school email", "school_email", "google_email"].includes(header));

  if (suidIndex === -1 && emailIndex === -1) return [];

  const identities: CsvAttendanceIdentity[] = [];
  for (let index = 1; index < lines.length; index += 1) {
    const cells = parseCsvLine(lines[index]);
    const rawSuid = suidIndex >= 0 ? cells[suidIndex] ?? "" : "";
    const rawEmail = emailIndex >= 0 ? cells[emailIndex] ?? "" : "";
    const suid = normalizeAttendanceSuid(rawSuid);
    const email = normalizeAttendanceEmail(rawEmail);

    identities.push({
      rawValue: suid ?? email ?? (rawSuid.trim() || rawEmail.trim()),
      suid,
      email,
      rowNumber: index + 1
    });
  }

  return identities;
}

export function matchCsvIdentities(identities: CsvAttendanceIdentity[], members: CsvMember[]): CsvMatch[] {
  const memberBySuid = new Map(members.map(member => [member.suid, member]));
  const memberByEmail = new Map(
    members
      .map(member => [member.googleEmail ? normalizeAttendanceEmail(member.googleEmail) : null, member] as const)
      .filter((entry): entry is [string, CsvMember] => Boolean(entry[0]))
  );
  const seenIdentities = new Set<string>();
  const seenMemberIds = new Set<string>();

  return identities.map(identity => {
    const identityKey = identity.suid ?? identity.email;
    if (!identityKey) {
      return {
        rawValue: identity.rawValue,
        rowNumber: identity.rowNumber,
        memberId: null,
        memberName: null,
        suid: identity.suid,
        email: identity.email,
        confidence: "low",
        reason: "missing_identity"
      };
    }

    if (seenIdentities.has(identityKey)) {
      return {
        rawValue: identity.rawValue,
        rowNumber: identity.rowNumber,
        memberId: null,
        memberName: null,
        suid: identity.suid,
        email: identity.email,
        confidence: "low",
        reason: "duplicate_identity"
      };
    }

    seenIdentities.add(identityKey);
    const suidMatch = identity.suid ? memberBySuid.get(identity.suid) : null;
    const emailMatch = identity.email ? memberByEmail.get(identity.email) : null;
    const match = suidMatch ?? emailMatch ?? null;

    if (match && seenMemberIds.has(match.id)) {
      return {
        rawValue: identity.rawValue,
        rowNumber: identity.rowNumber,
        memberId: null,
        memberName: match.name,
        suid: identity.suid,
        email: identity.email,
        confidence: "low",
        reason: "duplicate_identity"
      };
    }

    if (match) seenMemberIds.add(match.id);

    return {
      rawValue: identity.rawValue,
      rowNumber: identity.rowNumber,
      memberId: match?.id ?? null,
      memberName: match?.name ?? null,
      suid: identity.suid,
      email: identity.email,
      confidence: match ? "high" : "low",
      reason: match ? (suidMatch ? "suid" : "email") : "no_match"
    };
  });
}

export const matchCsvNames = matchCsvIdentities;
