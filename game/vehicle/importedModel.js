import * as THREE from 'three';

// Asset-only adaptation: physics, camera and recovery retain their original
// coordinate system. The visual renderer expects a -Z-facing, ground-root kart.
export function prepareImportedKart(source, width = 1.85) {
  const model = new THREE.Group();
  const asset = source.clone(true);
  asset.rotation.y += Math.PI;
  model.add(asset);
  model.updateMatrixWorld(true);
  let bounds = new THREE.Box3().setFromObject(asset);
  const size = bounds.getSize(new THREE.Vector3());
  if (!Number.isFinite(size.x) || size.x <= 0) throw new Error('Imported kart has invalid bounds');
  asset.scale.multiplyScalar(width / size.x);
  model.updateMatrixWorld(true);
  bounds = new THREE.Box3().setFromObject(asset);
  asset.position.x -= (bounds.min.x + bounds.max.x) / 2;
  asset.position.z -= (bounds.min.z + bounds.max.z) / 2;
  asset.position.y -= bounds.min.y;
  model.updateMatrixWorld(true);
  return model;
}
