/**
 * UIAutomator XML node parsing (attribute-order independent).
 */
import { readFileSync } from 'node:fs';

/**
 * @param {string} xmlContent
 */
export function parseUiXml(xmlContent) {
  const nodes = [];
  const nodeRe = /<node\b([\s\S]*?)(?:\/>|>)/gi;
  for (const m of xmlContent.matchAll(nodeRe)) {
    nodes.push(parseNodeAttributes(m[1]));
  }
  return nodes;
}

function parseNodeAttributes(attrString) {
  const attrs = {};
  for (const m of attrString.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    attrs[m[1]] = m[2];
  }
  const bounds = attrs.bounds;
  if (bounds) {
    const b = bounds.match(/\[(\d+),(\d+)\]\[(\d+),(\d+)\]/);
    if (b) {
      const x1 = Number(b[1]);
      const y1 = Number(b[2]);
      const x2 = Number(b[3]);
      const y2 = Number(b[4]);
      attrs.boundsRect = {
        x1,
        y1,
        x2,
        y2,
        cx: Math.floor((x1 + x2) / 2),
        cy: Math.floor((y1 + y2) / 2),
      };
    }
  }
  return attrs;
}

/**
 * @param {string} xmlContent
 */
export function isEduvijnaAppForeground(xmlContent) {
  return /package="com\.eduvijna\.app"/.test(xmlContent);
}

/**
 * @param {ReturnType<typeof parseUiXml>} nodes
 */
export function collectUiTexts(nodes) {
  const texts = new Set();
  for (const n of nodes) {
    for (const key of ['text', 'content-desc', 'hint']) {
      const v = n[key];
      if (v && String(v).trim()) texts.add(String(v).trim());
    }
  }
  return [...texts];
}

function nodeLabels(n) {
  return [n.text, n['content-desc'], n.hint].filter(Boolean).join(' ');
}

/**
 * @param {ReturnType<typeof parseUiXml>} nodes
 * @param {string} testId
 */
export function locateByTestId(nodes, testId, { minY = 0, pick = 'top' } = {}) {
  const hits = nodes
    .filter((n) => {
      if (!n.boundsRect || n.boundsRect.y1 < minY) return false;
      const blob = `${n['resource-id'] || ''} ${n['content-desc'] || ''} ${n.text || ''}`;
      return blob.includes(testId);
    })
    .map((n) => ({
      kind: 'testId',
      label: testId,
      x: n.boundsRect.cx,
      y: n.boundsRect.cy,
      bounds: n.boundsRect,
    }));
  if (!hits.length) return null;
  hits.sort((a, b) => (pick === 'top' ? a.y - b.y : b.y - a.y));
  return hits[0];
}

/**
 * @param {ReturnType<typeof parseUiXml>} nodes
 * @param {string|RegExp} pattern
 */
export function locateByLabel(nodes, pattern, { minY = 0, pick = 'bottom' } = {}) {
  const re = typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern;
  const hits = nodes
    .filter((n) => {
      if (!n.boundsRect || n.boundsRect.y1 < minY) return false;
      return re.test(nodeLabels(n));
    })
    .map((n) => ({
      kind: 'label',
      label: nodeLabels(n),
      x: n.boundsRect.cx,
      y: n.boundsRect.cy,
      bounds: n.boundsRect,
    }));
  if (!hits.length) return null;
  hits.sort((a, b) => (pick === 'bottom' ? b.y - a.y : a.y - b.y));
  return hits[0];
}

/**
 * @param {string} xmlPathOrContent
 */
export function readXmlContent(xmlPathOrContent) {
  if (xmlPathOrContent.includes('<hierarchy')) return xmlPathOrContent;
  return readFileSync(xmlPathOrContent, 'utf8');
}
