import { Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export function InfoTip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Info className="w-3 h-3 text-muted-foreground/60 cursor-help inline ml-1" />
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}
