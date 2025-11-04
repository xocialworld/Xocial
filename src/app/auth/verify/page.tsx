"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createClient();

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get("token");
      const email = searchParams.get("email");
      const type = searchParams.get("type");

      // If no token, show resend form
      if (!token || !email) {
        setStatus("error");
        setMessage("Invalid verification link. Please request a new one.");
        return;
      }

      // Verify the email
      const { error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email',
      });

      if (error) {
        setStatus("error");
        setMessage(error.message || "Failed to verify email. Please try again.");
        toast.error("Email verification failed");
      } else {
        setStatus("success");
        setMessage("Your email has been verified successfully!");
        toast.success("Email verified successfully!");
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/auth/login");
        }, 3000);
      }
    };

    verifyEmail();
  }, [searchParams, router, supabase]);

  const handleResendEmail = async () => {
    const email = searchParams.get("email");
    
    if (!email) {
      toast.error("Email address not found");
      return;
    }

    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message || "Failed to resend verification email");
    } else {
      toast.success("Verification email sent! Please check your inbox.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary-50 to-secondary-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto mb-4">
            {status === "loading" && (
              <Loader2 className="h-16 w-16 animate-spin text-primary-600" />
            )}
            {status === "success" && (
              <CheckCircle className="h-16 w-16 text-success-600" />
            )}
            {status === "error" && (
              <XCircle className="h-16 w-16 text-error-600" />
            )}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === "loading" && "Verifying Email..."}
            {status === "success" && "Email Verified!"}
            {status === "error" && "Verification Failed"}
          </CardTitle>
          <CardDescription className="text-center">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "success" && (
            <div className="text-center">
              <p className="text-sm text-secondary-600 mb-4">
                Redirecting you to login...
              </p>
              <Link href="/auth/login">
                <Button className="w-full">
                  Go to Login
                </Button>
              </Link>
            </div>
          )}
          
          {status === "error" && (
            <div className="space-y-3">
              <Button
                onClick={handleResendEmail}
                className="w-full"
                variant="primary"
              >
                Resend Verification Email
              </Button>
              <Link href="/auth/signup">
                <Button variant="secondary" className="w-full">
                  Back to Sign Up
                </Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

