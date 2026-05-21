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

export type CsvMember = { id: string; name: string; suid: string };
export type CsvMatch = {
  rawName: string;
  memberId: string | null;
  memberName: string | null;
  score: number;
  confidence: "high" | "medium" | "low";
};

export function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // remove accents
    .replace(/[^a-z0-9 ]/g, "")      // remove special chars
    .trim();
}

function getSimilarity(s1: string, s2: string): number {
  const norm1 = normalizeName(s1);
  const norm2 = normalizeName(s2);
  if (norm1 === norm2) return 1.0;
  
  // Exact containment bonus
  if (norm1.includes(norm2) || norm2.includes(norm1)) {
    const minLen = Math.min(norm1.length, norm2.length);
    const maxLen = Math.max(norm1.length, norm2.length);
    return maxLen > 0 ? minLen / maxLen : 0;
  }

  // Levenshtein distance
  const track = Array(norm2.length + 1).fill(null).map(() => Array(norm1.length + 1).fill(null));
  for (let i = 0; i <= norm1.length; i += 1) track[0][i] = i;
  for (let j = 0; j <= norm2.length; j += 1) track[j][0] = j;
  for (let j = 1; j <= norm2.length; j += 1) {
    for (let i = 1; i <= norm1.length; i += 1) {
      const indicator = norm1[i - 1] === norm2[j - 1] ? 0 : 1;
      track[j][i] = Math.min(
        track[j][i - 1] + 1, // deletion
        track[j - 1][i] + 1, // insertion
        track[j - 1][i - 1] + indicator, // substitution
      );
    }
  }
  const distance = track[norm2.length][norm1.length];
  const maxLen = Math.max(norm1.length, norm2.length);
  return maxLen > 0 ? (maxLen - distance) / maxLen : 0;
}

export function parseAttendanceCsv(csv: string): string[] {
  const lines = csv.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return [];
  
  // Parse headers from the first line
  const headers = lines[0].split(',').map(h => h.replace(/^["']|["']$/g, '').trim().toLowerCase());
  let nameIndex = headers.findIndex(h => h === 'name' || h === 'member' || h === 'full name');
  if (nameIndex === -1) nameIndex = 0; // Default to first column if header not matched
  
  const names: string[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Basic CSV cell split handling simple quotes
    const row = lines[i];
    const cells: string[] = [];
    let currentCell = '';
    let inQuotes = false;
    
    for (let charIndex = 0; charIndex < row.length; charIndex++) {
      const char = row[charIndex];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(currentCell.trim());
        currentCell = '';
      } else {
        currentCell += char;
      }
    }
    cells.push(currentCell.trim());
    
    if (cells[nameIndex]) {
      names.push(cells[nameIndex].replace(/^["']|["']$/g, '').trim());
    }
  }
  return names;
}

export function matchCsvNames(rawNames: string[], members: CsvMember[]): CsvMatch[] {
  return rawNames.map((rawName) => {
    let bestMatch: CsvMember | null = null;
    let bestScore = 0;

    for (const member of members) {
      const score = getSimilarity(rawName, member.name);
      if (score > bestScore) {
        bestScore = score;
        bestMatch = member;
      }
    }

    if (!bestMatch || bestScore < 0.45) {
      return { rawName, memberId: null, memberName: null, score: 0, confidence: "low" };
    }

    return {
      rawName,
      memberId: bestMatch.id,
      memberName: bestMatch.name,
      score: bestScore,
      confidence: bestScore > 0.85 ? "high" : bestScore >= 0.6 ? "medium" : "low",
    };
  });
}
