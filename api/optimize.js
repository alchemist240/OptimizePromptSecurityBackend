// api/optimize.js

// This function runs on Vercel's computers whenever someone visits your URL.
export default async function handler(req, res) {
  
  // 1. SECURITY HEADERS (CORS)
  // This allows your Chrome Extension to talk to this server.
  // Without this, the browser will block the connection.
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*'); // '*' allows ANY site. For better security later, change '*' to your Extension ID.
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // 2. PRE-FLIGHT CHECK
  // Browsers sometimes send a "test" signal (OPTIONS) before the real data.
  // We need to say "OK" to that test.
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // 3. GET THE DATA
  // We expect the extension to send us JSON data looking like: { "prompt": "Fix this email..." }
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: "No prompt provided" });
  }

  // 4. GET THE SECRET KEY
  // process.env is how we read secrets stored in Vercel settings.
  // You do NOT paste the key here in the code!
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "Server configuration error: Missing API Key" });
  }

  // 5. CALL GOOGLE GEMINI
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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