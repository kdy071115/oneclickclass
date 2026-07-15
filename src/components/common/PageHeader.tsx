import { ArrowLeft } from 'lucide-react'; import { useNavigate } from 'react-router-dom';
export function PageHeader({title,subtitle}:{title:string;subtitle?:string}){const nav=useNavigate();return <><button className="back-btn" onClick={()=>nav(-1)} aria-label="뒤로"><ArrowLeft/></button><h1>{title}</h1>{subtitle&&<p className="muted page-subtitle">{subtitle}</p>}</>}
