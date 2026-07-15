import type { Applicant } from '../../types/class'; import { StatusBadge } from '../common/StatusBadge';
const colors=[['#ffe9d9','#e8590c'],['#e3f0ff','#1b64da'],['#edebff','#6741d9']];
export function ApplicantRow({item,index=0}:{item:Applicant;index?:number}){const c=colors[index%colors.length];return <div className="applicant-row"><span className="avatar" style={{background:c[0],color:c[1]}}>{item.name[0]}</span><span className="grow"><strong>{item.name}</strong><small>{item.classTitle} · {item.appliedAt}</small></span><StatusBadge>{item.payment}</StatusBadge></div>}
