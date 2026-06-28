import { toast } from "react-toastify";

// Console-themed toast helpers. Mint check for success, amber for errors.
export const notify = {
  success: (msg: string) =>
    toast.success(msg, { icon: false, style: { borderLeft: "3px solid var(--mint)" } }),
  error: (msg: string) =>
    toast.error(msg, { icon: false, style: { borderLeft: "3px solid var(--signal)" } }),
  info: (msg: string) =>
    toast(msg, { icon: false, style: { borderLeft: "3px solid var(--slate)" } }),
};
