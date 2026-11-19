import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { test, describe, before, after } from 'node:test';

import { Resvg } from '@resvg/resvg-js';
import pixelmatch from 'pixelmatch';

const CLI_PATH = path.resolve('bin/index.js');
const OUTPUT_DIR = path.resolve('tests/visual-output');
const FIXTURES_DIR = path.resolve('tests/fixtures');
const IMAGE_SIZE = 256;
const MAX_DIFFERING_PIXEL_RATIO = 0.01;

const renderSvg = svg =>
	new Resvg(svg, { fitTo: { mode: 'width', value: IMAGE_SIZE } }).render();

const compareVisuals = (inputSvg, outputSvg) => {
	const input = renderSvg(inputSvg);
	const output = renderSvg(outputSvg);

	assert.strictEqual(input.width, output.width, 'Rendered image widths differ');
	assert.strictEqual(input.height, output.height, 'Rendered image heights differ');

	const differentPixels = pixelmatch(
		input.pixels,
		output.pixels,
		null,
		input.width,
		input.height,
		{ threshold: 0.1, includeAA: false, checkerboard: false }
	);

	return differentPixels / (input.width * input.height);
};

describe('SVG visual regression tests', () => {
	before(() => {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	});

	after(() => {
		fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
	});

	for (const fixture of [
		'bomb-minimalistic.svg',
		'bell-off.svg',
		'buildings-2.svg',
		'palette-round.svg',
		'pass.svg'
	]) {
		test(`CLI output should visually match ${fixture}`, () => {
			const inputPath = path.join(FIXTURES_DIR, fixture);
			const outputPath = path.join(
				OUTPUT_DIR,
				`${path.basename(fixture, '.svg')}-bimi.svg`
			);

			execFileSync('node', [CLI_PATH, '-f', inputPath, '-o', OUTPUT_DIR]);

			const differenceRatio = compareVisuals(
				fs.readFileSync(inputPath, 'utf8'),
				fs.readFileSync(outputPath, 'utf8')
			);

			assert.ok(
				differenceRatio <= MAX_DIFFERING_PIXEL_RATIO,
				`${fixture}: ${(differenceRatio * 100).toFixed(2)}% of pixels differ ` +
					`(maximum ${(MAX_DIFFERING_PIXEL_RATIO * 100).toFixed(2)}%)`
			);
		});
	}

	test('CLI arc conversion should preserve the rendered appearance', () => {
		const inputPath = path.join(OUTPUT_DIR, 'arcs.svg');
		const inputSvg =
			'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" ' +
			'fill="none" stroke="#1c274c" stroke-width="2">' +
			'<path d="M50 10 A40 40 0 1 1 49.99 10 M20 50 a30 20 35 0 1 60 0"/>' +
			'</svg>';
		const outputPath = path.join(OUTPUT_DIR, 'arcs-bimi.svg');

		fs.writeFileSync(inputPath, inputSvg);
		execFileSync('node', [CLI_PATH, '-f', inputPath, '-o', OUTPUT_DIR]);

		const differenceRatio = compareVisuals(
			inputSvg,
			fs.readFileSync(outputPath, 'utf8')
		);

		assert.ok(
			differenceRatio <= MAX_DIFFERING_PIXEL_RATIO,
			`Arc conversion changed ${(differenceRatio * 100).toFixed(2)}% of pixels ` +
				`(maximum ${(MAX_DIFFERING_PIXEL_RATIO * 100).toFixed(2)}%)`
		);
	});
});
