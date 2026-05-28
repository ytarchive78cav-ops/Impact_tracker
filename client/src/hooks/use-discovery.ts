import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { storage } from "@/lib/local-storage";
import { useUser } from "@/lib/user-context";
import { api } from "@shared/routes";

export function useDiscoveryCauses() {
  return useQuery({
    queryKey: ["discovery-causes"],
    queryFn: async () => storage.getDiscoveryCauses(),
  });
}

export function useAddDiscoveryCause() {
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useUser();

  return useMutation({
    mutationFn: async (input: { templateId: string; type: "donation" | "volunteer" | "either"; tier: 1 | 2 | 3; scope: "local" | "global" }) => {
      if (!activeWorkspaceId) {
        throw new Error("Select a Giving Space first.");
      }
      return storage.addDiscoveryCauseToWorkspace(activeWorkspaceId, input.templateId, {
        type: input.type,
        tier: input.tier,
        scope: input.scope,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.causes.list.path, activeWorkspaceId] });
      queryClient.invalidateQueries({ queryKey: [api.dashboard.stats.path, activeWorkspaceId] });
    },
  });
}
