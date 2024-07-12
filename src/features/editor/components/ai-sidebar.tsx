import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ActiveTool, Editor } from "@/features/editor/types";
import { ToolSidebarHeader } from "@/features/editor/components/tool-sidebar-header";
import { ToolSidebarClose } from "@/features/editor/components/tool-sidebar-close";

import { useGenerateImage } from "@/features/ai/api/use-generate-image";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Loader2 } from "lucide-react";

interface AiSidebarProps {
  editor: Editor | undefined;
  activeTool: ActiveTool;
  onChangeActiveTool: (tool: ActiveTool) => void;
}

export const AiSidebar = ({ editor, activeTool, onChangeActiveTool }: AiSidebarProps) => {
  const mutation = useGenerateImage();
  const [value, setValue] = useState("");

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // TODO: Block with paywall

    mutation.mutate(
      { prompt: value },
      {
        onSuccess: ({ data }) => {
          editor?.addImage(data);
        },
      }
    );
  };

  const onClose = () => {
    onChangeActiveTool("select");
  };

  return (
    <aside
      className={cn(
        "bg-white relative border-r z-[40] w-[360px] h-full flex flex-col",
        activeTool === "ai" ? "visible" : "hidden"
      )}
    >
      <ToolSidebarHeader title="AI" description="Generate an image using AI" />
      <div className="flex flex-col gap-y-4 items-center justify-center flex-1">
        <AlertTriangle className="size-4 text-muted-foreground" />
        <p className="text-muted-foreground text-xs">API problems, please try again later</p>
      </div>
      {/* <ScrollArea>
        <form onSubmit={onSubmit} className="p-4 space-y-6">
          <Textarea
            disabled={mutation.isPending}
            placeholder="an astronaut riding a horse on mars, hd, dramatic lighting"
            cols={30}
            rows={10}
            required
            minLength={3}
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button disabled={mutation.isPending} type="submit" className="w-full">
            {mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Generate"}
          </Button>
        </form>
      </ScrollArea> */}
      <ToolSidebarClose onClick={onClose} />
    </aside>
  );
};
