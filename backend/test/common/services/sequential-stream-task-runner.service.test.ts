import { Test, TestingModule } from "@nestjs/testing";

import { SequentialStreamTaskRunner } from "../../../src/common/services/sequential-stream-task-runner.service";

describe("SequentialStreamTaskRunner", () => {
    let service: SequentialStreamTaskRunner;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [SequentialStreamTaskRunner],
        }).compile();

        service = module.get<SequentialStreamTaskRunner>(SequentialStreamTaskRunner);
    });

    describe("processSequential", () => {
        it("calls the processor for each item in order", async () => {
            const order: number[] = [];
            const items = [1, 2, 3];
            const processor = jest.fn(async (n: number) => {
                order.push(n);
            });

            await service.processSequential(items, processor);

            expect(processor).toHaveBeenCalledTimes(3);
            expect(order).toEqual([1, 2, 3]);
        });

        it("awaits each processor before calling the next", async () => {
            const resolved: number[] = [];
            const processor = jest.fn(async (n: number) => {
                await new Promise<void>((r) => setTimeout(r, 0));
                resolved.push(n);
            });

            await service.processSequential([1, 2, 3], processor);

            expect(resolved).toEqual([1, 2, 3]);
        });

        it("does nothing for an empty list", async () => {
            const processor = jest.fn();
            await service.processSequential([], processor);
            expect(processor).not.toHaveBeenCalled();
        });

        it("propagates errors thrown by the processor", async () => {
            const processor = jest.fn(async () => {
                throw new Error("processor error");
            });

            await expect(service.processSequential([1], processor)).rejects.toThrow(
                "processor error",
            );
        });
    });

    describe("runSafely", () => {
        it("calls work and does not invoke onError when work succeeds", async () => {
            const work = jest.fn(async () => {});
            const onError = jest.fn();

            await service.runSafely(work, onError);

            expect(work).toHaveBeenCalledTimes(1);
            expect(onError).not.toHaveBeenCalled();
        });

        it("calls onError with the thrown value when work throws", async () => {
            const error = new Error("boom");
            const work = jest.fn(async () => {
                throw error;
            });
            const onError = jest.fn();

            await service.runSafely(work, onError);

            expect(onError).toHaveBeenCalledWith(error);
        });

        it("does not rethrow after calling onError", async () => {
            const work = jest.fn(async () => {
                throw new Error("silent");
            });
            const onError = jest.fn();

            await expect(service.runSafely(work, onError)).resolves.toBeUndefined();
        });
    });
});
