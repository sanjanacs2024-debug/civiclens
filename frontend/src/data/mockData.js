// Centralized mock dataset matching MongoDB/Mongoose schema specifications

export const COLLECTIVE_SIGNAL_THRESHOLD = 10;

export const INITIAL_ISSUES = [
  {
    id: "CL-8921",
    title: "Deep Pothole near Signal Junction",
    description: "Large, hazardous pothole on 5th Block junction creating severe traffic slowdowns and wheel damage for two-wheelers.",
    category: "Roads & Infrastructure",
    image: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&w=800&q=80",
    location: "Koramangala 5th Block, Bengaluru",
    latitude: 12.9352,
    longitude: 77.6245,
    severity: "High",
    status: "In Progress",
    reportCount: 14,
    collectiveSignal: true,
    collectiveSignalCount: 14,
    affectedAreaKm: 1.2,
    neglectStatus: "ON TRACK", // ON TRACK | ATTENTION | DEADLINE EXCEEDED
    escalationLevel: 1,
    escalationReason: "Standard municipal assignment timeframe active",
    department: "BBMP Road Infrastructure Dept",
    createdAt: "2026-09-20T10:00:00Z",
    updatedAt: "2026-09-28T14:30:00Z",
    expectedResolutionDate: "2026-10-05T18:00:00Z",
    reporter: {
      name: "Arjun Sharma",
      role: "Civic Reporter (Verified)"
    },
    aiAnalysis: {
      detectedCategory: "Roads & Infrastructure",
      detectedIssue: "Damaged road surface / Deep Pothole",
      suggestedSeverity: "High",
      confidence: 0.94
    },
    progressUpdates: [
      {
        id: "PU-101",
        date: "2026-09-22T09:00:00Z",
        status: "Acknowledged",
        description: "Complaint verified by Ward Inspector. Dispatched to road maintenance division.",
        percentage: 25,
        updatedBy: "Ward 151 Nodal Officer"
      },
      {
        id: "PU-102",
        date: "2026-09-28T14:30:00Z",
        status: "In Progress",
        description: "Asphalt patch team scheduled for overnight repair work.",
        percentage: 60,
        updatedBy: "BBMP Road Maintenance Division"
      }
    ]
  },
  {
    id: "CL-8894",
    title: "Overflowing Sewage Pipeline on Main Road",
    description: "Raw sewage leaking onto main road causing health hazard for nearby shops and residents.",
    category: "Water & Drainage",
    image: "https://images.unsplash.com/photo-1547683905-f686c993aae5?auto=format&fit=crop&w=800&q=80",
    location: "Indiranagar 100ft Road, Bengaluru",
    latitude: 12.9784,
    longitude: 77.6408,
    severity: "Critical",
    status: "Escalated",
    reportCount: 22,
    collectiveSignal: true,
    collectiveSignalCount: 22,
    affectedAreaKm: 2.5,
    neglectStatus: "DEADLINE EXCEEDED",
    escalationLevel: 2,
    escalationReason: "Resolution deadline exceeded by 8 days without site resolution.",
    department: "BWSSB Sanitary Works Division",
    createdAt: "2026-09-01T08:30:00Z",
    updatedAt: "2026-09-25T11:00:00Z",
    expectedResolutionDate: "2026-09-10T18:00:00Z",
    reporter: {
      name: "Priya Nair",
      role: "Resident Reporter"
    },
    aiAnalysis: {
      detectedCategory: "Water & Drainage",
      detectedIssue: "Sewage Overflow / Public Health Risk",
      suggestedSeverity: "Critical",
      confidence: 0.98
    },
    progressUpdates: [
      {
        id: "PU-201",
        date: "2026-09-03T10:00:00Z",
        status: "Acknowledged",
        description: "Assigned to BWSSB local engineering unit.",
        percentage: 15,
        updatedBy: "BWSSB Desk"
      }
    ]
  },
  {
    id: "CL-8830",
    title: "Non-Functional Streetlights on Main Corridor",
    description: "Entire stretch of 8 streetlights out of order, rendering pedestrian path completely dark at night.",
    category: "Public Safety",
    image: "https://images.unsplash.com/photo-1509114397022-ed747cca3f65?auto=format&fit=crop&w=800&q=80",
    location: "HSR Layout Sector 2, Bengaluru",
    latitude: 12.9121,
    longitude: 77.6445,
    severity: "Medium",
    status: "Reported",
    reportCount: 4,
    collectiveSignal: false,
    collectiveSignalCount: 4,
    affectedAreaKm: 0.4,
    neglectStatus: "ATTENTION",
    escalationLevel: 1,
    escalationReason: "Approaching initial resolution deadline",
    department: "BESCOM Electrical Operations",
    createdAt: "2026-09-26T19:15:00Z",
    updatedAt: "2026-09-26T19:15:00Z",
    expectedResolutionDate: "2026-10-02T18:00:00Z",
    reporter: {
      name: "Rahul Verma",
      role: "Citizen"
    },
    aiAnalysis: {
      detectedCategory: "Public Safety",
      detectedIssue: "Unlit Street Corridor",
      suggestedSeverity: "Medium",
      confidence: 0.89
    },
    progressUpdates: []
  },
  {
    id: "CL-8791",
    title: "Uncollected Garbage Accumulation near Park",
    description: "Large dump of unsegregated waste blocking public walkway and creating odor.",
    category: "Waste & Cleanliness",
    image: "https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?auto=format&fit=crop&w=800&q=80",
    location: "BTM Layout 2nd Stage, Bengaluru",
    latitude: 12.9166,
    longitude: 77.6101,
    severity: "Medium",
    status: "Resolved",
    reportCount: 8,
    collectiveSignal: false,
    collectiveSignalCount: 8,
    affectedAreaKm: 0.2,
    neglectStatus: "ON TRACK",
    escalationLevel: 1,
    escalationReason: "Successfully resolved within SLA target",
    department: "BBMP Solid Waste Management",
    createdAt: "2026-09-15T07:45:00Z",
    updatedAt: "2026-09-18T16:00:00Z",
    expectedResolutionDate: "2026-09-20T18:00:00Z",
    reporter: {
      name: "Suresh Kumar",
      role: "Verified Citizen"
    },
    aiAnalysis: {
      detectedCategory: "Waste & Cleanliness",
      detectedIssue: "Solid Waste Dumping",
      suggestedSeverity: "Medium",
      confidence: 0.92
    },
    progressUpdates: [
      {
        id: "PU-301",
        date: "2026-09-16T08:00:00Z",
        status: "In Progress",
        description: "Cleanup team dispatched with compaction vehicle.",
        percentage: 50,
        updatedBy: "BBMP SWM Supervisor"
      },
      {
        id: "PU-302",
        date: "2026-09-18T16:00:00Z",
        status: "Resolved",
        description: "Site fully cleared and sanitized.",
        percentage: 100,
        updatedBy: "BBMP SWM Supervisor"
      }
    ]
  }
];
export { INITIAL_ISSUES as mockIssues };