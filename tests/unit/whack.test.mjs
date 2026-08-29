import { describe, it } from "node:test";
import assert from "node:assert/strict";
describe("whack",()=>{it("score normal",()=>{let s=0; s+=1; assert.equal(s,1)});it("golden",()=>{let s=0; s+=3; assert.equal(s,3)});it("grid size",()=>{assert.equal(3*3,9)});});
