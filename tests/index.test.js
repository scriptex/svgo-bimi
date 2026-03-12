import fs from 'node:fs';
import path from 'node:path';
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

import { optimize } from 'svgo';

import { svgoBimiPlugin, validateBimi } from '../dist/index.js';

const getFixture = name => fs.readFileSync(path.join(process.cwd(), 'tests/fixtures', name), 'utf8');

describe('BIMI Integration Tests', () => {
	test('Transformation: Should clean dirty headers', () => {
		const raw = getFixture('dirty-headers.svg');
		const result = optimize(raw, { plugins: [svgoBimiPlugin] });
		const svgTag = result.data.match(/<svg[^>]*>/)?.[0] || '';

		assert.strictEqual(/\sx=/i.test(svgTag), false, 'SVG tag still contains x attribute');
		assert.strictEqual(/\sy=/i.test(svgTag), false, 'SVG tag still contains y attribute');
	});

	test('Validation: Should pass a perfect SVG with no errors or warnings', () => {
		const raw = getFixture('pass.svg');
		const { errors, warnings } = validateBimi(raw);

		assert.strictEqual(errors.length, 0, 'Should have no errors');
		assert.strictEqual(warnings.length, 0, 'Should have no warnings');
	});

	test('Validation: Should catch embedded bitmaps as errors', () => {
		const raw = getFixture('fail-bitmap.svg');
		const { errors } = validateBimi(raw);

		assert.ok(errors.length > 0);
		assert.match(errors[0], /bitmaps/i);
	});

	test('Validation: Should catch text elements as warnings', () => {
		const raw = getFixture('fail-text.svg');
		const { warnings } = validateBimi(raw);

		assert.ok(warnings.length > 0);
		assert.match(warnings[0], /Font tags/i);
	});

	test('Security: Should strip forbidden script tags', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0h10v10H0z"/></svg>';
		const result = optimize(svg, { plugins: [svgoBimiPlugin] });
		const hasScript = /<script/i.test(result.data);

		assert.strictEqual(hasScript, false, `Output still contains script tag: ${result.data}`);
	});
});
