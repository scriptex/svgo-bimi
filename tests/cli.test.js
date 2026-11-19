import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { test, describe, before, after } from 'node:test';

const CLI_PATH = path.resolve('bin/index.js');
const OUTPUT_DIR = path.resolve('tests/output');
const FIXTURES_DIR = path.resolve('tests/fixtures');

describe('CLI Integration Tests', () => {
	before(() => {
		if (!fs.existsSync(OUTPUT_DIR)) {
			fs.mkdirSync(OUTPUT_DIR);
		}
	});

	after(() => {
		if (fs.existsSync(OUTPUT_DIR)) {
			fs.rmSync(OUTPUT_DIR, { recursive: true, force: true });
		}
	});

	test('CLI: should process file with --file and --output flags', () => {
		const inputFile = path.join(FIXTURES_DIR, 'pass.svg');

		execSync(`node ${CLI_PATH} -f ${inputFile} -o ${OUTPUT_DIR}`);

		const expectedFile = path.join(OUTPUT_DIR, 'pass-bimi.svg');

		assert.ok(fs.existsSync(expectedFile), 'Output file was not created');

		const content = fs.readFileSync(expectedFile, 'utf8');

		assert.match(content, /version="1.2"/, 'Missing BIMI version');
		assert.match(content, /baseProfile="tiny-ps"/, 'Missing BIMI profile');
		assert.strictEqual((content.match(/version="1\.2"/g) || []).length, 1, 'Duplicate BIMI version');
		assert.strictEqual((content.match(/baseProfile="tiny-ps"/g) || []).length, 1, 'Duplicate BIMI profile');
	});

	test('CLI: should fail gracefully if file is missing', () => {
		assert.throws(() => {
			execSync(`node ${CLI_PATH} -f non-existent.svg`, { stdio: 'pipe' });
		}, /Error: File not found/);
	});

	test('CLI: should create output directory if it does not exist', () => {
		const nestedDir = path.join(OUTPUT_DIR, 'nested/path');
		const inputFile = path.join(FIXTURES_DIR, 'pass.svg');

		execSync(`node ${CLI_PATH} -f ${inputFile} -o ${nestedDir}`);

		assert.ok(fs.existsSync(nestedDir), 'Nested output directory was not created');
		assert.ok(fs.existsSync(path.join(nestedDir, 'pass-bimi.svg')));
	});

	test('CLI: should convert arcs and preserve single BIMI attributes', () => {
		const inputFile = path.join(OUTPUT_DIR, 'arc.svg');
		const raw = '<svg viewBox="0 0 100 100"><path d="M10 50 A40 40 0 0 1 90 50"/></svg>';

		fs.writeFileSync(inputFile, raw);

		execSync(`node ${CLI_PATH} -f ${inputFile} -o ${OUTPUT_DIR}`);

		const content = fs.readFileSync(path.join(OUTPUT_DIR, 'arc-bimi.svg'), 'utf8');
		const pathData = content.match(/<path[^>]*\bd="([^"]+)"/)?.[1] || '';

		assert.match(pathData, /[Cc]/, 'Arc was not converted to a cubic curve');
		assert.doesNotMatch(pathData, /[aA]/, 'Arc command remains in the path');
		assert.strictEqual((content.match(/version="1\.2"/g) || []).length, 1, 'Duplicate BIMI version');
		assert.strictEqual((content.match(/baseProfile="tiny-ps"/g) || []).length, 1, 'Duplicate BIMI profile');
	});

	test('CLI: should not reintroduce arcs in the supplied BIMI logo', () => {
		const inputFile = path.join(OUTPUT_DIR, 'supplied-logo.svg');
		// https://github.com/scriptex/svgo-bimi/issues/23
		const raw =
			'<svg version="1.2" xmlns="http://www.w3.org/2000/svg" width="800" height="800" baseProfile="tiny-ps" viewBox="0 0 24 24"><title>BIMI Logo</title><circle cx="9.5" cy="14.5" r="7.5" stroke="#eceff4" stroke-width="1.5"/><path stroke="#eceff4" stroke-linecap="round" stroke-width="1.5" d="M10 16h2"/><path fill="#eceff4" d="M14 12.5c0 .828-.448 1.5-1 1.5s-1-.672-1-1.5.448-1.5 1-1.5 1 .672 1 1.5"/><ellipse cx="9" cy="12.5" fill="#eceff4" rx="1" ry="1.5"/><path stroke="#eceff4" stroke-linecap="round" stroke-width="1.5" d="m17 7-2 2"/><path stroke="#eceff4" stroke-width="1.5" d="M17.981 2.353a.558.558 0 0 1 1.038 0l.654 1.66c.057.143.17.257.315.314l1.659.654c.47.186.47.852 0 1.038l-1.66.654a.56.56 0 0 0-.314.315l-.654 1.659a.558.558 0 0 1-1.038 0l-.654-1.66a.56.56 0 0 0-.315-.314l-1.659-.654a.558.558 0 0 1 0-1.038l1.66-.654a.56.56 0 0 0 .314-.315z"/></svg>';

		fs.writeFileSync(inputFile, raw);

		execSync(`node ${CLI_PATH} -f ${inputFile} -o ${OUTPUT_DIR}`);

		const content = fs.readFileSync(path.join(OUTPUT_DIR, 'supplied-logo-bimi.svg'), 'utf8');
		const pathData = [...content.matchAll(/<path\b[^>]*\bd="([^"]+)"/g)].map(match => match[1]);

		assert.ok(pathData.length > 0, 'No path data found in optimized logo');
		assert.ok(
			pathData.every(d => !/[aA]/.test(d)),
			'Arc command remains in a path'
		);

		assert.strictEqual((content.match(/version="1\.2"/g) || []).length, 1, 'Duplicate BIMI version');
		assert.strictEqual((content.match(/baseProfile="tiny-ps"/g) || []).length, 1, 'Duplicate BIMI profile');
	});

	test('CLI: should preserve inherited root presentation attributes', () => {
		const inputFile = path.join(OUTPUT_DIR, 'root-fill.svg');
		const raw = '<svg fill="none" stroke="#1C274C" stroke-width="1.5" viewBox="0 0 24 24"><path d="M2 2h20"/></svg>';

		fs.writeFileSync(inputFile, raw);

		execSync(`node ${CLI_PATH} -f ${inputFile} -o ${OUTPUT_DIR}`);

		const content = fs.readFileSync(path.join(OUTPUT_DIR, 'root-fill-bimi.svg'), 'utf8');
		const svgTag = content.match(/<svg\b[^>]*>/)?.[0] || '';

		assert.match(svgTag, /\bfill="none"/, 'Root fill was removed');
		assert.match(svgTag, /\bstroke="#1c274c"/i, 'Root stroke was removed');
		assert.match(svgTag, /\bstroke-width="1\.5"/, 'Root stroke width was removed');
	});

	test('CLI: should preserve transparency and stroke widths in reported SVGs', () => {
		for (const fixture of ['bell-off.svg', 'buildings-2.svg', 'palette-round.svg']) {
			const inputFile = path.join(FIXTURES_DIR, fixture);

			execSync(`node ${CLI_PATH} -f ${inputFile} -o ${OUTPUT_DIR}`);

			const outputFile = path.join(
				OUTPUT_DIR,
				`${path.basename(fixture, '.svg')}-bimi.svg`
			);
			const content = fs.readFileSync(outputFile, 'utf8');
			const svgTag = content.match(/<svg\b[^>]*>/)?.[0] || '';

			assert.match(svgTag, /\bfill="none"/, `${fixture}: root transparency was removed`);
			assert.match(content, /\bstroke-width="1\.5"/, `${fixture}: stroke width was removed`);
			assert.strictEqual(
				(content.match(/version="1\.2"/g) || []).length,
				1,
				`${fixture}: duplicate BIMI version`
			);
			assert.strictEqual(
				(content.match(/baseProfile="tiny-ps"/g) || []).length,
				1,
				`${fixture}: duplicate BIMI profile`
			);
		}
	});
});
