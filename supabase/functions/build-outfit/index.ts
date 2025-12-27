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
    const { userId, anchorItemId } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!userId || !anchorItemId) {
      return new Response(JSON.stringify({ error: "Missing userId or anchorItemId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the anchor item
    const { data: anchorItem, error: anchorError } = await supabase
      .from("closet_items")
      .select("*")
      .eq("id", anchorItemId)
      .eq("user_id", userId)
      .single();

    if (anchorError || !anchorItem) {
      return new Response(JSON.stringify({ error: "Anchor item not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch all user's closet items (excluding the anchor and underwear)
    const { data: items, error: itemsError } = await supabase
      .from("closet_items")
      .select("*")
      .eq("user_id", userId)
      .neq("id", anchorItemId)
      .neq("category", "underwear");

    if (itemsError) throw itemsError;

    // Categorize items
    const tops = items.filter((i: any) => i.category === "tops");
    const bottoms = items.filter((i: any) => i.category === "bottoms");
    const shoes = items.filter((i: any) => i.category === "shoes");
    const outerwear = items.filter((i: any) => i.category === "outerwear");
    const accessories = items.filter((i: any) => i.category === "accessories");

    // Build item summaries for the prompt
    const itemSummary = (arr: any[]) =>
      arr.map((i: any) => `${i.id}: ${i.subtype || i.category} (${i.primary_color || 'unknown color'}, ${i.dress_level || 'unknown style'})`).join("\n");

    const anchorSummary = `${anchorItem.subtype || anchorItem.category} (${anchorItem.primary_color || 'unknown color'}, ${anchorItem.dress_level || 'unknown style'})`;

    // Determine what slots we need to fill based on anchor category
    const anchorCategory = anchorItem.category;
    const needTop = anchorCategory !== "tops";
    const needBottom = anchorCategory !== "bottoms";
    const needShoes = anchorCategory !== "shoes";

    // Check if we have enough items
    const missingItems: string[] = [];
    if (needTop && tops.length === 0) missingItems.push("tops");
    if (needBottom && bottoms.length === 0) missingItems.push("bottoms");
    if (needShoes && shoes.length === 0) missingItems.push("shoes");

    const prompt = `You are a men's fashion stylist. Create a cohesive outfit built around this anchor item:

ANCHOR ITEM (${anchorCategory}):
${anchorSummary}

The user wants to build an outfit around this piece. Select items that complement it.

${needTop ? `AVAILABLE TOPS:\n${tops.length > 0 ? itemSummary(tops) : "NO TOPS IN CLOSET - Suggest a purchase"}` : ""}

${needBottom ? `AVAILABLE BOTTOMS:\n${bottoms.length > 0 ? itemSummary(bottoms) : "NO BOTTOMS IN CLOSET - Suggest a purchase"}` : ""}

${needShoes ? `AVAILABLE SHOES:\n${shoes.length > 0 ? itemSummary(shoes) : "NO SHOES IN CLOSET - Suggest a purchase"}` : ""}

${outerwear.length > 0 ? `OUTERWEAR (optional):\n${itemSummary(outerwear)}` : ""}

${accessories.length > 0 ? `ACCESSORIES (optional, pick 0-2):\n${itemSummary(accessories)}` : ""}

Return JSON with:
- closet_picks: object with keys for each slot (top, bottom, shoes, outerwear, accessories) containing item IDs from the user's closet. Use null if not selecting for that slot. accessories should be an array.
- shopping_suggestions: array of objects with { category, description, color, style, reasoning } for items the user should consider buying to complete or enhance the outfit. Include suggestions if the user is missing essential categories or if a purchase would significantly improve the outfit.
- outfit_reasoning: a brief explanation of why these items work together (1-2 sentences)
- style_notes: any styling tips for wearing this outfit

Make sure colors complement each other and dress levels match the anchor item. Return ONLY valid JSON.`;

    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      throw new Error("AI service not configured");
    }

    console.log("Calling Lovable AI gateway for build-outfit...");
    console.log("Anchor item:", anchorItem.category, anchorItem.subtype);

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
    
    // Extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    const result = jsonMatch ? JSON.parse(jsonMatch[0]) : null;

    if (!result) {
      throw new Error("Failed to parse AI response");
    }

    return new Response(JSON.stringify({
      anchor_item: anchorItem,
      closet_picks: result.closet_picks || {},
      shopping_suggestions: result.shopping_suggestions || [],
      outfit_reasoning: result.outfit_reasoning || "",
      style_notes: result.style_notes || "",
    }), {
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
