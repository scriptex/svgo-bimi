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
});
