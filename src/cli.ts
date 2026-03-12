import fs from 'node:fs';
import path from 'node:path';

import chalk from 'chalk';
import { Command } from 'commander';
import { optimize, Config, PluginConfig } from 'svgo';

import { svgoBimiPlugin, validateBimi } from './index.js';

const program = new Command();

program
	.name('svgo-bimi')
	.description('Optimize and validate SVGs for BIMI compliance')
	.version('1.0.0')
	.requiredOption('-f, --file <path>', 'path to the SVG file to process')
	.option('-o, --output <dir>', 'output directory', '.')
	.action(async (options: { file: string; output: string }) => {
		const inputPath = path.resolve(options.file);

		if (!fs.existsSync(inputPath)) {
			console.error(chalk.red(`❌ Error: File not found at ${inputPath}`));

			process.exit(1);
		}

		const rawSvg = fs.readFileSync(inputPath, 'utf8');
		const filename = path.basename(options.file, '.svg');
		const outputDir = path.resolve(options.output);

		if (!fs.existsSync(outputDir)) {
			fs.mkdirSync(outputDir, { recursive: true });
		}

		const validation = validateBimi(rawSvg);

		const config: Config = {
			multipass: true,
			plugins: [svgoBimiPlugin as PluginConfig, { name: 'preset-default' } as PluginConfig]
		};

		const optimized = optimize(rawSvg, config);
		let finalSvg = optimized.data;

		if (!finalSvg.includes('version="1.2"')) {
			finalSvg = finalSvg.replace('<svg', '<svg version="1.2" baseProfile="tiny-ps"');
		}

		const vb = optimized.data.match(/viewBox=["'](\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)\s+(\d+\.?\d*)["']/);

		if (vb && vb[3] !== vb[4]) {
			validation.warnings.push(`Aspect ratio is not 1:1 (${vb[3]}x${vb[4]}).`);
		}

		const sizeKB = optimized.data.length / 1024;

		if (sizeKB > 32) {
			validation.errors.push(`File size is ${sizeKB.toFixed(2)}KB (Limit: 32KB).`);
		}

		const outPath = path.join(outputDir, `${filename}-bimi.svg`);

		fs.writeFileSync(outPath, finalSvg);

		console.log(chalk.bold(`\n--- SVGO BIMI Report: ${path.basename(options.file)} ---`));

		validation.errors.forEach(e => console.log(chalk.red(`❌ ${e}`)));
		validation.warnings.forEach(w => console.log(chalk.yellow(`⚠️ ${w}`)));

		if (validation.errors.length === 0 && validation.warnings.length === 0) {
			console.log(chalk.green('✅ SVGO BIMI Ready!'));
		}

		console.log(chalk.gray(`Final Size: ${sizeKB.toFixed(2)} KB`));
		console.log(chalk.gray(`Saved to: ${outPath}\n`));
	});

program.parse();
