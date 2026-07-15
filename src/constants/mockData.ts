import type { Applicant, CertificateItem, ClassDetail, ClassItem, Dashboard, ExamQuestion, SurveyQuestion } from '../types/class';
export const classes: ClassItem[] = [
  {id:'notion',title:'노션으로 시작하는 업무 자동화',status:'모집중',type:'온라인',date:'8월 5일 · 화',enrolled:24,capacity:30,color:'#4c82f7'},
  {id:'calligraphy',title:'주말 원데이 캘리그라피 클래스',status:'모집중',type:'오프라인',date:'8월 9일 · 토',enrolled:6,capacity:15,color:'#22b573'},
  {id:'branding',title:'나만의 브랜드 만들기',status:'진행중',type:'혼합형',date:'7월 5일 ~ 26일',enrolled:18,capacity:20,color:'#7048e8'},
  {id:'photo',title:'스마트폰 사진 보정 클래스',status:'종료',type:'온라인',date:'6월 14일',enrolled:20,capacity:20,color:'#f76707'},
];
export const applicants: Applicant[] = [
  {id:'1',name:'김서연',classTitle:'노션 업무 자동화',appliedAt:'방금',payment:'결제대기',amount:45000},
  {id:'2',name:'이준호',classTitle:'캘리그라피 클래스',appliedAt:'12분 전',payment:'결제완료',amount:45000},
  {id:'3',name:'박민지',classTitle:'노션 업무 자동화',appliedAt:'1시간 전',payment:'결제완료',amount:45000},
];
export const dashboard: Dashboard = {newApplicants:12,todayClasses:2,pendingPayments:3,pendingAmount:135000,classes:classes.slice(0,2),applicants};
export const classDetail:ClassDetail={...classes[0],summary:'반복 업무를 자동화하는 실전 4주 과정',description:'데이터베이스 설계부터 반복 업무 자동화, 팀 협업 템플릿까지 4주 동안 직접 만들며 배웁니다.',instructor:'이지훈',price:45000,recruitEndDate:'7월 29일',sessions:4,location:'ZOOM 온라인',rating:4.9};
export const surveyQuestions:SurveyQuestion[]=[{id:'s1',text:'강의 전반에 만족하시나요?',type:'choice',options:['매우 만족','만족','보통','아쉬워요']},{id:'s2',text:'강사의 설명은 이해하기 쉬웠나요?',type:'rating'},{id:'s3',text:'가장 좋았던 점을 알려주세요',type:'text'}];
export const examQuestions:ExamQuestion[]=[{id:'e1',text:'노션 데이터베이스의 핵심 구성 요소는?',choices:['페이지와 속성','폴더와 파일','셀과 시트','슬라이드와 도형'],answer:0},{id:'e2',text:'반복 업무를 자동화할 때 가장 먼저 할 일은?',choices:['도구 구매','반복 과정 정의','팀원 채용','디자인 변경'],answer:1},{id:'e3',text:'자동화 결과를 점검하는 가장 좋은 방법은?',choices:['한 번에 배포','작은 범위로 테스트','설명서 생략','권한 전체 공개'],answer:1}];
export const certificates:CertificateItem[]=[{id:'0',title:'데이터 시각화 마스터',completedAt:'2026.06',attendance:100,score:94,color:'#4c82f7'},{id:'1',title:'UX 리서치 실무 4주',completedAt:'2026.05',attendance:92,score:88,color:'#7048e8'},{id:'2',title:'사진 보정 클래스',completedAt:'2026.03',attendance:96,score:0,color:'#0ca678'}];
