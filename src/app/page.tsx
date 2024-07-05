import { Button } from "@/components/ui/button";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <Button size="lg" variant="secondary">
        <Link href="/editor/beta">Click Me (to redirect)</Link>
      </Button>
    </div>
  );
}
