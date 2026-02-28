import {
  fetchQueue,
  approveRequest,
  approveRecommendation,
  rejectRecommendation,
  createVerificationFollowup,
  addRequestNotes,
} from "./data";

describe("coordinator/data", () => {
  describe("fetchQueue", () => {
    it("returns an array (empty from stubs)", async () => {
      const items = await fetchQueue();
      expect(Array.isArray(items)).toBe(true);
      expect(items).toHaveLength(0);
    });
  });

  describe("approveRequest", () => {
    it("returns true (stub always succeeds)", async () => {
      const ok = await approveRequest("req-1", "user-1", "Looks good");
      expect(ok).toBe(true);
    });
  });

  describe("addRequestNotes", () => {
    it("returns true (stub always succeeds)", async () => {
      const ok = await addRequestNotes("req-1", "user-1", "Some note");
      expect(ok).toBe(true);
    });
  });

  describe("approveRecommendation", () => {
    it("returns true (stub always succeeds)", async () => {
      const ok = await approveRecommendation("rec-1", "user-1");
      expect(ok).toBe(true);
    });
  });

  describe("rejectRecommendation", () => {
    it("returns true (stub always succeeds)", async () => {
      const ok = await rejectRecommendation("rec-1", "user-1", "Not a good fit");
      expect(ok).toBe(true);
    });
  });

  describe("createVerificationFollowup", () => {
    it("returns a followup ID", async () => {
      const result = await createVerificationFollowup(
        "rec-1",
        "user-1",
        "Please verify clearance",
        "Clearance expired 2 days ago",
      );
      expect(result.followupId).toBeTruthy();
      expect(typeof result.followupId).toBe("string");
    });
  });
});
