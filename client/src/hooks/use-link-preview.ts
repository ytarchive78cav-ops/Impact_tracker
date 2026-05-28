import { useQuery } from "@tanstack/react-query";

import { getExternalHref } from "@/lib/cause-ui";

export interface LinkPreview {
  url: string;
  title: string | null;
  description: string | null;
  imageUrl: string | null;
  faviconUrl: string | null;
}

export function useLinkPreview(url?: string | null) {
  const normalizedUrl = getExternalHref(url);

  return useQuery({
    queryKey: ["link-preview", normalizedUrl],
    enabled: Boolean(normalizedUrl),
    staleTime: 1000 * 60 * 60 * 6,
    queryFn: async () => {
      const response = await fetch(`/api/link-preview?url=${encodeURIComponent(normalizedUrl!)}`);
      if (!response.ok) {
        throw new Error("Preview unavailable");
      }
      return response.json() as Promise<LinkPreview>;
    },
    retry: false,
  });
}
