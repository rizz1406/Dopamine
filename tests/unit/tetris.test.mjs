import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('tetris scoring', () => {
  it('line clear points', () => {
    const pts=[0,100,300,500,800]; assert.equal(pts[1],100); assert.equal(pts[4],800);
  });
  it('level calc', () => {
    const lvl = (lines)=> (lines/10|0)+1;
    assert.equal(lvl(0),1); assert.equal(lvl(10),2); assert.equal(lvl(20),3);
  });
  it('rotation is square', () => {
    const rot=(m)=>{ const n=m.length; const r=Array(n).fill(0).map(()=>Array(n).fill(0)); for(let y=0;y<n;y++) for(let x=0;x<n;x++) r[x][n-1-y]=m[y][x]; return r; };
    const m=[[1,0],[1,1]]; const r=rot(m); assert.equal(r[0][0],1);
  });
});
