import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AlertSignal, AlertSource, SystemEventNames } from "@/common";

import { Alert } from "../../domain";
import { AlertRepository } from "../../repositories";

/**
 * Reconciles the alert signals currently firing for a source against the alerts
 * already open for that source. Per subject and type:
 *  - signal present, no open alert  → add     (emit alert.created)
 *  - signal present, alert open, changed severity/message → update (emit alert.updated)
 *  - signal present, alert open, unchanged → refresh (bump lastSeenAt, no event)
 *  - open alert with no matching signal → resolve  (emit alert.resolved)
 *
 * Producers never call this directly — rulers translate data events into signals
 * and reconcile (see ADR-0010).
 */
@Injectable()
export class AlertReconcileService {
    constructor(
        private readonly alertRepository: AlertRepository,
        private readonly events: EventEmitter2,
    ) {}

    /**
     * Reconcile one subject. `signals` must be the COMPLETE set firing for that
     * (source, subject) this cycle — any open alert without a matching signal is resolved.
     */
    async reconcileSubject(
        source: AlertSource,
        subject: string,
        signals: AlertSignal[],
    ): Promise<void> {
        const open = await this.alertRepository.findOpenBySourceAndSubject(source, subject);
        const openByType = new Map<string, Alert>(open.map((alert) => [alert.type, alert]));
        const firing = this.dedupeByType(signals);
        const now = new Date();

        for (const signal of firing.values()) {
            const existing = openByType.get(signal.type);
            if (existing) {
                await this.applyChange(existing, signal, now);
            } else {
                await this.openAlert(source, subject, signal);
            }
        }

        for (const alert of open) {
            if (!firing.has(alert.type)) {
                await this.resolve(alert.id, now);
            }
        }
    }

    /**
     * Reconcile a whole source from a per-subject signal map. Subjects that have
     * open alerts but no signals this cycle are reconciled with an empty set, so
     * their alerts resolve when the underlying condition (or the subject) disappears.
     */
    async reconcileSource(
        source: AlertSource,
        signalsBySubject: Map<string, AlertSignal[]>,
    ): Promise<void> {
        const openSubjects = await this.alertRepository.findOpenSubjects(source);
        const subjects = new Set<string>([...signalsBySubject.keys(), ...openSubjects]);

        for (const subject of subjects) {
            await this.reconcileSubject(source, subject, signalsBySubject.get(subject) ?? []);
        }
    }

    /**
     * Resolve an alert and announce it (`alert.resolved`). The single owner of the
     * resolve transition — used both by the reconcile loop (a signal vanished) and
     * the manual REST surface (`AlertAccessService`). Returns null if already gone.
     */
    async resolve(alertId: string, resolvedAt: Date = new Date()): Promise<Alert | null> {
        const resolved = await this.alertRepository.resolveById(alertId, resolvedAt);
        if (resolved) {
            this.events.emit(SystemEventNames.ALERT_RESOLVED, resolved);
        }
        return resolved;
    }

    /**
     * One subject can be reported by several nodes, so the same alert type may
     * arrive more than once per cycle — keep the first signal of each type.
     */
    private dedupeByType(signals: AlertSignal[]): Map<string, AlertSignal> {
        const byType = new Map<string, AlertSignal>();
        for (const signal of signals) {
            if (!byType.has(signal.type)) {
                byType.set(signal.type, signal);
            }
        }
        return byType;
    }

    /** Open a new alert, emitting alert.created unless a concurrent reconcile won the race. */
    private async openAlert(
        source: AlertSource,
        subject: string,
        signal: AlertSignal,
    ): Promise<void> {
        const { alert, created } = await this.alertRepository.create({
            source,
            subject,
            type: signal.type,
            severity: signal.severity,
            message: signal.message,
        });
        if (created) {
            this.events.emit(SystemEventNames.ALERT_CREATED, alert);
        }
    }

    /**
     * Update an open alert when its severity/message changed (emit alert.updated),
     * or just bump lastSeenAt when the signal is unchanged (refresh, no event).
     */
    private async applyChange(existing: Alert, signal: AlertSignal, now: Date): Promise<void> {
        const changed =
            existing.severity !== signal.severity || existing.message !== signal.message;
        if (!changed) {
            await this.alertRepository.update(existing.id, { lastSeenAt: now });
            return;
        }

        const updated = await this.alertRepository.update(existing.id, {
            severity: signal.severity,
            message: signal.message,
            lastSeenAt: now,
        });
        if (updated) {
            this.events.emit(SystemEventNames.ALERT_UPDATED, updated);
        }
    }
}
