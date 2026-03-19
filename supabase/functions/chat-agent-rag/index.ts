// @ts-nocheck
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { GoogleGenerativeAI } from "npm:@google/generative-ai";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { message, history } = await req.json();

    if (!message) {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const geminiApiKey = Deno.env.get("GEMINI_API_KEY") ?? "";

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Generate Embedding using Gemini SDK
    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
    const embedResult = await embedModel.embedContent(message);
    const queryEmbedding = embedResult.embedding.values;

    // 2. Perform Semantic Search in Supabase using pgvector
    console.log("Executing Supabase RPC with queryEmbedding length:", queryEmbedding.length);
    let { data: documents, error: searchError } = await supabase.rpc(
      "match_site_documents",
      {
        query_embedding: queryEmbedding,
        match_count: 3,
        similarity_threshold: 0.3,
      }
    );
    console.log("Documents retrieved:", documents ? documents.length : 0);
    if (searchError) {
      console.error("RPC Error:", searchError);
    }

    // Fallback just in case the table hasn't been seeded yet but they query it anyway
    if (searchError || !documents || documents.length === 0) {
      console.warn("Supabase search returned empty or failed. Trying to proceed.", searchError);
    }

    // 3. Construct context string from retrieved documents
    let contextStr = "";
    if (documents && documents.length > 0) {
      contextStr = documents
        .map(
          (doc) =>
            `Title: ${doc.title}\nURL Path: ${doc.url_path}\nContent: ${doc.content}\n---`
        )
        .join("\n");
    } else {
      contextStr = "No specific site documentation found matching the query.";
    }

    // 4. Construct Prompt for the LLM
    const systemPrompt = `
You are the advanced Agentic RAG Chatbot for the Edura learning platform.
You assist users by answering questions and autonomously navigating them around the application.

Below is relevant context retrieved from the platform's database based on the user's query:
<CONTEXT>
${contextStr}
</CONTEXT>

INSTRUCTIONS:
1. Answer the user's query intelligently using the provided <CONTEXT>. 
2. If the user asks for a specific course, assignment, or tool (like the Focus Room), and it exists in the <CONTEXT>, you MUST immediately navigate them there.
3. You MUST ALWAYS return a raw JSON object (do not wrap in markdown \`\`\`json) with exactly two keys:
   - "reply": The conversational text you want to show the user.
   - "action": An optional object determining what the UI should do. Can be null if simply chatting.

ACTION PAYLOAD EXAMPLES:
If recommending the python course from context:
{
  "reply": "I highly recommend the Python for Beginners course! I'll take you there right now.",
  "action": {
    "type": "navigate",
    "path": "/courses/ext-1"
  }
}

If just answering a general question:
{
  "reply": "A Pomodoro timer usually consists of 25 minutes of work followed by a 5-minute break. You can try this in our Focus Room if you like!",
  "action": null
}

Do NOT use markdown code blocks (\`\`\`). Output valid JSON only.
`;

    // 5. Build conversation history
    const contents = [];
    if (history && Array.isArray(history)) {
      history.forEach((msg) => {
        contents.push({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        });
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }]
    });

    // We inject the system prompt as a developer instruction if using Gemini API properly, 
    // but for simplicity via REST, we often prepend it to the very first user message.
    if (contents.length > 0) {
       contents[0].parts[0].text = systemPrompt + "\n\nUser Query: " + contents[0].parts[0].text;
    } else {
        contents.push({ role: 'user', parts: [{ text: systemPrompt + "\n\nUser Query: " + message }]});
    }

    // 6. Call Gemini 3 Flash Preview
    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json"
          },
        }),
      }
    );

    const geminiData = await geminiRes.json();
    if (geminiData.error) throw new Error(geminiData.error.message);

    const rawText = geminiData.candidates[0].content.parts[0].text;
    
    // Attempt to parse JSON
    let resultJson;
    try {
      resultJson = JSON.parse(rawText.trim());
    } catch (e) {
      console.error("Failed to parse Gemini output as JSON:", rawText);
      resultJson = {
        reply: rawText,
        action: null
      };
    }

    return new Response(JSON.stringify(resultJson), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
