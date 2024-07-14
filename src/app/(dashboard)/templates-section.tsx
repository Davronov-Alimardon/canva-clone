"use client";

import { useRouter } from "next/navigation";
import { Loader, TriangleAlert } from "lucide-react";

import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";

import { ResponseType, useGetTemplates } from "@/features/projects/api/use-get-templates";
import { useCreateProject } from "@/features/projects/api/use-create-project";

import { TemplateCard } from "./template-card";

export const TemplatesSection = () => {
  const { shouldBlock, triggerPaywall } = usePaywall();
  const router = useRouter();
  const mutation = useCreateProject();

  const { 
    data, 
    isLoading, 
    isError
  } = useGetTemplates({ page: "1", limit: "4" });

  const onClick = (template: ResponseType["data"][0]) => {
    if (template.isPro && shouldBlock) {
      triggerPaywall();
      return;
    }

    mutation.mutate(
      {
        name: `${template.name} project`,
        json: template.json,
        width: template.width,
        height: template.height,
      },
      {
        onSuccess: ({ data }) => {
          router.push(`/editor/${data.id}`);
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Start from a template
        </h3>
        <div className="flex items-center justify-center h-32">
          <Loader className="size-6 text-muted-foreground animate-spin" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">
          Start from a template
        </h3>
        <div className="flex flex-col gap-y-4 items-center justify-center h-32">
          <TriangleAlert className="size-6 text-muted-foreground" />
          <p>
            Failed to load templates
          </p>
        </div>
      </div>
    );
  }

  if (!data?.length) {
    return null;
  }

  return (
    <div>
      <h3 className="font-semibold text-lg">
        Start from a template
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 mt-4 gap-4">
        {data?.map((template) => (
          <TemplateCard
            key={template.id}
            title={template.name}
            imageSrc={template.thumbnailUrl || ""}
            onClick={() => onClick(template)}
            disabled={mutation.isPending}
            description={`${template.width} x ${template.height} px`}
            width={template.width}
            height={template.height}
            isPro={template.isPro}
          />
        ))}
      </div>
    </div>
  );
};
