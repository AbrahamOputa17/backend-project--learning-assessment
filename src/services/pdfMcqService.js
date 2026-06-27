const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');
const AppError = require('../utils/AppError');

/**
 * Resolve pdf-parse regardless of whether it ships as CJS or ESM.
 */
async function getPdfParser() {
  try {
    const mod = require('pdf-parse');
    if (typeof mod === 'function') return mod;
    if (mod && typeof mod.PDFParse === 'function') {
      return async (buffer) => {
        const instance = new mod.PDFParse(new Uint8Array(buffer));
        const res = await instance.getText();
        let text = '';
        if (typeof res === 'string') {
          text = res;
        } else if (res && typeof res.text === 'string') {
          text = res.text;
        } else if (res && typeof res === 'object') {
          text = Object.values(res).filter(v => typeof v === 'string').join('\n');
        }
        return { text };
      };
    }
    if (mod && typeof mod.default === 'function') return mod.default;
  } catch { /* fall through */ }

  try {
    const mod = await import('pdf-parse');
    if (typeof mod.default === 'function') return mod.default;
    if (typeof mod.PDFParse === 'function') {
      return async (buffer) => {
        const instance = new mod.PDFParse(new Uint8Array(buffer));
        const res = await instance.getText();
        let text = '';
        if (typeof res === 'string') {
          text = res;
        } else if (res && typeof res.text === 'string') {
          text = res.text;
        } else if (res && typeof res === 'object') {
          text = Object.values(res).filter(v => typeof v === 'string').join('\n');
        }
        return { text };
      };
    }
    if (typeof mod === 'function') return mod;
  } catch { /* fall through */ }

  throw new AppError('PDF parsing library failed to load. Please restart the server.', 500);
}

const PdfMcqService = {
  /**
   * Robustly extract JSON from AI response.
   */
  _extractJson(text) {
    if (!text) return null;
    let jsonString = text.trim();
    
    // 1. Try to find code fences
    const fenceMatch = jsonString.match(/```(?:json)?\n?([\s\S]*?)\n?```/);
    if (fenceMatch) {
      jsonString = fenceMatch[1].trim();
    } else {
      // 2. Try to find the first '{' and last '}'
      const start = jsonString.indexOf('{');
      const end = jsonString.lastIndexOf('}');
      if (start !== -1 && end !== -1) {
        jsonString = jsonString.slice(start, end + 1);
      }
    }
    
    try {
      return JSON.parse(jsonString);
    } catch (err) {
      console.error('AI JSON Parse Error:', err.message, '\nOriginal Text:', text);
      return null;
    }
  },

  /**
   * Generate MCQs from PDF.
   */
  async generateMcqFromPdf(pdfBuffer, questionCount = 5) {
    if (!config.google.apiKey) throw new AppError('AI missing API key', 503);

    const count = Math.min(Math.max(Math.floor(questionCount), 1), 30);
    const pdfParse = await getPdfParser();
    const pdfData = await pdfParse(pdfBuffer);
    const rawText = pdfData.text?.trim();
    if (!rawText) throw new AppError('Could not extract text from PDF', 422);

    const charLimit = Math.min(8000 + count * 400, 24000);
    const excerpt = rawText.slice(0, charLimit);

    const genAI = new GoogleGenerativeAI(config.google.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ]
    });

    const prompt = `You are an expert quiz generator. Generate exactly ${count} multiple-choice questions from the content below.
Return ONLY valid JSON.
 
JSON shape:
{
  "questions": [
    {
      "questionText": "string",
      "explanation": "string",
      "points": 1,
      "options": [
        { "optionText": "string", "isCorrect": boolean }
      ]
    }
  ]
}
 
Content:
${excerpt}`;

    const result = await model.generateContent(prompt);
    const parsed = this._extractJson(result.response.text());

    if (!parsed || !Array.isArray(parsed.questions)) {
      throw new AppError('AI returned an unexpected format. Please try again.', 502);
    }

    return parsed.questions.map((q, idx) => ({
      id: `generated-${idx}`,
      questionText: q.questionText || `Question ${idx + 1}`,
      explanation: q.explanation || '',
      points: Number(q.points) || 1,
      options: (q.options || []).map((o, oi) => ({
        id: `generated-${idx}-opt-${oi}`,
        optionText: o.optionText || `Option ${oi + 1}`,
        isCorrect: !!o.isCorrect,
      })),
    }));
  },

  /**
   * Generate Course Outline from PDF.
   */
  async generateCourseOutline(pdfBuffer) {
    if (!config.google.apiKey) throw new AppError('AI missing API key', 503);

    const pdfParse = await getPdfParser();
    const pdfData = await pdfParse(pdfBuffer);
    const rawText = pdfData.text?.trim();
    if (!rawText) throw new AppError('Could not read PDF content', 422);

    const excerpt = rawText.slice(0, 15000);

    const genAI = new GoogleGenerativeAI(config.google.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ]
    });

    const prompt = `Break down the educational content below into a structured course outline with modules and lessons.
Return ONLY valid JSON.
 
JSON shape:
{
  "outline": [
    {
      "moduleTitle": "string",
      "lessons": [
        { "title": "string", "contentSummary": "string" }
      ]
    }
  ]
}
 
Content:
${excerpt}`;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // Diagnostic logging
    const fs = require('fs');
    const logMsg = `\n--- OUTLINE DEBUG ${new Date().toISOString()} ---\nRAW RESPONSE:\n${responseText}\n-----------------------\n`;
    fs.appendFileSync('ai_debug.log', logMsg);

    const parsed = this._extractJson(responseText);

    if (!parsed || !Array.isArray(parsed.outline)) {
      throw new AppError(`AI failed to generate a valid course outline. (Response length: ${responseText.length} chars)`, 502);
    }

    return parsed.outline;
  },

  /**
   * Generate Coding Challenge from a text prompt (Lecturer request).
   */
  async generateCodingQuestionFromPrompt(userRequest) {
    if (!config.google.apiKey) throw new AppError('AI missing API key', 503);

    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(config.google.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ]
    });

    const prompt = `Create a professional coding challenge for students based on this request from a lecturer: "${userRequest}".
Return ONLY valid JSON.
The challenge should be solvable in Node.js (JavaScript).
 
JSON shape:
{
  "title": "string",
  "description": "string (Detailed markdown including examples and constraints)",
  "starterCode": "string (Function signature and maybe some comments)",
  "solutionCode": "string (Correct working implementation)",
  "language": "javascript",
  "difficulty": "medium",
  "points": 10,
  "testCases": [
     { "input": "string (args separated by newline if multiple)", "expectedOutput": "string", "isHidden": boolean }
  ]
}
  
Return ONLY the JSON.`;

    let result;
    try {
      result = await model.generateContent(prompt);
    } catch (err) {
      // Manual retry once if 503
      if (err.message.includes('503')) {
        await new Promise(r => setTimeout(r, 2000));
        result = await model.generateContent(prompt);
      } else {
        throw err;
      }
    }
    const parsed = this._extractJson(result.response.text());

    if (!parsed || !parsed.title) {
      throw new AppError('AI failed to generate a valid coding challenge from your request.', 502);
    }

    return parsed;
  },

  /**
   * Generate a full tutorial/lecture for a specific module.
   */
  async generateFullLecture(pdfBuffer, moduleTitle, moduleSummary) {
    if (!config.google.apiKey) throw new AppError('AI missing API key', 503);

    const pdfParse = await getPdfParser();
    const pdfData = await pdfParse(pdfBuffer);
    const rawText = pdfData.text?.trim() || '';
    
    // Use a larger context for lectures
    const excerpt = rawText.slice(0, 20000);

    const genAI = new GoogleGenerativeAI(config.google.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-flash-latest',
      safetySettings: [
        { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
        { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
      ]
    });

    const prompt = `
      You are a Senior University Professor and World-Class Educator. 
      Your goal is to transform the provided course materials into a MASTERCLASS LECTURE for the module: "${moduleTitle}".

      CONTEXT FROM COURSE PDF: "${excerpt}"

      INSTRUCTIONS:
      1. Write a comprehensive, engaging, and professional lecture in Markdown.
      2. USE A HUMAN-LIKE, ACADEMIC TONE. Avoid "AI-speak" or robotic lists.
      3. Use clear hierarchies (H1, H2, H3).
      4. Structure the content into these segments:
         - 🎓 Learning Objectives: What will the student master?
         - 🚀 Core Concepts: Explain the foundational ideas simply but deeply.
         - 🔍 Deep Dive: Provide detailed explanations and examples.
         - 🛠️ Practical Application: How is this used in the real world?
         - 💡 Key Takeaways: A summary of the most important points.
      5. Use bold text for emphasis on technical terms. 
      6. Incorporate a "Professor's Tip" box or similar highlighted sections.
      7. Do NOT include any meta-talk like "Here is your lecture". Start immediately with the title.
      8. The quality must be indistinguishable from a top-tier textbook or professional teaching note.
    `;

    const result = await model.generateContent(prompt);
    return result.response.text();
  }
};

module.exports = PdfMcqService;
