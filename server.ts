import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit for base64 images and PDFs
  app.use(express.json({ limit: "200mb" }));

  // API route for grading
  app.post("/api/grade", async (req, res) => {
    try {
      const { images, language } = req.body;
      const apiKey = req.headers["x-api-key"] as string;

      if (!apiKey) {
        return res.status(401).json({ error: "API key is required" });
      }
      if (!images || !images.length) {
        return res.status(400).json({ error: "At least one file is required" });
      }

      // Initialize Gemini with the client-provided key
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
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
            mimeType: "image/jpeg",
            data: dataUrl.replace(/^data:image\/\w+;base64,/, ""),
          },
        };
      });

      const langName = language === "es" ? "Spanish" : "English";

      const promptText = `You are a strict, highly experienced science teacher grading a student's science workbook (provided as images or a PDF).
      
CRITICAL INSTRUCTIONS FOR GRADING (SPEED OPTIMIZED & DETERMINISTIC):
1. EXTRACT AND GRADE: For EVERY question where the student has provided an answer, extract it and grade it (6.0-10.0) against standard expected curriculum.
2. BE EXTREMELY CONCISE: To minimize latency, keep 'feedback' very short (1 sentence max).
3. SKIP REWRITES FOR HIGH SCORES: Only provide a 'rewrittenAnswer' if the score is below 8.0. Otherwise, leave it completely empty.
4. BE DETERMINISTIC: You must be highly consistent. If given the same answer, always give the exact same score.

STRICT GRADING RUBRIC (6.0 to 10.0):
- 10.0: Perfect. Factual, complete, and conceptually flawless.
- 9.0 - 9.5: Good. Minor details missing but conceptually correct.
- 8.0 - 8.5: Partial. Mentions some correct keywords but explanation is flawed or incomplete.
- 7.0 - 7.5: Incorrect. Fundamentally misunderstands the science concept.
- 6.0: Blank, completely irrelevant, or illegible. (Lowest possible score).

Grading Rules:
- Provide an overall score between 6.0 and 10.0.
- For each section, assign a score between 6.0 and 10.0 based EXACTLY on the rubric above.
- Language of the output report MUST BE in \${langName}.`;

      parts.push({ text: promptText });

      let response;
      let retries = 5; 
      let delay = 2000; // Drastically reduced base delay from 8000 to 2000 for faster retry loops

      while (retries > 0) {
        try {
          response = await ai.models.generateContent({
            model: "gemini-3.1-flash-lite",
            contents: { parts },
            config: {
              maxOutputTokens: 8192,
              temperature: 0.0,
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  overallScore: {
                    type: Type.NUMBER,
                    description: "Overall score from 6.0 to 10.0",
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
                          description: "Question or section identifier.",
                        },
                        originalAnswer: {
                          type: Type.STRING,
                          description: "The student's original handwritten answer.",
                        },
                        rewrittenAnswer: {
                          type: Type.STRING,
                          description: "The answer rewritten at a 6th-grade level if needed. Otherwise, leave empty or provide a model answer.",
                        },
                        score: {
                          type: Type.NUMBER,
                          description: "Score for this section (6.0 to 10.0).",
                        },
                        feedback: {
                          type: Type.STRING,
                          description: "Specific feedback for this section.",
                        },
                      },
                      required: ["sectionName", "originalAnswer", "rewrittenAnswer", "score", "feedback"],
                    },
                  },
                },
                required: ["overallScore", "feedbackSummary", "sections"],
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
          
          // If it's a 503 or 429, back off significantly more
          const isCapacityError = error.message && (error.message.includes("503") || error.message.includes("429"));
          const currentDelay = isCapacityError ? delay * 2 : delay;
          
          console.log(`Waiting ${currentDelay}ms before retry...`);
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, currentDelay));
          delay *= 1.5; // Exponential backoff
        }
      }

      if (!response) {
         throw new Error("Failed to get response after multiple retries.");
      }

      const resultText = response.text;
      if (!resultText) {
        throw new Error("No response from AI");
      }

      const result = JSON.parse(resultText);
      res.json(result);
    } catch (error: any) {
      console.error("Grading error:", error);
      
      let errorMessage = "An unexpected error occurred while processing the workbook. Please try again.";
      const rawError = error?.message || "";
      
      // Parse specific Google API errors if possible to make them friendlier
      if (rawError.includes("503")) {
          errorMessage = "The AI service is currently experiencing high demand. We've automatically retried, but it's still busy. Please try again in a few minutes.";
      } else if (rawError.includes("429")) {
          errorMessage = "Your API key has exceeded its rate limit or quota. Please try again later or check your Google Cloud Console.";
      } else if (rawError.includes("API_KEY_INVALID") || rawError.includes("API key not valid")) {
          errorMessage = "The provided API key is invalid. Please check your key and try again.";
      } else if (rawError.includes("400") || rawError.includes("invalid argument")) {
          errorMessage = "The document was too large or complex to process in one request. Try scanning fewer pages at a time.";
      }
      
      res.status(500).json({ error: errorMessage });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // Global error handler to catch body-parser errors (like Payload Too Large)
  // and ensure they are returned as JSON instead of HTML.
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error("Express Middleware Error:", err);
    if (err.type === 'entity.too.large') {
      res.status(413).json({ error: "The uploaded files are too large. Please try uploading fewer pages at a time." });
    } else {
      res.status(500).json({ error: err.message || "Internal server error" });
    }
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log("Server running on port " + PORT);
  });
}

startServer();
