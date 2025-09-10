import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailGenerationRequest {
  user_id: string;
  brand_id: string;
  draft_id: string;
  email_type: string;
  user_input: string;
  brand_details: {
    brand_name: string;
    brand_description: string;
  };
  products_details: {
    name?: string;
    price?: number;
    key_features?: string[];
  };
  sales_details: {
    target_audience?: string;
    special_offer?: string;
  };
  news_details: {
    website_url?: string;
    keywords?: string[];
  };
  community: {
    community_topics?: string;
    key_highlights?: string;
  };
  feedback_text?: string; // For draft revisions
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      "https://dcxslpoqywduvqgtkqxf.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjeHNscG9xeXdkdXZxZ3RrcXhmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTcxNzEyNDQsImV4cCI6MjA3Mjc0NzI0NH0.vkiCR1mK4CY8FzxNxzhSBH-KgfegW6lo9HHyVNGtBOA"
    );

    const request: EmailGenerationRequest = await req.json();
    console.log("Received email generation request:", JSON.stringify(request, null, 2));

    // Check if this is a new draft or feedback on existing draft
    const isNewDraft = !request.draft_id || request.draft_id === "";
    const isFeedback = !!request.feedback_text;

    let draftId: string;
    let emailContent: string;

    if (isNewDraft) {
      // Create new draft
      console.log("Creating new draft...");
      
      // Generate mock email content based on the request
      emailContent = generateEmailContent(request);
      
      // Insert new draft
      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .insert({
          user_id: request.user_id,
          brand_id: request.brand_id,
          email_type: request.email_type,
          user_input: request.user_input,
          product_info: {
            products_details: request.products_details,
            sales_details: request.sales_details,
            news_details: request.news_details,
            community: request.community
          },
          current_version: 1
        })
        .select('id')
        .single();

      if (draftError) {
        console.error("Error creating draft:", draftError);
        throw draftError;
      }

      draftId = draftData.id;

      // Insert first version
      const { error: versionError } = await supabase
        .from('draft_versions')
        .insert({
          draft_id: draftId,
          version: 1,
          content: emailContent
        });

      if (versionError) {
        console.error("Error creating draft version:", versionError);
        throw versionError;
      }

    } else {
      // Handle feedback on existing draft
      console.log("Processing feedback for existing draft...");
      
      draftId = request.draft_id;
      
      // Get current draft info
      const { data: draftData, error: draftError } = await supabase
        .from('drafts')
        .select('current_version')
        .eq('id', draftId)
        .single();

      if (draftError) {
        console.error("Error fetching draft:", draftError);
        throw draftError;
      }

      const newVersion = draftData.current_version + 1;
      
      // Insert feedback
      const { data: feedbackData, error: feedbackError } = await supabase
        .from('email_feedbacks')
        .insert({
          draft_id: draftId,
          feedback_text: request.feedback_text!,
          is_valid: true
        })
        .select('id')
        .single();

      if (feedbackError) {
        console.error("Error creating feedback:", feedbackError);
        throw feedbackError;
      }

      // Generate revised email content
      emailContent = generateRevisedEmailContent(request);

      // Insert new version
      const { error: versionError } = await supabase
        .from('draft_versions')
        .insert({
          draft_id: draftId,
          version: newVersion,
          content: emailContent
        });

      if (versionError) {
        console.error("Error creating new version:", versionError);
        throw versionError;
      }

      // Update draft current version
      const { error: updateError } = await supabase
        .from('drafts')
        .update({ current_version: newVersion })
        .eq('id', draftId);

      if (updateError) {
        console.error("Error updating draft version:", updateError);
        throw updateError;
      }
    }

    console.log("Successfully processed email generation request");

    return new Response(
      JSON.stringify({
        draft_id: draftId,
        email_draft_result: emailContent,
        success: true
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error: any) {
    console.error("Error in campaign function:", error);
    
    return new Response(
      JSON.stringify({
        error: error.message || "An unexpected error occurred",
        success: false
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
};

function generateEmailContent(request: EmailGenerationRequest): string {
  const { email_type, brand_details, user_input } = request;
  
  let content = `Subject: `;
  
  // Generate content based on email type and available details
  switch (email_type) {
    case 'product':
      const product = request.products_details;
      content = `Subject: Introducing ${product.name || 'Our New Product'} - ${brand_details.brand_name}

Dear Valued Customer,

${user_input}

We're excited to announce ${product.name || 'our latest product'}${product.price ? ` for just $${product.price}` : ''}.

${product.key_features && product.key_features.length > 0 ? `
Key Features:
${product.key_features.map(feature => `• ${feature}`).join('\n')}
` : ''}

${brand_details.brand_description ? `
About ${brand_details.brand_name}:
${brand_details.brand_description}
` : ''}

Best regards,
The ${brand_details.brand_name} Team`;
      break;

    case 'sales':
      const sales = request.sales_details;
      content = `Subject: Special Offer for ${sales.target_audience || 'You'} - ${brand_details.brand_name}

Dear ${sales.target_audience || 'Valued Customer'},

${user_input}

${sales.special_offer ? `Take advantage of our exclusive ${sales.special_offer}!` : ''}

${brand_details.brand_description ? `
${brand_details.brand_description}
` : ''}

Don't miss out on this limited-time opportunity!

Best regards,
The ${brand_details.brand_name} Team`;
      break;

    case 'news':
      const news = request.news_details;
      content = `Subject: Newsletter - ${brand_details.brand_name}

Dear Subscriber,

${user_input}

${news.keywords && news.keywords.length > 0 ? `
Topics covered: ${news.keywords.join(', ')}
` : ''}

${news.website_url ? `Visit us at: ${news.website_url}` : ''}

${brand_details.brand_description ? `
${brand_details.brand_description}
` : ''}

Stay informed,
The ${brand_details.brand_name} Team`;
      break;

    case 'community':
      const community = request.community;
      content = `Subject: ${community.community_topics || 'Community Update'} - ${brand_details.brand_name}

Dear Community Member,

${user_input}

${community.key_highlights ? `
Highlights:
${community.key_highlights}
` : ''}

${brand_details.brand_description ? `
${brand_details.brand_description}
` : ''}

Together we grow,
The ${brand_details.brand_name} Team`;
      break;

    default:
      content = `Subject: Update from ${brand_details.brand_name}

Dear Customer,

${user_input}

${brand_details.brand_description ? `
${brand_details.brand_description}
` : ''}

Best regards,
The ${brand_details.brand_name} Team`;
  }

  return content;
}

function generateRevisedEmailContent(request: EmailGenerationRequest): string {
  // For now, generate new content based on feedback
  // In a real implementation, you'd use AI to revise based on feedback
  const baseContent = generateEmailContent(request);
  
  return `${baseContent}

---
Revised based on your feedback: "${request.feedback_text}"
---`;
}

serve(handler);