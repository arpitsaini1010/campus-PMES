const express = require('express');
const router = express.Router();
const { CPU_PROGRAMS, CPU_DEPARTMENTS, FACULTY_DESIGNATIONS, FACULTY_SPECIALIZATIONS } = require('../models/User');
const Project = require('../models/Project');

const PROGRAM_DETAILS = {
  'BCA': { name: 'Bachelor of Computer Applications', department: 'School of Computer Applications', maxSemesters: 6, degree: 'Undergraduate' },
  'BTECH CSE': { name: 'B.Tech Computer Science & Engineering', department: 'School of Engineering & Technology', maxSemesters: 8, degree: 'Undergraduate' },
  'BTECH ECE': { name: 'B.Tech Electronics & Communication', department: 'School of Engineering & Technology', maxSemesters: 8, degree: 'Undergraduate' },
  'BTECH ME': { name: 'B.Tech Mechanical Engineering', department: 'School of Engineering & Technology', maxSemesters: 8, degree: 'Undergraduate' },
  'BTECH CE': { name: 'B.Tech Civil Engineering', department: 'School of Engineering & Technology', maxSemesters: 8, degree: 'Undergraduate' },
  'MCA': { name: 'Master of Computer Applications', department: 'School of Computer Applications', maxSemesters: 4, degree: 'Postgraduate' },
  'MBA': { name: 'Master of Business Administration', department: 'School of Management Studies', maxSemesters: 4, degree: 'Postgraduate' },
  'BSc CS': { name: 'B.Sc Computer Science', department: 'School of Computer Applications', maxSemesters: 6, degree: 'Undergraduate' },
  'BSc IT': { name: 'B.Sc Information Technology', department: 'School of Computer Applications', maxSemesters: 6, degree: 'Undergraduate' },
  'BSc Biotech': { name: 'B.Sc Biotechnology', department: 'School of Basic Sciences', maxSemesters: 6, degree: 'Undergraduate' },
  'Pharm.D': { name: 'Doctor of Pharmacy (Pharm.D)', department: 'School of Pharmaceutical Sciences', maxSemesters: 8, degree: 'Doctorate' },
  'B.Pharma': { name: 'Bachelor of Pharmacy', department: 'School of Pharmaceutical Sciences', maxSemesters: 8, degree: 'Undergraduate' },
  'M.Pharma': { name: 'Master of Pharmacy', department: 'School of Pharmaceutical Sciences', maxSemesters: 4, degree: 'Postgraduate' },
  'BBA': { name: 'Bachelor of Business Administration', department: 'School of Management Studies', maxSemesters: 6, degree: 'Undergraduate' },
  'Other': { name: 'Other Academic Program', department: 'School of Computer Applications', maxSemesters: 8, degree: 'Other' }
};

// @route   GET /api/meta/academic-config
// @desc    Get university academic hierarchy and program classification
router.get('/academic-config', (req, res) => {
  res.json({
    university: 'Career Point University, Kota',
    departments: CPU_DEPARTMENTS,
    programs: CPU_PROGRAMS,
    programDetails: PROGRAM_DETAILS,
    facultyDesignations: FACULTY_DESIGNATIONS,
    facultySpecializations: FACULTY_SPECIALIZATIONS
  });
});

// @route   GET /api/meta/showcase
// @desc    Public showcase of evaluated projects
router.get('/showcase', async (req, res) => {
  try {
    const { search, program, category } = req.query;
    const filter = { status: 'Evaluated' };

    if (program) filter.program = program;
    if (category) filter.category = category;

    let projects = await Project.find(filter)
      .populate('category', 'name')
      .populate('leader', 'name email program semester batch')
      .populate('supervisor', 'name designation department')
      .sort({ updatedAt: -1 })
      .limit(20);

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      projects = projects.filter(p =>
        p.title?.toLowerCase().includes(q) ||
        p.description?.toLowerCase().includes(q) ||
        p.leader?.name?.toLowerCase().includes(q) ||
        p.supervisor?.name?.toLowerCase().includes(q)
      );
    }

    res.json({ projects });
  } catch (error) {
    console.error('Showcase error:', error);
    res.status(500).json({ message: 'Error retrieving showcase projects.' });
  }
});

module.exports = router;
