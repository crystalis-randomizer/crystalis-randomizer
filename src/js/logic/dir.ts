
export type Dir = 0 | 1 | 2 | 3; // N, W, S, E

export namespace Dir {
  export function name(dir: Dir) {
    switch (dir) {
    case 0: return 'N';
    case 1: return 'W';
    case 2: return 'S';
    case 3: return 'E';
    }
    throw new Error(`Bad direction: ${dir}`);
  }

  export function all(): Dir[] {
    return [0, 1, 2, 3];
  }

  export const North = 0 as Dir;
  export const West = 1 as Dir;
  export const South = 2 as Dir;
  export const East = 3 as Dir;
}
