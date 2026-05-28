import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, type MonthlyLog } from "@shared/routes";
import { z } from "zod";
import { storage } from "@/lib/local-storage";
import { useUser } from "@/lib/user-context";

export function useMonthlyLogs() {
  const { activeWorkspaceId } = useUser();
  return useQuery({
    queryKey: [api.monthlyLogs.list.path, activeWorkspaceId],
    enabled: activeWorkspaceId !== null,
    queryFn: async () => storage.getMonthlyLogs(activeWorkspaceId!),
  });
}

export function useMonthlyLog(monthKey: string) {
  const { activeWorkspaceId } = useUser();
  return useQuery({
    queryKey: [api.monthlyLogs.get.path, activeWorkspaceId, monthKey],
    enabled: activeWorkspaceId !== null,
    queryFn: async () => storage.getMonthlyLogs(activeWorkspaceId!).filter((log) => log.monthKey === monthKey),
  });
}

export function useRevealMonthlyLog() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUser();
  return useMutation({
    mutationFn: async (monthKey: string) => {
      if (!activeWorkspaceId) {
        throw new Error("Select a Giving Space first.");
      }
      return storage.revealMonthlyLog(activeWorkspaceId, monthKey);
    },
    onSuccess: (_, monthKey) => {
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.get.path, activeWorkspaceId, monthKey] });
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.list.path, activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path, activeWorkspaceId] });
    },
  });
}

type CompleteLogInput = z.infer<typeof api.monthlyLogs.complete.input>;

export function useCompleteMonthlyLog() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUser();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CompleteLogInput }) => {
      const validated = api.monthlyLogs.complete.input.parse(data);
      if (!activeWorkspaceId) {
        throw new Error("Select a Giving Space first.");
      }
      return storage.completeMonthlyLog(activeWorkspaceId, id, validated);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.list.path, activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.get.path, activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path, activeWorkspaceId] });
    },
  });
}

export function useDeleteMonthlyLog() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUser();
  return useMutation({
    mutationFn: async (id: number) => {
      if (!activeWorkspaceId) {
        throw new Error("Select a Giving Space first.");
      }
      storage.deleteMonthlyLog(activeWorkspaceId, id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.list.path, activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.get.path, activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path, activeWorkspaceId] });
    },
  });
}
