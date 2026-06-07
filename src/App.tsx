import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from '@/components/ProtectedRoute';
import Login from '@/pages/Login';

import GuardianHome from '@/pages/guardian/GuardianHome';
import GuardianApply from '@/pages/guardian/GuardianApply';
import GuardianApprove from '@/pages/guardian/GuardianApprove';
import GuardianHistory from '@/pages/guardian/GuardianHistory';

import TeacherHome from '@/pages/teacher/TeacherHome';
import TeacherHandoffQueue from '@/pages/teacher/TeacherHandoffQueue';
import TeacherVerify from '@/pages/teacher/TeacherVerify';
import TeacherHistory from '@/pages/teacher/TeacherHistory';

import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminVerify from '@/pages/admin/AdminVerify';
import AdminHistory from '@/pages/admin/AdminHistory';
import AdminAudit from '@/pages/admin/AdminAudit';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/guardian"
          element={
            <ProtectedRoute allowedRoles={['guardian']}>
              <GuardianHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guardian/apply"
          element={
            <ProtectedRoute allowedRoles={['guardian']}>
              <GuardianApply />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guardian/approve"
          element={
            <ProtectedRoute allowedRoles={['guardian']}>
              <GuardianApprove />
            </ProtectedRoute>
          }
        />
        <Route
          path="/guardian/history"
          element={
            <ProtectedRoute allowedRoles={['guardian']}>
              <GuardianHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/teacher"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherHome />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/handoff-queue"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherHandoffQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/verify"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherVerify />
            </ProtectedRoute>
          }
        />
        <Route
          path="/teacher/history"
          element={
            <ProtectedRoute allowedRoles={['teacher']}>
              <TeacherHistory />
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/handoff-queue"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <TeacherHandoffQueue />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/verify"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminVerify />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/history"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminHistory />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/audit"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminAudit />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
