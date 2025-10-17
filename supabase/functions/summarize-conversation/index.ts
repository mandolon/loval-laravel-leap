import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { threadId, messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build conversation history for context
    const conversationText = messages
      .map((m: any) => `${m.role}: ${m.content}`)
      .join("\n\n");

    const systemPrompt = `You are an AI assistant that summarizes project conversations into structured data.
Analyze the conversation and extract:
1. A clear, concise title (max 60 chars)
2. A brief summary (2-3 sentences)
3. Key points discussed (3-5 bullet points)
4. Pending items that need follow-up
5. Action items with optional assignees and due dates
6. Relevant tags for categorization

Return ONLY valid JSON matching this exact structure:
{
  "title": "string",
  "summary": "string",
  "key_points": ["string"],
  "pending_items": ["string"],
  "action_items": [{"task": "string", "assignee": "string?", "due_date": "string?"}],
  "tags": ["string"]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Summarize this conversation:\n\n${conversationText}` },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON response
    let summary;
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      const jsonMatch = content.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonText = jsonMatch ? jsonMatch[1] : content;
      summary = JSON.parse(jsonText.trim());
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      throw new Error("Invalid JSON response from AI");
    }

    return new Response(JSON.stringify(summary), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("summarize-conversation error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
