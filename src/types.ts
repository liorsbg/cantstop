export type PlayerID = string;
export type DiceSum = number;

export type SumOption = {
  // The 2-dice sums. There can be 0, 1 or 2.
  sums: (DiceSum | null)[];
  // In case there are 2, can we use both.
  split?: boolean;
};
