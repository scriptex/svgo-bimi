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
		assert.strictEqual(errors[0], 'SVGO-BIMI error: Prohibited element: <image>');
	});

	test('Validation: Should catch text elements as warnings', () => {
		const raw = getFixture('fail-text.svg');
		const { warnings } = validateBimi(raw);

		assert.ok(warnings.length > 0);
		assert.match(warnings[0], /Font tags/i);
	});

	test('Security: Should strip forbidden script tags', () => {
		const svg = '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><path d="M0 0h10v10H0z"/></svg>';

		assert.throws(() => optimize(svg, { plugins: [svgoBimiPlugin] }));
	});

	test('Validation: Should detect multiple violations in one file', () => {
		const raw = '<svg><image href="http://bad.com/img.png"/><text>Forbidden</text></svg>';
		const { errors, warnings } = validateBimi(raw);

		console.log(errors, warnings);

		assert.ok(errors.length >= 2, 'Should catch both image and external link');
		assert.ok(warnings.length > 0, 'Should catch text element');
	});

	test('Transformation: Should not duplicate baseProfile/version', () => {
		const raw = '<svg version="1.2" baseProfile="tiny-ps"></svg>';
		const result = optimize(raw, { plugins: [svgoBimiPlugin] });

		const versionCount = (result.data.match(/version="1.2"/g) || []).length;
		const profileCount = (result.data.match(/baseProfile="tiny-ps"/g) || []).length;

		assert.strictEqual(versionCount, 1, 'Should not duplicate version');
		assert.strictEqual(profileCount, 1, 'Should not duplicate baseProfile');
	});

	test('Validation: Should recursively scan nested groups', () => {
		const raw = '<svg><g><g><script>bad()</script></g></g></svg>';
		// Using validateBimi to check if it finds nested forbidden tags
		const { errors } = validateBimi(raw);

		assert.ok(errors.length > 0, 'Should find forbidden tag in nested group');
	});
});
