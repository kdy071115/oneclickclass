import type { ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { NotFoundPage, RouteErrorPage } from '../pages/NotFoundPage';
import { ProtectedRoute, RoleGuard } from './guards';

type PageModule = Record<string, unknown>;

const lazyPage = <T extends PageModule>(
  load: () => Promise<T>,
  name: keyof T,
) => async () => ({
  Component: (await load())[name] as ComponentType,
});

const accountPage = (name: keyof typeof import('../pages/AccountPages')) =>
  lazyPage(() => import('../pages/AccountPages'), name);
const advancedPage = (name: keyof typeof import('../pages/AdvancedFlowsPage')) =>
  lazyPage(() => import('../pages/AdvancedFlowsPage'), name);
const previewPage = (name: keyof typeof import('../pages/PreviewPage')) =>
  lazyPage(() => import('../pages/PreviewPage'), name);
const studentPage = (name: keyof typeof import('../pages/StudentPages')) =>
  lazyPage(() => import('../pages/StudentPages'), name);
const classOperationsPage = lazyPage(
  () => import('../pages/ClassOperationsPage'),
  'ClassOperationsPage',
);

const operations = [
  'applicants',
  'attendance',
  'survey',
  'exams',
  'survey-builder',
  'exam-builder',
  'manage',
  'certificates',
].map((path) => ({ path: `/classes/:id/${path}`, lazy: classOperationsPage }));

export const router = createBrowserRouter([
  {
    errorElement: <RouteErrorPage />,
    element: (
      <ProtectedRoute>
        <AppLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', lazy: lazyPage(() => import('../pages/HomePage'), 'HomePage') },
      { path: '/classes', lazy: lazyPage(() => import('../pages/ClassesPage'), 'ClassesPage') },
      {
        path: '/classes/:id',
        lazy: lazyPage(() => import('../pages/ClassDetailPage'), 'ClassDetailPage'),
      },
      {
        path: '/classes/:id/curriculum',
        lazy: lazyPage(() => import('../pages/CurriculumPage'), 'CurriculumPage'),
      },
      { path: '/classes/:id/preview', lazy: previewPage('PreviewPage') },
      { path: '/classes/published', lazy: advancedPage('PublishDonePage') },
      ...operations,
      {
        path: '/classes/:id/attendance/qr',
        lazy: lazyPage(() => import('../pages/QrPage'), 'QrPage'),
      },
      { path: '/classes/:id/exams/:examId', lazy: advancedPage('ExamResultPage') },
      {
        path: '/classes/:id/exams/:examId/:personId',
        lazy: advancedPage('ExamTakerPage'),
      },
      {
        path: '/classes/:id/certificates/setup',
        lazy: advancedPage('CertificateSetupPage'),
      },
      {
        path: '/applicants',
        lazy: lazyPage(() => import('../pages/ApplicantsPage'), 'ApplicantsPage'),
      },
      {
        path: '/applicants/:id',
        lazy: lazyPage(() => import('../pages/ApplicantDetailPage'), 'ApplicantDetailPage'),
      },
      { path: '/my', lazy: lazyPage(() => import('../pages/MyPage'), 'MyPage') },
      { path: '/notifications', lazy: accountPage('NotificationsPage') },
      { path: '/settlement', element: <Navigate to="/settlements" replace /> },
      {
        path: '/settlements',
        lazy: async () => {
          const { SettlementPage } = await import('../pages/AccountPages');
          return {
            Component: () => (
              <RoleGuard allowed={['teacher']}>
                <SettlementPage />
              </RoleGuard>
            ),
          };
        },
      },
      { path: '/notification-settings', lazy: accountPage('NotificationSettingsPage') },
      { path: '/support', lazy: accountPage('SupportPage') },
      { path: '/settings', lazy: accountPage('SettingsPage') },
      { path: '/payment', lazy: accountPage('PaymentPage') },
      { path: '/attendance/select', lazy: advancedPage('AttendPickerPage') },
    ],
  },
  {
    path: '/s/:shareToken',
    lazy: previewPage('PublicEnrollmentPage'),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/s/:shareToken/complete',
    lazy: previewPage('EnrollmentCompletePage'),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/learn/:id',
    lazy: previewPage('LearnerRoomPage'),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/favorites',
    lazy: lazyPage(() => import('../pages/LearnerFavoritesPage'), 'LearnerFavoritesPage'),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/learn/survey/take',
    lazy: studentPage('SurveyTakePage'),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/learn/survey/done',
    lazy: studentPage('SurveyDonePage'),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/learn/exam/take',
    lazy: studentPage('ExamTakePage'),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/learn/exam/result',
    lazy: studentPage('ExamResultStudentPage'),
    errorElement: <RouteErrorPage />,
  },
  {
    path: '/classes/new',
    errorElement: <RouteErrorPage />,
    lazy: async () => {
      const { CreateClassPage } = await import('../pages/CreateClassPage');
      return {
        Component: () => (
          <ProtectedRoute>
            <RoleGuard allowed={['teacher']}>
              <CreateClassPage />
            </RoleGuard>
          </ProtectedRoute>
        ),
      };
    },
  },
  {
    errorElement: <RouteErrorPage />,
    element: <AuthLayout />,
    children: [
      { path: '/login', lazy: lazyPage(() => import('../pages/LoginPage'), 'LoginPage') },
      { path: '/signup', lazy: lazyPage(() => import('../pages/SignupPage'), 'SignupPage') },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
