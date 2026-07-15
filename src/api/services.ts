import { apiClient } from './client';
import { applicants, certificates, classDetail, classes, dashboard, examQuestions, surveyQuestions } from '../constants/mockData';
import type { Applicant, CertificateItem, ClassDetail, ClassDraft, ClassItem, Dashboard, ExamQuestion, SurveyQuestion } from '../types/class';
const mock = import.meta.env.VITE_USE_MOCK !== 'false';
const delay = <T,>(data:T) => new Promise<T>((resolve)=>setTimeout(()=>resolve(data),350));
export const classService = {
  dashboard: ():Promise<Dashboard> => mock ? delay(dashboard) : apiClient.get<Dashboard>('/dashboard').then(r=>r.data),
  list: ():Promise<ClassItem[]> => mock ? delay(classes) : apiClient.get<ClassItem[]>('/classes').then(r=>r.data),
  get: (id:string):Promise<ClassItem> => mock ? delay(classes.find(c=>c.id===id) ?? classes[0]) : apiClient.get<ClassItem>(`/classes/${id}`).then(r=>r.data),
  create: (draft:ClassDraft):Promise<ClassItem> => mock ? delay({...classes[0],id:crypto.randomUUID(),title:draft.title,capacity:draft.capacity,enrolled:0}) : apiClient.post<ClassItem>('/classes',draft).then(r=>r.data),
};
export const applicantService = { list: ():Promise<Applicant[]> => mock ? delay(applicants) : apiClient.get<Applicant[]>('/applicants').then(r=>r.data) };
export const detailService={
  getClass:(id:string):Promise<ClassDetail>=>mock?delay({...classDetail,id}):apiClient.get<ClassDetail>(`/classes/${id}/detail`).then(r=>r.data),
  surveyQuestions:():Promise<SurveyQuestion[]>=>mock?delay(surveyQuestions):apiClient.get<SurveyQuestion[]>('/surveys/current/questions').then(r=>r.data),
  examQuestions:():Promise<ExamQuestion[]>=>mock?delay(examQuestions):apiClient.get<ExamQuestion[]>('/exams/current/questions').then(r=>r.data),
  certificates:():Promise<CertificateItem[]>=>mock?delay(certificates):apiClient.get<CertificateItem[]>('/certificates').then(r=>r.data),
};
