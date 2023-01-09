/*
 * Create sequences for generating unique values, like ExMachina's sequence/1.
 */
const SEQ_COUNTER: Record<string, number> = {};

export const sequence = (name: string): string => {
  name in SEQ_COUNTER ? SEQ_COUNTER[name]++ : (SEQ_COUNTER[name] = 0);

  return `${name}${SEQ_COUNTER[name]}`;
};
