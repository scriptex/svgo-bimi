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
});
