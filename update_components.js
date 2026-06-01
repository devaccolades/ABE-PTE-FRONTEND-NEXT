const fs = require('fs');
const path = require('path');

const dir = 'e:/afnan/abe-pte/src/components/questions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.jsx'));

files.forEach(f => {
  const p = path.join(dir, f);
  let content = fs.readFileSync(p, 'utf8');
  let changed = false;

  // Add name prop if missing
  if (content.includes('export default function ') && !content.includes(' name ') && !content.includes(' name,') && !content.includes(' name=')) {
    content = content.replace(/export default function (\w+)\(\{\s*/, 'export default function $1({\n  name = "",\n  ');
    changed = true;
  }

  // Replace {subsection...} inside <h2> or <span> or <div>
  const subRegex1 = /<h2([^>]*)>\s*\{subsection(.*?)\}\s*<\/h2>/g;
  if (subRegex1.test(content)) {
    content = content.replace(subRegex1, '<h2$1>\n            {name}\n          </h2>');
    changed = true;
  }

  const subRegex2 = /<h2([^>]*)>\s*\{name \|\| subsection\}\s*<\/h2>/g;
  if (subRegex2.test(content)) {
    content = content.replace(subRegex2, '<h2$1>\n            {name}\n          </h2>');
    changed = true;
  }

  const subRegex3 = /<span([^>]*)>\s*\{subsection\}\s*<\/span>/g;
  if (subRegex3.test(content)) {
    content = content.replace(subRegex3, '<span$1>{name}</span>');
    changed = true;
  }

  const subRegex4 = /<div([^>]*)>\s*\{subsection(?:\?\.replace[^}]*)? \|\| name\}\s*<\/div>/g;
  if (subRegex4.test(content)) {
    content = content.replace(subRegex4, '<div$1>\n          {name}\n        </div>');
    changed = true;
  }

  const subRegex5 = /<div([^>]*)>\s*\{subsection\}\s*<\/div>/g;
  if (subRegex5.test(content)) {
    content = content.replace(subRegex5, '<div$1>{name}</div>');
    changed = true;
  }

  const subRegex6 = /\{name \|\| subsection\}/g;
  if (subRegex6.test(content)) {
    content = content.replace(subRegex6, '{name}');
    changed = true;
  }

  const subRegex7 = /\{subsection\}/g;
  if (subRegex7.test(content)) {
    // Only replace if it's used as a JSX child expression, not as a prop
    content = content.replace(/>\s*\{subsection\}\s*</g, '>{name}<');
    content = content.replace(/>\s*\{subsection\?\.[^}]*\}\s*</g, '>{name}<');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(p, content);
    console.log("Updated", f);
  }
});
