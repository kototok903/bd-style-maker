import type { ErrorInfo, ReactNode } from "react";
import { Component } from "react";

export class AppErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Editor error", error, info.componentStack);
  }
  render() {
    if (this.state.failed)
      return (
        <main className="m-auto max-w-[600px] px-[30px] py-[60px]">
          <h1 className="mb-[15px] text-2xl">The workspace hit a problem.</h1>
          <p className="mb-5 text-muted-foreground">
            Your last saved draft stays on this device. Reload to recover it.
          </p>
          <button
            className="rounded-[7px] bg-primary px-[15px] py-2.5 text-primary-foreground"
            onClick={() => window.location.reload()}
          >
            Reload workspace
          </button>
        </main>
      );
    return this.props.children;
  }
}
