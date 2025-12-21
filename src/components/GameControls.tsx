import { Button } from "@/components/ui/button";
import { RotateCw, Delete, Check } from "lucide-react";

interface GameControlsProps {
  onShuffle: () => void;
  onDelete: () => void;
  onSubmit: () => void;
}

export const GameControls = ({ onShuffle, onDelete, onSubmit }: GameControlsProps) => {
  return (
    <div className="flex gap-3 justify-center w-full max-w-md">
      <Button
        id="shuffle-button"
        variant="outline"
        size="lg"
        onClick={onShuffle}
        className="flex-1 gap-2 hover:bg-secondary"
      >
        <RotateCw className="w-5 h-5" />
        Shuffle
      </Button>
      <Button
        id="delete-button"
        variant="outline"
        size="lg"
        onClick={onDelete}
        className="flex-1 gap-2 hover:bg-secondary"
      >
        <Delete className="w-5 h-5" />
        Delete
      </Button>
      <Button
        id="submit-button"
        size="lg"
        onClick={onSubmit}
        className="flex-1 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
      >
        <Check className="w-5 h-5" />
        Enter
      </Button>
    </div>
  );
};
