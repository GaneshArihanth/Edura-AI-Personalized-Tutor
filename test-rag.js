import dotenv from 'dotenv';
dotenv.config();
fetch(process.env.VITE_SUPABASE_URL + "/functions/v1/chat-agent-rag", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": "Bearer " + process.env.VITE_SUPABASE_ANON_KEY },
  body: JSON.stringify({ message: "I want to learn python, do you have any assignments?", history: [] })
}).then(r => r.json()).then(console.log).catch(console.error);
