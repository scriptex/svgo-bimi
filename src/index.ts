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

const pathArgumentCounts: Record<string, number> = {
	M: 2,
	L: 2,
	H: 1,
	V: 1,
	C: 6,
	S: 4,
	Q: 4,
	T: 2,
	A: 7
};

const convertArcToCurves = (startX: number, startY: number, arc: number[]): number[][] => {
	const [rawRx, rawRy, rotation, largeArc, sweep, endX, endY] = arc;

	const rx = Math.abs(rawRx);
	const ry = Math.abs(rawRy);

	if (startX === endX && startY === endY) {
		return [];
	}

	if (rx === 0 || ry === 0) {
		const deltaX = (endX - startX) / 3;
		const deltaY = (endY - startY) / 3;

		return [[startX + deltaX, startY + deltaY, startX + 2 * deltaX, startY + 2 * deltaY, endX, endY]];
	}

	const phi = (rotation * Math.PI) / 180;
	const cosPhi = Math.cos(phi);
	const sinPhi = Math.sin(phi);
	const halfDeltaX = (startX - endX) / 2;
	const halfDeltaY = (startY - endY) / 2;
	const xPrime = cosPhi * halfDeltaX + sinPhi * halfDeltaY;
	const yPrime = -sinPhi * halfDeltaX + cosPhi * halfDeltaY;
	const radiiScale = Math.sqrt((xPrime * xPrime) / (rx * rx) + (yPrime * yPrime) / (ry * ry));
	const adjustedRx = radiiScale > 1 ? rx * radiiScale : rx;
	const adjustedRy = radiiScale > 1 ? ry * radiiScale : ry;
	const rxSquared = adjustedRx * adjustedRx;
	const rySquared = adjustedRy * adjustedRy;
	const numerator = Math.max(0, rxSquared * rySquared - rxSquared * yPrime * yPrime - rySquared * xPrime * xPrime);
	const denominator = rxSquared * yPrime * yPrime + rySquared * xPrime * xPrime;
	const centerScale = (largeArc === sweep ? -1 : 1) * Math.sqrt(numerator / denominator);
	const centerXPrime = (centerScale * adjustedRx * yPrime) / adjustedRy;
	const centerYPrime = (-centerScale * adjustedRy * xPrime) / adjustedRx;
	const centerX = cosPhi * centerXPrime - sinPhi * centerYPrime + (startX + endX) / 2;
	const centerY = sinPhi * centerXPrime + cosPhi * centerYPrime + (startY + endY) / 2;
	const startAngle = Math.atan2((yPrime - centerYPrime) / adjustedRy, (xPrime - centerXPrime) / adjustedRx);
	const endAngle = Math.atan2((-yPrime - centerYPrime) / adjustedRy, (-xPrime - centerXPrime) / adjustedRx);

	let angleDelta = endAngle - startAngle;

	if (sweep === 0 && angleDelta > 0) {
		angleDelta -= 2 * Math.PI;
	} else if (sweep === 1 && angleDelta < 0) {
		angleDelta += 2 * Math.PI;
	}

	const segmentCount = Math.ceil(Math.abs(angleDelta) / (Math.PI / 2));
	const segmentAngle = angleDelta / segmentCount;

	const curves: number[][] = [];

	for (let segment = 0; segment < segmentCount; segment++) {
		const angle1 = startAngle + segment * segmentAngle;
		const angle2 = angle1 + segmentAngle;
		const alpha = (4 / 3) * Math.tan((angle2 - angle1) / 4);
		const cos1 = Math.cos(angle1);
		const sin1 = Math.sin(angle1);
		const cos2 = Math.cos(angle2);
		const sin2 = Math.sin(angle2);
		const point1X = centerX + cosPhi * adjustedRx * cos1 - sinPhi * adjustedRy * sin1;
		const point1Y = centerY + sinPhi * adjustedRx * cos1 + cosPhi * adjustedRy * sin1;
		const point2X = centerX + cosPhi * adjustedRx * cos2 - sinPhi * adjustedRy * sin2;
		const point2Y = centerY + sinPhi * adjustedRx * cos2 + cosPhi * adjustedRy * sin2;
		const tangent1X = -cosPhi * adjustedRx * sin1 - sinPhi * adjustedRy * cos1;
		const tangent1Y = -sinPhi * adjustedRx * sin1 + cosPhi * adjustedRy * cos1;
		const tangent2X = -cosPhi * adjustedRx * sin2 - sinPhi * adjustedRy * cos2;
		const tangent2Y = -sinPhi * adjustedRx * sin2 + cosPhi * adjustedRy * cos2;

		curves.push([
			point1X + alpha * tangent1X,
			point1Y + alpha * tangent1Y,
			point2X - alpha * tangent2X,
			point2Y - alpha * tangent2Y,
			segment === segmentCount - 1 ? endX : point2X,
			segment === segmentCount - 1 ? endY : point2Y
		]);
	}

	return curves;
};

const convertPathArcs = (pathData: string): string => {
	if (!/[aA]/.test(pathData)) {
		return pathData;
	}

	const output: string[] = [];
	let cursorX = 0;
	let cursorY = 0;
	let startX = 0;
	let startY = 0;
	let command = '';
	let index = 0;

	while (index < pathData.length) {
		while (index < pathData.length && /[\s,]/.test(pathData[index])) {
			index++;
		}

		if (index === pathData.length) {
			break;
		}

		if (/[a-zA-Z]/.test(pathData[index])) {
			command = pathData[index++];

			if (command.toUpperCase() === 'Z') {
				output.push(command);
				cursorX = startX;
				cursorY = startY;
				continue;
			}
		}

		const upperCommand = command.toUpperCase();
		const argumentCount = pathArgumentCounts[upperCommand];

		if (!argumentCount) {
			return pathData;
		}

		const args: number[] = [];

		for (let argIndex = 0; argIndex < argumentCount; argIndex++) {
			while (index < pathData.length && /[\s,]/.test(pathData[index])) {
				index++;
			}

			if (upperCommand === 'A' && (argIndex === 3 || argIndex === 4)) {
				if (pathData[index] !== '0' && pathData[index] !== '1') {
					return pathData;
				}

				args.push(Number(pathData[index++]));
				continue;
			}

			const numberPattern = /[-+]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][-+]?\d+)?/y;

			numberPattern.lastIndex = index;
			const match = numberPattern.exec(pathData);

			if (!match) {
				return pathData;
			}

			args.push(Number(match[0]));
			index = numberPattern.lastIndex;
		}

		const relative = command === command.toLowerCase();

		if (upperCommand === 'A') {
			const endX = relative ? cursorX + args[5] : args[5];
			const endY = relative ? cursorY + args[6] : args[6];
			const curves = convertArcToCurves(cursorX, cursorY, [...args.slice(0, 5), endX, endY]);

			curves.forEach(curve => {
				output.push(`C${curve.join(' ')}`);
			});
			cursorX = endX;
			cursorY = endY;
		} else {
			output.push(`${command}${args.join(' ')}`);

			switch (upperCommand) {
				case 'M':
				case 'L':
				case 'T':
					cursorX = relative ? cursorX + args[0] : args[0];
					cursorY = relative ? cursorY + args[1] : args[1];

					if (upperCommand === 'M') {
						startX = cursorX;
						startY = cursorY;
						command = relative ? 'l' : 'L';
					}

					break;
				case 'H':
					cursorX = relative ? cursorX + args[0] : args[0];
					break;
				case 'V':
					cursorY = relative ? cursorY + args[0] : args[0];
					break;
				case 'C':
				case 'S':
					cursorX = relative ? cursorX + args[args.length - 2] : args[args.length - 2];
					cursorY = relative ? cursorY + args[args.length - 1] : args[args.length - 1];
					break;
				case 'Q':
					cursorX = relative ? cursorX + args[2] : args[2];
					cursorY = relative ? cursorY + args[3] : args[3];
					break;
			}
		}
	}

	return output.join(' ');
};

export const svgoBimiPlugin: CustomPlugin = {
	name: 'svgo-bimi-plugin',
	fn: () => ({
		element: {
			enter: node => {
				if (node.name === 'path' && node.attributes.d) {
					node.attributes.d = convertPathArcs(node.attributes.d);
				}

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
						'height',
						'fill',
						'fill-opacity',
						'fill-rule',
						'stroke',
						'stroke-width',
						'stroke-opacity',
						'stroke-linecap',
						'stroke-linejoin',
						'stroke-miterlimit',
						'stroke-dasharray',
						'stroke-dashoffset',
						'opacity',
						'color',
						'clip-rule',
						'paint-order',
						'vector-effect'
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
