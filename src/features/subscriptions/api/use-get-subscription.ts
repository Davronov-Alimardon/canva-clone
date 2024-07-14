import { useQuery } from "@tanstack/react-query";

import { client } from "@/lib/hono";

export const useGetSubscription = () => {
  const query = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const response = await client.api.subscriptions.current.$get();

      if (!response.ok) {
        throw new Error("Something went wrong");
      }

      const { data } = await response.json();
      return data; 
    },
  });

  return query;
};
