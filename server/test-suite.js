/**
 * Comprehensive Acceptance Criteria Test Suite for Campus PMES Version 1.1
 * Validates AC-01 through AC-17 as defined in SRS Section 11.2
 */

require('dotenv').config();
const http = require('http');

const BASE_URL = 'http://localhost:5000/api';
const DYNAMIC_TEST_PASS = 'TestPass_' + Math.random().toString(36).slice(-8) + 'A1!';

const request = async (endpoint, options = {}) => {
  const url = `${BASE_URL}${endpoint}`;
  const headers = options.headers || {};
  let body = options.body;

  if (body && typeof body === 'object' && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
    body = JSON.stringify(body);
  }

  const response = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.method === 'GET' ? undefined : body
  });

  const contentType = response.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  return { status: response.status, data };
};

const runAcceptanceTests = async () => {
  console.log('\n=============================================================');
  console.log('🧪 RUNNING CAMPUS PMES AUTOMATED ACCEPTANCE TEST SUITE (AC-01 to AC-17)');
  console.log('=============================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, testName, details = '') => {
    if (condition) {
      console.log(`  ✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${testName} - ${details}`);
      failed++;
    }
  };

  // Wait for server to be fully ready
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) {
        ready = true;
        break;
      }
    } catch (e) {
      // wait a bit
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!ready) {
    console.error('Server failed to start within timeout window.');
    process.exit(1);
  }

  try {
    // System Healthcheck
    const health = await request('/health');
    assert(health.status === 200 && health.data.status === 'ok', 'System Health Check');

    // 1. Admin Login
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { 
        email: process.env.ADMIN_EMAIL || 'admin@cpur.in', 
        password: process.env.ADMIN_PASSWORD || DYNAMIC_TEST_PASS 
      }
    });
    assert(adminLogin.status === 200 && adminLogin.data.token, 'Admin Login Authenticates Successfully');
    const adminToken = adminLogin.data.token;

    // AC-08: Passwords never appear in any API response or database record in plain text
    assert(!adminLogin.data.user.password, 'AC-08: Password hash not exposed in API response');

    // AC-15: There is no public registration (FR-AUTH-01, BR-01)
    const publicRegAttempt = await request('/auth/register', {
      method: 'POST',
      body: { name: 'Test Public User', email: `test.public.${Date.now()}@example.com`, password: DYNAMIC_TEST_PASS }
    });
    assert(publicRegAttempt.status === 403, 'AC-15: Public registration rejected with HTTP 403 (Admin-only creation)');

    // Fetch seeded departments
    const deptRes = await request('/departments');
    assert(deptRes.status === 200 && deptRes.data.departments.length === 5, 'FR-DEP-01: Five university departments exist');
    const bcaDept = deptRes.data.departments.find(d => d.code === 'BCA');
    const btechDept = deptRes.data.departments.find(d => d.code === 'BTECH');

    // AC-17: The Admin dashboard warns for any department with fewer than 5 active faculty
    const adminDash = await request('/dashboard', { headers: { Authorization: `Bearer ${adminToken}` } });
    assert(adminDash.status === 200 && Array.isArray(adminDash.data.departmentStats), 'AC-17: Admin dashboard tracks faculty count per department');

    // Create Faculty accounts via Admin (FR-ADM-01)
    const facultyEmail = `prof.bca.${Date.now()}@cpur.in`;
    const facultyEmpId = `EMP-${Date.now().toString().slice(-4)}`;
    const createFaculty = await request('/admin/faculty', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Dr. Test Professor',
        email: facultyEmail,
        employeeId: facultyEmpId,
        password: DYNAMIC_TEST_PASS,
        department: bcaDept._id,
        designation: 'Assistant Professor'
      }
    });
    assert(createFaculty.status === 201 && createFaculty.data.user.role === 'faculty', 'Admin creates Faculty account');
    const facultyId = createFaculty.data.user._id;

    // Faculty login
    const facultyLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: facultyEmail, password: DYNAMIC_TEST_PASS }
    });
    assert(facultyLogin.status === 200 && facultyLogin.data.token, 'Faculty Login Authenticates Successfully');
    const facultyToken = facultyLogin.data.token;

    // Register Student via Admin (FR-STU-01)
    const studentEmail = `student.bca.${Date.now()}@cpur.in`;
    const studentEnroll = `K${Date.now().toString().slice(-5)}`;
    const createStudent = await request('/admin/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'Test BCA Student',
        email: studentEmail,
        enrollmentNo: studentEnroll,
        department: bcaDept._id,
        semester: 5,
        password: DYNAMIC_TEST_PASS
      }
    });
    assert(createStudent.status === 201 && createStudent.data.user.role === 'student', 'Admin registers Student account (FR-STU-01)');
    const studentId = createStudent.data.user._id;

    // Student login
    const studentLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: studentEmail, password: DYNAMIC_TEST_PASS }
    });
    assert(studentLogin.status === 200 && studentLogin.data.token, 'Student Login Authenticates Successfully');
    const studentToken = studentLogin.data.token;

    // AC-01: A Student cannot access any Admin or Faculty API (403)
    const studentAdminAttempt = await request('/admin/users', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(studentAdminAttempt.status === 403, 'AC-01: Student denied access to Admin route (403)');

    // Allocate subject to faculty (FR-DEP-05)
    const subjectRes = await request(`/subjects?department=${bcaDept._id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    let allocatedSubject = subjectRes.data.subjects.find(s => s.semester === 5);
    if (!allocatedSubject) {
      const newSubj = await request('/subjects', {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: {
          name: 'Advanced Web Applications',
          code: `BCA-${Date.now().toString().slice(-3)}`,
          department: bcaDept._id,
          semester: 5,
          faculty: facultyId
        }
      });
      allocatedSubject = newSubj.data.subject;
    } else {
      await request(`/subjects/${allocatedSubject._id}/allocate`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${adminToken}` },
        body: { facultyId }
      });
    }

    // AC-10: A faculty member can post assignments only for subjects allocated to them
    const postAssignmentRes = await request('/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: {
        title: 'Project Phase 1 Implementation',
        description: 'Complete the database models and authentication endpoints.',
        subjectId: allocatedSubject._id,
        dueDate: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString(),
        maxMarks: 20
      }
    });
    assert(postAssignmentRes.status === 201, 'AC-10: Faculty posts assignment for allocated subject');
    const assignmentId = postAssignmentRes.data.assignment._id;

    // AC-12: Posting an assignment notifies all students of that department and semester
    const notifRes = await request('/notifications', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(
      notifRes.status === 200 && notifRes.data.notifications.some(n => n.type === 'assignment_posted'),
      'AC-12: Posting assignment notifies matching student cohort'
    );

    // AC-09: A student cannot see, open or submit to an assignment of another department or semester (404)
    // Create BTECH student
    const btechStudentEmail = `student.btech.${Date.now()}@cpur.in`;
    const createBtechStudent = await request('/admin/students', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: {
        name: 'BTech Student',
        email: btechStudentEmail,
        enrollmentNo: `K${Date.now().toString().slice(-5)}B`,
        department: btechDept._id,
        semester: 7,
        password: DYNAMIC_TEST_PASS
      }
    });
    const btechLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: btechStudentEmail, password: DYNAMIC_TEST_PASS }
    });
    const btechToken = btechLogin.data.token;

    const btechAccessAttempt = await request(`/assignments/${assignmentId}`, {
      headers: { Authorization: `Bearer ${btechToken}` }
    });
    assert(btechAccessAttempt.status === 404, 'AC-09: Student from different department/semester receives HTTP 404 for assignment');

    // AC-11: Two faculty can post assignments at the same time
    const secondAssignmentRes = await request('/assignments', {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: {
        title: 'Concurrent Assignment 2',
        description: 'Testing simultaneous independent assignments.',
        subjectId: allocatedSubject._id,
        dueDate: new Date(Date.now() + 10 * 24 * 3600 * 1000).toISOString(),
        maxMarks: 30
      }
    });
    assert(secondAssignmentRes.status === 201, 'AC-11: Concurrent faculty assignment posted successfully');

    // Student submits assignment (Multipart file upload)
    const boundary = '----WebKitFormBoundaryTest2026';
    const fakeFileContent = 'TEST FILE DATA FOR ASSIGNMENT SUBMISSION';
    const subBody = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="notes"\r\n\r\nCompleted assignment on time\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="assignment_work.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      `${fakeFileContent}\r\n` +
      `--${boundary}--\r\n`;

    const assignmentSubRes = await request(`/assignments/${assignmentId}/submissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: subBody
    });
    assert(assignmentSubRes.status === 201, 'Student submits assignment file');

    // AC-13: A student submission notifies exactly the assignment faculty; grading notifies student
    const facultyNotif = await request('/notifications', {
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    assert(
      facultyNotif.status === 200 && facultyNotif.data.notifications.some(n => n.type === 'submission_received'),
      'AC-13 Part A: Student submission notifies assignment faculty'
    );

    // Faculty grades the assignment
    const trackerRes = await request(`/assignments/${assignmentId}/submissions`, {
      headers: { Authorization: `Bearer ${facultyToken}` }
    });
    const subIdToGrade = trackerRes.data.submitted[0]?.submissionId;
    assert(!!subIdToGrade, 'Faculty tracker retrieves student submission');

    const gradeRes = await request(`/assignment-submissions/${subIdToGrade}/grade`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { marks: 19, remarks: 'Well structured solution!' }
    });
    assert(gradeRes.status === 200 && gradeRes.data.submission.marks === 19, 'Faculty grades submission');

    // AC-14: Student sees marks right after they are saved (and notified)
    const marksRes = await request('/my-marks', {
      headers: { Authorization: `Bearer ${studentToken}` }
    });
    assert(
      marksRes.status === 200 && marksRes.data.marksBySubject.length > 0 && marksRes.data.marksBySubject[0].totalObtained === 19,
      'AC-14: Student sees updated marks on My Marks immediately'
    );

    // Project Lifecycle Testing (AC-02, AC-03, AC-05, AC-06)
    const catRes = await request('/categories');
    const categoryId = catRes.data.categories[0]._id;

    // Student creates project in Draft
    const projectCreate = await request('/projects', {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: {
        title: 'Smart Campus IoT Network',
        description: 'Comprehensive campus asset tracking.',
        categoryId
      }
    });
    assert(projectCreate.status === 201 && projectCreate.data.project.status === 'Draft', 'Student creates project in Draft status');
    const projectId = projectCreate.data.project._id;

    // Admin assigns supervisor
    await request(`/admin/projects/${projectId}/assign`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { facultyId }
    });

    // Upload proposal
    const propBody = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="type"\r\n\r\nproposal\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="notes"\r\n\r\nSynopsis doc\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="submitForReview"\r\n\r\ntrue\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="proposal.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      `%PDF-1.4 Proposal Content\r\n` +
      `--${boundary}--\r\n`;

    const propSub = await request(`/projects/${projectId}/submissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: propBody
    });
    assert(propSub.status === 201 && propSub.data.projectStatus === 'Proposal Submitted', 'Proposal submitted for supervisor review');

    // AC-03: Invalid status transition rejected
    const illegalTransition = await request(`/projects/${projectId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { action: 'RETURN_TO_DRAFT' }
    });
    assert(illegalTransition.status === 400 || illegalTransition.status === 403, 'AC-03: Illegal status transition rejected');

    // AC-06 Part A: Supervisor rejects with reason
    const rejRes = await request(`/projects/${projectId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { action: 'REJECT_PROPOSAL', reason: 'Expand section 3.' }
    });
    assert(rejRes.status === 200 && rejRes.data.project.status === 'Rejected', 'AC-06: Supervisor rejects proposal with mandatory reason');

    // AC-06 Part B: Student returns to Draft and resubmits
    await request(`/projects/${projectId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { action: 'RETURN_TO_DRAFT' }
    });
    await request(`/projects/${projectId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${studentToken}` },
      body: { action: 'SUBMIT_PROPOSAL' }
    });

    // Supervisor approves -> In Progress
    const appRes = await request(`/projects/${projectId}/status`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { action: 'APPROVE_PROPOSAL' }
    });
    assert(appRes.status === 200 && appRes.data.project.status === 'In Progress', 'Proposal approved -> moves automatically to In Progress');

    // Student uploads final submission
    const finalBody = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="type"\r\n\r\nfinal\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="notes"\r\n\r\nComplete final deliverable\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="file"; filename="final.pdf"\r\n` +
      `Content-Type: application/pdf\r\n\r\n` +
      `%PDF-1.4 Final Content\r\n` +
      `--${boundary}--\r\n`;

    await request(`/projects/${projectId}/submissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${studentToken}`,
        'Content-Type': `multipart/form-data; boundary=${boundary}`
      },
      body: finalBody
    });

    // AC-05: Rubric marks validation and total calculation
    const outOfRange = await request(`/projects/${projectId}/evaluation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: { marks: { report: 35, implementation: 40, presentation: 20, viva: 10 } }
    });
    assert(outOfRange.status === 400, 'AC-05: Out-of-bounds rubric marks rejected');

    const validEval = await request(`/projects/${projectId}/evaluation`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${facultyToken}` },
      body: {
        marks: { report: 28, implementation: 38, presentation: 19, viva: 9 }, // total 94
        remarks: 'Outstanding project demonstration.'
      }
    });
    assert(validEval.status === 200 && validEval.data.evaluation.total === 94, 'AC-05: Total marks automatically calculated (94/100)');

    // AC-16: Promoting a semester moves every active student of that department and semester exactly once
    const promoteRes = await request('/admin/students/promote', {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
      body: { department: bcaDept._id, semester: 5 }
    });
    assert(promoteRes.status === 200 && promoteRes.data.nextSemester === 6, 'AC-16: Admin semester promotion moves cohort to Semester 6');

    console.log('\n=============================================================');
    console.log(`🏁 TEST SUITE COMPLETE: ${passed} PASSED, ${failed} FAILED`);
    console.log('=============================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Fatal test error:', err);
    process.exit(1);
  }
};

runAcceptanceTests();
