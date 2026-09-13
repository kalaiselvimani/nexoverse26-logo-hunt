import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req:Request){
 try{const supabaseAdmin=getSupabaseAdmin();
  const s=await requireParticipant(); if(!s)return NextResponse.json({success:false,error:"Participant session required"},{status:401});
  const {answer}=await req.json(); if(!String(answer||"").trim())return NextResponse.json({success:false,error:"Answer is required."},{status:400});
  const {data:event,error:ee}=await supabaseAdmin.from("events").select("active_question_id,buzzer_attempt,buzzer_open,status").eq("id",s.eventId).single(); if(ee)throw ee;
  if(event.status!=="running"||!event.active_question_id)return NextResponse.json({success:false,error:"No active question."},{status:409});
  const {data:buzz}=await supabaseAdmin.from("buzzes").select("id,priority,attempt_number").eq("question_id",event.active_question_id).eq("participant_id",s.participantId).eq("priority",1).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!buzz)return NextResponse.json({success:false,error:"You do not have answer priority."},{status:403});
  const {data:existing}=await supabaseAdmin.from("answers").select("id").eq("question_id",event.active_question_id).eq("participant_id",s.participantId).eq("attempt_number",buzz.attempt_number).maybeSingle();
  if(existing)return NextResponse.json({success:false,error:"Answer already submitted."},{status:409});
  const {error}=await supabaseAdmin.from("answers").insert({question_id:event.active_question_id,participant_id:s.participantId,attempt_number:buzz.attempt_number,answer_text:String(answer).trim(),result:"pending"});
  if(error)throw error;
  return NextResponse.json({success:true});
 }catch(e){console.error("ANSWER ERROR",e);return NextResponse.json({success:false,error:"Answer could not be submitted."},{status:500});}
}