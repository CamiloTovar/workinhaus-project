import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials are not set in environment variables.");
    }

    const { interviewId } = await req.json();

    if (!interviewId) {
      return new Response(JSON.stringify({ error: "Interview ID is missing from the request body." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // --- Using the exact query from your existing Supabase function ---
    const { data: interviewData, error: fetchError } = await supabaseClient
      .from('interviews')
      .select(`
        candidates ( full_name ),
        vacancies ( recruiter_questions, job_title )
      `)
      .eq('id', interviewId)
      .single();

    if (fetchError || !interviewData) {
      console.error('Supabase fetch error:', fetchError);
      // Sending a more specific error message based on your original log
      return new Response(JSON.stringify({ error: "Interview not found." }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // --- Formatting the payload exactly like your Supabase function ---
    const responsePayload = {
      candidateName: interviewData.candidates?.full_name || "Candidate",
      jobTitle: interviewData.vacancies?.job_title || "the position",
      questions: interviewData.vacancies?.recruiter_questions?.map((q) => q.question) || []
    };

    return new Response(JSON.stringify(responsePayload), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Unexpected error in get-interview-details:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});