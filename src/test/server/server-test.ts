import test from 'ava';
import {mergeObjects} from '../../server/server';

test('mergeObjects should merge objects', (t) => {
  t.deepEqual({a: 1}, mergeObjects({a: 1}, {a: 2}));
  t.deepEqual({a: {b: [1, 2]}}, mergeObjects({a: {b: [1]}}, {a: {b: [2]}}));
  t.deepEqual(
      {a: {b: [1, 2], c: 3}},
      mergeObjects({a: {b: [1], c: 3}}, {a: {b: [2], c: 4}}));
});
