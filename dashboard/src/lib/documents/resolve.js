export function buildProjectMap(projects = []) {
  const map = new Map();
  projects.forEach((project) => {
    if (project?.id) map.set(project.id, project);
  });
  return map;
}

export function buildClientMap(clients = []) {
  const map = new Map();
  clients.forEach((client) => {
    if (client?.id) map.set(client.id, client);
  });
  return map;
}

export function resolveDocumentMeta(doc, projectMap, clientMap) {
  const project = doc?.project_id ? projectMap.get(doc.project_id) : null;
  const clientId = doc?.client_id || project?.client_id;
  const client = clientId ? clientMap.get(clientId) || project?.client : null;

  return {
    project,
    client,
    projectName: project?.name || null,
    clientName: client?.name || null,
    unassignedProject: !doc?.project_id,
  };
}

export function formatDocDate(ts) {
  if (!ts) return '—';
  try {
    const ms = Number(ts) > 1e12 ? Number(ts) : Number(ts) * 1000;
    return new Intl.DateTimeFormat('ar', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(ms));
  } catch {
    return '—';
  }
}
