import { toast } from "sonner";
import { useCrm } from "@/lib/store";

/** Applies a data change and shows a toast whose action puts the previous data back. */
export function withUndo(message: string, undoLabel: string, change: () => void): void {
  const { snapshot, restore } = useCrm.getState();
  const before = snapshot();
  change();
  toast(message, { action: { label: undoLabel, onClick: () => restore(before) } });
}
