import { createSafeActionClient } from "next-safe-action";
import { getSelf } from "./auth-service";

export const action = createSafeActionClient({
  async middleware() {
    const self = await getSelf();
    return { self };
  },
  handleReturnedServerError(error) {
    return error instanceof Error ? error.message : "An unknown server error occurred.";
  }
});
