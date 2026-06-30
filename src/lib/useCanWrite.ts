import { useWriteAccess } from "@/routes/admin";

export function useCanWrite() {
  return useWriteAccess();
}
