import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import * as THREE from 'three';
import { inspectVisibleGeometryLoad } from '../app/graphics-budget.ts';

const pageSource = readFileSync(
  new URL('../app/page.tsx', import.meta.url),
  'utf8',
);

function sourceBetween(startMarker: string, endMarker: string): string {
  const start = pageSource.indexOf(startMarker);
  assert.ok(start >= 0, `missing source marker: ${startMarker}`);
  const end = pageSource.indexOf(endMarker, start + startMarker.length);
  assert.ok(end > start, `missing source marker: ${endMarker}`);
  return pageSource.slice(start, end);
}

void test('viewmodel load becomes truthful only after its equipped root is visible', () => {
  const presentationCamera = new THREE.PerspectiveCamera();
  const equippedRoot = new THREE.Group();
  const heldWeapon = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1));
  equippedRoot.add(heldWeapon);
  presentationCamera.add(equippedRoot);

  equippedRoot.visible = false;
  assert.deepEqual(inspectVisibleGeometryLoad(presentationCamera), {
    visibleDrawProxies: 0,
    visibleTriangles: 0,
  });

  equippedRoot.visible = true;
  assert.deepEqual(inspectVisibleGeometryLoad(presentationCamera), {
    visibleDrawProxies: 1,
    visibleTriangles: 12,
  });

  heldWeapon.geometry.dispose();
});

void test('published budget facts are labeled snapshots and late ready cannot overwrite play', () => {
  const publisher = sourceBetween(
    'let hasPublishedPostReadyBudget = false;',
    'const registerCharacterRenderVariant =',
  );
  assert.match(
    publisher,
    /if \(reason === 'ready' && hasPublishedPostReadyBudget\) return;/,
  );
  assert.match(
    publisher,
    /if \(reason !== 'ready'\) hasPublishedPostReadyBudget = true;/,
  );
  assert.match(publisher, /snapshot:\s*{\s*reason,/);
  assert.match(publisher, /weaponAtSnapshot,/);
  assert.match(
    publisher,
    /viewmodelVisibleAtSnapshot: viewmodel\.visibleDrawProxies > 0/,
  );
});

void test('restart retains the active-round reset guard and always publishes requested facts', () => {
  const resetRound = sourceBetween(
    'const resetRound =',
    'restartRef.current = (newMatch, snapshotReason',
  );
  assert.match(resetRound, /showWeaponView\(player\.activeWeapon\);/);

  const restart = sourceBetween(
    'restartRef.current = (newMatch, snapshotReason',
    '// Local-only fixed camera entry point',
  );
  assert.match(restart, /snapshotReason = 'play-start'/);
  assert.match(
    restart,
    /if \(status !== 'active'\) {\s*resetRound\(newMatch\);\s*}\s*publishGraphicsBudget\(snapshotReason, player\.activeWeapon\);/,
  );
  assert.match(pageSource, /restartRef\.current\(false, 'round-prepared'\);/);
});

void test('ready and quality snapshots are explicit and animation never publishes budget', () => {
  assert.match(pageSource, /publishGraphicsBudget\('ready'\);/);
  assert.match(
    pageSource,
    /queueMicrotask\(\(\) => publishGraphicsBudget\('quality-change'\)\)/,
  );
  const clock = sourceBetween('const clock =', 'let activeDirectionalKeys:');
  assert.doesNotMatch(clock, /publishGraphicsBudget/);
});
