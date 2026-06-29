const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    const result = await model.generateContent("hello");
    console.log('Success with gemini-1.5-flash');
  } catch (err) {
    console.log('Failed with gemini-1.5-flash:', err.message);
    
    try {
        const model3 = genAI.getGenerativeModel({ model: 'gemini-pro' });
        const result3 = await model3.generateContent("hello");
        console.log('Success with gemini-pro');
    } catch (err3) {
        console.log('Failed with gemini-pro:', err3.message);
    }

  }
}
test();
