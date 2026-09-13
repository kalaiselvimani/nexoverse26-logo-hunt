import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
 try {
  if (!await requireOrganiser()) return NextResponse.json({success:false,error:"Unauthorised"},{status:401});
  const supabaseAdmin=getSupabaseAdmin();
  const {action}=await req.json();
  const {data:event,error:ee}=await supabaseAdmin.from("events").select("*").eq("code",process.env.DEFAULT_GAME_CODE||"NEXO26").maybeSingle();
  if(ee) throw ee;
  if(!event) return NextResponse.json({success:false,error:"Game event not found. Run supabase/schema.sql."},{status:404});
  let patch:any={};
  if(action==="start_game"){
   let qid=event.active_question_id, rid=event.active_round_id;
   if(!qid){
    const {data:first,error}=await supabaseAdmin.from("questions").select("id,round_id").order("sort_order").limit(1).maybeSingle();
    if(error) throw error;
    if(!first) return NextResponse.json({success:false,error:"Add at least one question before starting the game."},{status:409});
    qid=first.id; rid=first.round_id;
   }
   patch={status:"running",paused:false,active_question_id:qid,active_round_id:rid,question_visible:false,logo_visible:false,buzzer_open:false,buzzer_attempt:0};
  }
  if(action==="pause") patch={paused:true,buzzer_open:false};
  if(action==="resume") patch={paused:false};
  if(action==="reveal_question") patch={question_visible:true};
  if(action==="reveal_logo") patch={logo_visible:true};
  if(action==="open_buzzer"||action==="reopen_buzzer") patch={buzzer_open:true,buzzer_attempt:(event.buzzer_attempt||0)+1};
  if(action==="close_buzzer") patch={buzzer_open:false};
  if(action==="end_game") patch={status:"ended",buzzer_open:false};
  if(action==="next_question"){
    if(!event.active_question_id) return NextResponse.json({success:false,error:"No active question."},{status:409});
    const {data:q,error:qe}=await supabaseAdmin.from("questions").select("round_id,sort_order").eq("id",event.active_question_id).single(); if(qe) throw qe;
    const {data:n,error:ne}=await supabaseAdmin.from("questions").select("id,round_id").eq("round_id",q.round_id).gt("sort_order",q.sort_order).order("sort_order",{ascending:true}).limit(1).maybeSingle(); if(ne) throw ne;
    if(!n) return NextResponse.json({success:false,error:"No next question in this round."},{status:409});
    patch={active_question_id:n.id,active_round_id:n.round_id,question_visible:false,logo_visible:false,buzzer_open:false,buzzer_attempt:0,paused:false};
  }
  if(Object.keys(patch).length===0) return NextResponse.json({success:false,error:"Unknown action"},{status:400});
  const {error}=await supabaseAdmin.from("events").update(patch).eq("id",event.id); if(error) throw error;
  return NextResponse.json({success:true});
 } catch(e) { console.error("ORGANISER ACTION ERROR",e); return NextResponse.json({success:false,error:e instanceof Error?e.message:"Action failed"},{status:500}); }
}
