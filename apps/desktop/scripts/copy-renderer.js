const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '../../app/dist');
const destDir = path.resolve(__dirname, '../renderer');

if (!fs.existsSync(srcDir)) {
  console.error(
    `[copy-renderer] ERRO: Pasta de origem não encontrada: ${srcDir}. Execute 'pnpm --filter @proj/app build' primeiro.`,
  );
  process.exit(1);
}

if (fs.existsSync(destDir)) {
  fs.rmSync(destDir, { recursive: true, force: true });
}

fs.cpSync(srcDir, destDir, { recursive: true });
console.log(`[copy-renderer] Frontend sincronizado com sucesso: ${srcDir} -> ${destDir}`);

