const { createClient } = require('@supabase/supabase-js');

exports.handler = async function(event, context) {
  // Allow the function to be called from anywhere
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  try {
    const { interviewId } = JSON.parse(event.body);
    if (!interviewId) {
      throw new Error("Interview ID is required.");
    }

    const supabase = createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: interviewData, error } = await supabase
      .from('interviews')
      .select(`
        candidates ( full_name ),
        vacancies ( recruiter_questions, job_title )
      `)
      .eq('id', interviewId)
      .single();

    if (error || !interviewData) {
      throw new Error("Interview not found in Supabase.");
    }

    const responsePayload = {
      candidateName: interviewData.candidates?.full_name,
      jobTitle: interviewData.vacancies?.job_title,
      questions: interviewData.vacancies?.recruiter_questions?.map(q => q.question) || [],
    };

    return {
      statusCode: 200,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(responsePayload),
    };

  } catch (err) {
    return {
      statusCode: 400,
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: err.message }),
    };
  }
};