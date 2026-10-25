import assert from 'node:assert/strict';
import test from 'node:test';
import { isDuplicateQueueEnd, queueEndSignature } from '../../src/services/audio/queueEndGuard';

test('identical queue-end events are recognized during the duplicate delivery window', () => {
  const event = { track: 0, position: 183.42 };
  const previous = queueEndSignature(event, 10_000);

  assert.equal(isDuplicateQueueEnd({ ...event, position: 183.49 }, previous, 14_999), true);
  assert.equal(isDuplicateQueueEnd(event, previous, 15_001), false);
});

test('different ended track indexes or positions are not suppressed', () => {
  const previous = queueEndSignature({ track: 0, position: 183.42 }, 10_000);

  assert.equal(isDuplicateQueueEnd({ track: 1, position: 183.42 }, previous, 10_100), false);
  assert.equal(isDuplicateQueueEnd({ track: 0, position: 181.9 }, previous, 10_100), false);
});
