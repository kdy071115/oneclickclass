import { ArrowLeft, RefreshCw } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

const SIZE = 21;
const FINDERS = [
  [0, 0],
  [0, 14],
  [14, 0],
] as const;

function qrMatrix(seed: number) {
  let value = (seed * 2654435761) >>> 0;
  const random = () => {
    value ^= value << 13;
    value ^= value >>> 17;
    value ^= value << 5;
    value >>>= 0;
    return value / 4294967296;
  };

  return Array.from({ length: SIZE * SIZE }, (_, index) => {
    const row = Math.floor(index / SIZE);
    const col = index % SIZE;
    const finder = FINDERS.find(
      ([top, left]) => row >= top && row < top + 7 && col >= left && col < left + 7,
    );

    if (finder) {
      const [top, left] = finder;
      const localRow = row - top;
      const localCol = col - left;
      return (
        localRow === 0 ||
        localRow === 6 ||
        localCol === 0 ||
        localCol === 6 ||
        (localRow >= 2 && localRow <= 4 && localCol >= 2 && localCol <= 4)
      );
    }

    if (row === 7 || col === 7) return (row + col) % 2 === 0;
    return random() > 0.5;
  });
}
export function QrPage(){
  const nav=useNavigate(); const {id='notion'}=useParams(); const [seed,setSeed]=useState(7); const [seconds,setSeconds]=useState(299); const cells=useMemo(()=>qrMatrix(seed),[seed]); const label=id==='calligraphy'?'주말 원데이 캘리그라피 · 1회차':'노션 업무 자동화 · 2회차'; const total=id==='calligraphy'?15:24; const checked=id==='calligraphy'?9:18;
  useEffect(()=>{const timer=window.setInterval(()=>setSeconds(value=>Math.max(0,value-1)),1000);return()=>window.clearInterval(timer)},[]);
  const time=`${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
  return <div className="qr-screen"><button className="qr-back" onClick={()=>nav(-1)} aria-label="뒤로"><ArrowLeft/></button><div className="qr-heading"><h1>출석 QR 코드</h1><p>수강생이 이 QR을 스캔하면<br/>자동으로 출석 처리돼요</p></div><div className="qr-timer"><span>남은 시간</span><b>{time}</b></div><section className="qr-card"><div className="qr-code" aria-label="출석 QR 코드">{cells.map((on,index)=><i className={on?'on':''} key={index}/>)}</div><b>{label}</b></section><div className="qr-live"><span>실시간 출석</span><b>{checked}<small> / {total}명</small></b></div><button className="qr-refresh" onClick={()=>{setSeed(seed+1);setSeconds(300)}}><RefreshCw/>QR 새로고침</button></div>
}
