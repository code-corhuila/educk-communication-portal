// API Client for EduTrack Communication Microservice (Spring Boot :8085)
// Includes W3C Trace Context (traceparent), Correlation ID, and Idempotency-Key propagation
const DEFAULT_API_URL =
  typeof window !== 'undefined' &&
  window.location.hostname !== 'localhost' &&
  window.location.hostname !== '127.0.0.1'
    ? '/api/v1'
    : 'http://localhost:8085/api/v1';
const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  DEFAULT_API_URL;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const TOPIC_UUID_MAP = Object.freeze({
  'Consulta Académica': '33333333-3333-3333-3333-333333333333',
  'Seguimiento de Calificación': '77777777-7777-7777-7777-777777777777',
  'Justificación de Inasistencia': '88888888-8888-8888-8888-888888888888',
  'Solicitud de Atención a Padres': '99999999-9999-9999-9999-999999999999',
  'Observación General': '66666666-6666-6666-6666-666666666666'
});
export const UUID_TOPIC_MAP = Object.freeze(
  Object.fromEntries(Object.entries(TOPIC_UUID_MAP).map(([label, uuid]) => [uuid, label]))
);
export function resolveSubjectUuid(subjectOrTopic) {
  if (!subjectOrTopic) return null;
  if (UUID_REGEX.test(subjectOrTopic)) return subjectOrTopic;
  return TOPIC_UUID_MAP[subjectOrTopic] || '33333333-3333-3333-3333-333333333333';
}
export function resolveTopicLabel(subjectIdOrTopic) {
  if (!subjectIdOrTopic) return 'Consulta Académica';
  return UUID_TOPIC_MAP[subjectIdOrTopic] || subjectIdOrTopic;
}
function randomHex(byteLength) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    const bytes = new Uint8Array(byteLength);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  }
  let out = '';
  for (let i = 0; i < byteLength * 2; i++) {
    out += Math.floor(Math.random() * 16).toString(16);
  }
  return out;
}
export function createTraceTelemetry() {
  const traceId = randomHex(16);
  const spanId = randomHex(8);
  const traceparent = `00-${traceId}-${spanId}-01`;
  const correlationId =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? `corr-${crypto.randomUUID().slice(0, 8)}`
      : `corr-${randomHex(4)}`;
  const idempotencyKey =
    typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `${randomHex(4)}-${randomHex(2)}-4${randomHex(1).slice(1)}-a${randomHex(1).slice(1)}-${randomHex(6)}`;
  return {
    traceId,
    spanId,
    traceparent,
    correlationId,
    idempotencyKey,
    timestamp: new Date().toISOString()
  };
}
async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}
export async function checkBackendHealth() {
  try {
    const telemetry = createTraceTelemetry();
    const res = await fetchWithTimeout(
      `${API_BASE_URL}/messages/health`,
      {
        headers: {
          traceparent: telemetry.traceparent,
          'X-Correlation-Id': telemetry.correlationId
        }
      },
      2000
    );
    return res.ok;
  } catch {
    return false;
  }
}
export async function fetchConversation(user1, user2) {
  const telemetry = createTraceTelemetry();
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/messages/conversation?user1=${encodeURIComponent(user1)}&user2=${encodeURIComponent(user2)}`,
    {
      headers: {
        traceparent: telemetry.traceparent,
        'X-Correlation-Id': telemetry.correlationId
      }
    },
    2500
  );
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `HTTP ${response.status}`);
  }
  return await response.json();
}
export async function sendMessageApi({
  senderId,
  receiverId,
  content,
  subjectId,
  idempotencyKey,
  telemetry = createTraceTelemetry()
}) {
  const finalIdempotencyKey = idempotencyKey || telemetry.idempotencyKey;
  const resolvedSubjectId = resolveSubjectUuid(subjectId);
  const headers = {
    'Content-Type': 'application/json',
    'Idempotency-Key': finalIdempotencyKey,
    traceparent: telemetry.traceparent,
    'X-Correlation-Id': telemetry.correlationId
  };
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/messages`,
    {
      method: 'POST',
      headers,
      body: JSON.stringify({
        senderId,
        receiverId,
        content,
        subjectId: resolvedSubjectId
      })
    },
    3500
  );
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `HTTP ${response.status}`);
  }
  return {
    ...data,
    _telemetry: {
      ...telemetry,
      idempotencyKey: finalIdempotencyKey
    }
  };
}
