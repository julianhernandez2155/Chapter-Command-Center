import { Member, Event, Branch } from './types';

export const MOCK_MEMBERS: Member[] = [
  {
    id: '1',
    firstName: 'Julian',
    lastName: 'Sterling',
    preferredName: 'Julian',
    suid: '882944102',
    major: 'Philosophy & Political Science',
    gradYear: '2026',
    status: 'active',
    standing: 'good',
    email: 'julian.sterling@syr.edu',
    avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCtpwkSiMBbCK3RL9VB29AAVSz-u6dFH3erqrxpmnV2E1IFcgc1rcM9BT0wfbVZ1HS4_AnAdw3uqwFIVRP7Sy0N6kNYWAUD5oAzYF_GrBO2m3wQJrAYUlJvj76dTSP-y4VBDIefjHZH_hlPUfFQEHlzqIAFf7nREhKJM-HYPzjDakyaGhd8B7M05bJbziZuRmTMhLfrDEdUGHCJ4_bsrRmfwaAYy4n9UMJIWQaRUMDUAF3cJ2QAlI01AjEEPfHbJ8vAWonTgid9-sVW',
    socials: {
      instagram: '@j.sterling',
      snapchat: 'js_phi_26',
      linkedin: 'julian-sterling',
      venmo: '@JS-Pay'
    },
    logistics: {
      dorm: 'Lawrinson Hall',
      room: '1402-B',
      tshirtSize: 'L'
    }
  }
];

export const MOCK_EVENTS: Event[] = [
  {
    id: 'e1',
    name: 'Spring Chapter Meeting',
    type: 'Chapter Meeting',
    category: 'Administrative',
    date: 'March 15, 2024',
    time: '19:00 EST',
    location: 'Union Building 402',
    isMandatory: true,
    checkInOpen: true,
    qrEnabled: true,
    allowExcusals: true,
    expectedCount: 140,
    actualCount: 64,
    officerNotes: 'Expect guests from National Headquarters for a site visit. Ensure all active brothers are in business casual attire.'
  },
  {
    id: 'e2',
    name: 'Recruitment Workshop',
    type: 'Committee',
    category: 'Development',
    date: 'Oct 26, 2023',
    time: '4:00 PM — 5:30 PM',
    location: 'Chapter House Library',
    isMandatory: false,
    checkInOpen: false,
    qrEnabled: true,
    allowExcusals: false,
    expectedCount: 45,
    actualCount: 0
  }
];

export const MOCK_BRANCHES: Branch[] = [
  {
    id: 'b1',
    name: 'Executive Board',
    oversight: 'Chapter President',
    positions: [
      { id: 'p1', title: 'President', assignedTo: '1', assignedDate: 'Sept 23', isVacant: false, priority: 'High' },
      { id: 'p2', title: 'Internal VP', assignedTo: '2', assignedDate: 'Sept 23', isVacant: false, priority: 'High' },
      { id: 'p3', title: 'External VP', assignedTo: '3', assignedDate: 'Sept 23', isVacant: false, priority: 'High' },
      { id: 'p4', title: 'Treasurer', isVacant: true, priority: 'High' },
      { id: 'p5', title: 'Secretary', assignedTo: '4', assignedDate: 'Oct 23', isVacant: false, priority: 'Medium' },
      { id: 'p6', title: 'Recruitment', assignedTo: '5', assignedDate: 'Nov 23', isVacant: false, priority: 'High' }
    ]
  }
];
