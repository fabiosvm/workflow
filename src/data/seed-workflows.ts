/**
 * The workflows a fresh install starts with.
 *
 * Read once, by `workflow-repository.ts`, the first time the library is opened
 * on a machine — from then on the stored library is the truth and this file is
 * inert. Nothing else should import it: everything reaches workflows through
 * `src/api/`.
 *
 * Two of them rather than one on purpose. A library with a single entry hides
 * every bug that only appears when switching documents.
 */

import type { Workflow } from '@/types/workflow'

const orderNotifications: Workflow = {
  id: 'wf_order_notifications',
  name: 'Order notifications',
  description: 'Notifies the team when a high-value order comes in',
  nodes: [
    {
      id: 'node_webhook',
      type: 'trigger.webhook',
      label: 'Order received',
      position: { x: 0, y: 160 },
      params: {
        method: 'POST',
        path: '/hooks/orders',
      },
    },
    {
      id: 'node_enrich',
      type: 'action.http',
      label: 'Fetch customer',
      position: { x: 320, y: 160 },
      params: {
        method: 'GET',
        url: 'https://api.example.com/customers/{{ $json.customerId }}',
      },
    },
    {
      id: 'node_check_total',
      type: 'condition.if',
      label: 'High value?',
      position: { x: 640, y: 160 },
      params: {
        left: '{{ $json.total }}',
        operator: 'gte',
        right: '1000',
      },
    },
    {
      id: 'node_notify',
      type: 'action.email',
      label: 'Alert sales team',
      position: { x: 980, y: 40 },
      params: {
        to: 'sales@example.com',
        subject: 'High-value order received',
        body: 'Order {{ $json.id }} came in above the alert threshold.',
      },
    },
    {
      id: 'node_archive',
      type: 'action.transform',
      label: 'Archive order',
      position: { x: 980, y: 300 },
      params: {
        expression: '{ id: $json.id, archivedAt: $now }',
      },
    },
  ],
  connections: [
    {
      id: 'edge_webhook_enrich',
      source: 'node_webhook',
      target: 'node_enrich',
      sourceHandle: 'main',
    },
    {
      id: 'edge_enrich_check',
      source: 'node_enrich',
      target: 'node_check_total',
      sourceHandle: 'main',
    },
    {
      id: 'edge_check_notify',
      source: 'node_check_total',
      target: 'node_notify',
      sourceHandle: 'true',
    },
    {
      id: 'edge_check_archive',
      source: 'node_check_total',
      target: 'node_archive',
      sourceHandle: 'false',
    },
  ],
}

const dailyDigest: Workflow = {
  id: 'wf_daily_digest',
  name: 'Daily digest',
  description: 'Emails yesterday’s signups every morning',
  nodes: [
    {
      id: 'node_every_morning',
      type: 'trigger.schedule',
      label: 'Every morning',
      position: { x: 0, y: 120 },
      params: {
        cron: '0 7 * * *',
        timezone: 'America/Sao_Paulo',
      },
    },
    {
      id: 'node_fetch_signups',
      type: 'action.http',
      label: 'Fetch signups',
      position: { x: 320, y: 120 },
      params: {
        method: 'GET',
        url: 'https://api.example.com/signups?since={{ $yesterday }}',
      },
    },
    {
      id: 'node_summarize',
      type: 'action.transform',
      label: 'Summarize',
      position: { x: 640, y: 120 },
      params: {
        expression: '{ count: $json.length, names: $json.map(u => u.name) }',
      },
    },
    {
      id: 'node_send_digest',
      type: 'action.email',
      label: 'Send digest',
      position: { x: 960, y: 120 },
      params: {
        to: 'growth@example.com',
        subject: 'Signups yesterday: {{ $json.count }}',
        body: '{{ $json.names }}',
      },
    },
  ],
  connections: [
    {
      id: 'edge_morning_fetch',
      source: 'node_every_morning',
      target: 'node_fetch_signups',
      sourceHandle: 'main',
    },
    {
      id: 'edge_fetch_summarize',
      source: 'node_fetch_signups',
      target: 'node_summarize',
      sourceHandle: 'main',
    },
    {
      id: 'edge_summarize_send',
      source: 'node_summarize',
      target: 'node_send_digest',
      sourceHandle: 'main',
    },
  ],
}

export const SEED_WORKFLOWS: Workflow[] = [orderNotifications, dailyDigest]
