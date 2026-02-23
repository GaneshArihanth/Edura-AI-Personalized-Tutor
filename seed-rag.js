import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY; 
const geminiApiKey = process.env.VITE_GEMINI_API_KEY;

if (!supabaseUrl || !supabaseKey || !geminiApiKey) {
  console.error("Missing required environment variables. Check your .env file.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Define some dummy pages and courses to act as our RAG context
const documentsToSeed = [
  {
    url_path: '/courses/ext-1',
    title: 'Python for Beginners',
    content_type: 'course',
    content: 'Learn the basics of Python programming. This course covers variables, loops, data structures, and basic algorithms. Perfect for someone starting their coding journey.',
  },
  {
    url_path: '/courses/advanced-react',
    title: 'Advanced React Patterns',
    content_type: 'course',
    content: 'Master React with advanced hooks, context API, Zustand state management, and performance optimization techniques like memoization.',
  },
  {
    url_path: '/courses/python-assignment',
    title: 'Python Assignment: Build a Calculator',
    content_type: 'assignment',
    content: 'Your task is to build a command-line calculator in Python that supports addition, subtraction, multiplication, and division. Due next Friday.',
  },
  {
    url_path: '/focus',
    title: 'Focus Room (Pomodoro Timer)',
    content_type: 'page',
    content: 'The Focus Room is an immersive study environment. It features a Pomodoro timer and ambient soundscapes like rain or coffee shop noises to help you concentrate.',
  },
  {
    url_path: '/community',
    title: 'Community Discussion Forum',
    content_type: 'page',
    content: 'Join the community forum to ask questions about your courses, answer peers, and find study groups.',
  },
  {
    url_path: '/dashboard',
    title: 'Student Dashboard',
    content: 'Your main dashboard where you can see your current XP, level, active study streaks, and resume your recent courses.',
  }
];

const genAI = new GoogleGenerativeAI(geminiApiKey);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function generateEmbedding(text) {
  const result = await embedModel.embedContent(text);
  return result.embedding.values;
}

// Ensure the Edge Function is authorized to execute this schema rebuild
const rebuildSchemaSQL = `
CREATE EXTENSION IF NOT EXISTS vector;
DROP FUNCTION IF EXISTS match_site_documents(vector(768), INT, FLOAT);
DROP FUNCTION IF EXISTS match_site_documents(vector(3072), INT, FLOAT);
DROP TABLE IF EXISTS site_rag_documents;

CREATE TABLE site_rag_documents (
  id BIGSERIAL PRIMARY KEY,
  url_path TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  content_type TEXT NOT NULL,
  embedding vector(3072)
);

ALTER TABLE site_rag_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all" ON site_rag_documents FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all" ON site_rag_documents FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all" ON site_rag_documents FOR UPDATE USING (true);
`;

async function main() {
  console.log('Seeding RAG documents into Supabase...');

  for (const doc of documentsToSeed) {
    console.log(`Generating embedding for: ${doc.title}...`);
    try {
      // Combine title and content for a richer embedding representation
      const textToEmbed = `${doc.title}\n\n${doc.content}\n\nType: ${doc.content_type}`;
      const embedding = await generateEmbedding(textToEmbed);

      let retryCount = 0;
      let success = false;
      while (retryCount < 3 && !success) {
        const { data, error } = await supabase
          .from('site_rag_documents')
          .upsert({
            url_path: doc.url_path,
            title: doc.title,
            content: doc.content,
            content_type: doc.content_type,
            embedding: embedding,
          }, { onConflict: 'url_path' });

        if (error) {
          if (error.code === 'PGRST205') {
            console.log(`Schema cache refreshing, waiting 5 seconds... (${retryCount + 1}/3)`);
            await new Promise(resolve => setTimeout(resolve, 5000));
            retryCount++;
          } else {
             console.error(`Error inserting ${doc.title}:`, error);
             break;
          }
        } else {
          console.log(`Successfully seeded: ${doc.title}`);
          success = true;
        }
      }
    } catch (err) {
      console.error(`Failed to seed ${doc.title}:`, err);
    }
  }
  console.log('Finished seeding documents.');
}

main();
