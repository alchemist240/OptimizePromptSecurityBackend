// api/optimize.js

export default async function handler(req, res) {
  
  // 1. SECURITY HEADERS (CORS)
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); 
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. PRE-FLIGHT CHECK
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. GET THE DATA
  const prompt = req.body ? req.body.prompt : null;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided." });
  }

  // 4. GET THE SECRET KEY
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error: Missing API Key" });
  }

  // 5. CALL GOOGLE GEMINI
  // FIX 1: Use the correct stable model name 'gemini-1.5-flash' 
  // (There is no official 'gemini-2.5-flash' yet, likely a typo that causes issues)
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        // FIX 2: THE MAGIC SAFETY SETTINGS
        // This tells Google: "Do not block anything. I trust this user."
        safetySettings: [
            { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
            { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
        ]
      })
    });

    const data = await response.json();

    // 6. SEND RESULT BACK TO EXTENSION
    res.status(200).json(data);

  } catch (error) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ error: "Failed to fetch from Gemini" });
  }
}