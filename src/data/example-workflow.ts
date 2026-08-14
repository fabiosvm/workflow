/**
 * Local data source for the example workflow.
 *
 * This file stands in for the backend. `src/api/workflows.ts` reads from here
 * today and will read from the API later; nothing else should import it
 * directly.
 */

import type { Workflow } from '@/types/workflow'

export const exampleWorkflow: Workflow = {
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

export const exampleWorkflows: Workflow[] = [exampleWorkflow]
