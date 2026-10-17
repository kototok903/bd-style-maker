import {
  ArrowUpRightIcon,
  BracesIcon,
  FileCode2Icon,
  FolderOpenIcon,
  PlusIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

type Props = {
  onFile: () => void;
  onPaste: () => void;
  onSample: () => void;
  onNew: () => void;
  disabled: boolean;
};
export function OpenTheme({
  onFile,
  onPaste,
  onSample,
  onNew,
  disabled,
}: Props) {
  return (
    <main className="m-auto w-full max-w-[620px] overflow-y-auto px-7 py-8 max-[760px]:px-[23px]">
      <div>
        <div className="mb-[26px] grid size-[50px] place-items-center rounded-[14px] border bg-card text-ring">
          <BracesIcon className="size-[25px]" />
        </div>
        <div className="text-[9px] font-[550] tracking-[1.3px] text-subtle-foreground uppercase">
          A workspace for your BetterDiscord themes
        </div>
        <h1 className="mt-3.5 mb-[15px] text-[44px] leading-[1.12] font-semibold tracking-[-1.9px] max-[760px]:text-[37px]">
          Your theme.
          <br />
          <span className="text-muted-foreground">Your starting point.</span>
        </h1>
        <p className="max-w-[380px] text-[13px] leading-[1.75] text-muted-foreground">
          Open the CSS you already love. Make it feel a little more like you.
        </p>
      </div>
      <button
        className="mt-[30px] flex w-full flex-col items-center gap-1.5 rounded-xl border border-dashed border-muted-foreground/40 bg-card px-5 py-[27px] transition-colors duration-150 hover:border-ring hover:bg-muted"
        onClick={onFile}
        disabled={disabled}
      >
        <div className="mb-2.5 text-muted-foreground">
          <FileCode2Icon className="size-[25px]" />
        </div>
        <strong className="text-[14px] font-medium">
          Drop a .theme.css file here
        </strong>
        <span className="text-[11px] text-muted-foreground">
          or click to choose a file from your device
        </span>
        <span className="mt-[13px] flex items-center gap-[7px] rounded-md bg-primary px-3 py-[7px] text-[12px] text-primary-foreground">
          <FolderOpenIcon className="size-[13px]" />
          Open theme <ArrowUpRightIcon className="size-[13px]" />
        </span>
      </button>
      <div className="mt-4 mb-7 flex justify-center gap-[7px]">
        <Button variant="outline" onClick={onPaste} disabled={disabled}>
          Paste CSS
        </Button>
        <Button variant="ghost" onClick={onNew} disabled={disabled}>
          <PlusIcon data-icon="inline-start" />
          Start from scratch
        </Button>
      </div>
      <Separator />
      <div className="my-[23px] flex items-center gap-3 max-[760px]:gap-[9px]">
        <div className="flex size-9 shrink-0 items-center max-[760px]:hidden">
          <span className="h-[30px] w-3 -rotate-12 rounded bg-[#a7b7ff]" />
          <span className="h-[30px] w-3 rounded bg-[#687592]" />
          <span className="h-[30px] w-3 rotate-12 rounded bg-[#d9dce7]" />
        </div>
        <div>
          <strong className="text-[12px] font-medium">
            A little inspiration?
          </strong>
          <p className="mt-[3px] text-[11px] text-muted-foreground max-[760px]:max-w-[150px]">
            Try Midnight, our editable starter theme.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="ml-auto max-[760px]:shrink-0"
          onClick={onSample}
          disabled={disabled}
        >
          Try Midnight <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
      </div>
      <p className="mt-[25px] text-center text-[10px] text-subtle-foreground">
        Your files stay on this device. No accounts. No uploads.
      </p>
    </main>
  );
}
