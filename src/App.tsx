import { AppErrorBoundary } from "@/app/AppErrorBoundary";
import { AppShell } from "@/app/AppShell";

export default function App() {
  return (
    <AppErrorBoundary>
      <AppShell />
    </AppErrorBoundary>
  );
}
