import type { Applicant, ClassItem, Dashboard } from '../types/class';
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
