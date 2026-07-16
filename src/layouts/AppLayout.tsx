import { Grid2X2, Heart, Home, Plus, UserRound, Users } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { StatusBar } from '../components/common/StatusBar';
import { useRole } from '../hooks/useRole';
const nav=[['/',Home,'홈'],['/classes',Grid2X2,'클래스'],['/applicants',Users,'신청자'],['/my',UserRound,'마이']] as const;
export function AppLayout(){const {role}=useRole();const teacher=role==='teacher';return <main className="stage"><section className="phone"><StatusBar/><div className="scroll"><Outlet/></div><nav className={`five-nav ${teacher?'':'student-nav'}`}>{nav.slice(0,2).map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/'}><Icon size={22}/><small>{label}</small></NavLink>)}{teacher?<Link className="nav-create" to="/classes/new" aria-label="강의 만들기"><Plus size={27}/></Link>:<NavLink to="/wishlist"><Heart size={22}/><small>관심</small></NavLink>}{teacher&&<NavLink to="/applicants"><Users size={22}/><small>신청자</small></NavLink>}<NavLink to="/my"><UserRound size={22}/><small>마이</small></NavLink></nav></section></main>}
