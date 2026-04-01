export function computeCameraDistance({
  radius,
  fovDeg,
  aspect,
  padding,
}: {
  radius: number;
  fovDeg: number;
  aspect: number;
  padding: number;
}) {
  const vFov = (fovDeg * Math.PI) / 180;
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const vertical = radius / Math.tan(vFov / 2);
  const horizontal = radius / Math.tan(hFov / 2);
  return Math.max(4, padding * Math.max(vertical, horizontal));
}
