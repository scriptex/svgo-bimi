import { CustomPlugin, optimize, XastElement } from 'svgo';

export type SVGOBIMIValidationResult = {
	errors: string[];
	warnings: string[];
};

export const svgoBimiForbiddenTags = new Set([
	'animate',
	'animateMotion',
	'animateTransform',
	'audio',
	'foreignObject',
	'iframe',
	'script',
	'video',
	'image'
]);

export const svgoBimiValidateNode = (node: XastElement): SVGOBIMIValidationResult => {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (svgoBimiForbiddenTags.has(node.name)) {
		errors.push(`SVGO-BIMI error: Prohibited element: <${node.name}>`);
	}

	if (node.attributes.href?.includes('http') || node.attributes['xlink:href']?.includes('http')) {
		errors.push(`SVGO-BIMI error: External resource reference in <${node.name}>`);
	}

	if (['filter', 'mask', 'style'].includes(node.name) || node.attributes.style) {
		warnings.push(`SVGO-BIMI warning: Complex rendering element: <${node.name}>`);
	}

	if (node.name === 'image') {
		errors.push('SVGO-BIMI error: Embedded bitmap detected.');
	}

	if (node.name === 'text' || node.name === 'tspan') {
		warnings.push('SVGO-BIMI warning: Font tags detected.');
	}

	return { errors, warnings };
};

export const svgoBimiPlugin: CustomPlugin = {
	name: 'svgo-bimi-plugin',
	fn: () => ({
		element: {
			enter: node => {
				const { errors, warnings } = svgoBimiValidateNode(node);

				errors.forEach(e => {
					throw new Error(e);
				});

				warnings.forEach(w => console.warn(w));
			},
			exit: (node, parentNode) => {
				if (svgoBimiForbiddenTags.has(node.name)) {
					parentNode.children = parentNode.children.filter(c => c !== node);

					return;
				}

				if (node.name === 'svg') {
					const allowedAttributes = new Set([
						'xmlns',
						'xmlns:xlink',
						'version',
						'baseProfile',
						'viewBox',
						'width',
						'height'
					]);

					for (const attr in node.attributes) {
						if (!allowedAttributes.has(attr)) {
							delete node.attributes[attr];
						}
					}

					const hasTitle = node.children.some(child => child.type === 'element' && child.name === 'title');

					if (!hasTitle) {
						node.children.unshift({
							type: 'element',
							name: 'title',
							attributes: {},
							children: [
								{
									type: 'text',
									value: 'BIMI Logo'
								}
							]
						});
					}

					Object.assign(node.attributes, {
						xmlns: 'http://www.w3.org/2000/svg',
						'xmlns:xlink': 'http://www.w3.org/1999/xlink',
						version: '1.2',
						baseProfile: 'tiny-ps'
					});
				}
			}
		}
	})
};

export const validateBimi = (svgData: string): SVGOBIMIValidationResult => {
	let result: SVGOBIMIValidationResult = {
		errors: [],
		warnings: []
	};

	optimize(svgData, {
		plugins: [
			{
				name: 'bimi-validator',
				fn: () => ({
					element: {
						enter: (node: XastElement) => {
							const { errors, warnings } = svgoBimiValidateNode(node);

							result.errors.push(...errors);
							result.warnings.push(...warnings);
						}
					}
				})
			}
		]
	});

	return result;
};
