import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      throw new Error("No image provided");
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    console.log("Analyzing frame for clothing detection...");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Analyze this camera frame and determine if it contains a CLEAR, WELL-VISIBLE clothing item that can be properly captured.

Respond with a JSON object (no markdown) with these fields:
- "ready": boolean - true ONLY if there is a single, clear clothing item that is:
  * Well-lit and in focus
  * Mostly visible in the frame (not cut off significantly)
  * The main subject of the image
  * A recognizable clothing article (shirt, pants, dress, jacket, shoes, etc.)
- "confidence": number 0-100 - how confident you are about the detection
- "feedback": string - brief feedback for the user (e.g., "Move closer", "Hold steady", "Good - capturing!", "No clothing detected")
- "clothing_type": string or null - what type of clothing is detected (e.g., "t-shirt", "jeans", "dress")

Be strict - only return ready:true when the clothing item is clearly visible and would make a good closet photo.`
              },
              {
                type: "image_url",
                image_url: {
                  url: imageBase64
                }
              }
            ]
          }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded", ready: false, feedback: "Please wait a moment..." }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";
    
    console.log("Detection response:", content);

    // Parse the JSON response
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanContent);
      
      return new Response(
        JSON.stringify({
          ready: result.ready === true,
          confidence: result.confidence || 0,
          feedback: result.feedback || "Scanning...",
          clothing_type: result.clothing_type || null
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      return new Response(
        JSON.stringify({ ready: false, confidence: 0, feedback: "Scanning...", clothing_type: null }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

  } catch (error) {
    console.error("Error in detect-clothing:", error);
    return new Response(
      JSON.stringify({ ready: false, confidence: 0, feedback: "Error scanning", clothing_type: null }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
