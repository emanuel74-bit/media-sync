/// <reference types="vite/client" />

interface Window {
    io?: (
        url: string,
        options?: Record<string, unknown>,
    ) => {
        connected: boolean;
        connect: () => void;
        disconnect: () => void;
        on: (event: string, listener: (...args: any[]) => void) => void;
    };
}
