const esbuild = require("esbuild");

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

/**
 * @type {import('esbuild').Plugin}
 */
const esbuildProblemMatcherPlugin = {
	name: "esbuild-problem-matcher",

	setup(build) {
		build.onStart(() => {
			console.log("[watch] Build started...");
		});
		build.onEnd((result) => {
			if (result.errors.length > 0) {
				console.error("[watch] Build finished with errors:");
				result.errors.forEach(({ text, location }) => {
					console.error(`✘ [ERROR] ${text}`);
					if (location) {
						console.error(`    ${location.file}:${location.line}:${location.column}`);
					}
				});
			} else if (result.warnings.length > 0) {
				console.warn("[watch] Build finished with warnings:");
				result.warnings.forEach(({ text, location }) => {
					console.warn(`⚠️ [WARNING] ${text}`);
					if (location) {
						console.warn(`    ${location.file}:${location.line}:${location.column}`);
					}
				});
			} else {
				console.log("[watch] Build finished successfully!");
			}
		});
	},
};

async function main() {
	const ctx = await esbuild.context({
		entryPoints: ["src/extension.ts"], // Entry point for your extension
		bundle: true, // Combines everything into a single file
		format: "cjs", // CommonJS format for Node.js
		minify: production, // Minify the code in production mode
		sourcemap: !production, // Include source maps in non-production mode
		sourcesContent: !production, // Include sources content in source maps
		platform: "node", // Target Node.js runtime
		outfile: "dist/extension.js", // Output file location
		external: ["vscode"], // Exclude VSCode module
		logLevel: "info", // Provide build status updates
		plugins: [
			// Add the problem matcher plugin
			esbuildProblemMatcherPlugin,
		],
		define: {
			"process.env.NODE_ENV": production ? '"production"' : '"development"', // Define environment variables
		},
	});

	if (watch) {
		// Enable watch mode for continuous builds
		console.log("[watch] Watching for changes...");
		await ctx.watch();
	} else {
		// Perform a one-time build and clean up resources
		await ctx.rebuild();
		await ctx.dispose();
		console.log("[build] Build completed successfully.");
	}
}

// Run the esbuild process and handle errors
main().catch((e) => {
	console.error("[build] An error occurred during the build process:");
	console.error(e);
	process.exit(1);
});
