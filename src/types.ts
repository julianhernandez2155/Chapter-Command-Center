export type MemberStatus = 'active' | 'probation' | 'inactive' | 'pledge';
export type Standing = 'good' | 'warning' | 'bad';
export type Tier = 'gold' | 'garnet' | 'white' | 'ineligible';

export interface ChairmanReport {
  id: string;
  positionId: string;
  positionTitle: string;
  submittedBy: string; // Member Name
  semester: string;
  weekNumber: number;
  submittedAt?: string;
  status: 'draft' | 'submitted';
  meetingDate: string;
  attendancePresent: string;
  attendanceAbsent: string;
  content: {
    accomplishments: string; // What did your committee accomplish this week?
    plannedActions: string;  // What is planned for next week?
    smartGoalProgress: string; // SMART goal progress
    supportNeeded: string;     // Support/resources needed from exec
    recognitions: string;      // Members to recognize
    concerns: string;          // Concerns or issues
    upcomingEvents: string;    // Upcoming events (name, date, type)
    budgetUpdate: string;      // Budget updates
    agendaItems: string;       // Items for chapter meeting agenda
  };
}

export interface Member {
  id: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  suid: string;
  major: string;
  gradYear: string;
  status: MemberStatus;
  standing: Standing;
  email: string;
  avatar?: string;
  socials: {
    instagram?: string;
    snapchat?: string;
    linkedin?: string;
    venmo?: string;
  };
  logistics: {
    dorm?: string;
    room?: string;
    tshirtSize: 'S' | 'M' | 'L' | 'XL' | 'XXL';
  };
}

export interface Event {
  id: string;
  name: string;
  type: 'Chapter Meeting' | 'Committee' | 'Social' | 'Philanthropy' | 'Other';
  category: 'Administrative' | 'Governance' | 'Development' | 'Service';
  date: string;
  time: string;
  location: string;
  isMandatory: boolean;
  checkInOpen: boolean;
  qrEnabled: boolean;
  allowExcusals: boolean;
  expectedCount: number;
  actualCount: number;
  officerNotes?: string;
}

export interface Position {
  id: string;
  title: string;
  assignedTo?: string; // Member ID
  assignedDate?: string;
  isVacant: boolean;
  priority: 'High' | 'Medium' | 'Low';
}

export interface Branch {
  id: string;
  name: string;
  oversight: string;
  positions: Position[];
}
