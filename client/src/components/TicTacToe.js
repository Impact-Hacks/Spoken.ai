import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, font } from '../theme';

// Something to do while the calls run. You are X; the computer (O) takes a winning move,
// otherwise blocks yours, otherwise plays at random, so it can be beaten.

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const EMPTY = Array(9).fill(null);
const COMPUTER_DELAY_MS = 450;

// { mark: 'X' | 'O' | 'draw', line: [cells] } once the game is over, else null.
function resultOf(board) {
  for (const line of LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return { mark: board[a], line };
  }
  return board.every(Boolean) ? { mark: 'draw', line: [] } : null;
}

// The cell that would complete a line for `mark`, if any.
function finishingMove(board, mark) {
  for (const line of LINES) {
    const marks = line.map((i) => board[i]);
    if (marks.filter((m) => m === mark).length === 2 && marks.includes(null)) return line[marks.indexOf(null)];
  }
  return null;
}

function computerMove(board) {
  const move = finishingMove(board, 'O') ?? finishingMove(board, 'X');
  if (move !== null) return move;
  const open = board.flatMap((m, i) => (m ? [] : [i]));
  return open[Math.floor(Math.random() * open.length)];
}

const RESULT = { X: 'You win!', O: 'Computer wins', draw: "It's a draw" };

export default function TicTacToe() {
  const [board, setBoard] = useState(EMPTY);
  const [score, setScore] = useState({ X: 0, O: 0 });
  const result = resultOf(board);
  const computerTurn = !result && board.filter(Boolean).length % 2 === 1;

  const place = (i, mark) => {
    const next = [...board];
    next[i] = mark;
    setBoard(next);
    const end = resultOf(next);
    if (end && end.mark !== 'draw') setScore((s) => ({ ...s, [end.mark]: s[end.mark] + 1 }));
  };

  useEffect(() => {
    if (!computerTurn) return;
    const id = setTimeout(() => place(computerMove(board), 'O'), COMPUTER_DELAY_MS);
    return () => clearTimeout(id);
  }, [computerTurn, board]);

  const play = (i) => {
    if (board[i] || result || computerTurn) return;
    place(i, 'X');
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View>
          <Text style={styles.heading}>While you wait</Text>
          <Text style={styles.sub}>Tic-tac-toe · you're X</Text>
        </View>
        <Text accessibilityLabel={`Score: you ${score.X}, computer ${score.O}`} style={styles.score}>
          You {score.X} · {score.O} CPU
        </Text>
      </View>

      <View style={styles.grid}>
        {board.map((mark, i) => {
          const winning = result?.line.includes(i);
          return (
            <Pressable
              key={i}
              accessibilityRole="button"
              accessibilityLabel={`Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}, ${mark || 'empty'}`}
              accessibilityState={{ disabled: !!mark || !!result || computerTurn }}
              onPress={() => play(i)}
              style={({ pressed, hovered }) => [
                styles.cell,
                (pressed || hovered) && !mark && !result && styles.cellPressed,
                winning && styles.cellWinning,
              ]}
            >
              <Text style={[styles.mark, mark === 'O' && styles.markO]}>{mark}</Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.footer}>
        <Text accessibilityLiveRegion="polite" style={[styles.status, result && styles.statusDone]}>
          {result ? RESULT[result.mark] : computerTurn ? 'Computer is thinking…' : 'Your turn'}
        </Text>
        {result ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => setBoard(EMPTY)}
            style={({ pressed }) => [styles.again, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.againText}>Play again</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const CELL = 64;
const GAP = 8;

const styles = StyleSheet.create({
  card: { alignSelf: 'stretch', backgroundColor: colors.mist, borderRadius: 20, padding: 18, gap: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  heading: { ...font(700), fontSize: 16, color: colors.ink },
  sub: { ...font(400), fontSize: 13, color: colors.muted, marginTop: 2 },
  score: {
    ...font(700),
    fontSize: 13,
    color: colors.forest,
    backgroundColor: colors.white,
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    overflow: 'hidden',
  },
  grid: { alignSelf: 'center', width: CELL * 3 + GAP * 2, flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  cell: {
    width: CELL,
    height: CELL,
    borderRadius: 14,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 1px 2px rgba(22,51,0,0.08)',
  },
  cellPressed: { backgroundColor: colors.hover },
  cellWinning: { backgroundColor: colors.lime },
  mark: { ...font(800), fontSize: 28, color: colors.forest },
  markO: { color: colors.dashed },
  footer: { minHeight: 34, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  status: { ...font(600), fontSize: 14, color: colors.muted },
  statusDone: { ...font(700), color: colors.ink },
  again: { backgroundColor: colors.forest, borderRadius: 999, paddingVertical: 7, paddingHorizontal: 14 },
  againText: { ...font(700), fontSize: 13, color: colors.white },
});
