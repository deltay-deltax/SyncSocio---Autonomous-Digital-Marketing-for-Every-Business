import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ImageCompareSlider } from "./ImageCompareSlider";

interface ImageCompareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const ImageCompareDialog = ({ open, onOpenChange }: ImageCompareDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl border-border/50 bg-background/95 backdrop-blur-xl overflow-hidden p-6 rounded-3xl">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-2xl font-bold">SD vs HD Quality</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Slide the handle to compare standard definition (SD) with high definition (HD) image quality.
          </DialogDescription>
        </DialogHeader>
        <ImageCompareSlider imageSrc="/assets/landing/car1.jpg" />
      </DialogContent>
    </Dialog>
  );
};
