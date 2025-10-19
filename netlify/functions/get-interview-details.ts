import { createClient } from '@supabase/supabase-js';
import type { Handler } from "@netlify/functions";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// This is the standard Netlify Function handler
const handler: Handler = async (event) => {
  // Handle CORS preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: 'ok'
    };
  }

  try {
    // Access environment variables using process.env in Node.js
    const SUPABASE_URL = process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials are not set in environment variables.");
    }
    
    // The request body is in event.body, and needs to be parsed
    if (!event.body) {
        throw new Error("Request body is missing.");
    }
    const { interviewId } = JSON.parse(event.body);

    if (!interviewId) {
       return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Interview ID is missing from the request body." }),
      };
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      return {
        statusCode: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: "Interview not found." }),
      };
    }

    const responsePayload = {
      candidateName: interviewData.candidates?.full_name || "Candidate",
      jobTitle: interviewData.vacancies?.job_title || "the position",
      questions: interviewData.vacancies?.recruiter_questions?.map((q) => q.question) || []
    };

    // Return a response object in the format Netlify expects
    return {
      statusCode: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify(responsePayload),
    };

  } catch (error) {
    console.error('Unexpected error in get-interview-details:', error);
    return {
      statusCode: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};

export { handler };
