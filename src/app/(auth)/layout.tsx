import { Button } from "@/components/ui/button";

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div>
      <nav className="flex h-[60px] p-2 gap-x-2 bg-blue-500">
        <Button>Home</Button>
        <Button>Settings</Button>
        <Button>About</Button>
      </nav>
      <div className="h-[calc(100vh-60px)] flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
