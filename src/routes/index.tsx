import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { AuthLayout } from '../layouts/AuthLayout';
import { MobileLayout } from '../layouts/MobileLayout';
import {
  NotificationsPage,
  NotificationSettingsPage,
  PaymentPage,
  SettingsPage,
  SettlementPage,
  SupportPage,
} from '../pages/AccountPages';
import {
  AttendPickerPage,
  CertificateSetupPage,
  ExamResultPage,
  ExamTakerPage,
  PublishDonePage,
} from '../pages/AdvancedFlowsPage';
import { ApplicantDetailPage } from '../pages/ApplicantDetailPage';
import { ApplicantsPage } from '../pages/ApplicantsPage';
import { CertificateViewPage, CertificatesPage } from '../pages/CertificatesPage';
import { ClassDetailPage } from '../pages/ClassDetailPage';
import { ClassOperationsPage } from '../pages/ClassOperationsPage';
import { ClassesPage } from '../pages/ClassesPage';
import { CreateClassPage } from '../pages/CreateClassPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { MyPage } from '../pages/MyPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { LearnerRoomPage, PreviewPage, PublicEnrollmentPage } from '../pages/PreviewPage';
import { QrPage } from '../pages/QrPage';
import { GuestPage, SignupPage } from '../pages/SignupPage';
import {
  ExamResultStudentPage,
  ExamTakePage,
  SurveyDonePage,
  SurveyTakePage,
} from '../pages/StudentPages';
import { ProtectedRoute, RoleGuard } from './guards';
const operations = [
  'applicants',
  'attendance',
  'survey',
  'exams',
  'survey-builder',
  'exam-builder',
  'manage',
  'certificates',
].map((path) => ({ path: `/classes/:id/${path}`, element: <ClassOperationsPage /> }));
export const router = createBrowserRouter([
  {
    element: <ProtectedRoute><AppLayout /></ProtectedRoute>,
    children: [
      { path: '/', element: <Navigate to="/dashboard" replace /> },
      { path: '/dashboard', element: <HomePage /> },
      { path: '/classes', element: <ClassesPage /> },
      { path: '/classes/:id', element: <ClassDetailPage /> },
      { path: '/classes/:id/preview', element: <PreviewPage /> },
      { path: '/classes/published', element: <PublishDonePage /> },
      ...operations,
      { path: '/classes/:id/attendance/qr', element: <QrPage /> },
      { path: '/classes/:id/exams/:examId', element: <ExamResultPage /> },
      { path: '/classes/:id/exams/:examId/:personId', element: <ExamTakerPage /> },
      { path: '/classes/:id/certificates/setup', element: <CertificateSetupPage /> },
      { path: '/applicants', element: <ApplicantsPage /> },
      { path: '/applicants/:id', element: <ApplicantDetailPage /> },
      { path: '/my', element: <MyPage /> },
      { path: '/my/certificates', element: <CertificatesPage /> },
      { path: '/my/certificates/:id', element: <CertificateViewPage /> },
      { path: '/notifications', element: <NotificationsPage /> },
      { path: '/settlement', element: <Navigate to="/settlements" replace /> },
      { path: '/settlements', element: <RoleGuard allowed={['teacher']}><SettlementPage /></RoleGuard> },
      { path: '/notification-settings', element: <NotificationSettingsPage /> },
      { path: '/support', element: <SupportPage /> },
      { path: '/settings', element: <SettingsPage /> },
      { path: '/payment', element: <PaymentPage /> },
    ],
  },
  { path: '/s/:shareToken', element: <PublicEnrollmentPage /> },
  { path: '/learn/:id', element: <LearnerRoomPage /> },
  {
    element: <MobileLayout />,
    children: [
      { path: '/attendance/select', element: <AttendPickerPage /> },
      { path: '/learn/survey/take', element: <SurveyTakePage /> },
      { path: '/learn/survey/done', element: <SurveyDonePage /> },
      { path: '/learn/exam/take', element: <ExamTakePage /> },
      { path: '/learn/exam/result', element: <ExamResultStudentPage /> },
    ],
  },
  { path: '/classes/new', element: <ProtectedRoute><RoleGuard allowed={['teacher']}><CreateClassPage /></RoleGuard></ProtectedRoute> },
  {
    element: <AuthLayout />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/signup', element: <SignupPage /> },
      { path: '/guest', element: <GuestPage /> },
    ],
  },
  { path: '*', element: <NotFoundPage /> },
]);
