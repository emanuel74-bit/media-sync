import { Injectable } from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";

import { AlertSignal, AlertSource, SystemEventNames } from "@/common";

import { Alert } from "../domain";
import { AlertRepository } from "../repositories";

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
        const now = new Date();

        // One subject can be reported by several nodes, so the same alert type may
        // arrive more than once per cycle — collapse to one signal per type.
        const signalByType = new Map<string, AlertSignal>();
        for (const signal of signals) {
            if (!signalByType.has(signal.type)) {
                signalByType.set(signal.type, signal);
            }
        }

        for (const signal of signalByType.values()) {
            const existing = openByType.get(signal.type);
            if (!existing) {
                const created = await this.alertRepository.create({
                    source,
                    subject,
                    type: signal.type,
                    severity: signal.severity,
                    message: signal.message,
                });
                this.events.emit(SystemEventNames.ALERT_CREATED, created);
            } else if (
                existing.severity !== signal.severity ||
                existing.message !== signal.message
            ) {
                const updated = await this.alertRepository.update(existing.id, {
                    severity: signal.severity,
                    message: signal.message,
                    lastSeenAt: now,
                });
                if (updated) {
                    this.events.emit(SystemEventNames.ALERT_UPDATED, updated);
                }
            } else {
                await this.alertRepository.update(existing.id, { lastSeenAt: now });
            }
        }

        for (const alert of open) {
            if (!signalByType.has(alert.type)) {
                const resolved = await this.alertRepository.resolveById(alert.id, now);
                if (resolved) {
                    this.events.emit(SystemEventNames.ALERT_RESOLVED, resolved);
                }
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
}
