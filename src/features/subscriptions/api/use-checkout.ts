import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.subscriptions.checkout["$post"], 200>;

export const useCheckout = () => {
  const mutation = useMutation<
    ResponseType,
    Error
  >({
    mutationFn: async () => {
      const response = await client.api.subscriptions.checkout.$post();

      if (!response.ok) {
        throw new Error("Failed to create session");
      }

      return await response.json();
    },
    onSuccess: ({ data }) => {
      window.location.href = data;
    },
    onError: () => {
      toast.error("Failed to create session");
    },
  });

  return mutation;
};
