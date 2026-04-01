import { describe, it, expect } from "vitest";
import { decodeFloat32, getTrajectoryFrame, reshapeToVec3 } from "../binaryLoader";

describe("decodeFloat32", () => {
  it("returns Float32Array from ArrayBuffer", () => {
    const source = new Float32Array([1.0, 2.0, 3.0]);
    const result = decodeFloat32(source.buffer);
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(3);
    expect(result[0]).toBeCloseTo(1.0);
    expect(result[2]).toBeCloseTo(3.0);
  });

  it("handles empty buffer", () => {
    const result = decodeFloat32(new ArrayBuffer(0));
    expect(result).toBeInstanceOf(Float32Array);
    expect(result.length).toBe(0);
  });
});

describe("getTrajectoryFrame", () => {
  // 3 frames × 2 beads × 3 coords = 18 floats
  const trajectory = new Float32Array([
    // frame 0: bead0=[1,2,3], bead1=[4,5,6]
    1, 2, 3, 4, 5, 6,
    // frame 1: bead0=[7,8,9], bead1=[10,11,12]
    7, 8, 9, 10, 11, 12,
    // frame 2: bead0=[13,14,15], bead1=[16,17,18]
    13, 14, 15, 16, 17, 18,
  ]);

  it("extracts first frame correctly", () => {
    const frame = getTrajectoryFrame(trajectory, 2, 0);
    expect(frame.length).toBe(6);
    expect(frame[0]).toBeCloseTo(1);
    expect(frame[5]).toBeCloseTo(6);
  });

  it("extracts last frame correctly", () => {
    const frame = getTrajectoryFrame(trajectory, 2, 2);
    expect(frame.length).toBe(6);
    expect(frame[0]).toBeCloseTo(13);
    expect(frame[5]).toBeCloseTo(18);
  });

  it("extracts middle frame correctly", () => {
    const frame = getTrajectoryFrame(trajectory, 2, 1);
    expect(frame[0]).toBeCloseTo(7);
    expect(frame[3]).toBeCloseTo(10);
  });
});

describe("reshapeToVec3", () => {
  it("converts flat array to array of [x,y,z] tuples", () => {
    const flat = new Float32Array([1, 2, 3, 4, 5, 6]);
    const result = reshapeToVec3(flat);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([1, 2, 3]);
    expect(result[1]).toEqual([4, 5, 6]);
  });

  it("handles empty array", () => {
    const result = reshapeToVec3(new Float32Array(0));
    expect(result).toHaveLength(0);
  });

  it("handles single point", () => {
    const result = reshapeToVec3(new Float32Array([7, 8, 9]));
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([7, 8, 9]);
  });
});
