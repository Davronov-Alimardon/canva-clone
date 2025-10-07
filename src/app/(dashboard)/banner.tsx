"use client";

import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles } from "lucide-react";
import { useState } from "react";

import { useCreateProject } from "@/features/projects/api/use-create-project";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Common canvas dimensions
const PRESET_DIMENSIONS = [
  { name: "Instagram Post", width: 1080, height: 1080 },
  { name: "Instagram Story", width: 1080, height: 1920 },
  { name: "Facebook Post", width: 1200, height: 630 },
  { name: "Twitter Post", width: 1200, height: 675 },
  { name: "YouTube Thumbnail", width: 1280, height: 720 },
  { name: "Pinterest Pin", width: 1000, height: 1500 },
  { name: "A4 Paper", width: 794, height: 1123 }, // 96 DPI
  { name: "Letter Paper", width: 816, height: 1056 }, // 96 DPI
];

export const Banner = () => {
  const [loading, setLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectName, setProjectName] = useState("Untitled project");
  const [customWidth, setCustomWidth] = useState(900);
  const [customHeight, setCustomHeight] = useState(1200);
  const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
  
  const router = useRouter();
  const mutation = useCreateProject();

  const handleCreateProject = (width: number, height: number) => {
    setLoading(true);
    mutation.mutate(
      {
        name: projectName,
        json: "",
        width,
        height,
      },
      {
        onSuccess: ({ data }) => {
          setIsModalOpen(false);
          router.push(`/editor/${data.id}`);
        },
        onError: () => {
          setLoading(false);
        },
      },
    );
  };

  const handlePresetSelect = (preset: typeof PRESET_DIMENSIONS[0]) => {
    setCustomWidth(preset.width);
    setCustomHeight(preset.height);
    setSelectedPreset(preset.name);
  };

  const handleCustomCreate = () => {
    handleCreateProject(customWidth, customHeight);
  };

  return (
    <>
      <div className="text-white aspect-[5/1] min-h-[248px] flex gap-x-6 p-6 items-center rounded-xl bg-gradient-to-r from-[#2e62cb] via-[#0073ff] to-[#3faff5]">
        <div className="rounded-full size-28 items-center justify-center bg-white/50 hidden md:flex">
          <div className="rounded-full size-20 flex items-center justify-center bg-white">
            <Sparkles className="h-20 text-[#0073ff] fill-[#0073ff]" />
          </div>
        </div>
        <div className="flex flex-col gap-y-2">
          <h1 className="text-xl md:text-3xl font-semibold">
            Visualize your ideas with The Canvas
          </h1>
          <p className="text-xs md:text-sm mb-2">
            Turn inspiration into design in no time. Simply upload an image and
            let AI do the rest.
          </p>
          <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="secondary"
                className="w-[160px]"
              >
                Start creating
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Create New Project</DialogTitle>
              </DialogHeader>
              
              {/* Project Name Input */}
              <div className="space-y-2">
                <Label htmlFor="project-name">Project Name</Label>
                <Input
                  id="project-name"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Enter project name"
                />
              </div>

              {/* Preset Dimensions */}
              <div className="space-y-3">
                <Label>Choose a template</Label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                  {PRESET_DIMENSIONS.map((preset) => (
                    <button
                      key={preset.name}
                      onClick={() => handlePresetSelect(preset)}
                      className={`p-3 text-sm border rounded-md text-left hover:bg-gray-50 transition-colors ${
                        selectedPreset === preset.name
                          ? "border-blue-500 bg-blue-50"
                          : "border-gray-200"
                      }`}
                    >
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-gray-500 text-xs">
                        {preset.width} × {preset.height}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Dimensions */}
              <div className="space-y-3">
                <Label>Custom Dimensions</Label>
                <div className="flex gap-4">
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="width" className="text-xs">Width</Label>
                    <Input
                      id="width"
                      type="number"
                      value={customWidth}
                      onChange={(e) => setCustomWidth(Number(e.target.value))}
                      min={100}
                      max={5000}
                    />
                  </div>
                  <div className="space-y-2 flex-1">
                    <Label htmlFor="height" className="text-xs">Height</Label>
                    <Input
                      id="height"
                      type="number"
                      value={customHeight}
                      onChange={(e) => setCustomHeight(Number(e.target.value))}
                      min={100}
                      max={5000}
                    />
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <Button
                onClick={handleCustomCreate}
                disabled={mutation.isPending || !projectName.trim()}
                className="w-full"
              >
                {mutation.isPending ? (
                  <>
                    <Loader2 className="size-4 mr-2 animate-spin" />
                    Creating Project...
                  </>
                ) : (
                  "Create Project"
                )}
              </Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </>
  );
};