import { Grid2X2, Home, Plus, UserRound, Users } from 'lucide-react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import { StatusBar } from '../components/common/StatusBar';
const nav=[['/',Home,'홈'],['/classes',Grid2X2,'클래스'],['/applicants',Users,'신청자'],['/my',UserRound,'마이']] as const;
export function AppLayout(){return <main className="stage"><section className="phone"><StatusBar/><div className="scroll"><Outlet/></div><nav className="five-nav">{nav.slice(0,2).map(([to,Icon,label])=><NavLink key={to} to={to} end={to==='/'}><Icon size={22}/><small>{label}</small></NavLink>)}<Link className="nav-create" to="/classes/new" aria-label="강의 만들기"><Plus size={27}/></Link>{nav.slice(2).map(([to,Icon,label])=><NavLink key={to} to={to}><Icon size={22}/><small>{label}</small></NavLink>)}</nav></section></main>}
