import "server-only";
/* The ONE authoritative route. Pages, transfer screens, validation, the code sheet and the organiser guide all read from here. */

export const ROUTE = [
  { round: 1, room: "C4" },
  { round: 2, room: "Lab" },
  { round: 3, room: "B2" },
  { round: 4, room: "B1" },
  { round: 5, room: "B3" }, // Round 5, the merged Final Verdict and the treasure all happen here
] as const;
export const ROOM_OF_ROUND: Record<number, string> = Object.fromEntries(ROUTE.map((r) => [r.round, r.room]));
export const FINAL_ROOM = ROOM_OF_ROUND[5];
export const NAV_ROUNDS = [1, 2, 3, 4]; // rounds followed by a navigation puzzle

export const NAV_HEADING = "Round complete. Where next?";
export const NAV_SUBTITLE = "A quick brain break before your next challenge.";
export const navMessage = (room: string) => `Take your team to ${room}. Get your next round-entry code from the coordinator.`;
export const FINISH_MESSAGE = `Stay in ${FINAL_ROOM}. Show your completed investigation to the coordinator to collect your treasure.`;

type Kind = "cups" | "mirror" | "robot" | "grid";
type Nav = { kind: Kind; title: string; hint: string; wrong: string; success: string };

/* Destinations come from ROUTE (the room of the NEXT round), never from a second list. */
export const NAV: Record<number, Nav> = {
  1: {
    kind: "cups", title: "Cup shuffle",
    hint: "Track the token’s position after each swap, rather than following a cup’s colour.",
    wrong: "Empty! Replay the shuffle and follow the token again.",
    success: `Good tracking! Your next round is in the ${ROOM_OF_ROUND[2]}.`,
  },
  2: {
    kind: "mirror", title: "The backwards sign",
    hint: "A mirror swaps left and right.",
    wrong: "Still not readable. Think about how a mirror changes a sign.",
    success: `Sign repaired! Head to ${ROOM_OF_ROUND[3]}.`,
  },
  3: {
    kind: "robot", title: "Follow the robot",
    hint: "Moving right changes the column. Moving up reduces the row number.",
    wrong: "Your robot took a wrong turn. Start at A4 and count each square carefully.",
    success: `Robot delivered! Your next room is ${ROOM_OF_ROUND[4]}.`,
  },
  4: {
    kind: "grid", title: "Complete the mini-grid",
    hint: "Look at the bottom row. Which of the three symbols is missing?",
    wrong: "That symbol repeats in the row or column. Try another.",
    success: `Pattern completed! Triangle points to ${ROOM_OF_ROUND[5]}.`,
  },
};
export const navDestination = (round: number) => ROOM_OF_ROUND[round + 1];

type Input = Record<string, unknown>;
const s = (v: unknown) => String(v ?? "").trim().toLowerCase();

/* One supported answer per puzzle. */
export function verifyNav(round: number, a: Input): boolean {
  switch (round) {
    case 1: return s(a.cup) === "right";
    case 2: return s(a.op) === "flip-h";
    case 3: return String(a.cell ?? "").trim().toUpperCase() === "B1";
    case 4: return s(a.symbol) === "triangle";
  }
  return false;
}
