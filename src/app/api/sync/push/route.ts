import { api, HttpError } from "@/lib/http";
import { device } from "@/lib/auth";
export async function POST(request: Request) {
  return api(async () => {
    await device(request);
    throw new HttpError(410, "旧版任意数据写入接口已停用，请使用答题保存接口。");
  });
}
