import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(){
 try{const supabaseAdmin=getSupabaseAdmin();
  const s=await requireParticipant(); if(!s)return NextResponse.json({success:false,error:"Participant session required"},{status:401});
  const {data,error}=await supabaseAdmin.rpc("record_buzz",{p_event_id:s.eventId,p_participant_id:s.participantId});
  if(error)throw error;
  return NextResponse.json({success:true,...data});
 }catch(e){console.error("BUZZ ERROR",e);return NextResponse.json({success:false,error:"Buzz could not be recorded."},{status:409});}
}