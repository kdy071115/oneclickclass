export type ClassStatus = '모집중' | '진행중' | '종료';
export interface ClassItem { id:string; title:string; status:ClassStatus; type:string; date:string; enrolled:number; capacity:number; color:string }
export interface Applicant { id:string; name:string; classTitle:string; appliedAt:string; payment:'결제대기'|'결제완료'|'환불'; amount:number }
export interface Dashboard { newApplicants:number; todayClasses:number; pendingPayments:number; pendingAmount:number; classes:ClassItem[]; applicants:Applicant[] }
export interface ClassDraft { type:'online'|'live'|'offline'|'hybrid'; title:string; summary:string; description:string; startDate:string; recruitEndDate:string; capacity:number; payment:'free'|'paid'; price:number; questions:string[]; url:string; address:string }
