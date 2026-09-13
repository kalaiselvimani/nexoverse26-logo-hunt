 "use client";
import { useEffect,useState } from "react"; import {useRouter} from "next/navigation";
export default function Waiting(){const [error,setError]=useState("");const router=useRouter();
 useEffect(()=>{const t=setInterval(async()=>{const r=await fetch("/api/participant/state",{cache:"no-store"});const d=await r.json().catch(()=>null);if(r.ok&&d?.game?.status==="running"){router.push("/game")}else if(!r.ok)setError(d?.error||"Connection error")},1000);return()=>clearInterval(t)},[router]);
 return <main className="shell center"><div className="card" style={{textAlign:"center",maxWidth:600}}><div className="tag">NEXOVERSE'26 • LOGO HUNT</div><h1>Waiting for organiser</h1><p className="muted">The game will begin when the organiser starts the event.</p>{error&&<p className="error">{error}</p>}<div className="status">LIVE SYNC ACTIVE</div></div></main>}
