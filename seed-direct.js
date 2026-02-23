import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config();

const geminiApiKey = process.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(geminiApiKey);
const embedModel = genAI.getGenerativeModel({ model: "gemini-embedding-001" });

async function generateEmbedding(text) {
  const result = await embedModel.embedContent(text);
  return result.embedding.values;
}

const documentsToSeed = [
    { url_path: '/courses/ext-1', title: 'Python for Beginners', content_type: 'course', content: 'Learn python basics.' },
    { url_path: '/courses/python-assignment', title: 'Python Assignment: Build a Calculator', content_type: 'assignment', content: 'Build a calculator.' },
    { url_path: '/focus', title: 'Focus Room (Pomodoro Timer)', content_type: 'page', content: 'The Focus Room is an immersive study environment.' },
    { url_path: '/dashboard', title: 'Dashboard', content_type: 'page', content: 'Your student dashboard.' }
];

async function main() {
    let sqlOutput = `-- Auto-generated RAG Seed Script\n`;
    console.log("Generating 3072-dimension vectors...");
    
    for(const doc of documentsToSeed) {
        process.stdout.write(`Embedding ${doc.title}... `);
        const textToEmbed = `${doc.title}\n${doc.content}\n${doc.content_type}`;
        try {
            const emb = await generateEmbedding(textToEmbed);
            sqlOutput += `INSERT INTO site_rag_documents (url_path, title, content, content_type, embedding) VALUES ('${doc.url_path}', '${doc.title}', '${doc.content}', '${doc.content_type}', '[${emb.join(',')}]');\n`;
            console.log("Done.");
        } catch (e) {
            console.log("Failed:", e.message);
        }
    }
    
    fs.writeFileSync('seed.sql', sqlOutput);
    console.log("Finished generating seed.sql!");
}
main();
