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

    console.log("Processing image for background removal...");

    // Use Gemini's image generation to extract just the clothing item
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ONLY the single main clothing item (shirt, pants, dress, jacket, shoes, etc.) from this image. Follow these rules strictly:\n\n1. REMOVE COMPLETELY: background, people's body parts (hands, feet, arms, legs, torso), plants, furniture, hangers, mannequins, and ALL other objects\n2. KEEP ONLY: The single main clothing article with all its details, colors, and textures preserved\n3. ORIENTATION: Rotate the clothing item so it appears upright and properly oriented (e.g., shirts should have collar at top, pants should have waistband at top)\n4. BACKGROUND: Output must have a pure white (#FFFFFF) background - not transparent, not gray, pure white\n5. CENTERING: Center the clothing item in the frame with some padding around it\n\nThe final image should look like a professional product photo of just the clothing item on a clean white background."
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
        modalities: ["image", "text"]
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    console.log("AI response received");

    const extractedImage = data.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    
    if (!extractedImage) {
      throw new Error("No image returned from AI");
    }

    return new Response(
      JSON.stringify({ image: extractedImage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in remove-background:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
