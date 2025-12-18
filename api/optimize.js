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

  // 3. GET THE DATA (Safely!)
  // OLD CODE (Crashed): const { prompt } = req.body;
  // NEW CODE (Safe): Check if body exists first
  const prompt = req.body ? req.body.prompt : null;

  if (!prompt) {
    // If you visit this in a browser, you will see this error. That is normal!
    return res.status(400).json({ error: "No prompt provided. (Browser access usually fails because it sends no body)." });
  }

  // 4. GET THE SECRET KEY
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error: Missing API Key" });
  }

  // 5. CALL GOOGLE GEMINI
  // Note: Switched to 'gemini-1.5-flash' for maximum stability and speed
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-exp:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
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