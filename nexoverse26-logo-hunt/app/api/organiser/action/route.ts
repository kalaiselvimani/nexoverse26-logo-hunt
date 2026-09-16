import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    if (!(await requireOrganiser())) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const supabaseAdmin = getSupabaseAdmin();
    const { action } = await req.json();

    // Get latest event
    const { data: event, error: ee } = await supabaseAdmin
      .from("events")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (ee) throw ee;

    if (!event) {
      return NextResponse.json(
        {
          success: false,
          error: "Game event not found. Please create an event first."
        },
        { status: 404 }
      );
    }

    let patch: any = {};

    // --------------------------------
    // START GAME
    // --------------------------------
    if (action === "start_game") {
      let qid = event.active_question_id;
      let rid = event.active_round_id;

      if (!qid) {
        const { data: first, error } = await supabaseAdmin
          .from("questions")
          .select("id,round_id")
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) throw error;

        if (!first) {
          return NextResponse.json(
            {
              success: false,
              error: "Add at least one question before starting the game."
            },
            { status: 409 }
          );
        }

        qid = first.id;
        rid = first.round_id;
      }

      patch = {
        status: "running",
        paused: false,
        active_question_id: qid,
        active_round_id: rid,
        question_visible: false,
        logo_visible: false,
        buzzer_open: false,
        buzzer_attempt: 0
      };
    }

    // --------------------------------
    // PAUSE
    // --------------------------------
    if (action === "pause") {
      patch = {
        paused: true,
        buzzer_open: false
      };
    }

    // --------------------------------
    // RESUME
    // --------------------------------
    if (action === "resume") {
      patch = {
        paused: false
      };
    }

    // --------------------------------
    // REVEAL QUESTION
    // --------------------------------
    if (action === "reveal_question") {
      patch = {
        question_visible: true
      };
    }

    // --------------------------------
    // REVEAL LOGO
    // --------------------------------
    if (action === "reveal_logo") {
      patch = {
        logo_visible: true
      };
    }

    // --------------------------------
    // OPEN BUZZER
    // --------------------------------
    if (action === "open_buzzer") {
      patch = {
        buzzer_open: true,
        buzzer_attempt: (event.buzzer_attempt || 0) + 1
      };
    }

    // --------------------------------
    // CLOSE BUZZER
    // --------------------------------
    if (action === "close_buzzer") {
      patch = {
        buzzer_open: false
      };
    }

    // --------------------------------
    // END GAME
    // --------------------------------
    if (action === "end_game") {
      patch = {
        status: "ended",
        buzzer_open: false
      };
    }

    // --------------------------------
    // NEXT QUESTION
    // --------------------------------
    if (action === "next_question") {
      if (!event.active_question_id) {
        return NextResponse.json(
          {
            success: false,
            error: "No active question."
          },
          { status: 409 }
        );
      }

      // Get current question
      const { data: currentQuestion, error: currentError } =
        await supabaseAdmin
          .from("questions")
          .select(`
            id,
            round_id,
            sort_order,
            created_at
          `)
          .eq("id", event.active_question_id)
          .single();

      if (currentError) throw currentError;

      // --------------------------------
      // STEP 1:
      // Find next question in SAME ROUND
      // --------------------------------
      let nextQuestion: any = null;

      const { data: sameRoundQuestions, error: sameRoundError } =
        await supabaseAdmin
          .from("questions")
          .select(`
            id,
            round_id,
            sort_order,
            created_at
          `)
          .eq("round_id", currentQuestion.round_id)
          .order("sort_order", { ascending: true })
          .order("created_at", { ascending: true });

      if (sameRoundError) throw sameRoundError;

      const currentIndex =
        (sameRoundQuestions || []).findIndex(
          (q) => q.id === currentQuestion.id
        );

      if (
        currentIndex >= 0 &&
        currentIndex + 1 < (sameRoundQuestions || []).length
      ) {
        nextQuestion = sameRoundQuestions[currentIndex + 1];
      }

      // --------------------------------
      // STEP 2:
      // If current round finished,
      // find NEXT ROUND
      // --------------------------------
      if (!nextQuestion) {
        const { data: currentRound, error: roundError } =
          await supabaseAdmin
            .from("rounds")
            .select(`
              id,
              sort_order,
              created_at
            `)
            .eq("id", currentQuestion.round_id)
            .single();

        if (roundError) throw roundError;

        // Find next round
        const { data: nextRounds, error: nextRoundError } =
          await supabaseAdmin
            .from("rounds")
            .select(`
              id,
              sort_order,
              created_at
            `)
            .gt("sort_order", currentRound.sort_order)
            .order("sort_order", { ascending: true })
            .order("created_at", { ascending: true })
            .limit(1);

        if (nextRoundError) throw nextRoundError;

        const nextRound = nextRounds?.[0];

        if (nextRound) {
          // Find first question in next round
          const { data: firstQuestion, error: firstQuestionError } =
            await supabaseAdmin
              .from("questions")
              .select(`
                id,
                round_id,
                sort_order,
                created_at
              `)
              .eq("round_id", nextRound.id)
              .order("sort_order", { ascending: true })
              .order("created_at", { ascending: true })
              .limit(1)
              .maybeSingle();

          if (firstQuestionError) throw firstQuestionError;

          if (firstQuestion) {
            nextQuestion = firstQuestion;
          }
        }
      }

      // --------------------------------
      // NO MORE QUESTIONS
      // --------------------------------
      if (!nextQuestion) {
        return NextResponse.json(
          {
            success: false,
            error: "No more questions available."
          },
          { status: 409 }
        );
      }

      // --------------------------------
      // MOVE TO NEXT QUESTION
      // --------------------------------
      patch = {
        active_question_id: nextQuestion.id,
        active_round_id: nextQuestion.round_id,
        question_visible: false,
        logo_visible: false,
        buzzer_open: false,
        buzzer_attempt: 0,
        paused: false
      };
    }

    // --------------------------------
    // UNKNOWN ACTION
    // --------------------------------
    if (Object.keys(patch).length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "Unknown action"
        },
        { status: 400 }
      );
    }

    // --------------------------------
    // UPDATE EVENT
    // --------------------------------
    const { error } = await supabaseAdmin
      .from("events")
      .update(patch)
      .eq("id", event.id);

    if (error) throw error;

    return NextResponse.json({
      success: true
    });

  } catch (e) {
    console.error("ORGANISER ACTION ERROR", e);

    return NextResponse.json(
      {
        success: false,
        error:
          e instanceof Error
            ? e.message
            : "Action failed"
      },
      { status: 500 }
    );
  }
}