/**
 * Career Point University, Kota — Academic Classification Constants
 * Structure: University -> Departments/Schools -> Programs -> Semesters
 */

export const CPU_DEPARTMENTS = [
  'School of Computer Applications',
  'School of Engineering & Technology',
  'School of Pharmaceutical Sciences',
  'School of Management Studies',
  'School of Basic Sciences',
  'School of Law',
  'School of Education',
  'Administration'
];

export const CPU_PROGRAMS = [
  {
    code: 'BCA',
    name: 'Bachelor of Computer Applications',
    department: 'School of Computer Applications',
    semesters: 6,
    degree: 'Undergraduate'
  },
  {
    code: 'BTECH CSE',
    name: 'B.Tech Computer Science & Engineering',
    department: 'School of Engineering & Technology',
    semesters: 8,
    degree: 'Undergraduate'
  },
  {
    code: 'BTECH ECE',
    name: 'B.Tech Electronics & Communication',
    department: 'School of Engineering & Technology',
    semesters: 8,
    degree: 'Undergraduate'
  },
  {
    code: 'BTECH ME',
    name: 'B.Tech Mechanical Engineering',
    department: 'School of Engineering & Technology',
    semesters: 8,
    degree: 'Undergraduate'
  },
  {
    code: 'BTECH CE',
    name: 'B.Tech Civil Engineering',
    department: 'School of Engineering & Technology',
    semesters: 8,
    degree: 'Undergraduate'
  },
  {
    code: 'MCA',
    name: 'Master of Computer Applications',
    department: 'School of Computer Applications',
    semesters: 4,
    degree: 'Postgraduate'
  },
  {
    code: 'MBA',
    name: 'Master of Business Administration',
    department: 'School of Management Studies',
    semesters: 4,
    degree: 'Postgraduate'
  },
  {
    code: 'BSc CS',
    name: 'B.Sc Computer Science',
    department: 'School of Computer Applications',
    semesters: 6,
    degree: 'Undergraduate'
  },
  {
    code: 'BSc IT',
    name: 'B.Sc Information Technology',
    department: 'School of Computer Applications',
    semesters: 6,
    degree: 'Undergraduate'
  },
  {
    code: 'BSc Biotech',
    name: 'B.Sc Biotechnology',
    department: 'School of Basic Sciences',
    semesters: 6,
    degree: 'Undergraduate'
  },
  {
    code: 'Pharm.D',
    name: 'Doctor of Pharmacy (Pharm.D)',
    department: 'School of Pharmaceutical Sciences',
    semesters: 8,
    degree: 'Doctorate'
  },
  {
    code: 'B.Pharma',
    name: 'Bachelor of Pharmacy',
    department: 'School of Pharmaceutical Sciences',
    semesters: 8,
    degree: 'Undergraduate'
  },
  {
    code: 'M.Pharma',
    name: 'Master of Pharmacy',
    department: 'School of Pharmaceutical Sciences',
    semesters: 4,
    degree: 'Postgraduate'
  },
  {
    code: 'BBA',
    name: 'Bachelor of Business Administration',
    department: 'School of Management Studies',
    semesters: 6,
    degree: 'Undergraduate'
  },
  {
    code: 'Other',
    name: 'Other Academic Program',
    department: 'School of Computer Applications',
    semesters: 8,
    degree: 'Other'
  }
];

export const FACULTY_DESIGNATIONS = [
  'HOD',
  'Head of Department (HOD)',
  'Professor',
  'Associate Professor',
  'Assistant Professor',
  'Senior Lecturer',
  'Lecturer',
  'Director',
  'Visiting Faculty'
];

export const FACULTY_SPECIALIZATIONS = [
  'Web & Full Stack Development',
  'Artificial Intelligence & ML',
  'Data Science & Analytics',
  'Cloud Computing & DevOps',
  'Cybersecurity & Networking',
  'Mobile App Development',
  'Internet of Things (IoT)',
  'Blockchain Technology',
  'Database Systems',
  'Software Engineering',
  'Pharmaceutical Sciences',
  'General / Other'
];

export const BATCH_OPTIONS = [
  '2022-2026',
  '2023-2026',
  '2023-2027',
  '2024-2027',
  '2024-2028',
  '2025-2028',
  '2025-2029'
];

export const SECTION_OPTIONS = ['A', 'B', 'C', 'D'];

export const getProgramByCode = (code) => {
  return CPU_PROGRAMS.find((p) => p.code === code) || CPU_PROGRAMS[0];
};

export const getSemestersForProgram = (code) => {
  const prog = CPU_PROGRAMS.find((p) => p.code === code);
  const max = prog ? prog.semesters : 8;
  return Array.from({ length: max }, (_, i) => i + 1);
};
