// api/optimize.js

export default async function handler(req, res) {
  
  // ---------------------------------------------------------------------------
  // 1. SECURITY HEADERS (CORS)
  // ---------------------------------------------------------------------------
  // Essential for Chrome Extensions to talk to Vercel
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // ---------------------------------------------------------------------------
  // 2. PRE-FLIGHT CHECK
  // ---------------------------------------------------------------------------
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // ---------------------------------------------------------------------------
  // 3. EXTRACT PROMPT (Safely)
  // ---------------------------------------------------------------------------
  // Check if body exists first to prevent crashes on browser refresh
  const prompt = req.body ? req.body.prompt : null;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided. (Browser access usually fails because it sends no body)." });
  }

  // ---------------------------------------------------------------------------
  // 4. DVYRA CONFIGURATION
  // ---------------------------------------------------------------------------
  // We use your Master Key from Vercel Environment Variables
  const dvyraKey = process.env.LITELLM_MASTER_KEY;
  const dvyraUrl = "https://dominator2414-unified-dvyra.hf.space/v1/chat/completions";
  
  // 'gemini-lite' should be defined in your Dvyra config.yaml (with fallbacks!)
  const MODEL_ID = "llama-8b"; 

  if (!dvyraKey) {
    return res.status(500).json({ error: "Server configuration error: Missing LITELLM_MASTER_KEY" });
  }

  // ---------------------------------------------------------------------------
  // 5. CALL DVYRA (THE GATEWAY)
  // ---------------------------------------------------------------------------
  try {
    const response = await fetch(dvyraUrl, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${dvyraKey}` // Dvyra acts like OpenAI
      },
      body: JSON.stringify({
        model: MODEL_ID,
        // The extension sends a massive "System Prompt" block as the user message.
        messages: [
          { role: "user", content: prompt } 
        ],
        temperature: 0.7 
      })
    });

    const data = await response.json();

    // Check for Gateway Errors (Dvyra or Upstream)
    if (!response.ok) {
        console.error("Dvyra Error:", data);
        throw new Error(data.error?.message || "Gateway Error");
    }

    // ---------------------------------------------------------------------------
    // 6. THE TRANSLATION LAYER (CRITICAL)
    // Convert OpenAI format (from Dvyra) -> Gemini format (for Extension)
    // ---------------------------------------------------------------------------
    
    // SAFE EXTRACTION: Prevents crash if 'choices' array is empty or malformed
    // Uses optional chaining (?.) and provides a fallback
    const optimizedText = data.choices?.[0]?.message?.content || "";

    if (!optimizedText) {
        throw new Error("Received empty response from AI model.");
    }

    // Reconstruct the legacy JSON shape your extension expects
    const legacyPayload = {
        candidates: [
            {
                content: {
                    parts: [
                        { text: optimizedText }
                    ]
                }
            }
        ]
    };

    // ---------------------------------------------------------------------------
    // 7. SEND RESULT BACK TO EXTENSION
    // ---------------------------------------------------------------------------
    res.status(200).json(legacyPayload);

  } catch (error) {
    console.error("Rate Limit or Gateway Error:", error);
    
    // Return the SPECIFIC error message your Extension listens for to show the "Rate Limit" toast.
    // This ensures that even if Dvyra fails completely, the user gets a clean error message.
    res.status(500).json({ 
        error: "Kshitij AI Rate Limiter Activated : (CODE- KS874): Activity suspended due to heavy global usage!! Please try again after 5 mins." 
    });
  }
}