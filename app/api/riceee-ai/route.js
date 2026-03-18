import { NextResponse } from "next/server";

export async function POST(req) {
  try {
    const body = await req.json();
    const { message, userName, partnerName, scenario, userPerspective, partnerPerspective } = body;

    // If it's a simple message (conversational), use a different format
    if (message && !scenario) {
      // Call Python FastAPI server for conversational chat
      const response = await fetch("http://localhost:8000/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: message,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(
          { error: error.detail || "AI service error" },
          { status: response.status }
        );
      }

      const data = await response.json();
      return NextResponse.json({ advice: data.response });
    }

    // Original conflict analysis format
    if (!scenario || !userPerspective || !partnerPerspective) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Call Python FastAPI server for conflict analysis
    const response = await fetch("http://localhost:8000/analyze-conflict", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        user_name: userName || "",
        partner_name: partnerName || "",
        scenario,
        user_perspective: userPerspective,
        partner_perspective: partnerPerspective,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.detail || "AI service error" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json({ advice: data.advice });
  } catch (error) {
    console.error("Riceee AI API error:", error);
    return NextResponse.json(
      { error: "Failed to get AI response. Make sure the Python server is running." },
      { status: 500 }
    );
  }
}
