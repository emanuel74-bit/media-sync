import { Test, TestingModule } from "@nestjs/testing";

import { IngestActivationController } from "@/sync/controllers";
import { IngestStreamSynchronizerService } from "@/sync/services";

describe("IngestActivationController", () => {
    let controller: IngestActivationController;
    let synchronizer: jest.Mocked<IngestStreamSynchronizerService>;

    beforeEach(async () => {
        synchronizer = {
            activate: jest.fn().mockResolvedValue(undefined),
        } as unknown as jest.Mocked<IngestStreamSynchronizerService>;

        const module: TestingModule = await Test.createTestingModule({
            controllers: [IngestActivationController],
            providers: [{ provide: IngestStreamSynchronizerService, useValue: synchronizer }],
        }).compile();

        controller = module.get(IngestActivationController);
    });

    it("relays the named stream on its ingest node, then accepts", async () => {
        const result = await controller.streamReady("node-1", { name: "cam" });

        expect(synchronizer.activate).toHaveBeenCalledWith("node-1", "cam");
        expect(result).toEqual({ accepted: true });
    });

    it("propagates a relay failure to the caller", async () => {
        synchronizer.activate.mockRejectedValue(new Error("boom"));

        await expect(controller.streamReady("node-1", { name: "cam" })).rejects.toThrow("boom");
    });
});
