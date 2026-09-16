import { NextResponse } from "next/server";
import { requireParticipant } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
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

    const { answer } = await req.json();

    const answerText = String(
      answer || ""
    ).trim();

    if (!answerText) {
      return NextResponse.json(
        {
          success: false,
          error: "Answer is required.",
        },
        { status: 400 }
      );
    }

    // Get current event
    const { data: event, error: eventError } =
      await supabaseAdmin
        .from("events")
        .select(`
          id,
          active_question_id,
          buzzer_attempt,
          status
        `)
        .eq("id", s.eventId)
        .single();

    if (eventError) {
      throw eventError;
    }

    if (
      event.status !== "running" ||
      !event.active_question_id
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "No active question.",
        },
        { status: 409 }
      );
    }

    /*
      Get this participant's buzz
      for the current question/attempt.
    */
    const { data: myBuzz, error: buzzError } =
      await supabaseAdmin
        .from("buzzes")
        .select(`
          id,
          participant_id,
          attempt_number,
          priority
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
        .maybeSingle();

    if (buzzError) {
      throw buzzError;
    }

    if (!myBuzz) {
      return NextResponse.json(
        {
          success: false,
          error: "You have not buzzed for this question.",
        },
        { status: 403 }
      );
    }

    /*
      Find all answers already submitted
      for this question/attempt.
    */
    const { data: answers, error: answersError } =
      await supabaseAdmin
        .from("answers")
        .select(`
          participant_id,
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

    if (answersError) {
      throw answersError;
    }

    /*
      Find all buzzes in priority order.
    */
    const { data: buzzes, error: buzzesError } =
      await supabaseAdmin
        .from("buzzes")
        .select(`
          participant_id,
          priority,
          attempt_number
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

    if (buzzesError) {
      throw buzzesError;
    }

    /*
      Determine whose turn it is.

      The first participant whose answer
      is missing or pending is the current turn.
    */
    let currentParticipantId: string | null =
      null;

    for (const buzz of buzzes || []) {
      const existingAnswer =
        (answers || []).find(
          (a) =>
            a.participant_id ===
            buzz.participant_id
        );

      if (
        !existingAnswer ||
        existingAnswer.result === "pending"
      ) {
        currentParticipantId =
          buzz.participant_id;

        break;
      }
    }

    if (
      currentParticipantId !==
      s.participantId
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "It is not your turn to answer.",
        },
        { status: 403 }
      );
    }

    /*
      Prevent duplicate submission.
    */
    const { data: existingAnswer, error: existingError } =
      await supabaseAdmin
        .from("answers")
        .select("id,result")
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
        .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingAnswer) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Answer already submitted.",
        },
        { status: 409 }
      );
    }

    /*
      Insert pending answer.
      Organiser will judge it.
    */
    const { error: insertError } =
      await supabaseAdmin
        .from("answers")
        .insert({
          question_id:
            event.active_question_id,

          participant_id:
            s.participantId,

          attempt_number:
            event.buzzer_attempt,

          answer_text: answerText,

          result: "pending",
        });

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({
      success: true,
      message: "Answer submitted successfully.",
    });
  } catch (e) {
    console.error(
      "ANSWER ERROR",
      e
    );

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Answer could not be submitted.",
      },
      {
        status: 500,
      }
    );
  }
}