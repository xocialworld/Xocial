import { config } from 'dotenv';
import { join } from 'path';

// Load env vars first
config({ path: join(__dirname, '../.env.local') });

async function main() {
  console.log('🧪 Testing AI Generation (Real Mode)...');
  
  // Manually check for either key
  if (!process.env.VERCEL_AI_GATEWAY_API_KEY && !process.env.OPENAI_API_KEY) {
    console.error('❌ Neither VERCEL_AI_GATEWAY_API_KEY nor OPENAI_API_KEY is present.');
    process.exit(1);
  }

  if (process.env.OPENAI_API_KEY) {
    console.log('ℹ️ Using OPENAI_API_KEY');
  } else {
    console.log('ℹ️ Using VERCEL_AI_GATEWAY_API_KEY');
  }

  try {
    // Dynamic import after env is loaded
    const { generateContent } = await import('../src/lib/openai/index');

    const result = await generateContent({
      prompt: "Write a short post about launching a new coffee brand called 'Morning Star'.",
      platforms: ['twitter', 'instagram'],
      tone: 'enthusiastic',
      length: 'short',
      addHashtags: true
    });

    console.log('\n✅ AI Generation Successful!');
    console.log(JSON.stringify(result, null, 2));
  } catch (error: any) {
    console.error('\n❌ AI Generation Failed:', error.message);
    if (error.message.includes('credit card') || error.message.includes('402')) {
        console.log('\n💡 TIP: The Vercel AI Gateway requires a credit card. You can switch to a direct OpenAI Key by adding OPENAI_API_KEY to your .env.local file.');
    }
  }
}

main();
