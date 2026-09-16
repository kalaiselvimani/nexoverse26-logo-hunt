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

    let myBuzz: any = null;
    let canAnswer = false;
    let currentPriority: number | null = null;

    /*
      Find the current answer turn.

      Example:

      #1 -> wrong
      #2 -> pending

      Then #2 is the current answerer.

      If #1 -> pending,
      then #1 remains the current answerer.
    */
    if (event.active_question_id) {
      const { data: buzzes, error: buzzError } =
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
            "attempt_number",
            event.buzzer_attempt
          )
          .order("priority", {
            ascending: true,
          });

      if (buzzError) {
        throw buzzError;
      }

      const { data: answers, error: answerError } =
        await supabaseAdmin
          .from("answers")
          .select(`
            id,
            participant_id,
            attempt_number,
            result
          `)
          .eq(
            "question_id",
            event.active_question_id
          )
          .eq(
            "attempt_number",
            event.buzzer_attempt
          );

      if (answerError) {
        throw answerError;
      }

      /*
        Find the first priority participant
        who has not completed their answer.

        No answer yet      -> current turn
        pending            -> current turn
        wrong              -> skip
        correct             -> skip / question finished
      */

      let currentBuzz: any = null;

      for (const buzz of buzzes || []) {
        const participantAnswers =
          (answers || []).filter(
            (a) =>
              a.participant_id ===
                buzz.participant_id &&
              a.attempt_number ===
                buzz.attempt_number
          );

        const latestAnswer =
          participantAnswers.length > 0
            ? participantAnswers[
                participantAnswers.length - 1
              ]
            : null;

        if (
          !latestAnswer ||
          latestAnswer.result === "pending"
        ) {
          currentBuzz = buzz;
          break;
        }

        // wrong/correct answers are completed,
        // so move to the next priority.
      }

      // Find this participant's buzz
      myBuzz =
        (buzzes || []).find(
          (b) =>
            b.participant_id ===
            s.participantId
        ) || null;

      if (currentBuzz) {
        currentPriority =
          currentBuzz.priority;

        canAnswer =
          currentBuzz.participant_id ===
          s.participantId;
      }
    }

    return NextResponse.json({
      success: true,

      game: {
        status: event.status,

        roundId:
          event.active_round_id,

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

        currentPriority,

        canAnswer,

        question:
          event.question_visible &&
          question
            ? {
                id: question.id,

                text:
                  question.question_text,

                logoUrl:
                  event.logo_visible
                    ? question.logo_url
                    : null,

                points:
                  question.points,
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