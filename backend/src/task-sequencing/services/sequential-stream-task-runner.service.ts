import { Injectable } from "@nestjs/common";

@Injectable()
export class SequentialStreamTaskRunner {
    async processSequential<T>(
        items: readonly T[],
        processor: (item: T) => Promise<void>,
    ): Promise<void> {
        for (const item of items) {
            await processor(item);
        }
    }

    async runSafely(work: () => Promise<void>, onError: (error: unknown) => void): Promise<void> {
        try {
            await work();
        } catch (error) {
            onError(error);
        }
    }
}
