"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import Link from "next/link";

export function TempHome() {
  const [loading, setLoading] = useState(false);
  const [loadingApp, setLoadingApp] = useState(false);
  const [loadingOut, setLoadingOut] = useState(false);

  return (
    <div className="min-h-screen flex items-center justify-center  gap-x-2 bg-black">
      <Link href="/editor/beta">
        <Button
          size="lg"
          onClick={() => {
            setLoading(true);
            setLoadingApp(true);
          }}
          variant="secondary"
          disabled={loading}
        >
          {loadingApp ? <Loader2 className="size-4 animate-spin" /> : "Open App"}
        </Button>
      </Link>
      <Link href="/api/auth/signout">
        <Button
          size="lg"
          onClick={() => {
            setLoading(true);
            setLoadingOut(true);
          }}
          variant="destructive"
          disabled={loading}
        >
          {loadingOut ? <Loader2 className="size-4 animate-spin" /> : "SignOut"}
        </Button>
      </Link>
    </div>
  );
}
