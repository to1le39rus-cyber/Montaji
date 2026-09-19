import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJob } from '../src/domain/normalize.js';

test('formatted money values are normalized without data loss',()=>{
 assert.equal(normalizeJob({price:'12 500'}).price,12500);
 assert.equal(normalizeJob({price:'12 500,50'}).price,12500.5);
 assert.equal(normalizeJob({price:'12 500 ₽'}).price,12500);
});
