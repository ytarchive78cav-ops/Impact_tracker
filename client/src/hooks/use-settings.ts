import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Settings, type InsertSettings } from "@shared/routes";
import { storage } from "@/lib/local-storage";
import { useUser } from "@/lib/user-context";

export function useSettings() {
  const { activeWorkspaceId } = useUser();
  return useQuery({
    queryKey: [api.settings.get.path, activeWorkspaceId],
    enabled: activeWorkspaceId !== null,
    queryFn: async () => storage.getSettings(activeWorkspaceId!),
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUser();
  return useMutation({
    mutationFn: async (updates: Partial<InsertSettings>) => {
      if (!activeWorkspaceId) {
        throw new Error("Select a workspace first.");
      }
      return storage.updateSettings(activeWorkspaceId, updates);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.settings.get.path, activeWorkspaceId] }),
  });
}
