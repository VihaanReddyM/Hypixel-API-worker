import { env, createExecutionContext, waitOnExecutionContext } from "cloudflare:test";
import { describe, it, expect } from "vitest";
import worker from "../src/index";

const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

async function sha256Hex(input: string): Promise<string> {
	const bytes = new TextEncoder().encode(input);
	const digest = await crypto.subtle.digest("SHA-256", bytes);
	const hashBytes = new Uint8Array(digest);
	let hex = "";
	for (const b of hashBytes) hex += b.toString(16).padStart(2, "0");
	return hex;
}

describe("hypixel-api worker auth", () => {
	it("rejects requests without Authorization", async () => {
		(env as unknown as Env).HYPIXEL_API_KEY = "test";
		(env as unknown as Env).GUILD_API_KEYS = JSON.stringify({
			keys: [{ id: "guild-a", sha256: await sha256Hex("guild-a-key") }],
		});

		const request = new IncomingRequest("http://example.com/");
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env as unknown as Env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(401);
		expect(await response.json()).toEqual({ error: "unauthorized" });
	});

	it("accepts requests with a valid Bearer token", async () => {
		const rawKey = "guild-a-key";
		(env as unknown as Env).HYPIXEL_API_KEY = "test";
		(env as unknown as Env).GUILD_API_KEYS = JSON.stringify({
			keys: [{ id: "guild-a", sha256: await sha256Hex(rawKey) }],
		});

		const request = new IncomingRequest("http://example.com/", {
			headers: {
				Authorization: `Bearer ${rawKey}`,
			},
		});
		const ctx = createExecutionContext();
		const response = await worker.fetch(request, env as unknown as Env, ctx);
		await waitOnExecutionContext(ctx);

		expect(response.status).toBe(200);
		expect(await response.json()).toEqual({ status: "online" });
	});
});
