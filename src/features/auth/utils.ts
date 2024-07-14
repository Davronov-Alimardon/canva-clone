import { redirect } from "next/navigation";

import { auth } from "@/auth";

export const protectServer = async () => {
  const session = await auth();

  if (!session) {
    redirect("/api/auth/signin");
  }
};
