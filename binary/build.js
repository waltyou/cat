const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

// Platforms to build for
const platforms = [
  'win32-x64',
  // 'win32-arm64',
  // 'darwin-x64',
  // 'darwin-arm64',
  // 'linux-x64',
  // 'linux-arm64'
];

// Clean up previous builds
console.log('Cleaning up previous builds...');
if (fs.existsSync('dist')) {
  fs.rmSync('dist', { recursive: true, force: true });
}
if (fs.existsSync('bin')) {
  fs.rmSync('bin', { recursive: true, force: true });
}

// Create output directories
fs.mkdirSync('dist', { recursive: true });
fs.mkdirSync('bin', { recursive: true });

// Bundle with esbuild
console.log('Bundling with esbuild...');
esbuild.buildSync({
  entryPoints: ['src/index.ts'],
  bundle: true,
  platform: 'node',
  outfile: 'dist/index.js',
  minify: true,
  sourcemap: true,
  external: ['core/*'],
  alias: {
    'core': '../core'
  },
});

// Copy package.json to dist
console.log('Copying package.json to dist...');
fs.copyFileSync(
  path.join('pkgJson', 'package.json'),
  path.join('dist', 'package.json')
);

// Build binaries for each platform
console.log('Building binaries for each platform...');
platforms.forEach(platform => {
  const [nodeOS, arch] = platform.split('-');
  console.log(`Building for ${nodeOS}-${arch}...`);

  // Copy platform-specific package.json if it exists
  const platformPkgPath = path.join('pkgJson', platform, 'package.json');
  if (fs.existsSync(platformPkgPath)) {
    fs.copyFileSync(
      platformPkgPath,
      path.join('dist', 'package.json')
    );
  }

  // Build binary with pkg
  try {
    execSync(`npx pkg . --target node18-${platform} --output bin/cat-core-${platform}`, {
      cwd: 'dist',
      stdio: 'inherit'
    });
    console.log(`Successfully built binary for ${platform}`);
  } catch (error) {
    console.error(`Failed to build binary for ${platform}:`, error);
  }
});

console.log('Build complete!');
