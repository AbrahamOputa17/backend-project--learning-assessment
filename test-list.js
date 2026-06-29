const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function listModels() {
  try {
    // Note: The SDK might not have a direct listModels, but we can try fetching 
    // or just checking common names
    const models = ['gemini-1.5-flash', 'gemini-1.5-flash-latest', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro'];
    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            await model.generateContent("test");
            console.log('AVAILABLE:', m);
        } catch (e) {
            console.log('NOT AVAILABLE:', m, e.message);
        }
    }
  } catch (err) {
    console.log('Error:', err);
  }
}
listModels();
