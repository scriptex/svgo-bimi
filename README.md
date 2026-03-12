# svgo-bimi

A specialized CLI tool and SVGO plugin to optimize and validate SVGs for **BIMI (Brand Indicators for Message Identification)** compliance.

## Installation

Install the package globally or as a development dependency:

```bash
# Install globally
npm install -g svgo-bimi

# Or install as a dev dependency
npm install --save-dev svgo-bimi
```

## Usage

### Via npx (Recommended)

You can run the tool without installing it locally by using npx:

```bash
npx svgo-bimi -f path/to/logo.svg -o ./dist
```

### Via Local Installation

If installed globally or in your project:

```bash
svgo-bimi -f <path-to-svg> -o <output-directory>
```

### As SVGO plugin

```js
// svgo.config.js
import { svgoBimiPlugin } from 'svgo-bimi';

export default {
	// ...
	plugins: [
		// ...
		svgoBimiPlugin
		// ...
	]
	// ...
};
```

**Disclaimer:** Currently, SVGO doesn't support the SVG Tiny 1.2 standard so it's almost impossible to add `version="1.2"` to the optimized file using SVGO alone. More about this [here](https://github.com/svg/svgo/issues/1261). If you insist on using `svgo-bimi` as a plugin for SVGO, you must add the `version="1.2"` and `baseProfile="tiny-ps"` attributes using your own implementation.

## Options

| Flag               | Description                                       | Required |
| ------------------ | ------------------------------------------------- | -------- |
| "`-f`, `--file`"   | Path to the source SVG file                       | Yes      |
| "`-o`, `--output`" | Directory to save the optimized file (default: .) | No       |

## Adobe Illustrator Troubleshooting

Adobe Illustrator is the most common tool for creating BIMI logos, but its default export settings often break compliance.

1. "My logo turned into a black blob"
   Cause: Illustrator often uses CSS Classes or `<style>` blocks. BIMI requires Inline Attributes.
   Fix: When exporting, set CSS Properties to Presentation Attributes instead of Style Elements.
2. "Embedded bitmaps detected"
   Cause: You might have a raster image (PNG/JPG) placed inside your Illustrator file.
   Fix: You must use Object > Image Trace or manually redraw the shape with the Pen tool to make it a true vector.
3. "Font tags detected"
   Cause: You left the brand name as editable text.
   Fix: Select all text and go to Type > Create Outlines (Shift + Ctrl/Cmd + O). BIMI does not support font files.
4. Recommended Export Settings
   When using File > Save As > SVG:
   SVG Profile: SVG Tiny 1.2
   Type: Convert to outline
   CSS Properties: Presentation Attributes
   Decimal Places: 2 (helps keep file size under 32KB)

## BIMI Compliance Checklist

1. Version: Must be 1.2.
2. Base Profile: Must be tiny-ps.
3. No Bitmaps: No .png, .jpg, or Base64 encoded images.
4. No Scripts: Interactive elements are strictly forbidden.
5. Aspect Ratio: Must be 1:1 (Square).
6. Size: Files must be 32KB or smaller.

## Development & Testing

This project uses the native Node.js test runner.

### Start local development

```bash
npm start
```

### Run tests

```bash
npm test
```

## License

MIT

---

<div align="center">
    Connect with me:
</div>

<br />

<div align="center">
    <a href="https://atanas.info">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/logo.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="mailto:hi@atanas.info">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/email.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://www.linkedin.com/in/scriptex/">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/linkedin.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://github.com/scriptex">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/github.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://gitlab.com/scriptex">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/gitlab.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://twitter.com/scriptexbg">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/twitter.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://www.npmjs.com/~scriptex">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/npm.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://www.youtube.com/user/scriptex">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/youtube.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://stackoverflow.com/users/4140082/atanas-atanasov">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/stackoverflow.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://codepen.io/scriptex/">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/codepen.svg" width="20" alt="">
    </a>
    &nbsp;
    <a href="https://profile.codersrank.io/user/scriptex">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/codersrank.svg" height="20" alt="">
    </a>
    &nbsp;
    <a href="https://linktr.ee/scriptex">
        <img src="https://raw.githubusercontent.com/scriptex/socials/master/styled-assets/linktree.svg" height="20" alt="">
    </a>
</div>

---

<div align="center">
Support and sponsor my work:
<br />
<br />
<a href="https://twitter.com/intent/tweet?text=Checkout%20this%20awesome%20developer%20profile%3A&url=https%3A%2F%2Fgithub.com%2Fscriptex&via=scriptexbg&hashtags=software%2Cgithub%2Ccode%2Cawesome" title="Tweet">
	<img src="https://img.shields.io/badge/Tweet-Share_my_profile-blue.svg?logo=twitter&color=38A1F3" />
</a>
<a href="https://paypal.me/scriptex" title="Donate on Paypal">
	<img src="https://img.shields.io/badge/Donate-Support_me_on_PayPal-blue.svg?logo=paypal&color=222d65" />
</a>
<a href="https://revolut.me/scriptex" title="Donate on Revolut">
	<img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/scriptex/scriptex/master/badges/revolut.json" />
</a>
<a href="https://patreon.com/atanas" title="Become a Patron">
	<img src="https://img.shields.io/badge/Become_Patron-Support_me_on_Patreon-blue.svg?logo=patreon&color=e64413" />
</a>
<a href="https://ko-fi.com/scriptex" title="Buy Me A Coffee">
	<img src="https://img.shields.io/badge/Donate-Buy%20me%20a%20coffee-yellow.svg?logo=ko-fi" />
</a>
<a href="https://liberapay.com/scriptex/donate" title="Donate on Liberapay">
	<img src="https://img.shields.io/liberapay/receives/scriptex?label=Donate%20on%20Liberapay&logo=liberapay" />
</a>

<a href="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/scriptex/scriptex/master/badges/bitcoin.json" title="Donate Bitcoin">
	<img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/scriptex/scriptex/master/badges/bitcoin.json" />
</a>
<a href="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/scriptex/scriptex/master/badges/etherium.json" title="Donate Etherium">
	<img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/scriptex/scriptex/master/badges/etherium.json" />
</a>
<a href="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/scriptex/scriptex/master/badges/shiba-inu.json" title="Donate Shiba Inu">
	<img src="https://img.shields.io/endpoint?url=https://raw.githubusercontent.com/scriptex/scriptex/master/badges/shiba-inu.json" />
</a>
</div>
