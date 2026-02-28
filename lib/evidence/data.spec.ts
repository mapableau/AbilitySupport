import {
  listEvidenceForEntity,
  getEvidenceRef,
  createEvidenceRef,
  verifyEvidenceRef,
  deleteEvidenceRef,
  countEvidenceForEntity,
} from "./data";
import type { CreateEvidenceRefInput } from "../schemas/evidence";

const VALID_INPUT: CreateEvidenceRefInput = {
  entityType: "organisation",
  entityId: "550e8400-e29b-41d4-a716-446655440000",
  category: "abn_certificate",
  title: "ABN Registration Certificate",
  url: "https://example.com/abn-cert.pdf",
  snippet: "ABN 12345678901 registered to Acme Care Pty Ltd",
  source: "provider_upload",
};

describe("evidence/data", () => {
  it("listEvidenceForEntity returns an array", async () => {
    const refs = await listEvidenceForEntity("organisation", "org-1");
    expect(Array.isArray(refs)).toBe(true);
  });

  it("getEvidenceRef returns null from stub", async () => {
    const ref = await getEvidenceRef("ref-1");
    expect(ref).toBeNull();
  });

  it("createEvidenceRef returns a row with correct fields", async () => {
    const ref = await createEvidenceRef(VALID_INPUT, "user-1");
    expect(ref.id).toBeTruthy();
    expect(ref.entity_type).toBe("organisation");
    expect(ref.entity_id).toBe(VALID_INPUT.entityId);
    expect(ref.category).toBe("abn_certificate");
    expect(ref.title).toBe("ABN Registration Certificate");
    expect(ref.url).toBe("https://example.com/abn-cert.pdf");
    expect(ref.snippet).toBe("ABN 12345678901 registered to Acme Care Pty Ltd");
    expect(ref.source).toBe("provider_upload");
    expect(ref.submitted_by).toBe("user-1");
    expect(ref.verified).toBe(false);
    expect(ref.active).toBe(true);
  });

  it("createEvidenceRef handles missing optional fields", async () => {
    const ref = await createEvidenceRef(
      {
        entityType: "worker",
        entityId: "660e8400-e29b-41d4-a716-446655440001",
        category: "coordinator_note",
        title: "Manual observation",
        source: "coordinator_manual",
      },
      "coord-1",
    );
    expect(ref.url).toBeNull();
    expect(ref.snippet).toBeNull();
    expect(ref.captured_at).toBeNull();
    expect(ref.source).toBe("coordinator_manual");
  });

  it("verifyEvidenceRef returns true from stub", async () => {
    const ok = await verifyEvidenceRef("ref-1", "coord-1");
    expect(ok).toBe(true);
  });

  it("deleteEvidenceRef returns true from stub", async () => {
    const ok = await deleteEvidenceRef("ref-1");
    expect(ok).toBe(true);
  });

  it("countEvidenceForEntity returns zeroes from stub", async () => {
    const counts = await countEvidenceForEntity("organisation", "org-1");
    expect(counts.total).toBe(0);
    expect(counts.verified).toBe(0);
  });
});
