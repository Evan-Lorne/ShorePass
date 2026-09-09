import { api, HttpError } from "@/lib/http";
import { assertOrigin, createDevice, device, setDeviceCookie } from "@/lib/auth";
export async function POST(request: Request) {
  return api(async () => {
    assertOrigin(request);
    let current;
    try {
      current = await device(request);
    } catch (e) {
      if (!(e instanceof HttpError) || e.status !== 401) throw e;
      current = await createDevice();
    }
    await setDeviceCookie(current.token);
    return { userId: current.userId, lastSyncAt: current.lastSyncAt };
  });
}
