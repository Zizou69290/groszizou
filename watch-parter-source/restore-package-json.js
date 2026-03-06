const fs = require('fs');
const path = require('path');

const lockPath = path.join(process.cwd(), 'package-lock.json');
if (!fs.existsSync(lockPath)) {
  console.error('package-lock.json introuvable dans le dossier courant.');
  process.exit(1);
}

const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
const deps = {};
const devDeps = {};

// Dans package-lock.json moderne, les dépendances sont dans lock.dependencies
const lockDeps = lock.dependencies || {};

for (const [name, info] of Object.entries(lockDeps)) {
  if (!info || !info.version) continue;
  if (info.dev === true) {
    devDeps[name] = info.version;
  } else {
    deps[name] = info.version;
  }
}

// Si le lock contient des dépendances imbriquées mais sans champ dev,
// on les placera en "dependencies" par sécurité.
const pkg = {
  name: path.basename(process.cwd()),
  version: "1.0.0",
  description: "",
  main: "index.js",
  scripts: {
    // laisser vide; tu peux modifier selon ton projet
    start: "node index.js"
  },
  author: "",
  license: "ISC",
  dependencies: deps,
};

if (Object.keys(devDeps).length) {
  pkg.devDependencies = devDeps;
}

fs.writeFileSync(path.join(process.cwd(), 'package.json'), JSON.stringify(pkg, null, 2), 'utf8');
console.log('package.json créé. Vérifie-le et lance ensuite `npm install`.');