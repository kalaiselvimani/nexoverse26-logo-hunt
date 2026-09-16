import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!(await requireOrganiser())) {
      return NextResponse.json(
        {
          success: false,
          error: "Unauthorised",
        },
        {
          status: 401,
        }
      );
    }

    const { answerId, result } =
      await req.json();

    if (
      !answerId ||
      !["correct", "wrong"].includes(
        result
      )
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Invalid judgement",
        },
        {
          status: 400,
        }
      );
    }

    /*
      Get answer details.
    */
    const { data: answer, error: answerError } =
      await supabaseAdmin
        .from("answers")
        .select(`
          id,
          participant_id,
          question_id,
          attempt_number,
          result
        `)
        .eq("id", answerId)
        .single();

    if (answerError) {
      throw answerError;
    }

    if (answer.result !== "pending") {
      return NextResponse.json(
        {
          success: false,
          error:
            "This answer has already been judged.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      Get current event.
    */
    const { data: event, error: eventError } =
      await supabaseAdmin
        .from("events")
        .select(`
          id,
          active_question_id,
          buzzer_attempt,
          status
        `)
        .eq(
          "active_question_id",
          answer.question_id
        )
        .single();

    if (eventError) {
      throw eventError;
    }

    if (
      event.status !== "running"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "Game is not running.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      Make sure this answer belongs
      to the current buzzer attempt.
    */
    if (
      answer.attempt_number !==
      event.buzzer_attempt
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This answer belongs to an old buzzer attempt.",
        },
        {
          status: 409,
        }
      );
    }

    /*
      Update answer result.
    */
    const { error: updateError } =
      await supabaseAdmin
        .from("answers")
        .update({
          result,
        })
        .eq("id", answerId);

    if (updateError) {
      throw updateError;
    }

    /*
      CORRECT ANSWER
      ----------------
      Award points and close buzzer.
    */
    if (result === "correct") {
      const { data: q, error: questionError } =
        await supabaseAdmin
          .from("questions")
          .select("points")
          .eq(
            "id",
            answer.question_id
          )
          .single();

      if (questionError) {
        throw questionError;
      }

      const { data: existingScore } =
        await supabaseAdmin
          .from("scores")
          .select("id")
          .eq(
            "participant_id",
            answer.participant_id
          )
          .eq(
            "question_id",
            answer.question_id
          )
          .maybeSingle();

      if (!existingScore) {
        const { error: scoreError } =
          await supabaseAdmin
            .from("scores")
            .insert({
              participant_id:
                answer.participant_id,

              question_id:
                answer.question_id,

              points: q.points,
            });

        if (scoreError) {
          throw scoreError;
        }

        const { data: p, error: participantError } =
          await supabaseAdmin
            .from("participants")
            .select(
              "score,buzz_wins"
            )
            .eq(
              "id",
              answer.participant_id
            )
            .single();

        if (participantError) {
          throw participantError;
        }

        const { error: participantUpdateError } =
          await supabaseAdmin
            .from("participants")
            .update({
              score:
                (p.score || 0) +
                q.points,

              buzz_wins:
                (p.buzz_wins || 0) +
                1,
            })
            .eq(
              "id",
              answer.participant_id
            );

        if (participantUpdateError) {
          throw participantUpdateError;
        }
      }

      /*
        Correct answer means:
        Question is finished.
        Stop accepting new buzzes.
      */
      const { error: closeError } =
        await supabaseAdmin
          .from("events")
          .update({
            buzzer_open: false,
          })
          .eq(
            "id",
            event.id
          );

      if (closeError) {
        throw closeError;
      }
    }

    /*
      WRONG ANSWER
      ------------
      DO NOT CLOSE BUZZER.

      Existing priority queue will be used.

      Example:
      #1 wrong
      #2 becomes current answerer
      */
    if (result === "wrong") {
      const { error: keepOpenError } =
        await supabaseAdmin
          .from("events")
          .update({
            buzzer_open: true,
          })
          .eq(
            "id",
            event.id
          );

      if (keepOpenError) {
        throw keepOpenError;
      }
    }

    return NextResponse.json({
      success: true,
      result,
    });
  } catch (e) {
    console.error(
      "JUDGE ERROR",
      e
    );

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Judgement failed",
      },
      {
        status: 500,
      }
    );
  }
}