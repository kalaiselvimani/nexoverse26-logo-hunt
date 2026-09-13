import {NextResponse} from "next/server";import{requireOrganiser}from"@/lib/auth";import{getSupabaseAdmin}from"@/lib/supabaseAdmin";
export async function GET(){try{const supabaseAdmin=getSupabaseAdmin();if(!await requireOrganiser())return NextResponse.json({success:false,error:"Unauthorised"},{status:401});
 const {data:event,error}=await supabaseAdmin.from("events").select("*").order("created_at",{ascending:false}).limit(1).maybeSingle();if(error)throw error;
 if(!event)return NextResponse.json({success:true,event:null,participants:[],question:null,buzzes:[],answers:[]});
 const q=event.active_question_id?await supabaseAdmin.from("questions").select("*").eq("id",event.active_question_id).maybeSingle():{data:null,error:null};
 const p=await supabaseAdmin.from("participants").select("id,name,department,status,score,buzz_wins,joined_at").eq("event_id",event.id).order("joined_at",{ascending:true});
 const b=event.active_question_id?await supabaseAdmin.from("buzzes").select("id,participant_id,attempt_number,priority,created_at,participants(name,department)").eq("question_id",event.active_question_id).order("created_at",{ascending:true}):{data:[],error:null};
 const a=event.active_question_id?await supabaseAdmin.from("answers").select("id,participant_id,attempt_number,answer_text,result,submitted_at,participants(name,department)").eq("question_id",event.active_question_id).order("submitted_at",{ascending:true}):{data:[],error:null};
 return NextResponse.json({success:true,event,question:q.data,participants:p.data||[],buzzes:b.data||[],answers:a.data||[]});
}catch(e){console.error("ORGANISER STATE ERROR",e);return NextResponse.json({success:false,error:"Organiser state could not be loaded"},{status:500})}}
