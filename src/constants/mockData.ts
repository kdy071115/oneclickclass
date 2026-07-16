import type { Applicant, BillingHistory, CertificateItem, ClassDetail, ClassItem, Dashboard, ExamQuestion, FaqItem, LearningClass, MarketClass, NotificationItem, NotificationSetting, PaymentMethod, PaymentSummary, SettlementRow, SettlementSummary, SurveyQuestion } from '../types/class';
export const classes: ClassItem[] = [
  {id:'notion',title:'노션으로 시작하는 업무 자동화',status:'모집중',type:'온라인',date:'8월 5일 · 화',enrolled:24,capacity:30,color:'#4c82f7'},
  {id:'calligraphy',title:'주말 원데이 캘리그라피 클래스',status:'모집중',type:'오프라인',date:'8월 9일 · 토',enrolled:6,capacity:15,color:'#22b573'},
  {id:'branding',title:'나만의 브랜드 만들기',status:'진행중',type:'혼합형',date:'7월 5일 ~ 26일',enrolled:18,capacity:20,color:'#7048e8'},
  {id:'photo',title:'스마트폰 사진 보정 클래스',status:'종료',type:'온라인',date:'6월 14일',enrolled:20,capacity:20,color:'#f76707'},
];
export const applicants: Applicant[] = [
  {id:'1',name:'김서연',classTitle:'노션 업무 자동화',appliedAt:'방금',payment:'결제대기',amount:45000,phone:'010-2345-6789',email:'seoyeon@email.com',answers:[{label:'신청 동기',value:'반복 업무를 줄이고 팀의 업무 효율을 높이고 싶어요.'},{label:'노션 사용 경험',value:'개인 메모와 프로젝트 관리에 1년 정도 사용했어요.'}]},
  {id:'2',name:'이준호',classTitle:'캘리그라피 클래스',appliedAt:'12분 전',payment:'결제완료',amount:45000,phone:'010-4782-1135',email:'junho@example.com',answers:[{label:'신청 동기',value:'취미로 글씨를 배워 지인에게 카드를 만들어 주고 싶어요.'}]},
  {id:'3',name:'박민지',classTitle:'노션 업무 자동화',appliedAt:'1시간 전',payment:'결제완료',amount:45000,phone:'010-8891-2047',email:'minji@example.com',answers:[{label:'신청 동기',value:'회사에서 반복하는 업무 템플릿을 체계적으로 만들고, 팀원들이 같은 방식으로 협업할 수 있는 워크스페이스를 구축하고 싶어요. 자동화 기능까지 적용해 매일 발생하는 단순 작업 시간을 줄이는 것이 목표예요.'}]},
];
export const studentStats = [
  { value: '2', label: '수강 중', color: '#3182f6' },
  { value: '3', label: '이수 완료', color: '#0ca678' },
  { value: '3', label: '받은 수료증', color: '#f08c00' },
];
export const studentInProgress: LearningClass[] = [
  { id: 'ux', title: 'UX 리서치 실무 4주', meta: '2주차 진행 중 · 다음 강의 내일 저녁 8시', progress: 62, color: '#0ca678' },
  { id: 'python', title: '데이터 분석 입문 with 파이썬', meta: '1주차 · 방금 수강 시작', progress: 18, color: '#4c82f7' },
];
export const recommendedClasses: MarketClass[] = [
  { id: 'branding', title: '브랜딩 기초 클래스', meta: '32명 수강 · 만족도 4.9', price: '55,000원', color: '#f76707' },
  { id: 'youtube', title: '실전 유튜브 편집 8주 과정', meta: '20명 수강 · 만족도 4.8', price: '89,000원', color: '#7048e8' },
];
export const wishlistItems: MarketClass[] = [
  ...recommendedClasses,
  { id: 'homecafe', title: '초보를 위한 홈카페 클래스', meta: '오프라인 · 원데이', price: '40,000원', color: '#22b573' },
];
export const dashboard: Dashboard = {newApplicants:3,todayClasses:2,pendingPayments:3,pendingAmount:135000,classes:classes.slice(0,2),applicants,studentStats,studentInProgress,recommendedClasses};
export const classDetail:ClassDetail={...classes[0],summary:'반복 업무를 자동화하는 실전 4주 과정',description:'데이터베이스 설계부터 반복 업무 자동화, 팀 협업 템플릿까지 4주 동안 직접 만들며 배웁니다.',instructor:'이지훈',price:45000,recruitEndDate:'7월 29일',sessions:4,location:'ZOOM 온라인',rating:4.9};
export const surveyQuestions:SurveyQuestion[]=[{id:'s1',text:'강의 전반에 만족하시나요?',type:'choice',options:['매우 만족','만족','보통','아쉬워요']},{id:'s2',text:'강사의 설명은 이해하기 쉬웠나요?',type:'rating'},{id:'s3',text:'가장 좋았던 점을 알려주세요',type:'text'}];
export const examQuestions:ExamQuestion[]=[{id:'e1',text:'노션 데이터베이스의 핵심 구성 요소는?',choices:['페이지와 속성','폴더와 파일','셀과 시트','슬라이드와 도형'],answer:0},{id:'e2',text:'반복 업무를 자동화할 때 가장 먼저 할 일은?',choices:['도구 구매','반복 과정 정의','팀원 채용','디자인 변경'],answer:1},{id:'e3',text:'자동화 결과를 점검하는 가장 좋은 방법은?',choices:['한 번에 배포','작은 범위로 테스트','설명서 생략','권한 전체 공개'],answer:1}];
export const certificates:CertificateItem[]=[{id:'0',title:'데이터 시각화 마스터',completedAt:'2026.06',attendance:100,score:94,color:'#4c82f7'},{id:'1',title:'UX 리서치 실무 4주',completedAt:'2026.05',attendance:92,score:88,color:'#7048e8'},{id:'2',title:'사진 보정 클래스',completedAt:'2026.03',attendance:96,score:0,color:'#0ca678'}];
export const notifications: NotificationItem[] = [
  { id: 'n1', group: '오늘', type: 'apply', title: '새로운 신청', message: "김서연님이 '노션 업무 자동화'를 신청했어요", time: '방금', unread: true, target: '/applicants/1' },
  { id: 'n2', group: '오늘', type: 'pay', title: '결제 완료', message: '이준호님이 45,000원 결제를 완료했어요', time: '12분 전', unread: true, target: '/applicants/2' },
  { id: 'n3', group: '어제', type: 'review', title: '새 후기', message: "'캘리그라피 클래스'에 별점 5점 후기가 등록됐어요", time: '어제', unread: false, target: '/classes/calligraphy' },
  { id: 'n4', group: '어제', type: 'settle', title: '정산 완료', message: '7월 1일 정산 금액 820,000원이 입금됐어요', time: '어제', unread: false, target: '/settlements' },
  { id: 'n5', group: '이전 알림', type: 'pay', title: '결제 대기', message: '박민지님 신청이 입금 대기 중이에요', time: '3일 전', unread: false, target: '/applicants/3' },
  { id: 'n6', group: '이전 알림', type: 'notice', title: '공지사항', message: '원클릭 클래스에 정산 리포트 기능이 추가됐어요', time: '5일 전', unread: false, target: '/settlements' },
];
export const settlementRows: SettlementRow[] = [
  { id: 'st1', title: '노션으로 시작하는 업무 자동화', date: '2026.07.15 정산 예정', amount: '+135,000원', status: 'wait' },
  { id: 'st2', title: '주말 원데이 캘리그라피 클래스', date: '2026.07.01 정산 완료', amount: '+820,000원', status: 'done' },
  { id: 'st3', title: '실전 유튜브 편집 8주 과정', date: '2026.06.15 정산 완료', amount: '+640,000원', status: 'done' },
  { id: 'st4', title: '브랜딩 기초 클래스', date: '2026.06.01 정산 완료', amount: '+550,000원', status: 'done' },
];
export const settlementSummary: SettlementSummary = {
  availableAmount: 1240000,
  expectedAmount: 135000,
  account: '국민은행 123-45-6789-012',
  stats: [
    { label: '이번 달 매출', value: '2,145,000', color: '#191f28' },
    { label: '정산 완료', value: '2,010,000', color: '#0ca678' },
    { label: '정산 예정', value: '135,000', color: '#f76707' },
  ],
  rows: settlementRows,
};
export const notificationSettings: NotificationSetting[] = [
  { key: 'apply', label: '신규 신청 알림', description: '새 신청자가 생기면 알려드려요', enabled: true, group: 'push' },
  { key: 'pay', label: '결제 알림', description: '결제 완료·대기 상태를 알려드려요', enabled: true, group: 'push' },
  { key: 'settle', label: '정산 알림', description: '정산 입금·예정을 알려드려요', enabled: true, group: 'push' },
  { key: 'review', label: '후기 알림', description: '새 후기가 등록되면 알려드려요', enabled: true, group: 'push' },
  { key: 'notice', label: '공지사항', description: '서비스 소식과 업데이트', enabled: false, group: 'push' },
  { key: 'event', label: '이벤트 소식', description: '진행 중인 이벤트를 알려드려요', enabled: false, group: 'marketing' },
  { key: 'benefit', label: '혜택·프로모션', description: '수수료 할인 등 혜택 안내', enabled: true, group: 'marketing' },
];
export const faqs: FaqItem[] = [
  { id: 'f1', question: '정산은 언제 이루어지나요?', answer: '결제 완료 후 매주 화요일에 정산됩니다. 출금 신청 시 영업일 기준 1~2일 내 입금돼요.' },
  { id: 'f2', question: '수강생이 결제한 금액에서 수수료가 있나요?', answer: '스탠다드 플랜 기준 결제 금액의 3.5%가 결제 대행 수수료로 부과됩니다. 플랜에 따라 달라질 수 있어요.' },
  { id: 'f3', question: '강의를 삭제하면 신청자 정보는 어떻게 되나요?', answer: '강의를 삭제해도 이미 접수된 신청자 정보와 정산 내역은 30일간 보관되며, 마이 > 정산 관리에서 확인할 수 있어요.' },
  { id: 'f4', question: '수료증은 어떻게 발급하나요?', answer: '강의 상세 > 수료증에서 발급 조건을 설정하면 조건을 충족한 수강생에게 자동으로 발급 대기됩니다.' },
  { id: 'f5', question: '환불 처리는 어디서 하나요?', answer: '신청자 상세 화면에서 결제 상태를 환불로 변경하면 자동으로 환불이 접수돼요.' },
];
export const paymentMethods: PaymentMethod[] = [
  { id: 'card1', brand: '신한카드', last4: '신용 ****-4597', brandInitial: '신한', brandBg: '#eaf1ff', brandColor: '#1b64da', isDefault: true },
  { id: 'card2', brand: '카카오뱅크', last4: '체크 ****-1234', brandInitial: 'kb', brandBg: '#fff6d6', brandColor: '#8a6d00', isDefault: false },
];
export const billingHistory: BillingHistory[] = [
  { id: 'b1', description: '스탠다드 플랜 정기결제', date: '2026.07.15', method: '신한 ****4597', amount: '19,000원' },
  { id: 'b2', description: '스탠다드 플랜 정기결제', date: '2026.06.15', method: '신한 ****4597', amount: '19,000원' },
  { id: 'b3', description: '스탠다드 플랜 정기결제', date: '2026.05.15', method: '신한 ****4597', amount: '19,000원' },
];
export const paymentSummary: PaymentSummary = {
  plan: '스탠다드 플랜',
  price: '월 19,000원',
  nextBillingDate: '2026.08.15',
  methods: paymentMethods,
  history: billingHistory,
};
