 "use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [error,setError]=useState("");
  const router=useRouter();

  async function submit(e:FormEvent){
    e.preventDefault(); setError("");
    const r=await fetch("/api/auth/organiser",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,password})});
    const d=await r.json().catch(()=>null);
    if(!r.ok){setError(d?.error||"Login failed");return;}
    router.push("/organiser/dashboard");
  }
  return <main className="shell center"><div className="card" style={{width:420,maxWidth:"95vw"}}>
    <div className="tag">NEXOVERSE'26</div><h1>Organiser Access</h1>
    <form className="form" onSubmit={submit}>
      <input className="input" type="email" placeholder="Organiser email" value={email} onChange={e=>setEmail(e.target.value)} required/>
      <input className="input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required/>
      {error&&<div className="error">{error}</div>}
      <button className="btn primary">Login to control panel</button>
    </form>
  </div></main>
}