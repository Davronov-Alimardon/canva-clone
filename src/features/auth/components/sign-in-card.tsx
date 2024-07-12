"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/ui/card";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export const SignInCard = () => {
  const [loading, setLoading] = useState(false);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const onProviderSignIn = (provider: "github" | "google") => {
    setLoading(true);
    setLoadingGithub(provider === "github");
    setLoadingGoogle(provider === "google");
    signIn(provider, { callbackUrl: "/" });
  };

  return (
    <Card className="w-full h-full p-8">
      <CardHeader className="px-0 pt-0">
        <CardTitle>Login to continue</CardTitle>
        <CardDescription>Use your email or another service to continue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 px-0 pb-0">
        <div className="flex flex-col gap-y-2.5">
          <Button
            onClick={() => onProviderSignIn("google")}
            size="lg"
            variant="outline"
            className="w-full relative"
            disabled={loading}
          >
            {loadingGoogle ? (
              <Loader2 className="mr-2 size-5 top-2.5 left-2.5 absolute animate-spin" />
            ) : (
              <FcGoogle className="mr-2 size-5 top-2.5 left-2.5 absolute" />
            )}
            Continue with Google
          </Button>
          <Button
            onClick={() => onProviderSignIn("github")}
            size="lg"
            variant="outline"
            disabled={loading}
            className="w-full relative"
          >
            {loadingGithub ? (
              <Loader2 className="mr-2 size-5 top-2.5 left-2.5 absolute animate-spin" />
            ) : (
              <FaGithub className="mr-2 size-5 top-2.5 left-2.5 absolute" />
            )}
            Continue with Github
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/sign-up">
            <span className="text-sky-700 hover:underline">Sign Up</span>
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};
