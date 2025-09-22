import { Chrome, Circle } from "@uiw/react-color";

import { colors } from "@/features/editor/types";

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
}

export const ColorPicker = ({ value, onChange }: ColorPickerProps) => {
  return (
    <div className="w-full space-y-4">
      <Chrome
        color={value}
        onChange={(color) => {
          onChange(color.hex);
        }}
        className="border rounded-lg"
      />
      <Circle
        color={value}
        colors={colors}
        onChange={(color) => {
          onChange(color.hex);
        }}
      />
    </div>
  );
};
