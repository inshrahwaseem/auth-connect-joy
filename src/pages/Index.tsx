import { Navigate } from "react-router-dom";
import { ROUTES } from "@/config/constants";

// Root route redirects to login
export default function Index() {
  return <Navigate to={ROUTES.LOGIN} replace />;
}
