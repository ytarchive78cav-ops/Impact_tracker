import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type MonthlyLog } from "@shared/routes";
import { z } from "zod";

function parseWithLogging<T>(schema: any, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useMonthlyLogs() {
  return useQuery({
    queryKey: [api.monthlyLogs.list.path],
    queryFn: async () => {
      const res = await fetch(api.monthlyLogs.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch logs");
      const data = await res.json();
      return parseWithLogging<MonthlyLog[]>(api.monthlyLogs.list.responses[200], data, "monthlyLogs.list");
    },
  });
}

export function useMonthlyLog(monthKey: string) {
  return useQuery({
    queryKey: [api.monthlyLogs.get.path, monthKey],
    queryFn: async () => {
      const url = buildUrl(api.monthlyLogs.get.path, { monthKey });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch log");
      const data = await res.json();
      return parseWithLogging<MonthlyLog[]>(api.monthlyLogs.get.responses[200], data, "monthlyLogs.get");
    },
  });
}

export function useRevealMonthlyLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (monthKey: string) => {
      const res = await fetch(api.monthlyLogs.reveal.path, {
        method: api.monthlyLogs.reveal.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ monthKey }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to reveal monthly log");
      const data = await res.json();
      return parseWithLogging<MonthlyLog>(api.monthlyLogs.reveal.responses[201], data, "monthlyLogs.reveal");
    },
    onSuccess: (_, monthKey) => {
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.get.path, monthKey] });
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

type CompleteLogInput = z.infer<typeof api.monthlyLogs.complete.input>;

export function useCompleteMonthlyLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: CompleteLogInput }) => {
      const url = buildUrl(api.monthlyLogs.complete.path, { id });
      const validated = api.monthlyLogs.complete.input.parse(data);
      const res = await fetch(url, {
        method: api.monthlyLogs.complete.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to complete monthly log");
      return api.monthlyLogs.complete.responses[200].parse(await res.json());
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}

export function useDeleteMonthlyLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.monthlyLogs.delete.path, { id });
      const res = await fetch(url, {
        method: api.monthlyLogs.delete.method,
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to delete monthly log");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.monthlyLogs.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path] });
    },
  });
}
