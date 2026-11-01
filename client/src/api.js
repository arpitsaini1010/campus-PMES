import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request Interceptor: Attach JWT Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('campus_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Handle 401 Unauthorized globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('campus_token');
        localStorage.removeItem('campus_user');
        window.location.href = '/login?expired=1';
      }
    }
    return Promise.reject(error);
  }
);

// Auth Service
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.post('/auth/change-password', data)
};

// Admin Service
export const adminAPI = {
  createFaculty: (data) => api.post('/admin/faculty', data),
  createStudent: (data) => api.post('/admin/students', data),
  getNextId: (role) => api.get('/admin/next-id', { params: { role } }),
  importStudentsCSV: (csvData) => api.post('/admin/students/import', { csvData }),
  getStudents: (params) => api.get('/admin/students', { params }),
  updateStudentSemester: (id, semester) => api.put(`/admin/students/${id}/semester`, { semester }),
  promoteStudents: (data) => api.post('/admin/students/promote', data),
  getUsers: (roleOrParams) => {
    const params = typeof roleOrParams === 'string' ? (roleOrParams ? { role: roleOrParams } : {}) : roleOrParams;
    return api.get('/admin/users', { params });
  },
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  updateUser: (id, data) => api.put(`/admin/users/${id}`, data),
  toggleUserActive: (id, isActive) => api.put(`/admin/users/${id}/active`, { isActive }),
  resetPassword: (id, temporaryPassword) => api.put(`/admin/users/${id}/reset-password`, { temporaryPassword }),
  assignSupervisor: (projectId, facultyId) => api.put(`/admin/projects/${projectId}/assign`, { facultyId })
};

// Departments Service
export const departmentAPI = {
  getAll: () => api.get('/departments'),
  create: (data) => api.post('/departments', data),
  update: (id, data) => api.put(`/departments/${id}`, data),
  delete: (id) => api.delete(`/departments/${id}`)
};

// Subjects Service
export const subjectAPI = {
  getAll: (params) => api.get('/subjects', { params }),
  create: (data) => api.post('/subjects', data),
  update: (id, data) => api.put(`/subjects/${id}`, data),
  delete: (id) => api.delete(`/subjects/${id}`),
  allocate: (id, facultyId) => api.put(`/subjects/${id}/allocate`, { facultyId })
};

// Categories Service
export const categoryAPI = {
  getAll: () => api.get('/categories'),
  create: (name) => api.post('/categories', { name }),
  update: (id, name) => api.put(`/categories/${id}`, { name }),
  delete: (id) => api.delete(`/categories/${id}`)
};

// Projects Service
export const projectAPI = {
  create: (data) => api.post('/projects', data),
  getAll: (params) => api.get('/projects', { params }),
  getById: (id) => api.get(`/projects/${id}`),
  update: (id, data) => api.put(`/projects/${id}`, data),
  delete: (id) => api.delete(`/projects/${id}`),
  changeStatus: (id, payload) => api.put(`/projects/${id}/status`, payload),
  searchStudents: (query) => api.get('/projects/search/students', { params: { query } }),
  getHodProjects: (params) => api.get('/projects/hod/department-projects', { params }),
  assignGuide: (id, facultyId) => api.put(`/projects/${id}/assign-guide`, { facultyId })
};

// Project Submissions Service
export const submissionAPI = {
  upload: (projectId, formData) => api.post(`/projects/${projectId}/submissions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getByProject: (projectId) => api.get(`/projects/${projectId}/submissions`),
  downloadUrl: (submissionId) => `/api/submissions/${submissionId}/file`,
  addFeedback: (submissionId, text) => api.post(`/submissions/${submissionId}/feedback`, { text })
};

// Evaluations Service
export const evaluationAPI = {
  save: (projectId, payload) => api.post(`/projects/${projectId}/evaluation`, payload),
  get: (projectId) => api.get(`/projects/${projectId}/evaluation`)
};

// Assignments Service
export const assignmentAPI = {
  post: (formData) => api.post('/assignments', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getAll: (params) => api.get('/assignments', { params }),
  getById: (id) => api.get(`/assignments/${id}`),
  update: (id, data) => api.put(`/assignments/${id}`, data),
  delete: (id) => api.delete(`/assignments/${id}`),
  submitWork: (id, formData) => api.post(`/assignments/${id}/submissions`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getSubmissionsTracker: (id) => api.get(`/assignments/${id}/submissions`),
  gradeSubmission: (subId, data) => api.put(`/assignment-submissions/${subId}/grade`, data),
  exportCSVUrl: (id) => `/api/assignments/${id}/export`,
  getMyMarks: () => api.get('/my-marks'),
  downloadAttachmentUrl: (id) => `/api/assignments/${id}/file`,
  downloadSubmittedFileUrl: (subId) => `/api/assignment-submissions/${subId}/file`
};

// Academic Marks Service (Theory 100M & Practical 150M Schemes)
export const marksAPI = {
  getSubjectGradeSheet: (subjectId) => api.get(`/marks/subject/${subjectId}`),
  saveStudentMarks: (subjectId, studentId, data) => api.put(`/marks/subject/${subjectId}/student/${studentId}`, data),
  saveBulkMarks: (subjectId, studentsMarks) => api.post(`/marks/subject/${subjectId}/bulk`, { studentsMarks }),
  exportCSVUrl: (subjectId) => `/api/marks/subject/${subjectId}/export-csv`,
  getMyMarksReport: (semester) => api.get('/marks/my-marks', { params: semester ? { semester } : {} })
};

// Notifications Service
export const notificationAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all')
};

// Announcements Service
export const announcementAPI = {
  getAll: () => api.get('/announcements'),
  post: (data) => api.post('/announcements', data),
  update: (id, data) => api.put(`/announcements/${id}`, data),
  delete: (id) => api.delete(`/announcements/${id}`)
};

// Dashboard Service
export const dashboardAPI = {
  get: () => api.get('/dashboard')
};

export const metaAPI = {
  getAcademicConfig: () => api.get('/meta/academic-config'),
  getShowcase: (params) => api.get('/meta/showcase', { params })
};

export default api;
