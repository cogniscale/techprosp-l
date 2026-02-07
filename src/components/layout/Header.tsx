import { LogOut } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  title: string;
}

export function Header({ title }: HeaderProps) {
  const { profile, signOut } = useAuth();

  return (
    <header className="flex h-16 items-center justify-between border-b border-tp-light-grey bg-white px-8">
      <h1 className="text-lg font-semibold text-tp-dark font-heading">
        {title}
      </h1>

      <div className="flex items-center gap-4">
        {/* User info */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-tp-blue flex items-center justify-center">
            <span className="text-sm font-medium text-white">
              {profile?.full_name?.charAt(0) || "U"}
            </span>
          </div>
          <div className="hidden md:block">
            <p className="text-sm font-medium text-tp-dark">{profile?.full_name}</p>
            <p className="text-xs text-tp-dark-grey capitalize">
              {profile?.role}
            </p>
          </div>
        </div>

        {/* Sign out */}
        <Button
          variant="ghost"
          size="icon"
          onClick={signOut}
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
}
