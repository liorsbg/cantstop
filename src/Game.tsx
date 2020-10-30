import { Stage } from "boardgame.io/core";
import { getSumOptions, sumSteps } from "./math";
import { SumOption } from "./types";
import { INVALID_MOVE } from "boardgame.io/core";

interface Info {
  message: string;
  level: "success" | "danger";
}

export interface SetupDataType {
  passAndPlay: boolean;
}

type GameMode = "pass-and-play" | "remote";

export interface GameType {
  diceValues: number[];
  currentPositions: { [key: number]: number };
  checkpointPositions: { [key: string]: { [key: number]: number } };
  diceSumOptions?: SumOption[];
  lastPickedDiceSumOption: null | number[];
  blockedSums: { [key: number]: string };
  info: Info | null;
  scores: { [key: number]: number };
  // Game mode without the need of a server.
  passAndPlay: boolean;
  // playerID -> name
  playerNames: { [key: string]: string };
  // By default we'll set the game to the *maximum* number of players, but maybe less
  // people will join.
  numPlayers: number;
  setupData: SetupDataType;
}

/*
 * Go to a given stage but taking into account the passAndPlay mode.
 */
const gotoStage = (G: GameType, ctx, newStage: string): void => {
  const activePlayers = G.passAndPlay
    ? { all: newStage }
    : { currentPlayer: newStage, others: Stage.NULL };
  ctx.events.setActivePlayers(activePlayers);
};

/*
 * Definition of the main phase.
 */
const turn = {
  onBegin: (G: GameType, ctx) => {
    G.currentPositions = {};
    gotoStage(G, ctx, "rolling");
  },
  order: {
    first: (G: GameType, ctx) => 0,
    next: (G: GameType, ctx) => (ctx.playOrderPos + 1) % G.numPlayers,
    playOrder: (G: GameType, ctx) => {
      // Take the actual number of players, and randomize amongst them.
      let playOrder = Array(G.numPlayers)
        .fill(null)
        .map((_, i) => i.toString());
      playOrder = ctx.random.Shuffle(playOrder);
      return playOrder;
    },
  },
  stages: {
    rolling: {
      moves: {
        rollDice: (G: GameType, ctx) => {
          // After a roll we remove how the last player finished.
          G.info = null;
          G.diceValues = ctx.random.Die(6, 4);
          G.lastPickedDiceSumOption = null;
          G.diceSumOptions = getSumOptions(
            G.diceValues,
            G.currentPositions,
            G.checkpointPositions[ctx.currentPlayer],
            G.blockedSums
          );
          // Check if busted.
          const busted = G.diceSumOptions.every((sumOption: SumOption) => {
            return sumOption.diceSums.every((x) => x == null);
          });
          if (busted) {
            G.info = { message: "Busted!", level: "danger" };
            ctx.events.endTurn();
          }
          gotoStage(G, ctx, "moving");
        },
        stop: (G: GameType, ctx) => {
          G.lastPickedDiceSumOption = null;
          G.diceSumOptions = undefined;
          // Save current positions as checkpoints.
          Object.entries(G.currentPositions).forEach(([diceSumStr, step]) => {
            const diceSum = parseInt(diceSumStr);
            G.checkpointPositions[ctx.currentPlayer][diceSum] = step;
            if (step === sumSteps(diceSum)) {
              G.blockedSums[diceSum] = ctx.currentPlayer;
              G.scores[ctx.currentPlayer] += 1;
              // Remove all the checkpoints for that one
              for (let i = 0; i < ctx.numPlayers; ++i) {
                delete G.checkpointPositions[i][diceSum];
              }
            }
          });

          // Check if we should end the game,
          if (G.scores[ctx.currentPlayer] >= 3) {
            // Clean the board a bit.
            G.currentPositions = {};
            G.info = {
              message: `${G.playerNames[ctx.currentPlayer]} won!`,
              level: "success",
            };
            ctx.events.endPhase();
          } else {
            G.info = { message: "Stopped.", level: "success" };
            ctx.events.endTurn();
          }
        },
      },
    },
    moving: {
      moves: {
        /*
         * Pick one of the sums in option.
         * diceSplitIndex: One of the possible dice splits
         * choiceIndex: 0 or 1, for "split' dice ([3] [5]) it means either the first or
         * second one. For non split dice (e.g. [3 - 5]) it should always be 0.
         */
        pickSumOption: (
          G: GameType,
          ctx,
          diceSplitIndex: number,
          choiceIndex: number
        ) => {
          // Should not happen but makes typescript happy.
          if (G.diceSumOptions == null) {
            throw new Error("assert false");
          }
          const sumOption = G.diceSumOptions[diceSplitIndex];

          let { diceSums } = sumOption;
          if (sumOption?.split) {
            diceSums = [diceSums[choiceIndex]];
          }
          G.lastPickedDiceSumOption = [diceSplitIndex, choiceIndex];
          diceSums.forEach((s) => {
            if (s == null) {
              return;
            }
            if (G.currentPositions.hasOwnProperty(s)) {
              G.currentPositions[s]++;
            } else {
              const checkpoint =
                G.checkpointPositions[ctx.currentPlayer][s] || 0;
              G.currentPositions[s] = checkpoint + 1;
            }
          });
          gotoStage(G, ctx, "rolling");
        },
      },
    },
  },
};

const setup = (ctx, setupData: SetupDataType): GameType => {
  let passAndPlay = true;
  if (setupData?.passAndPlay != null) {
    passAndPlay = setupData.passAndPlay;
  }

  const scores: { [key: number]: number } = {};
  const checkpointPositions = {};
  // const playerNames = {};

  for (let i = 0; i < ctx.numPlayers; ++i) {
    scores[i] = 0;
    checkpointPositions[i] = {};
  }

  const playerNames = {};
  // For pass-and-play games we set default player names.
  if (passAndPlay) {
    for (let i = 0; i < ctx.numPlayers; ++i) {
      playerNames[i.toString()] = `Player ${i + 1}`;
    }
  }
  const blockedSums = {};

  //Those are for quick debugging
  // checkpointPositions["0"] = { 6: 10, 7: 12, 8: 7 };
  // checkpointPositions["1"] = { 6: 10, 7: 12, 8: 10 };
  // checkpointPositions["2"] = { 6: 10, 7: 12, 8: 10, 9: 2 };
  // checkpointPositions["3"] = { 7: 12, 8: 7, 9: 2 };
  // scores["1"] = 2;
  // scores["2"] = 1;
  // playerNames["1"] = "simon lemieux 123";
  // blockedSums[3] = "1";
  // blockedSums[5] = "3";

  return {
    /*
     * Rows are 1-indexed. This means that
     * 0 == not on the board
     * 1 == first space
     * 3 == end spot for diceSum=2
     */
    diceValues: [1, 2, 3, 6],
    // State of the 3 current climbers. diceSum -> position.
    currentPositions: {},
    checkpointPositions,
    diceSumOptions: undefined,
    lastPickedDiceSumOption: null,
    blockedSums,
    info: { message: "Good game!", level: "success" },
    scores,
    passAndPlay,
    playerNames,
    numPlayers: ctx.numPlayers,
    setupData,
  };
};

const CantStop = {
  name: "cantstop",
  setup,
  phases: {
    // Phase where we wait for everyone to join, choose a name, colors, etc.
    setup: {
      start: true,
      next: "main",
      turn: {
        onBegin: (G: GameType, ctx) => {
          // In pass-and-play mode we skip this phase.
          if (G.passAndPlay) {
            ctx.events.endPhase();
            return;
          }
          ctx.events.setActivePlayers({ all: "setup" });
        },
        // There is only one stage, but we need it for all the players to be able to
        // interact in any order.
        stages: {
          setup: {
            moves: {
              setName: (G: GameType, ctx, name: string) => {
                G.playerNames[ctx.playerID] = name;
              },
              startGame: (G: GameType, ctx) => {
                if (ctx.playerID !== "0") {
                  return INVALID_MOVE;
                }

                // If some players are not ready, we can't start the game. Not ready is
                // the same as writing down your name, at least for now.
                if (Object.values(G.playerNames).some((name) => !name)) {
                  return INVALID_MOVE;
                }
                G.numPlayers = G.passAndPlay
                  ? ctx.numPlayers
                  : Object.keys(G.playerNames).length;
                ctx.events.endPhase();
              },
            },
          },
        },
      },
    },
    // Main phase where we actually play the game.
    main: {
      turn,
      next: "gameover",
    },
    gameover: {
      onBegin: (G, ctx) => {
        ctx.events.setActivePlayers({ all: "gameover" });
      },
      turn: {
        // Make sure the order doesn't change when it's gameover. We'll change it at the
        // beginning of a new game.
        order: {
          first: (G: GameType, ctx) => ctx.playOrderPos,
          next: (G: GameType, ctx) => 0,
          playOrder: (G: GameType, ctx) => ctx.playOrder,
        },
      },
      moves: {
        /* Reset the game to initial state */
        playAgain: (G, ctx) => {
          // We need to keep some of the fields that were entered during the game, in the "setup"
          // phase.
          const keepFields = ["playerNames", "numPlayers"];

          // Create an object like G but with only the fields to keep.
          const GKeep = Object.keys(G)
            .filter((key) => keepFields.indexOf(key) >= 0)
            .reduce((G2, key) => Object.assign(G2, { [key]: G[key] }), {});

          Object.assign(G, setup(ctx, G.setupData), GKeep);

          ctx.events.setPhase("main");
        },
      },
      stages: {
        gameover: {},
      },
    },
  },
};

export default CantStop;
