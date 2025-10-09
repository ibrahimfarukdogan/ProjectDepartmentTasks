import { useAuth } from "@/context/authcontext";

function hasPermission(
  permissions: { category: string; level: number }[] | undefined,
  category: string,
  minLevel: number
): boolean {
  if (!permissions) return false;
  const found = permissions.find((p) => p.category === category);
  return found ? found.level >= minLevel : false;
}
/*
const RequirePermission = ({
  category,
  level,
  children,
}: {
  category: string;
  level: number;
  children: React.ReactNode;
}) => {
  const { user } = useAuth();
  return hasPermission(user?.permissions, category, level) ? <>{children}</> : null;
};
*/