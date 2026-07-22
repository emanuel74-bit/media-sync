import { Test, TestingModule } from "@nestjs/testing";

import { PublishAuthService, StreamQueryService } from "@/streams/services";

describe("PublishAuthService", () => {
    let service: PublishAuthService;
    let query: jest.Mocked<StreamQueryService>;

    beforeEach(async () => {
        query = { findByName: jest.fn() } as unknown as jest.Mocked<StreamQueryService>;

        const module: TestingModule = await Test.createTestingModule({
            providers: [PublishAuthService, { provide: StreamQueryService, useValue: query }],
        }).compile();

        service = module.get(PublishAuthService);
    });

    it("authorizes a publish whose secret matches the reservation", async () => {
        query.findByName.mockResolvedValue({ name: "cam", publishToken: "secret-123" } as never);

        const ok = await service.isAuthorized({
            action: "publish",
            path: "cam",
            user: "publish",
            password: "secret-123",
        });

        expect(ok).toBe(true);
        expect(query.findByName).toHaveBeenCalledWith("cam");
    });

    it("accepts the secret via the token field too", async () => {
        query.findByName.mockResolvedValue({ name: "cam", publishToken: "secret-123" } as never);

        const ok = await service.isAuthorized({
            action: "publish",
            path: "cam",
            token: "secret-123",
        });

        expect(ok).toBe(true);
    });

    it("denies a wrong secret", async () => {
        query.findByName.mockResolvedValue({ name: "cam", publishToken: "secret-123" } as never);

        const ok = await service.isAuthorized({ action: "publish", path: "cam", password: "nope" });

        expect(ok).toBe(false);
    });

    it("denies publishing to a path with no reservation", async () => {
        query.findByName.mockResolvedValue(null);

        const ok = await service.isAuthorized({ action: "publish", path: "cam", password: "x" });

        expect(ok).toBe(false);
    });

    it("denies a stream that carries no publish secret (was not reserved)", async () => {
        query.findByName.mockResolvedValue({ name: "cam", publishToken: null } as never);

        const ok = await service.isAuthorized({ action: "publish", path: "cam", password: "x" });

        expect(ok).toBe(false);
    });

    it("denies non-publish actions outright", async () => {
        const ok = await service.isAuthorized({ action: "read", path: "cam", password: "x" });

        expect(ok).toBe(false);
        expect(query.findByName).not.toHaveBeenCalled();
    });
});
