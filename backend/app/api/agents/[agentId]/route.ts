export const runtime = "nodejs";

import { store } from "@/lib/storage";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const trimmedAgentId = agentId?.trim();
  if (!trimmedAgentId) {
    return Response.json({ error: "Missing agentId" }, { status: 400 });
  }

  const url = new URL(req.url);
  const full = url.searchParams.get("full") === "true";

  if (full) {
    const agent = await store.getAgentFull({ agentId: trimmedAgentId });
    return Response.json(agent);
  }

  const agent = await store.getAgent({ agentId: trimmedAgentId });
  return Response.json({
    agentId: agent.id,
    role: agent.role,
    llmHistory: agent.llmHistory,
  });
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await params;
  const trimmedAgentId = agentId?.trim();
  if (!trimmedAgentId) {
    return Response.json({ error: "Missing agentId" }, { status: 400 });
  }

  const body = (await req.json().catch(() => null)) as {
    role?: string;
    guidance?: string;
    resetHistory?: boolean;
  } | null;

  if (!body || (!body.role && body.guidance === undefined && !body.resetHistory)) {
    return Response.json({ error: "At least one of role, guidance, or resetHistory is required" }, { status: 400 });
  }

  const results: Record<string, unknown> = { agentId: trimmedAgentId };

  if (body.role?.trim()) {
    const r = await store.updateAgentRole({ agentId: trimmedAgentId, role: body.role.trim() });
    results.role = r.role;
  }

  if (body.resetHistory) {
    const r = await store.resetAgentHistory({ agentId: trimmedAgentId, guidance: body.guidance?.trim() });
    results.historyReset = true;
    results.newRole = r.role;
  } else if (body.guidance !== undefined) {
    const r = await store.updateAgentGuidance({ agentId: trimmedAgentId, guidance: body.guidance });
    results.guidance = r.guidance;
  }

  return Response.json(results);
}
