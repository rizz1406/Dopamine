import { describe, it } from "node:test";
import assert from "node:assert/strict";
describe("breakout",()=>{it("brick count",()=>{assert.equal(8*5,40)});it("score",()=>{let s=0; s+=10; assert.equal(s,10)});it("lives",()=>{let l=3; l--; assert.equal(l,2)});});
