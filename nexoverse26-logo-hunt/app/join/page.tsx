"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Join(){
 const [name,setName]=useState(""); const [department,setDepartment]=useState("");
 const [error,setError]=useState(""); const [busy,setBusy]=useState(false); const router=useRouter();
 async function submit(e:FormEvent){e.preventDefault();setBusy(true);setError("");
   const r=await fetch("/api/participant/join",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,department})});
   const d=await r.json().catch(()=>null); setBusy(false);
   if(!r.ok){setError(d?.error||"Unable to join");return;}
   router.push("/waiting");
 }
 return <main className="shell center"><div className="card" style={{width:500,maxWidth:"95vw"}}>
   <div className="tag">NEXOVERSE'26 • LOGO HUNT</div><h1>Join Game</h1>
   <p className="muted">Enter your details and join the live game.</p>
   <form className="form" onSubmit={submit}>
    <input className="input" placeholder="Your Name" value={name} onChange={e=>setName(e.target.value)} required/>
    <input className="input" placeholder="Department" value={department} onChange={e=>setDepartment(e.target.value)} required/>
    {error&&<div className="error">{error}</div>}
    <button className="btn primary" disabled={busy}>{busy?"Joining...":"Join Game"}</button>
   </form>
 </div></main>
}
