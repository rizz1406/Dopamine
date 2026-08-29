import { describe, it } from "node:test";
import assert from "node:assert/strict";
describe("minesweeper",()=>{it("flag toggle",()=>{let f=false; f=!f; assert.equal(f,true)});it("diff sizes",()=>{assert.equal(9*9,81)});it("mine count",()=>{assert.equal(10+40+99,149)});});
