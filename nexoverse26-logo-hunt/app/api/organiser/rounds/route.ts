import { NextResponse } from "next/server";
import { requireOrganiser } from "@/lib/auth";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!await requireOrganiser()) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const { data, error: eventError } = await supabaseAdmin
      .from("events")
      .select("id")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (eventError) throw eventError;

    if (!data) {
      return NextResponse.json({
        success: true,
        rounds: []
      });
    }

    const { data: rounds, error } = await supabaseAdmin
      .from("rounds")
      .select("id,name,sort_order")
      .eq("event_id", data.id)
      .order("sort_order");

    if (error) throw error;

    return NextResponse.json({
      success: true,
      rounds: rounds || []
    });

  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { success: false, error: "Rounds could not be loaded" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();

    if (!await requireOrganiser()) {
      return NextResponse.json(
        { success: false, error: "Unauthorised" },
        { status: 401 }
      );
    }

    const { eventId, name, sortOrder } = await req.json();

    const { data, error } = await supabaseAdmin
      .from("rounds")
      .insert({
        event_id: eventId,
        name,
        sort_order: Number(sortOrder || 1)
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      round: data
    });

  } catch (e) {
    console.error(e);

    return NextResponse.json(
      { success: false, error: "Round could not be created" },
      { status: 500 }
    );
  }
}