import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET(){
 try{const supabaseAdmin=getSupabaseAdmin();
  const s=await requireParticipant();
  if(!s) return NextResponse.json({success:false,error:"Participant session required"},{status:401});
  const {data:event,error}=await supabaseAdmin.from("events").select("id,code,status,active_round_id,active_question_id,question_visible,logo_visible,buzzer_open,paused,timer_started_at,timer_seconds,buzzer_attempt").eq("id",s.eventId).single();
  if(error) throw error;
  let question:any=null;
  if(event.active_question_id){
   const q=await supabaseAdmin.from("questions").select("id,round_id,question_text,logo_url,points,timer_seconds,sort_order").eq("id",event.active_question_id).single();
   if(q.error) throw q.error;
   question=q.data;
  }
  const {data:myBuzzes}=await supabaseAdmin.from("buzzes").select("id,attempt_number,priority").eq("question_id",event.active_question_id || "00000000-0000-0000-0000-000000000000").eq("participant_id",s.participantId).order("created_at",{ascending:true});
  const myBuzz=event.active_question_id ? (myBuzzes||[]).find((b:any)=>b.attempt_number === (event.buzzer_attempt||0)) : null;
  const {data:winner}=event.active_question_id ? await supabaseAdmin.from("buzzes").select("participant_id,attempt_number,priority").eq("question_id",event.active_question_id).eq("attempt_number",event.buzzer_attempt||1).eq("priority",1).maybeSingle() : {data:null};
  return NextResponse.json({success:true,game:{
    status:event.status,roundId:event.active_round_id,questionVisible:event.question_visible,logoVisible:event.logo_visible,
    buzzerOpen:event.buzzer_open,paused:event.paused,timerStartedAt:event.timer_started_at,timerSeconds:event.timer_seconds,
    question:event.question_visible && question ? {id:question.id,text:question.question_text,logoUrl:event.logo_visible?question.logo_url:null,points:question.points} : null,
    myBuzz:myBuzz?{attemptNumber:myBuzz.attempt_number,priority:myBuzz.priority}:null,
    isWinner:!!myBuzz && myBuzz.priority===1
  }});
 }catch(e){console.error("PARTICIPANT STATE ERROR",e);return NextResponse.json({success:false,error:"Game state could not be loaded"},{status:500});}
}