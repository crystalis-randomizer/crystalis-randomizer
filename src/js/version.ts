declare const __VERSION__: {
  'STATUS'?: string,
  'VERSION'?: string,
  'LABEL'?: string,
  'HASH'?: string,
  'DATE'?: Date,
  'PREV'?: string,
};

const version = typeof __VERSION__ === 'object' ? __VERSION__ : {};

export const STATUS = version['STATUS'] || 'unstable';
export const VERSION = version['VERSION'] || 'HEAD';
export const LABEL = version['LABEL'] || 'HEAD';
export const HASH = version['HASH'] || 'HEAD';
export const DATE = version['DATE'] || new Date();
export const PREV = version['PREV'] || '';
