import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch user's closet items
    const { data: items, error } = await supabase
      .from("closet_items")
      .select("*")
      .eq("user_id", userId)
      .neq("category", "underwear");

    if (error) throw error;

    const tops = items.filter((i: any) => i.category === "tops");
    const bottoms = items.filter((i: any) => i.category === "bottoms");
    const shoes = items.filter((i: any) => i.category === "shoes");
    const outerwear = items.filter((i: any) => i.category === "outerwear");
    const accessories = items.filter((i: any) => i.category === "accessories");

    if (!tops.length || !bottoms.length || !shoes.length) {
      return new Response(JSON.stringify({ error: "Missing required items" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build prompt with item summaries
    const itemSummary = (arr: any[], label: string) => 
      arr.map((i: any) => `${i.id}: ${i.subtype || i.category} (${i.primary_color || 'unknown'}, ${i.dress_level})`).join("\n");

    const prompt = `You are a men's fashion stylist. Create a cohesive outfit from these items.

TOPS:
${itemSummary(tops, "top")}

BOTTOMS:
${itemSummary(bottoms, "bottom")}

SHOES:
${itemSummary(shoes, "shoes")}

${outerwear.length ? `OUTERWEAR (optional):\n${itemSummary(outerwear, "outerwear")}` : ""}

${accessories.length ? `ACCESSORIES (optional, pick 0-2):\n${itemSummary(accessories, "accessory")}` : ""}

Return JSON with:
- top: item ID
- bottom: item ID  
- shoes: item ID
- mid_layer: item ID or null
- outerwear: item ID or null
- accessories: array of item IDs (0-2)
- reasoning: brief style explanation (1 sentence)

Ensure colors complement each other and dress levels match. Return ONLY JSON.`;

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    console.log("Calling Lovable AI gateway...");
    
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      
      if (response.status === 429) {
        throw new Error("Rate limit exceeded. Please try again in a moment.");
      }
      if (response.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue.");
      }
      throw new Error(`AI suggestion failed: ${response.status}`);
    }
    
    console.log("AI response received successfully");

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const outfit = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    return new Response(JSON.stringify({ outfit, reasoning: outfit?.reasoning }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
