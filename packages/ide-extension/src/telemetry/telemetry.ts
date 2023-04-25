import { platform, arch, release } from 'os';
import { env, workspace } from 'vscode';
import type { Disposable } from 'vscode';
import { TelemetryClient } from 'applicationinsights';
import type { Contracts } from 'applicationinsights';
import { logString } from '../logger/logger';
import packageJson from '../../package.json';
import type { TelemetryEvent, TelemetryReporter, TelemetryUIEventProps } from '../utils/telemetry';
import {
    FILTERS_BLOGS_TAGS,
    FILTERS_TUTORIALS_TAGS,
    OPEN_TUTORIAL,
    OPEN_BLOG
} from '@sap/knowledge-hub-extension-types';
const key = 'ApplicationInsightsInstrumentationKeyPLACEH0LDER';

// Telemetry reporter client
let reporter: TelemetryReporter | undefined;

/**
 * Initialize telemetry.
 *
 * @returns - telemetry reporter
 */
export function initTelemetry(): TelemetryReporter {
    const disposables: Disposable[] = [];
    if (!reporter) {
        const client = new TelemetryClient(key);
        client.channel.setUseDiskRetryCaching(true);
        client.addTelemetryProcessor((envelope: Contracts.Envelope) => {
            envelope.tags['ai.location.ip'] = '0.0.0.0';
            envelope.tags['ai.cloud.roleInstance'] = 'masked';
            return true;
        });
        client.context.tags[client.context.keys.userId] = env.machineId;
        client.context.tags[client.context.keys.sessionId] = env.sessionId;
        client.context.tags[client.context.keys.cloudRole] = env.appName;
        const enabled = updateTelemetryStatus();
        disposables.push(workspace.onDidChangeConfiguration(() => updateTelemetryStatus()));
        reporter = {
            client,
            enabled,
            dispose: () => {
                disposables.forEach((d) => d.dispose());
                reporter = undefined;
            }
        };
    }
    return reporter;
}

/**
 * Update the telemetry setting by reading configuration.
 *
 * @returns - status of telemetry setting, true: enabled; false: disabled
 */
function updateTelemetryStatus(): boolean {
    const enabled = !!workspace.getConfiguration('sap.ux.knowledgeHub').get('telemetryEnabled');
    if (reporter) {
        reporter.enabled = enabled;
    }
    return enabled;
}

/**
 * Set common properties which will be added to every telemetry event.
 * If called without properties, all common properties are removed.
 *
 * @param properties - name/value pair of properties (optional)
 * @param properties.ide - development environment VSCODE or SBAS
 * @param properties.sbasdevSpace - SBAS devspace
 */
export function setCommonProperties(properties?: { ide: 'VSCODE' | 'SBAS'; sbasdevSpace: string }) {
    if (reporter) {
        reporter.commonProperties = properties
            ? {
                  'cmn.appstudio': properties.ide === 'SBAS' ? 'true' : 'false',
                  'cmn.devspace': properties.sbasdevSpace,
                  'cmn.os': platform(),
                  'cmn.nodeArch': arch(),
                  'cmn.platformversion': (release() || '').replace(/^(\d+)(\.\d+)?(\.\d+)?(.*)/, '$1$2$3'),
                  'cmn.extname': packageJson.name,
                  'cmn.extversion': packageJson.version
              }
            : undefined;
    }
}

/**
 * Track an even using telemetry.
 *
 * @param event - telemetry event
 */
export async function trackEvent(event: TelemetryEvent): Promise<void> {
    if (!reporter?.enabled) {
        return;
    }
    try {
        const name = `${packageJson.name}/${event.name}`;
        const properties = propertyValuesToString({ ...event.properties, ...(reporter.commonProperties || {}) });
        reporter.client.trackEvent({ name, properties });
        logString(`Telemetry event '${event.name}': ${JSON.stringify(event.properties)}`);
    } catch (error) {
        logString(`Error sending telemetry event '${event.name}': ${(error as Error).message}`);
    }
}

/**
 * Map specified redux actions to to telemetry events and track them.
 *
 * @param action - action that occurred
 */
export async function trackAction(action: any): Promise<void> {
    if (!reporter?.enabled) {
        return;
    }
    try {
        const properties: TelemetryUIEventProps = {
            action: '',
            title: action.title,
            primaryTag: action.primaryTag
        };
        if (action.source === OPEN_TUTORIAL) {
            properties.action = typeof FILTERS_TUTORIALS_TAGS;
            await trackEvent({ name: 'KHUB_OPEN_TUTORIAL', properties });
        } else if (action.source === OPEN_BLOG) {
            properties.action = typeof FILTERS_BLOGS_TAGS;
            await trackEvent({ name: 'KHUB_OPEN_BLOGS', properties });
        }
    } catch (error) {
        logString(`Error sending telemetry action '${action?.payload?.action?.type}': ${(error as Error).message}`);
    }
}

/**
 * Ensure all property values are strings. While type TelemetryEventProperties defines the values
 * as string | number | any, the call LogTelemetryEvent() throws an exception if a non-string
 * property value is passed.
 *
 * @param properties - key/value map of properties
 * @returns - key/value map where all values are strings
 */
function propertyValuesToString(properties: { [key: string]: any }): { [key: string]: string } {
    for (const property in properties) {
        if (typeof properties[property] !== 'string') {
            properties[property] = properties[property].toString();
        }
    }
    return properties;
}