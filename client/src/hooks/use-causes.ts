import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Cause, type InsertCause } from "@shared/routes";

function parseWithLogging<T>(schema: any, data: unknown, label: string): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    console.error(`[Zod] ${label} validation failed:`, result.error.format());
    throw result.error;
  }
  return result.data;
}

export function useCauses() {
  return useQuery({
    queryKey: [api.causes.list.path],
    queryFn: async () => {
      const res = await fetch(api.causes.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch causes");
      const data = await res.json();
      return parseWithLogging<Cause[]>(api.causes.list.responses[200], data, "causes.list");
    },
  });
}

export function useCreateCause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: InsertCause) => {
      const validated = api.causes.create.input.parse(data);
      const res = await fetch(api.causes.create.path, {
        method: api.causes.create.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create cause");
      return api.causes.create.responses[201].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.causes.list.path] }),
  });
}

export function useUpdateCause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: number } & Partial<InsertCause>) => {
      const validated = api.causes.update.input.parse(updates);
      const url = buildUrl(api.causes.update.path, { id });
      const res = await fetch(url, {
        method: api.causes.update.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validated),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to update cause");
      return api.causes.update.responses[200].parse(await res.json());
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.causes.list.path] }),
  });
}

export function useDeleteCause() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.causes.delete.path, { id });
      const res = await fetch(url, { method: api.causes.delete.method, credentials: "include" });
      if (!res.ok) throw new Error("Failed to delete cause");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [api.causes.list.path] }),
  });
}
