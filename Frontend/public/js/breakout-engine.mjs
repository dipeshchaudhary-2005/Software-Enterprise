// AI-assisted initial implementation by GitHub Copilot (2026-10-28); review and adapt before submission.
export const BOARD = Object.freeze({
  width: 640,
  height: 420,
  paddleWidth: 100,
  paddleHeight: 14,
  paddleBottom: 20,
  ballRadius: 8,
  columns: 8,
  brickWidth: 62,
  brickHeight: 22,
  brickGap: 8,
  brickTop: 48,
  brickRowGap: 12,
});

function createBricks(level) {
  const rows = Math.min(3 + level, 5);
  const rowWidth = BOARD.columns * BOARD.brickWidth
    + (BOARD.columns - 1) * BOARD.brickGap;
  const left = (BOARD.width - rowWidth) / 2;

  return Array.from({ length: rows * BOARD.columns }, (_, index) => {
    const row = Math.floor(index / BOARD.columns);
    const column = index % BOARD.columns;
    return {
      x: left + column * (BOARD.brickWidth + BOARD.brickGap),
      y: BOARD.brickTop + row * (BOARD.brickHeight + BOARD.brickRowGap),
      width: BOARD.brickWidth,
      height: BOARD.brickHeight,
      row,
    };
  });
}

function resetBall(state) {
  const speed = 230 + Math.min(state.level - 1, 6) * 18;
  state.paddle.x = (BOARD.width - BOARD.paddleWidth) / 2;
  state.ball.x = BOARD.width / 2;
  state.ball.y = BOARD.height - BOARD.paddleBottom - BOARD.paddleHeight - 22;
  state.ball.vx = speed * 0.56;
  state.ball.vy = -speed * 0.83;
}

export function createBreakoutState(level = 1, lives = 3) {
  const state = {
    level,
    lives,
    score: 0,
    paddle: {
      x: (BOARD.width - BOARD.paddleWidth) / 2,
      y: BOARD.height - BOARD.paddleBottom - BOARD.paddleHeight,
      width: BOARD.paddleWidth,
      height: BOARD.paddleHeight,
    },
    ball: { x: 0, y: 0, vx: 0, vy: 0 },
    bricks: createBricks(level),
  };
  resetBall(state);
  return state;
}

export function stepBreakout(state, deltaSeconds, controls = {}) {
  const events = { brickHit: false, lifeLost: false, levelComplete: false, gameOver: false };
  const delta = Math.min(Math.max(deltaSeconds, 0), 1 / 30);
  if (delta === 0) return events;

  const paddleTarget = Number.isFinite(controls.paddleTarget)
    ? controls.paddleTarget - state.paddle.width / 2
    : state.paddle.x + (controls.paddleDirection || 0) * 440 * delta;
  state.paddle.x = Math.min(
    BOARD.width - state.paddle.width,
    Math.max(0, paddleTarget),
  );

  const previousX = state.ball.x;
  const previousY = state.ball.y;
  state.ball.x += state.ball.vx * delta;
  state.ball.y += state.ball.vy * delta;

  if (state.ball.x - BOARD.ballRadius < 0) {
    state.ball.x = BOARD.ballRadius;
    state.ball.vx = Math.abs(state.ball.vx);
  } else if (state.ball.x + BOARD.ballRadius > BOARD.width) {
    state.ball.x = BOARD.width - BOARD.ballRadius;
    state.ball.vx = -Math.abs(state.ball.vx);
  }
  if (state.ball.y - BOARD.ballRadius < 0) {
    state.ball.y = BOARD.ballRadius;
    state.ball.vy = Math.abs(state.ball.vy);
  }

  if (
    state.ball.vy > 0
    && previousY + BOARD.ballRadius <= state.paddle.y
    && state.ball.y + BOARD.ballRadius >= state.paddle.y
    && state.ball.x + BOARD.ballRadius >= state.paddle.x
    && state.ball.x - BOARD.ballRadius <= state.paddle.x + state.paddle.width
  ) {
    const hitPosition = (state.ball.x - (state.paddle.x + state.paddle.width / 2))
      / (state.paddle.width / 2);
    const speed = Math.hypot(state.ball.vx, state.ball.vy);
    const angle = Math.max(-1, Math.min(1, hitPosition)) * (Math.PI / 3);
    state.ball.y = state.paddle.y - BOARD.ballRadius;
    state.ball.vx = speed * Math.sin(angle);
    state.ball.vy = -Math.abs(speed * Math.cos(angle));
  }

  const brickIndex = state.bricks.findIndex((brick) => {
    const nearestX = Math.max(brick.x, Math.min(state.ball.x, brick.x + brick.width));
    const nearestY = Math.max(brick.y, Math.min(state.ball.y, brick.y + brick.height));
    const distanceX = state.ball.x - nearestX;
    const distanceY = state.ball.y - nearestY;
    return distanceX * distanceX + distanceY * distanceY
      <= BOARD.ballRadius * BOARD.ballRadius;
  });

  if (brickIndex !== -1) {
    const [brick] = state.bricks.splice(brickIndex, 1);
    const distanceX = state.ball.x - (brick.x + brick.width / 2);
    const distanceY = state.ball.y - (brick.y + brick.height / 2);
    if (Math.abs(distanceX) > Math.abs(distanceY)) {
      state.ball.vx *= -1;
      state.ball.x = distanceX < 0
        ? brick.x - BOARD.ballRadius
        : brick.x + brick.width + BOARD.ballRadius;
    } else {
      state.ball.vy *= -1;
      state.ball.y = distanceY < 0
        ? brick.y - BOARD.ballRadius
        : brick.y + brick.height + BOARD.ballRadius;
    }
    state.score += 10;
    events.brickHit = true;

    if (state.bricks.length === 0) {
      state.level += 1;
      state.bricks = createBricks(state.level);
      resetBall(state);
      events.levelComplete = true;
    }
  }

  if (state.ball.y - BOARD.ballRadius > BOARD.height) {
    state.lives -= 1;
    events.lifeLost = true;
    if (state.lives <= 0) {
      events.gameOver = true;
    } else {
      resetBall(state);
    }
  }

  return events;
}
