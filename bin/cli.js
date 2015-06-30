#!/usr/bin/env node
/*jshint node:true, strict: true, eqnull: true */
"use strict";

var ERRORLEVEL_HELP = 1;
var ERRORLEVEL_FS = 2;
var ERRORLEVEL_OPTIONS = 255;

var modulePath = require('path').resolve.bind(null, __dirname, '..');
var svgasset = require(modulePath('lib', 'svgasset.js'));


var args = process.argv.slice(2);

if (!args.length || args.indexOf('-h') !== -1 || args.indexOf('--help') !== -1 || args.indexOf('/?') !== -1){
	var packageInfo = require(modulePath('package.json'));
	var executableName = 'node ' + __filename;
	if (packageInfo.bin && Object.keys(packageInfo.bin).length === 1){
		executableName = Object.keys(packageInfo.bin)[0];
	}

	console.log(packageInfo.name + ' v' + packageInfo.version);
	console.log('Usage:');
	console.log('\t' + executableName + ' [-o <output filename>] <filename> [, <filename>, ...]');
	process.exit(ERRORLEVEL_HELP);
}

// Process command line

var filenames = [];
var outputFilename = null;
var verbose = false;

for (var i=0; i<args.length; i++){
	var arg = args[i];
	if (arg.charAt(0) === '-'){
		if (arg === '-o' || arg === '--output'){ // Output filename
			if (outputFilename){
				console.error('output filename already set');
				process.exit(ERRORLEVEL_OPTIONS);
			}
			i++;
			outputFilename = require('path').resolve(process.cwd(), args[i]);
			if (outputFilename == null){
				console.error('-o must have a value');
				process.exit(ERRORLEVEL_OPTIONS);
			}
		} else if (arg === '-v' || arg === '--verbose') {
			verbose = true;
		} else {
			console.error('unknown option ' + arg);
			process.exit(ERRORLEVEL_OPTIONS);
		}
	} else {
		filenames.push(arg);
	}
}

if (filenames.length === 0){
	console.error('no input filenames');
	process.exit(ERRORLEVEL_OPTIONS);
}

// Unwrap filename list

var seenIncludes = [];
var trimmer = function(s){
	return s.trim();
};

function unwrap(filenames, dirname){
	var result = [];
	for (var i=0; i<filenames.length; i++){
		var filename = filenames[i];
		var isInclude = false;
		if (filename.charAt(0) === '@'){
			filename = filename.slice(1);
			isInclude = true;
		}
		var fullFilename = require('path').resolve(dirname, filename);
		var globbed;
		if (require('glob').hasMagic(fullFilename)){
			globbed = require('glob').sync(fullFilename);
		} else {
			globbed = [fullFilename];
		}
		if (!isInclude){
			result.push.apply(result, globbed);
		} else {
			for (var j=0; j<globbed.length; j++){
				var includeFilename = require('path').normalize(globbed[j]);
				if (seenIncludes.indexOf(includeFilename) !== -1){
					console.error('include recursion in ' + includeFilename);
					process.exit(ERRORLEVEL_FS);
				} else {
					seenIncludes.push(includeFilename);
				}
				var list;
				try {
					list = require('fs').readFileSync(includeFilename, 'utf-8');
				} catch(e) {
					console.error('cannot include file ' + includeFilename);
					process.exit(ERRORLEVEL_FS);
				}
				var included = list
					.replace(/#.*/g, '')
					.split(/[\r\n]+/)
					.map(trimmer)
					.filter(Boolean);
				var unwrapped = unwrap(included, require('path').dirname(includeFilename));
				result.push.apply(result, unwrapped);
			}
		}
	}
	return result;
}

var inputFilenames = unwrap(filenames, process.cwd()).sort();

var outputStream;
if (outputFilename){
	outputStream = require('fs').createWriteStream(outputFilename);
} else {
	outputStream = process.stdout;
}
outputStream.on('error', function(){
	console.error('error writing to ' + (outputFilename || '<stdout>'));
});


var stream = svgasset(inputFilenames, {
	writeBefore: 'svgAsset.register(',
	writeAfter: ');',
});
stream.on('error', function(error){
	console.error(error);
});

if (verbose){
	stream.on('progress', function(filename){
		console.error(filename + '...');
	});
}

stream.pipe(outputStream);
