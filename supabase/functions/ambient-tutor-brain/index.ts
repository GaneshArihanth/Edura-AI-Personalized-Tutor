// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.1/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceRoleKey || !geminiApiKey) {
      throw new Error("Missing environment variables for Supabase or Gemini.");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Fetch telemetry events from the last 2 hours
    const timeAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    
    const { data: recentEvents, error: eventsError } = await supabase
      .from("user_telemetry_events")
      .select("user_id, event_type, event_data, created_at")
      .gte("created_at", timeAgo);

    if (eventsError) throw eventsError;

    if (!recentEvents || recentEvents.length === 0) {
      return new Response(JSON.stringify({ message: "No recent events to process." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // group events by user
    const eventsByUser: Record<string, any[]> = {};
    for (const ev of recentEvents) {
      if (!eventsByUser[ev.user_id]) eventsByUser[ev.user_id] = [];
      eventsByUser[ev.user_id].push(ev);
    }

    let processedCount = 0;

    // 2. Process each user's telemetry via Gemini
    for (const [userId, events] of Object.entries(eventsByUser)) {
      // Get current profile
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("ai_persona_profile")
        .eq("id", userId)
        .single();

      if (userError) {
        console.error(`Failed to fetch user ${userId}:`, userError);
        continue;
      }

      const currentProfile = userData.ai_persona_profile || {};

      // 3. Construct Gemini Prompt
      const prompt = `
You are the Edura Ambient AI Tutor "Brain". Your role is to analyze a student's raw platform telemetry and update their psychological and academic profile.

CURRENT PROFILE (JSON):
${JSON.stringify(currentProfile, null, 2)}

RECENT ACTIVITY LOGS (JSON):
${JSON.stringify(events, null, 2)}

INSTRUCTIONS:
Analyze the logs. Look for signs of struggle, flow state, burnout, distraction, or mastery.
Return ONLY a raw JSON object (without markdown blocks like \`\`\`json) representing the updated profile. Include traits like:
- "current_mood": (e.g., "frustrated", "focused", "fatigued")
- "learning_style": (if apparent from activity)
- "struggle_points": (topics or tools confusing them)
- "last_analyzed_at": (current timestamp)

CRITICAL: If the user is frustrated, burned out, or needs a reset, you must propose an active intervention by including an "intervention" object:
"intervention": {
  "message": "Hey, I noticed you've been at this for a while and might be hitting a wall. How about a 5-minute reset in the Focus Room? It could help you recharge.",
  "action": {
    "type": "NAVIGATE_AND_START_FOCUS",
    "payload": { "duration": 5 }
  }
}

VALID ACTION TYPES INCLUDE:
- "NAVIGATE" (payload: {"path": "/target-route"})
- "NAVIGATE_AND_START_FOCUS" (payload: {"duration": 5})
- "ENABLE_DND" (payload: {})

Preserve or update any existing useful keys from the CURRENT PROFILE.
Do not wrap your response in markdown. Return raw JSON.
`;

      // 4. Call Gemini API
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
               temperature: 0.2,
               responseMimeType: "application/json"
            }
          }),
        }
      );

      if (!geminiResponse.ok) {
        console.error(`Gemini API error for user ${userId}:`, await geminiResponse.text());
        continue;
      }

      const geminiData = await geminiResponse.json();
      const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
      
      let newProfile = currentProfile;
      try {
        newProfile = JSON.parse(rawText || "{}");
      } catch (e) {
        console.error("Failed to parse Gemini JSON:", rawText);
        continue;
      }

      // 5. Update user profile in Supabase
      const { error: updateError } = await supabase
        .from("users")
        .update({ ai_persona_profile: newProfile })
        .eq("id", userId);

      if (updateError) {
        console.error(`Failed to update profile for ${userId}:`, updateError);
      } else {
        processedCount++;
        console.log(`Updated profile for ${userId}`);
      }
    }

    return new Response(JSON.stringify({ message: `Successfully processed ${processedCount} users.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error: any) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
