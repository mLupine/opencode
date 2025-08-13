import path from "path";
import os from "os";
import { z } from "zod";
import { Log } from "../util/log";
import { version } from "../../package.json";

export namespace AuthCodex {
  const log = Log.create({ service: "auth-codex" });

  const AuthDataSchema = z.object({
    tokens: z.object({
      id_token: z.string(),
      access_token: z.string(),
      refresh_token: z.string(),
      account_id: z.string(),
    }),
    last_refresh: z.string(),
  });

  export type AuthData = z.infer<typeof AuthDataSchema>;

  export async function get(): Promise<AuthData | null> {
    try {
      const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
      const authPath = path.join(codexHome, "auth.json");
      const file = Bun.file(authPath);
      if (!(await file.exists())) {
        return null;
      }
      const data = await file.json();
      const parsed = AuthDataSchema.safeParse(data);
      if (!parsed.success) {
        log.info("Invalid auth.json structure", { error: parsed.error });
        return null;
      }
      if (
        !parsed.data.tokens.id_token ||
        !parsed.data.tokens.access_token ||
        !parsed.data.tokens.refresh_token ||
        !parsed.data.tokens.account_id
      ) {
        log.info("Empty token fields in auth.json");
        return null;
      }
      return parsed.data;
    } catch (error) {
      log.error("Failed to read or parse ChatGPT auth file", { error });
      return null;
    }
  }

  const DEFAULT_ORIGINATOR = "codex_cli_rs";

  export function getUserAgent(originator?: string): string {
    const osInfo = {
      type: os.type(),
      version: os.release(),
      arch: os.arch(),
    };
    return `${originator || DEFAULT_ORIGINATOR}/${version} (${osInfo.type} ${osInfo.version}; ${osInfo.arch})`;
  }
}
