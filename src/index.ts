import { CustomPlugin } from 'svgo';

export const svgoBimiPlugin: CustomPlugin = {
	name: 'svgo-bimi-plugin',
	fn: () => ({
		element: {
			exit: (node, parentNode) => {
				const forbiddenTags = ['script', 'foreignObject', 'audio', 'video', 'iframe'];

				if (forbiddenTags.includes(node.name)) {
					parentNode.children = parentNode.children.filter(child => child !== node);

					return;
				}

				if (node.name === 'svg') {
					node.attributes.version = '1.2';
					node.attributes.baseProfile = 'tiny-ps';

					delete node.attributes.x;
					delete node.attributes.y;
				}
			}
		}
	})
};

export const validateBimi = (svgData: string) => {
	const errors: string[] = [];
	const warnings: string[] = [];

	if (svgData.includes('<image') || svgData.includes('data:image/')) {
		errors.push('Embedded bitmaps detected.');
	}

	if (svgData.includes('<text') || svgData.includes('<tspan')) {
		warnings.push('Font tags detected.');
	}

	return {
		errors,
		warnings
	};
};
