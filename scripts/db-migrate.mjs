import { spawn } from "node:child_process";

const run = (command, args) =>
	new Promise((resolve, reject) => {
		const child = spawn(command, args, {
			stdio: "pipe",
			shell: process.platform === "win32",
			env: process.env,
		});

		let stdout = "";
		let stderr = "";

		child.stdout.on("data", (chunk) => {
			const text = chunk.toString();
			stdout += text;
			process.stdout.write(text);
		});

		child.stderr.on("data", (chunk) => {
			const text = chunk.toString();
			stderr += text;
			process.stderr.write(text);
		});

		child.on("error", reject);
		child.on("close", (code) => {
			if (code === 0) {
				resolve({ stdout, stderr });
				return;
			}
			reject(
				new Error(
					`Command failed (${command} ${args.join(" ")}): ${stderr || stdout}`,
				),
			);
		});
	});

async function main() {
	const prismaArgs = ["prisma"];
	try {
		await run("npx", [...prismaArgs, "migrate", "deploy"]);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		if (!message.includes("P3005")) {
			throw error;
		}

		console.warn(
			'Detected baseline drift (P3005). Falling back to "prisma db push" for this environment.',
		);
		await run("npx", [...prismaArgs, "db", "push"]);
	}

	await run("npm", ["run", "db:backfill:equipment-categories"]);
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exit(1);
});
