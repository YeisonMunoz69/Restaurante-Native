import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

const root = path.resolve('src');
const translations = JSON.parse(fs.readFileSync(path.join(root, 'i18n/locales/es.json'), 'utf8'));
translations.attention = JSON.parse(fs.readFileSync(path.join(root, 'i18n/locales/attention.es.json'), 'utf8'));
const uiAttributes = new Set([
  'accessibilityHint',
  'accessibilityLabel',
  'label',
  'placeholder',
  'title',
]);
const issues = [];

function hasTranslation(key) {
  let value = translations;
  for (const part of key.split('.')) {
    if (value === null || value === undefined || !Object.prototype.hasOwnProperty.call(value, part)) return false;
    value = value[part];
  }
  return true;
}

function isVisibleTextLiteral(node) {
  return (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
    && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(node.text);
}

function visitFiles(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== '__tests__') visitFiles(fullPath);
      continue;
    }
    if (!/\.(tsx|ts)$/.test(entry.name) || /\.(test|spec)\.(tsx|ts)$/.test(entry.name)) continue;

    const source = fs.readFileSync(fullPath, 'utf8');
    const file = ts.createSourceFile(fullPath, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    function inspect(node) {
      if (ts.isJsxText(node) && /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ¿¡]/.test(node.text.trim())) {
        issues.push(`${fullPath}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: texto JSX literal`);
      }
      if (ts.isJsxExpression(node) && node.expression && isVisibleTextLiteral(node.expression)) {
        issues.push(`${fullPath}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: texto JSX literal en expresión`);
      }
      if (
        ts.isCallExpression(node)
        && node.expression.getText(file) === 't'
        && node.arguments[0]
        && ts.isStringLiteral(node.arguments[0])
        && !hasTranslation(node.arguments[0].text)
      ) {
        issues.push(`${fullPath}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: clave i18n inexistente (${node.arguments[0].text})`);
      }
      if (
        ts.isJsxAttribute(node)
        && uiAttributes.has(node.name.getText(file))
        && node.initializer
        && (ts.isStringLiteral(node.initializer)
          ? isVisibleTextLiteral(node.initializer)
          : ts.isJsxExpression(node.initializer)
            && node.initializer.expression
            && isVisibleTextLiteral(node.initializer.expression))
      ) {
        issues.push(`${fullPath}:${file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1}: literal en ${node.name.getText(file)}`);
      }
      ts.forEachChild(node, inspect);
    }
    inspect(file);
  }
}

visitFiles(root);
if (issues.length) {
  console.error(issues.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Sin textos de interfaz literales en JSX ni atributos visibles.');
}
