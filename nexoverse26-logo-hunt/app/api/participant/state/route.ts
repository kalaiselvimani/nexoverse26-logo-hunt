import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const s = await requireParticipant();

    if (!s) {
      return NextResponse.json(
        {
          success: false,
          error: "Participant session required",
        },
        { status: 401 }
      );
    }

    // Get current event
    const { data: event, error: eventError } =
      await supabaseAdmin
        .from("events")
        .select(`
          id,
          code,
          status,
          active_round_id,
          active_question_id,
          question_visible,
          logo_visible,
          buzzer_open,
          paused,
          timer_started_at,
          timer_seconds,
          buzzer_attempt
        `)
        .eq("id", s.eventId)
        .single();

    if (eventError) {
      throw eventError;
    }

    // Get active question
    let question: any = null;

    if (event.active_question_id) {
      const { data, error } =
        await supabaseAdmin
          .from("questions")
          .select(`
            id,
            round_id,
            question_text,
            logo_url,
            points,
            timer_seconds,
            sort_order
          `)
          .eq("id", event.active_question_id)
          .single();

      if (error) {
        throw error;
      }

      question = data;
    }

    // Get current participant's buzz
    let myBuzz: any = null;

    if (event.active_question_id) {
      const { data: myBuzzes, error: buzzError } =
        await supabaseAdmin
          .from("buzzes")
          .select(`
            id,
            participant_id,
            attempt_number,
            priority,
            created_at
          `)
          .eq(
            "question_id",
            event.active_question_id
          )
          .eq(
            "participant_id",
            s.participantId
          )
          .eq(
            "attempt_number",
            event.buzzer_attempt
          )
          .order("created_at", {
            ascending: true,
          })
          .limit(1);

      if (buzzError) {
        throw buzzError;
      }

      myBuzz =
        myBuzzes && myBuzzes.length > 0
          ? myBuzzes[0]
          : null;
    }

    return NextResponse.json({
      success: true,

      game: {
        status: event.status,

        roundId: event.active_round_id,

        questionVisible:
          event.question_visible,

        logoVisible:
          event.logo_visible,

        buzzerOpen:
          event.buzzer_open,

        paused:
          event.paused,

        timerStartedAt:
          event.timer_started_at,

        timerSeconds:
          event.timer_seconds,

        question:
          event.question_visible && question
            ? {
                id: question.id,

                text: question.question_text,

                logoUrl:
                  event.logo_visible
                    ? question.logo_url
                    : null,

                points: question.points,
              }
            : null,

        myBuzz:
          myBuzz
            ? {
                attemptNumber:
                  myBuzz.attempt_number,

                priority:
                  myBuzz.priority,
              }
            : null,

        // Priority #1 is the winner
        isWinner:
          myBuzz?.priority === 1,
      },
    });

  } catch (e) {
    console.error(
      "PARTICIPANT STATE ERROR",
      e
    );

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Game state could not be loaded",
      },
      {
        status: 500,
      }
    );
  }
}