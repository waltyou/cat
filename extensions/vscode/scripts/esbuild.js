#!/usr/bin/env node

const esbuild = require('esbuild');
const path = require('path');
const fs = require('fs');

// Define paths
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'src');
const outDir = path.join(rootDir, 'out');

// Ensure the output directory exists
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

// Define the entry point
const entryPoint = path.join(srcDir, 'extension.ts');

// Define external packages that should not be bundled
const external = ['vscode', 'esbuild'];

// Check if we're in production mode
const isProduction = process.env.NODE_ENV === 'production';
console.log(`Building in ${isProduction ? 'production' : 'development'} mode`);

// Build the extension
esbuild.build({
  entryPoints: [entryPoint],
  bundle: true,
  outfile: path.join(outDir, 'extension.js'),
  external,
  format: 'cjs',
  platform: 'node',
  sourcemap: !isProduction,
  minify: isProduction,
  target: 'node14',
  loader: {
    '.node': 'file',
  },
  // We're not using a banner to avoid __filename redeclaration issues
  define: {
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
  },
}).then(() => {
  console.log('Build completed successfully!');
  console.log(`Output file: ${path.join(outDir, 'extension.js')}`);
}).catch((error) => {
  console.error('Build failed:', error);
  process.exit(1);
});
