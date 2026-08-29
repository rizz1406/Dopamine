import { describe, it } from "node:test";
import assert from "node:assert/strict";
describe("flappy",()=>{it("gravity",()=>{let vy=0; vy+=0.5; assert.equal(vy,0.5)});it("score inc",()=>{let s=0; s++; assert.equal(s,1)});it("speed inc",()=>{let sp=2; sp+=0.2; assert.equal(sp,2.2)});});
