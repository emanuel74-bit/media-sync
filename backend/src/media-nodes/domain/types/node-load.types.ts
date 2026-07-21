/** The live publish load on one node: how many paths it currently serves. */
export interface NodeLoad {
    podId: string;
    load: number;
}
