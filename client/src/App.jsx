import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';

import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import ChangePasswordModal from './components/ChangePasswordModal';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

import Login from './pages/Login';
import StudentDashboard from './pages/StudentDashboard';
import FacultyDashboard from './pages/FacultyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import MyProject from './pages/MyProject';
import ProjectDetail from './pages/ProjectDetail';
import EvaluateProject from './pages/EvaluateProject';
import Assignments from './pages/Assignments';
import AssignmentDetail from './pages/AssignmentDetail';
import MyMarks from './pages/MyMarks';
import FacultySubjects from './pages/FacultySubjects';
import FacultySubjectMarks from './pages/FacultySubjectMarks';
import PostAssignment from './pages/PostAssignment';
import FacultyAssignments from './pages/FacultyAssignments';
import AssignmentTracker from './pages/AssignmentTracker';
import AdminDepartments from './pages/AdminDepartments';
import AdminSubjects from './pages/AdminSubjects';
import AdminStudents from './pages/AdminStudents';
import AdminUsers from './pages/AdminUsers';
import AdminProjects from './pages/AdminProjects';
import AdminCategories from './pages/AdminCategories';
import Announcements from './pages/Announcements';
import HodGuideAllocation from './pages/HodGuideAllocation';

// Role Dashboard Dispatcher
const RoleDashboard = () => {
  const { role } = useAuth();
  if (role === 'admin') return <AdminDashboard />;
  if (role === 'faculty') return <FacultyDashboard />;
  return <StudentDashboard />;
};

const AppContent = () => {
  const { isAuthenticated } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  return (
    <div className={isAuthenticated ? 'pmes-app-container' : 'd-flex flex-column min-vh-100'}>
      {isAuthenticated && (
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          onOpenPasswordModal={() => setShowPasswordModal(true)}
        />
      )}

      <div className={isAuthenticated ? 'pmes-main-wrapper' : 'flex-grow-1 d-flex flex-column'}>
        <TopBar onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        <main className="flex-grow-1 py-3 px-3 px-md-4">
          <ErrorBoundary>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Navigate to="/login" replace />} />
              <Route path="/showcase" element={<Navigate to="/dashboard" replace />} />

              {/* Default Redirect */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />

              {/* Protected Universal Dashboard */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <RoleDashboard />
                  </ProtectedRoute>
                }
              />

              {/* Student Routes */}
              <Route
                path="/assignments"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <Assignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignments/:id"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <AssignmentDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-marks"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <MyMarks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-project"
                element={
                  <ProtectedRoute allowedRoles={['student', 'admin']}>
                    <MyProject />
                  </ProtectedRoute>
                }
              />

              {/* Faculty Routes */}
              <Route
                path="/faculty/assignments"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <FacultyAssignments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/subjects"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <FacultySubjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/subjects/:id/marks"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <FacultySubjectMarks />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assignments/new"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <PostAssignment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/assignments/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <PostAssignment />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/assignments/:id/tracker"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <AssignmentTracker />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/faculty/projects"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <FacultyDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/hod/guide-allocation"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <HodGuideAllocation />
                  </ProtectedRoute>
                }
              />

              {/* Shared Project & Evaluation Routes */}
              <Route
                path="/projects/:id"
                element={
                  <ProtectedRoute>
                    <ProjectDetail />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/evaluate/:id"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <EvaluateProject />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="/admin/departments"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDepartments />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/subjects"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminSubjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/students"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminStudents />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminUsers />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/projects"
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminProjects />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/categories"
                element={<Navigate to="/admin/projects" replace />}
              />

              {/* Announcements */}
              <Route
                path="/announcements"
                element={
                  <ProtectedRoute>
                    <Announcements />
                  </ProtectedRoute>
                }
              />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </ErrorBoundary>
        </main>
      </div>

      {/* Manual Change Password Modal */}
      <ChangePasswordModal
        show={showPasswordModal}
        onClose={() => setShowPasswordModal(false)}
        forced={false}
      />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
