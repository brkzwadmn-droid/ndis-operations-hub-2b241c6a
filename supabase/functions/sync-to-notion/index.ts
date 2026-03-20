import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const NOTION_API_KEY = Deno.env.get("NOTION_API_KEY");
    if (!NOTION_API_KEY) {
      return new Response(
        JSON.stringify({ error: "NOTION_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const NOTION_DATABASE_ID = Deno.env.get("NOTION_DATABASE_ID");
    if (!NOTION_DATABASE_ID) {
      return new Response(
        JSON.stringify({ error: "NOTION_DATABASE_ID not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify auth
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { reviewId } = await req.json();
    if (!reviewId) {
      return new Response(JSON.stringify({ error: "reviewId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch review data
    const { data: review, error: reviewErr } = await supabase
      .from("shift_reviews")
      .select(`
        *,
        shift:shifts!shift_reviews_shift_id_fkey(
          *,
          profile:profiles!shifts_profile_id_fkey(full_name, email)
        ),
        director1:profiles!shift_reviews_director1_id_fkey(full_name),
        director2:profiles!shift_reviews_director2_id_fkey(full_name),
        items:shift_review_items(
          *,
          task:tasks(*, client:clients!tasks_client_id_fkey(full_name))
        )
      `)
      .eq("id", reviewId)
      .single();

    if (reviewErr || !review) {
      return new Response(JSON.stringify({ error: "Review not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build Notion page content
    const managerName = review.shift?.profile?.full_name || "Unknown";
    const shiftDate = review.shift?.start_time
      ? new Date(review.shift.start_time).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    const children: any[] = [
      {
        object: "block",
        type: "heading_2",
        heading_2: { rich_text: [{ type: "text", text: { content: "Shift Review Summary" } }] },
      },
      {
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            { type: "text", text: { content: `Manager: ${managerName}\nDate: ${shiftDate}\nDirector 1: ${review.director1?.full_name || "N/A"}\nDirector 2: ${review.director2?.full_name || "N/A"}\nStatus: ${review.status}` } },
          ],
        },
      },
      {
        object: "block",
        type: "divider",
        divider: {},
      },
      {
        object: "block",
        type: "heading_3",
        heading_3: { rich_text: [{ type: "text", text: { content: "Tasks Reviewed" } }] },
      },
    ];

    // Add each reviewed task
    for (const item of review.items || []) {
      const task = item.task;
      const statusEmoji = item.status === "approved" ? "✅" : item.status === "reviewed" ? "🔄" : "⏳";
      const clientName = task?.client?.full_name ? ` (Client: ${task.client.full_name})` : "";

      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [
            {
              type: "text",
              text: { content: `${statusEmoji} ${task?.title || "Unknown Task"}${clientName}` },
              annotations: { bold: true },
            },
          ],
        },
      });

      const details = [];
      if (task?.status === "completed") details.push(`Status: Completed`);
      else details.push(`Status: Incomplete`);
      if (task?.comment) details.push(`Comment: ${task.comment}`);
      if (task?.incomplete_reason) details.push(`Reason: ${task.incomplete_reason}`);
      if (item.decision) details.push(`Decision: ${item.decision}`);
      if (item.notes) details.push(`Director Notes: ${item.notes}`);

      children.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: details.join("\n") } }],
        },
      });
    }

    // Add summary notes
    if (review.summary_notes) {
      children.push(
        { object: "block", type: "divider", divider: {} },
        {
          object: "block",
          type: "heading_3",
          heading_3: { rich_text: [{ type: "text", text: { content: "Call Session Notes" } }] },
        },
        {
          object: "block",
          type: "paragraph",
          paragraph: { rich_text: [{ type: "text", text: { content: review.summary_notes } }] },
        }
      );
    }

    // Create Notion page
    const notionRes = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DATABASE_ID },
        properties: {
          Name: {
            title: [{ text: { content: `Shift Review - ${managerName} - ${shiftDate}` } }],
          },
          Date: {
            date: { start: shiftDate },
          },
          Manager: {
            rich_text: [{ text: { content: managerName } }],
          },
          Status: {
            rich_text: [{ text: { content: review.status } }],
          },
        },
        children,
      }),
    });

    if (!notionRes.ok) {
      const errBody = await notionRes.text();
      console.error("Notion API error:", errBody);
      return new Response(
        JSON.stringify({ error: `Notion API error: ${notionRes.status}`, details: errBody }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const notionPage = await notionRes.json();

    return new Response(
      JSON.stringify({ success: true, notionPageId: notionPage.id, notionUrl: notionPage.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
