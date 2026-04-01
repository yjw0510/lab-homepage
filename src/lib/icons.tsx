import { Atom, Brain, Droplets, Hexagon, Layers, Orbit, FlaskConical } from "lucide-react";

const iconComponents: Record<string, React.ComponentType<{ className?: string }>> = {
  Atom,
  Brain,
  Droplets,
  Hexagon,
  Layers,
  Orbit,
  FlaskConical,
};

/**
 * Get a lucide-react icon element for a multiscale area by name.
 * Falls back to FlaskConical if the icon name is unknown.
 */
export function getMultiscaleIcon(
  iconName: string,
  className: string = "w-10 h-10"
): React.ReactNode {
  const Icon = iconComponents[iconName] || FlaskConical;
  return <Icon className={className} />;
}
