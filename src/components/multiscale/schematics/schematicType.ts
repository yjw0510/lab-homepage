const REFERENCE_VIEWBOX_WIDTH = 760;

// MathSvg uses one em per 1,000 source units. These values keep its capital
// height aligned with the adjacent sans-serif labels.
const REFERENCE_SCALE = {
  formulaEm: 30,
  labelLg: 30,
  labelMd: 24,
  labelToFormula: 36,
  formulaStack: 38,
};

interface SchematicScale {
  formulaEm: number;
  labelLg: number;
  labelMd: number;
  labelToFormula: number;
  formulaStack: number;
};

/** Converts the shared type scale into a schematic's viewBox units. */
export function schematicScale(viewBoxWidth: number): SchematicScale {
  const scaleFactor = viewBoxWidth / REFERENCE_VIEWBOX_WIDTH;
  const scaled = (value: number) => +(value * scaleFactor).toFixed(2);
  return {
    formulaEm: scaled(REFERENCE_SCALE.formulaEm),
    labelLg: scaled(REFERENCE_SCALE.labelLg),
    labelMd: scaled(REFERENCE_SCALE.labelMd),
    labelToFormula: scaled(REFERENCE_SCALE.labelToFormula),
    formulaStack: scaled(REFERENCE_SCALE.formulaStack),
  };
}
