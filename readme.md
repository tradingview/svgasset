# SvgAsset

A simple library for inserting inline SVG into DOM. Comes with the builder!

## Client side

Include `browser/svgasset.svg` somewhere in the page. `SvgAsset` function appears in the global scope.

### Client side API

Calling `SvgAsset()` return a SVG DOM element that can be used in any way you want.

The signature is `SVGAsset(/* str */ assetName, /* optional object or str */ attrs)`.

-	`assetName` is a name of the SVG asset;

-	`attrs` (optional) is a dictionary of attributes to set to element.
	If it's a string in format "_width_ x _height_"`, it's the same as providing `{"width": ..., "height": ...}`.

But first you have to declare the assets themselves.
It is done with `SvgAsset.register(/* object */ assets)`

-	`assets` is a dictionary. Keys are asset names and values are corresponding HTML (SVG) strings.

## Builder

Sure, creating and maintaining assets dictionary by hands is close to impossible.
But you don't need to do it manually, there's a builder for that.

### Builder as a module

Builder can be used in Node.js as a module. The `require` result is a function with following signature:

`require('svgasset')(/* array of str */ filenames, /* optional object */ options)`

-	`filenames` are filenames of SVG files to be included into dictionary. No magic wildcards are used here.
	Relative filenames will be resolved from currect directory (`process.cwd()`, not `__dirname`!).

-	`options.writeBefore` (optional) is a string or Buffer to be written before the dictionary.

-   `options.writeAfter` (optional) is similar to `writeBefore`.

#### Return value

Function returns `ReadableStream` that can be piped to any file descriptor or stdout/stderr.

In addition to all `Stream` interface there's some events emitted:

-	`error` when something bad is happened. All errors are recoverable and even if you have zillion of errors,
	output stream still would contain valid javascript (if errors were handled and didn't abort Node process).

-	`progress` reports filename being processed now. Useful for CLI application.

### Builder as CLI application

If installed globally, this module can be called via command line interface.

`svgasset-build [-o <output filename>] [-v] <filename> [, <filename>, ...]`

-	`-o` or `--output` defines where output dictionary would be placed. Default is `stdout`.

-	`-v` or `--verbose` tells application to report what file is being processed right now.
	Reports end errors are written to `stderr`, not touching the `stdout`.

-	`filenames` are filenames. Detailed expaination is below.

#### Masks and includes

First of all, relative filenames are resolved from current directory.

Wildcards are supported (`glob` node module is used). So, `svgasset-build my-app/images/**/*.svg` is a perfectly valid input.

If a filename specified starts with `@`, it is considered to be a list: a text file containing filenames one per line.
Anything between `#` and the end of the line is a comment.

List file even can inlude other list files, start them with `@` char. Wildcards are also supported.
Relative filenames in list files are resolved form the directory where list file is (like in CSS includes).

#### Example 1

I want to build all the SVGs in current directory and anything listed in `prod-svgs.txt` in the parent dir, and place output into `svgs.js`.

```
svgasset-build *.svg @../prod-svgs.txt -o svgs.js
```

#### Example 2

I want to do the same keeping my command line as simple as possible.

```
svgasset-build  @prod.txt -o svgs.js
```

```
# prod.txt

# Include all the SVGs
*.svg

# Include another file
@../prod-svgs.txt
```

#### Example 3

I want to process file in current directory, it anme starts with `@`, but it's not the list.

```
svgasset-build  ./@icon.svg -o svgs.js
```

#### Using CLI without installation

If you dont want to install `svgasset-build` globally, it can be called directly:

```
node <path-to-module>/bin/cli
```
