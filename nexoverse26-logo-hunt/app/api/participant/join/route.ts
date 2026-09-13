import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { createSession } from "@/lib/auth";

export async function POST(req:Request){
 try{const supabaseAdmin=getSupabaseAdmin();
  const {code,name,department}=await req.json();
  const gameCode=String(code || process.env.DEFAULT_GAME_CODE || "NEXO26").trim().toUpperCase();
  if(!name||!department) return NextResponse.json({success:false,error:"Name and department are required."},{status:400});
  const {data:event,error:eventError}=await supabaseAdmin.from("events").select("id,code,status").eq("code",gameCode).maybeSingle();
  if(eventError) throw eventError;
  if(!event) return NextResponse.json({success:false,error:"Invalid game code."},{status:404});
  if(event.status==="ended") return NextResponse.json({success:false,error:"This game has ended."},{status:409});
  const {data:participant,error}=await supabaseAdmin.from("participants").insert({event_id:event.id,name:String(name).trim(),department:String(department).trim(),status:"joined"}).select("id,name,department").single();
  if(error) throw error;
  const token=await createSession({role:"participant",participantId:participant.id,eventId:event.id});
  const res=NextResponse.json({success:true,participant,event:{id:event.id,code:event.code}});
  res.cookies.set("nx_session",token,{httpOnly:true,sameSite:"lax",secure:process.env.NODE_ENV==="production",path:"/",maxAge:60*60*12});
  return res;
 }catch(e){
  console.error("PARTICIPANT JOIN ERROR",e);
  return NextResponse.json({success:false,error:"Participant join failed."},{status:500});
 }
}