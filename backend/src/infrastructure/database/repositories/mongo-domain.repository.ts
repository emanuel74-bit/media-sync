import { Model } from "mongoose";

type DocumentWithToObject = {
    toObject<T>(): T;
};

export abstract class MongoDomainRepository<
    TDocument extends DocumentWithToObject,
    TLean,
    TDomain,
> {
    protected constructor(protected readonly model: Model<TDocument>) {}

    protected abstract toDomain(raw: TLean): TDomain;

    protected toDomainList(rawDocs: readonly TLean[]): TDomain[] {
        return rawDocs.map((rawDoc) => this.toDomain(rawDoc));
    }

    protected toOptionalDomain(rawDoc: TLean | null): TDomain | null {
        return rawDoc ? this.toDomain(rawDoc) : null;
    }

    protected fromDocument(doc: TDocument): TDomain {
        return this.toDomain(doc.toObject<TLean>());
    }
}
