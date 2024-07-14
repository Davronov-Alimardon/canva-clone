import Image from "next/image";
import { AlertTriangle } from "lucide-react";

import { usePaywall } from "@/features/subscriptions/hooks/use-paywall";

import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";

import { useRemoveBg } from "@/features/ai/api/use-remove-bg";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface RemoveBgSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
};

export const RemoveBgSidebar = ({
  editor,
  activeTool,
  onChangeActiveTool,
}: RemoveBgSidebarProps) => {
  const { shouldBlock, triggerPaywall } = usePaywall();
  const mutation = useRemoveBg();

  const selectedObject = editor?.selectedObjects[0];

  // @ts-ignore
  const imageSrc = selectedObject?._originalElement?.currentSrc;

  const onClose = () => {
    onChangeActiveTool("select");
  };

  const onClick = () => {
    if (shouldBlock) {
      triggerPaywall();
      return;
    }

    mutation.mutate({
      image: imageSrc,
    }, {
      onSuccess: ({ data }) => {
        editor?.addImage(data);
      },
    });
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "remove-bg" ? "visible" : "hidden",
      )}
    >
      <ToolSidebarHeader
        title="Background removal"
        description="Remove background from image using AI"
      />
      {!imageSrc && (
        <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
          <AlertTriangle className="size-4 text-muted-foreground" />
          <p className="text-muted-foreground text-xs">
            Feature not available for this object
          </p>
        </div>
      )}
      {imageSrc && (
        <ScrollArea>
          <div className="p-4 space-y-4">
            <div className={cn(
              "relative aspect-square rounded-md overflow-hidden transition bg-muted",
              mutation.isPending && "opacity-50",
            )}>
              <Image
                src={imageSrc}
                fill
                alt="Image"
                className="object-cover"
              />
            </div>
            <Button
              disabled={mutation.isPending}
              onClick={onClick}
              className="w-full"
            >
              Remove background
            </Button>
          </div>
        </ScrollArea>
      )}
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
