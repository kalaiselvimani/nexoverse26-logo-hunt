import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!(await requireOrganiser())) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorised",
        },
        { status: 401 }
      );
    }

    // Get latest event
    const { data: event, error: eventError } = await supabaseAdmin
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventError) throw eventError;

    if (!event) {
      return NextResponse.json({
        success: true,
        event: null,
        participants: [],
        question: null,
        buzzes: [],
        answers: [],
      });
    }

    // Get active question
    let question = null;

    if (event.active_question_id) {
      const { data, error } = await supabaseAdmin
        .from("questions")
        .select("*")
        .eq("id", event.active_question_id)
        .maybeSingle();

      if (error) throw error;

      question = data;
    }

    // Get participants
    const { data: participants, error: participantsError } =
      await supabaseAdmin
        .from("participants")
        .select(
          "id,name,department,status,score,buzz_wins,joined_at"
        )
        .eq("event_id", event.id)
        .order("joined_at", { ascending: true });

    if (participantsError) throw participantsError;

    // Get current buzzes
    let buzzes: any[] = [];

    if (event.active_question_id) {
      const { data, error } = await supabaseAdmin
        .from("buzzes")
        .select(
          `
          id,
          participant_id,
          attempt_number,
          priority,
          created_at
        `
        )
        .eq("question_id", event.active_question_id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      buzzes = data || [];
    }

    // Get current answers
    let answers: any[] = [];

    if (event.active_question_id) {
      const { data, error } = await supabaseAdmin
        .from("answers")
        .select(
          `
          id,
          participant_id,
          attempt_number,
          answer_text,
          result,
          submitted_at
        `
        )
        .eq("question_id", event.active_question_id)
        .order("submitted_at", { ascending: true });

      if (error) throw error;

      answers = data || [];
    }

    // Attach participant information manually.
    // This avoids depending on Supabase nested relationships.
    const participantMap = new Map(
      (participants || []).map((p) => [p.id, p])
    );

    const buzzesWithParticipants = buzzes.map((b) => {
      const p = participantMap.get(b.participant_id);

      return {
        ...b,
        participants: p
          ? {
              name: p.name,
              department: p.department,
            }
          : null,
      };
    });

    const answersWithParticipants = answers.map((a) => {
      const p = participantMap.get(a.participant_id);

      return {
        ...a,
        participants: p
          ? {
              name: p.name,
              department: p.department,
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      event,
      question,
      participants: participants || [],
      buzzes: buzzesWithParticipants,
      answers: answersWithParticipants,
    });
  } catch (e) {
    console.error("ORGANISER STATE ERROR", e);

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Organiser state could not be loaded",
      },
      { status: 500 }
    );
  }
}