// AI-assisted initial tests by GitHub Copilot (2026-10-28); review and adapt before submission.
import assert from "node:assert/strict";
import test from "node:test";
import { BOARD, createBreakoutState, stepBreakout } from "../../Frontend/public/js/breakout-engine.mjs";

test("creates a centered paddle, starting ball, and banana-brick layout", () => {
  const state = createBreakoutState();

  assert.equal(state.lives, 3);
  assert.equal(state.level, 1);
  assert.equal(state.score, 0);
  assert.equal(state.paddle.x, (BOARD.width - state.paddle.width) / 2);
  assert.equal(state.bricks.length, 32);
  assert.ok(state.ball.vy < 0);
});

test("keeps the paddle inside the board when controls reach either edge", () => {
  const state = createBreakoutState();
  const startingX = state.paddle.x;

  stepBreakout(state, 1 / 60, { paddleDirection: -1 });
  assert.ok(state.paddle.x < startingX);

  stepBreakout(state, 1 / 60, { paddleTarget: -100 });
  assert.equal(state.paddle.x, 0);

  stepBreakout(state, 1 / 60, { paddleTarget: BOARD.width + 100 });
  assert.equal(state.paddle.x, BOARD.width - state.paddle.width);
});

test("bounces the ball away from the side wall", () => {
  const state = createBreakoutState();
  state.ball.x = BOARD.ballRadius + 1;
  state.ball.y = 250;
  state.ball.vx = -120;
  state.ball.vy = 0;

  stepBreakout(state, 1 / 60);

  assert.ok(state.ball.vx > 0);
});

test("bounces the ball upward from the paddle", () => {
  const state = createBreakoutState();
  state.ball.x = state.paddle.x + state.paddle.width / 2;
  state.ball.y = state.paddle.y - BOARD.ballRadius - 1;
  state.ball.vx = 0;
  state.ball.vy = 120;

  stepBreakout(state, 1 / 60);

  assert.ok(state.ball.vy < 0);
});

test("removes a brick and awards points when the ball hits it", () => {
  const state = createBreakoutState();
  state.bricks = [{ x: 300, y: 150, width: 62, height: 22, row: 0 }];
  state.ball.x = 320;
  state.ball.y = 150 + 22 + BOARD.ballRadius + 1;
  state.ball.vx = 0;
  state.ball.vy = -120;

  const events = stepBreakout(state, 1 / 60);

  assert.equal(events.brickHit, true);
  assert.equal(state.bricks.length, 40);
  assert.equal(state.score, 10);
  assert.equal(state.level, 2);
  assert.equal(events.levelComplete, true);
});

test("removes one life after a miss and ends the game at zero lives", () => {
  const state = createBreakoutState(1, 2);
  state.ball.x = 20;
  state.ball.y = BOARD.height + BOARD.ballRadius;
  state.ball.vx = 0;
  state.ball.vy = 120;

  const firstMiss = stepBreakout(state, 1 / 60);
  assert.equal(firstMiss.lifeLost, true);
  assert.equal(firstMiss.gameOver, false);
  assert.equal(state.lives, 1);

  state.ball.y = BOARD.height + BOARD.ballRadius;
  state.ball.vy = 120;
  const finalMiss = stepBreakout(state, 1 / 60);

  assert.equal(finalMiss.gameOver, true);
  assert.equal(state.lives, 0);
});
