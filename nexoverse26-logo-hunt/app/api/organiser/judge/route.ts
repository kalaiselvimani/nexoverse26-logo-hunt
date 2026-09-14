import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!(await requireOrganiser())) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const { answerId, result } = await req.json();

    if (!answerId || !["correct", "wrong"].includes(result)) {
      return NextResponse.json(
        { success: false, error: "Invalid judgement" },
        { status: 400 }
      );
    }

    const { data: answer, error: ae } = await supabaseAdmin
      .from("answers")
      .select("id,participant_id,question_id")
      .eq("id", answerId)
      .single();

    if (ae) throw ae;

    const { error } = await supabaseAdmin
      .from("answers")
      .update({ result })
      .eq("id", answerId);

    if (error) throw error;

    if (result === "correct") {
      const { data: q, error: qe } = await supabaseAdmin
        .from("questions")
        .select("points")
        .eq("id", answer.question_id)
        .single();

      if (qe) throw qe;

      const { data: existing } = await supabaseAdmin
        .from("scores")
        .select("id")
        .eq("participant_id", answer.participant_id)
        .eq("question_id", answer.question_id)
        .maybeSingle();

      if (!existing) {
        await supabaseAdmin.from("scores").insert({
          participant_id: answer.participant_id,
          question_id: answer.question_id,
          points: q.points,
        });

        const { data: p, error: pe } = await supabaseAdmin
          .from("participants")
          .select("score,buzz_wins")
          .eq("id", answer.participant_id)
          .single();

        if (pe) throw pe;

        await supabaseAdmin
          .from("participants")
          .update({
            score: (p.score || 0) + q.points,
            buzz_wins: (p.buzz_wins || 0) + 1,
          })
          .eq("id", answer.participant_id);
      }

      await supabaseAdmin
        .from("events")
        .update({ buzzer_open: false })
        .eq("active_question_id", answer.question_id);
    } else {
      await supabaseAdmin
        .from("events")
        .update({ buzzer_open: false })
        .eq("active_question_id", answer.question_id);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("JUDGE ERROR", e);

    return NextResponse.json(
      {
        success: false,
        error: e instanceof Error ? e.message : "Judgement failed",
      },
      { status: 500 }
    );
  }
}