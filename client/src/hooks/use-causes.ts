import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type Cause, type InsertCause } from "@shared/routes";
import { storage } from "@/lib/local-storage";
import { useUser } from "@/lib/user-context";

export function useCauses() {
  const { activeWorkspaceId } = useUser();
  return useQuery({
    queryKey: [api.causes.list.path, activeWorkspaceId],
    enabled: activeWorkspaceId !== null,
    queryFn: async () => storage.getCauses(activeWorkspaceId!),
  });
}

export function useCreateCause() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUser();
  return useMutation({
    mutationFn: async (data: InsertCause) => {
      const validated = api.causes.create.input.parse(data);
      if (!activeWorkspaceId) {
        throw new Error("Select a Giving Space first.");
      }
      return storage.createCause(activeWorkspaceId, validated);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.causes.list.path, activeWorkspaceId] }),
  });
}

export function useUpdateCause() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUser();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertCause>) => {
      const validated = api.causes.update.input.parse(updates);
      if (!activeWorkspaceId) {
        throw new Error("Select a Giving Space first.");
      }
      return storage.updateCause(activeWorkspaceId, id, validated);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.causes.list.path, activeWorkspaceId] }),
  });
}

export function useDeleteCause() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUser();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!activeWorkspaceId) {
        throw new Error("Select a Giving Space first.");
      }
      storage.deleteCause(activeWorkspaceId, id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.causes.list.path, activeWorkspaceId] }),
  });
}
