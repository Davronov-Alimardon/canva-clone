import { auth } from "@/auth";
import { TempHome } from "@/components/temp-home";
import { protectServer } from "@/features/auth/utils";
import { Navbar } from "./navbar";
import { Banner } from "./banner";

export default async function Home() {
  await protectServer();

  const session = await auth();
  return (
    <div className="flex flex-col space-y-6 max-w-screen-xl mx-auto pb-10">
      <Banner />
    </div>
  );
}
