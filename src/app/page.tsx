// "use client";

// import { useState } from "react";
// import { Button } from "@/components/ui/button";
// import { Loader2 } from "lucide-react";
// import Link from "next/link";

// export default function Home() {
//   const [loading, setLoading] = useState(false);

//   return (
//     <div className="flex items-center justify-center min-h-screen bg-black">
//       <Link href="/editor/beta">
//         <Button
//           size="lg"
//           onClick={() => setLoading(true)}
//           variant="secondary"
//           disabled={loading}
//         >
//           {loading ? <Loader2 className="size-4 animate-spin" /> : "Open App"}
//         </Button>
//       </Link>
//     </div>
//   );
// }

import { auth } from "@/auth";
import { TempHome } from "@/components/temp-home";
import { protectServer } from "@/features/auth/utils";

export default async function Home() {
  await protectServer();

  const session = await auth()
  return (
    <div>
      <TempHome />
      {JSON.stringify(session)}
    </div>
  );
}
