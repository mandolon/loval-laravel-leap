import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  first_name: string;
  last_name: string;
  app_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, first_name, last_name, app_url }: WelcomeEmailRequest = await req.json();

    const emailResponse = await resend.emails.send({
      from: "Loval Laravel Leap <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Loval Laravel Leap",
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Welcome to Loval Laravel Leap!</h1>
          
          <p>Hi ${first_name},</p>
          
          <p>Your account has been created successfully. You can now log in to the application.</p>
          
          <p><strong>Email:</strong> ${email}</p>
          
          <p style="margin-top: 30px;">
            <a href="${app_url}/auth" 
               style="background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
              Log In Now
            </a>
          </p>
          
          <p style="color: #666; font-size: 14px; margin-top: 30px;">
            If you didn't expect this email, please contact your administrator.
          </p>
          
          <p style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
            This email was sent from Loval Laravel Leap
          </p>
        </div>
      `,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
