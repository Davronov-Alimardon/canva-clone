import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";

import { client } from "@/lib/hono";

type ResponseType = InferResponseType<typeof client.api.users["$post"]>;
type RequestType = InferRequestType<typeof client.api.users["$post"]>["json"];

export const useSignUp = () => {
  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({
    mutationFn: async (json) => {
      const response = await client.api.users.$post({ json });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData?.error || "Something went wrong");
        } catch (parseError) {
          throw new Error("Something went wrong");
        }
      }

      return await response.json();
    },
    onSuccess: () => {
      toast.success("User created");
    }
  });

  return mutation;
};
