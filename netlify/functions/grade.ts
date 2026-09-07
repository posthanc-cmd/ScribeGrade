import { Handler } from '@netlify/functions';
import { GoogleGenAI, Type } from '@google/genai';

export const handler: Handler = async (event, context) => {
  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { images, language } = body;
    const apiKey = event.headers['x-api-key'] || event.headers['X-Api-Key'];

    if (!apiKey) {
      return { statusCode: 401, body: JSON.stringify({ error: 'API key is required' }) };
    }
    if (!images || !images.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'At least one file is required' }) };
    }

    // Initialize Gemini with the client-provided key
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build-netlify',
        },
      },
    });

    const parts = images.map((dataUrl: string) => {
      // match data URL format: data:[<mediatype>][;base64],<data>
      const match = dataUrl.match(/^data:(.*?);base64,(.*)$/);
      if (match) {
        return {
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        };
      }
      // Fallback for missing prefix, assuming image/jpeg
      return {
        inlineData: {
          mimeType: 'image/jpeg',
          data: dataUrl.replace(/^data:image\/\w+;base64,/, ''),
        },
      };
    });

    const langName = language === 'es' ? 'Spanish' : 'English';

    const promptText = `You are a strict, highly experienced science teacher grading a student's science workbook (provided as images or a PDF).
    
CRITICAL INSTRUCTIONS FOR GRADING (SPEED OPTIMIZED):
1. EXTRACT AND GRADE: For EVERY question where the student has provided an answer, extract it and grade it (0-10) against standard expected curriculum.
2. BE EXTREMELY CONCISE: To minimize latency, keep 'feedback' very short (1 sentence max).
3. SKIP REWRITES FOR HIGH SCORES: Only provide a 'rewrittenAnswer' if the score is below 8.0. Otherwise, leave it completely empty.

Grading Rules:
- Provide an overall score between 0.0 and 10.0.
- For each section, assign a score out of 10.
- Language of the output report MUST BE in ${langName}.`;

    parts.push({ text: promptText });

    let response;
    let retries = 5;
    let delay = 2000;

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: { parts },
          config: {
            maxOutputTokens: 8192,
            temperature: 0.2,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                overallScore: {
                  type: Type.NUMBER,
                  description: 'Overall score from 6.0 to 10.0',
                },
                feedbackSummary: {
                  type: Type.STRING,
                  description: "A summary of the student's performance.",
                },
                sections: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      sectionName: {
                        type: Type.STRING,
                        description: 'Question or section identifier.',
                      },
                      originalAnswer: {
                        type: Type.STRING,
                        description: "The student's original handwritten answer.",
                      },
                      rewrittenAnswer: {
                        type: Type.STRING,
                        description: 'The answer rewritten at a 6th-grade level if needed. Otherwise, leave empty or provide a model answer.',
                      },
                      score: {
                        type: Type.NUMBER,
                        description: 'Score for this section (6.0 to 10.0).',
                      },
                      feedback: {
                        type: Type.STRING,
                        description: 'Specific feedback for this section.',
                      },
                    },
                    required: ['sectionName', 'originalAnswer', 'rewrittenAnswer', 'score', 'feedback'],
                  },
                },
              },
              required: ['overallScore', 'feedbackSummary', 'sections'],
            },
          },
        });
        break; // Success, exit retry loop
      } catch (error: any) {
        retries--;
        console.warn(`API call failed. Retries left: ${retries}. Error:`, error.message);
        
        if (retries === 0) {
           throw error;
        }
        
        const isCapacityError = error.message && (error.message.includes('503') || error.message.includes('429'));
        const currentDelay = isCapacityError ? delay * 2 : delay;
        
        await new Promise(resolve => setTimeout(resolve, currentDelay));
        delay *= 1.5; // Exponential backoff
      }
    }

    if (!response) {
       throw new Error('Failed to get response after multiple retries.');
    }

    const resultText = response.text;
    if (!resultText) {
      throw new Error('No response from AI');
    }

    const result = JSON.parse(resultText);
    return {
      statusCode: 200,
      body: JSON.stringify(result)
    };
  } catch (error: any) {
    console.error('Grading error:', error);
    
    let errorMessage = 'An unexpected error occurred while processing the workbook. Please try again.';
    const rawError = error?.message || '';
    
    if (rawError.includes('503')) {
        errorMessage = "The AI service is currently experiencing high demand. We've automatically retried, but it's still busy. Please try again in a few minutes.";
    } else if (rawError.includes('429')) {
        errorMessage = 'Your API key has exceeded its rate limit or quota. Please try again later or check your Google Cloud Console.';
    } else if (rawError.includes('API_KEY_INVALID') || rawError.includes('API key not valid')) {
        errorMessage = 'The provided API key is invalid. Please check your key and try again.';
    } else if (rawError.includes('400') || rawError.includes('invalid argument')) {
        errorMessage = 'The document was too large or complex to process in one request. Try scanning fewer pages at a time.';
    }
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: errorMessage })
    };
  }
};
