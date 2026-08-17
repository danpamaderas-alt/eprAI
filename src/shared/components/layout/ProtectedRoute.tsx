import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../../store/useAuthStore";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const { session, userRole, isInitialized } = useAuthStore();
  const location = useLocation();

  if (!isInitialized) {
    return null;
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (requiredRole && userRole !== requiredRole && userRole !== "Administrador") {
    return <Navigate to="/inicio" replace />;
  }

  return <>{children}</>;
};
