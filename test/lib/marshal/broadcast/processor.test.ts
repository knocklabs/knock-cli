import { expect } from "@oclif/test";

import { factory } from "@/../test/support";
import {
  BROADCAST_JSON,
  buildBroadcastDirBundle,
} from "@/lib/marshal/broadcast/processor.isomorphic";

describe("lib/marshal/broadcast/processor", () => {
  describe("buildBroadcastDirBundle", () => {
    it("returns a bundle with broadcast.json", () => {
      const broadcast = factory.broadcast({
        key: "test-broadcast",
        name: "Test Broadcast",
        steps: [],
      });

      const bundle = buildBroadcastDirBundle(broadcast);

      expect(bundle).to.have.property(BROADCAST_JSON);
      expect(bundle[BROADCAST_JSON]).to.have.property("key", "test-broadcast");
      expect(bundle[BROADCAST_JSON]).to.have.property("name", "Test Broadcast");
      expect(bundle[BROADCAST_JSON]).to.have.property("steps");
      expect(bundle[BROADCAST_JSON].steps).to.eql([]);
    });
  });
});
