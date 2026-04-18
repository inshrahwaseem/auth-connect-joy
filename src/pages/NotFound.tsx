import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ROUTES } from "@/config/constants";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-muted/30 px-4 text-center">
      <h1 className="text-6xl font-bold text-muted-foreground/40">404</h1>
      <h2 className="text-xl font-semibold text-foreground">Page not found</h2>
      <p className="text-sm text-muted-foreground">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Button asChild>
        <Link to={ROUTES.LOGIN}>Go home</Link>
      </Button>
    </div>
  );
}
