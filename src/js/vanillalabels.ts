import { vanillaLabels } from './vanillalabels.macro' with {type: 'macro'};

// Unused directly, but forces the bundler to re-run when it changes.
import '../../vanilla/crystalis.s' with {type: 'text'};

// This is large, so it's only loaded when needed, which is why its split out from other macros.
export const VANILLA_LABELS: string = vanillaLabels();
