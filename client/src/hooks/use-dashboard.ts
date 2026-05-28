import { useQuery } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { storage } from "@/lib/local-storage";
import { useUser } from "@/lib/user-context";

export function useDashboardStats() {
  const { activeWorkspaceId } = useUser();
  return useQuery({
    queryKey: [api.dashboard.stats.path, activeWorkspaceId],
    enabled: activeWorkspaceId !== null,
    queryFn: async () => storage.getDashboardStats(activeWorkspaceId!),
  });
}
