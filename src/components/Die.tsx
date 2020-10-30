import React from "react";

/*
 * Define the dots as circles in a 100x100 squre
 */

const margin = 27;
const R = 10;

const topLeft = {
  cx: margin,
  cy: margin,
  r: R,
};

const topRight = {
  cx: 100 - margin,
  cy: margin,
  r: R,
};

const bottomLeft = {
  cx: margin,
  cy: 100 - margin,
  r: R,
};

const bottomRight = {
  cx: 100 - margin,
  cy: 100 - margin,
  r: R,
};

const center = {
  cx: 50,
  cy: 50,
  r: R,
};

// The dots for each die.
const dots = [
  [
    {
      cx: 50,
      cy: 50,
      r: 15,
    },
  ],
  [topLeft, bottomRight],
  [topLeft, center, bottomRight],
  [topLeft, topRight, bottomLeft, bottomRight],
  [topLeft, topRight, bottomLeft, bottomRight, center],
  [
    topLeft,
    topRight,
    bottomLeft,
    bottomRight,
    { cx: margin, cy: 50, r: R },
    { cx: 100 - margin, cy: 50, r: R },
  ],
];

/*
 * Map the value and current player to a list of <circle> tags.
 */
const diceDots = (value: number, currentPlayer: string) => {
  let className = `dot dotColor${currentPlayer}`;
  return dots[value - 1].map((dot, i) => (
    <circle {...dot} key={i} {...{ className }} />
  ));
};

interface DieProps {
  currentPlayer: string;
  value: number;
  highlight?: boolean;
  // 0: horizontal split
  // 1: vertical split
  // 20: diagonal split die 0
  // ...
  // 23: diagonal split die 3
  split?: string;
}

export class Die extends React.Component<DieProps> {
  render() {
    const { currentPlayer, value, highlight, split } = this.props;

    let className = `die bgcolor${currentPlayer}`;
    if (highlight) {
      className += " dieHighlight";
    }
    if (split != null) {
      className += ` dieSplit${split}`;
    }

    return (
      <svg
        viewBox="0 0 100 100"
        version="1.1"
        xmlns="http://www.w3.org/2000/svg"
        {...{ className }}
      >
        <g fill="#000000">{diceDots(value, currentPlayer)}</g>
      </svg>
    );
  }
}

export class Background extends React.Component {
  render() {
    // dice side
    const size = 100;
    // space between two die
    const padding = 50;
    // number of dice on the side of a pattern
    // This means we'll create a pattern of n x n dice and then we'll make a mosaic out
    // of that pattern.
    // This can't be too high because it can add some latency.
    const n = 7;
    const viewBox = n * (size + padding);
    const diceValues = Array(n * n)
      .fill(null)
      .map(() => Math.floor(Math.random() * 6));

    return (
      <svg
        id="background"
        height="100%"
        width="100%"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern
            id="dice"
            width={30 * n}
            height={30 * n}
            patternUnits="userSpaceOnUse"
            viewBox={`0 0 ${viewBox} ${viewBox}`}
          >
            <rect width={viewBox} height={viewBox} fill="#f7f6f2" />
            {diceValues.map((value, i) => {
              const dx = padding / 2 + (i % n) * (size + padding);
              const dy = padding / 2 + Math.floor(i / n) * (size + padding);
              return (
                <g
                  transform={`translate(${dx},${dy}),rotate(${
                    Math.random() * 360
                  }, ${padding}, ${padding})`}
                  key={i}
                >
                  <rect
                    rx="15"
                    width={size}
                    height={size}
                    fill="transparent"
                    stroke="#ecebe9"
                    strokeWidth="7px"
                    key={i}
                  />
                  {dots[value].map((params, j) => (
                    <circle {...params} fill="#ecebe9" key={j} />
                  ))}
                </g>
              );
            })}
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dice)" />
      </svg>
    );
  }
}
