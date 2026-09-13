 "use client";
import {useEffect,useState} from "react";
type Game={status:string;questionVisible:boolean;logoVisible:boolean;buzzerOpen:boolean;paused:boolean;question:any;myBuzz:any;isWinner:boolean};
export default function Game(){const[g,setG]=useState<Game|null>(null);const[error,setError]=useState("");const[busy,setBusy]=useState(false);const[answer,setAnswer]=useState("");
 async function load(){const r=await fetch("/api/participant/state",{cache:"no-store"});const d=await r.json().catch(()=>null);if(r.ok)setG(d.game);else setError(d?.error||"Game state unavailable")}
 useEffect(()=>{load();const t=setInterval(load,700);return()=>clearInterval(t)},[]);
 async function buzz(){setBusy(true);const r=await fetch("/api/game/buzz",{method:"POST"});const d=await r.json().catch(()=>null);setBusy(false);if(!r.ok)setError(d?.error||"Buzz failed");await load()}
 async function submit(){setBusy(true);const r=await fetch("/api/game/answer",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({answer})});const d=await r.json().catch(()=>null);setBusy(false);if(!r.ok)setError(d?.error||"Answer failed");else setAnswer("")}
 if(!g)return <main className="shell center"><div>Loading game...</div></main>;
 return <main className="shell"><div className="top"><div className="brand">NEXOVERSE<span className="accent">'26</span> • LOGO HUNT</div><div className="pill">{g.paused?"PAUSED":g.status.toUpperCase()}</div></div>
 <div className="card" style={{maxWidth:1000,margin:"35px auto"}}><div className="tag">LIVE QUESTION</div>
 {g.questionVisible&&g.question?<><div className="question" style={{margin:"20px 0"}}>{g.question.text}</div>{g.logoVisible&&g.question.logoUrl&&<img className="logo" src={g.question.logoUrl} alt="Question logo"/>}</>:<div className="status">Waiting for organiser to reveal the question...</div>}
 {g.buzzerOpen&&!g.myBuzz&&<div style={{display:"grid",placeItems:"center",padding:"35px"}}><button className="bigbuzz" onClick={buzz} disabled={busy}>{busy?"BUZZING":"BUZZ NOW"}</button></div>}
 {g.myBuzz&&<div className="status" style={{marginTop:25}}>{g.isWinner?<><h2>🥇 YOU WON THE BUZZER</h2><p>Priority #{g.myBuzz.priority}</p><div className="form"><input className="input" value={answer} onChange={e=>setAnswer(e.target.value)} placeholder="Type your answer" disabled={busy}/><button className="btn primary" onClick={submit} disabled={busy||!answer.trim()}>Submit Answer</button></div></>:<>BUZZER LOCKED — waiting for result</>}</div>}
 {!g.buzzerOpen&&!g.myBuzz&&<div className="status" style={{marginTop:25}}>BUZZER CLOSED</div>}
 {error&&<p className="error">{error}</p>}
 </div></main>
}