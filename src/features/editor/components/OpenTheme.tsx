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
    <main className="open-theme">
      <div className="welcome-heading">
        <div className="welcome-braces">
          <BracesIcon />
        </div>
        <div className="eyebrow">A workspace for your BetterDiscord themes</div>
        <h1>
          Your theme.
          <br />
          <span>Your starting point.</span>
        </h1>
        <p>
          Open the CSS you already love. Make it feel a little more like you.
        </p>
      </div>
      <button className="theme-dropzone" onClick={onFile} disabled={disabled}>
        <div className="drop-file-icon">
          <FileCode2Icon />
        </div>
        <strong>Drop a .theme.css file here</strong>
        <span>or click to choose a file from your device</span>
        <span className="drop-browse">
          <FolderOpenIcon />
          Open theme <ArrowUpRightIcon />
        </span>
      </button>
      <div className="open-alternatives">
        <Button variant="outline" onClick={onPaste} disabled={disabled}>
          Paste CSS
        </Button>
        <Button variant="ghost" onClick={onNew} disabled={disabled}>
          <PlusIcon data-icon="inline-start" />
          Start from scratch
        </Button>
      </div>
      <Separator />
      <div className="sample-entry">
        <div className="sample-palette">
          <span />
          <span />
          <span />
        </div>
        <div>
          <strong>A little inspiration?</strong>
          <p>Try Midnight, our editable starter theme.</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={onSample}
          disabled={disabled}
        >
          Try Midnight <ArrowUpRightIcon data-icon="inline-end" />
        </Button>
      </div>
      <p className="local-promise">
        Your files stay on this device. No accounts. No uploads.
      </p>
    </main>
  );
}
