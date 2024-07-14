"use client";

import Link from "next/link";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { FaGithub } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { Loader2, TriangleAlert } from "lucide-react";
import { useSearchParams } from "next/navigation";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Card, CardTitle, CardHeader, CardContent, CardDescription } from "@/components/ui/card";

export const SignInCard = () => {
  const [loading, setLoading] = useState(false);
  const [loadingGithub, setLoadingGithub] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const params = useSearchParams();
  const error = params.get("error");

  const onCredentialSignIn = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setLoadingLogin(true);

    signIn("credentials", {
      email: email,
      password: password,
      callbackUrl: "/",
    });
  };

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
      {!!error && (
        <div className="bg-destructive/15 p-3 rounded-md flex items-center gap-x-2 text-sm text-destructive mb-6">
          <TriangleAlert className="size-4" />
          <p>Invalid email or password</p>
        </div>
      )}
      <CardContent className="space-y-5 px-0 pb-0">
        <form onSubmit={onCredentialSignIn} className="space-y-2.5">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            type="email"
            disabled={loading || loadingLogin}
            required
          />
          <Input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            type="password"
            disabled={loading || loadingLogin}
            required
          />
          <Button className="w-full" type="submit" size="lg" disabled={loading}>
            {loadingLogin ? (
              <Loader2 className="mr-2 size-5 top-2.5 left-2.5 animate-spin" />
            ) : (
              "Continue"
            )}
          </Button>
        </form>
        <Separator />
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
          <Link href="/sign-up" onClick={() => setLoading(true)}>
            <span className="text-sky-700 hover:underline">Sign up</span>
          </Link>
        </p>
      </CardContent>
    </Card>
  );
};
