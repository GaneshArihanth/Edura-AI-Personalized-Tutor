import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error, count } = await supabase.from("site_rag_documents").select("title, url_path", { count: "exact" });
  console.log("USING KEY:", process.env.SUPABASE_SERVICE_ROLE_KEY ? "SERVICE_ROLE" : "ANON");
  console.log("ROW COUNT:", count);
  console.log("DATA:", data);
  console.log("ERROR:", error);
}
main();
