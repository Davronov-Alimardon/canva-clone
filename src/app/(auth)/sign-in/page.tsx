import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { SignInCard } from "@/features/auth/components/sign-in-card";

const SignInPage = async () => {
  const session = await auth();

  if (session) {
    redirect("/");
  }

  return <SignInCard />;
};

export default SignInPage;
