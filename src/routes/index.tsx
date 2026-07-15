import { createBrowserRouter } from 'react-router-dom';
import { AppLayout } from '../layouts/AppLayout';
import { MobileLayout } from '../layouts/MobileLayout';
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
import { PreviewPage, StudentClassPage } from '../pages/PreviewPage';
import { QrPage } from '../pages/QrPage';
import { GuestPage, SignupPage } from '../pages/SignupPage';
import {
  ExamResultStudentPage,
  ExamTakePage,
  SurveyDonePage,
  SurveyTakePage,
} from '../pages/StudentPages';
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
    element: <AppLayout />,
    children: [
      { path: '/', element: <HomePage /> },
      { path: '/classes', element: <ClassesPage /> },
      { path: '/applicants', element: <ApplicantsPage /> },
      { path: '/my', element: <MyPage /> },
    ],
  },
  {
    element: <MobileLayout />,
    children: [
      { path: '/classes/:id', element: <ClassDetailPage /> },
      ...operations,
      { path: '/classes/:id/attendance/qr', element: <QrPage /> },
      { path: '/classes/:id/exams/:examId', element: <ExamResultPage /> },
      { path: '/classes/:id/exams/:examId/:personId', element: <ExamTakerPage /> },
      { path: '/classes/:id/certificates/setup', element: <CertificateSetupPage /> },
      { path: '/classes/:id/preview', element: <PreviewPage /> },
      { path: '/classes/:id/enroll', element: <StudentClassPage /> },
      { path: '/learn/classes/:id', element: <StudentClassPage /> },
      { path: '/attendance/select', element: <AttendPickerPage /> },
      { path: '/learn/survey/take', element: <SurveyTakePage /> },
      { path: '/learn/survey/done', element: <SurveyDonePage /> },
      { path: '/learn/exam/take', element: <ExamTakePage /> },
      { path: '/learn/exam/result', element: <ExamResultStudentPage /> },
      { path: '/classes/published', element: <PublishDonePage /> },
      { path: '/applicants/:id', element: <ApplicantDetailPage /> },
      { path: '/my/certificates', element: <CertificatesPage /> },
      { path: '/my/certificates/:id', element: <CertificateViewPage /> },
    ],
  },
  { path: '/classes/new', element: <CreateClassPage /> },
  { path: '/login', element: <LoginPage /> },
  { path: '/signup', element: <SignupPage /> },
  { path: '/guest', element: <GuestPage /> },
  { path: '*', element: <NotFoundPage /> },
]);
