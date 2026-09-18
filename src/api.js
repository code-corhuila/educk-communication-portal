// API Client for EduTrack Communication Microservice (Spring Boot)
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8085/api/v1';

export async function checkBackendHealth() {
  try {
    const res = await fetch(`${API_BASE_URL}/messages/health`);
    if (res.ok) return true;
    // Fallback
    const dummyUser = '00000000-0000-0000-0000-000000000000';
    const fallbackRes = await fetch(`${API_BASE_URL}/messages/conversation?user1=${dummyUser}&user2=${dummyUser}`);
    return fallbackRes.ok || fallbackRes.status === 200;
  } catch (err) {
    return false;
  }
}

export async function fetchConversation(user1, user2) {
  const response = await fetch(`${API_BASE_URL}/messages/conversation?user1=${user1}&user2=${user2}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || `Error ${response.status}: No se pudo cargar la conversación`);
  }
  return await response.json();
}

export async function sendMessageApi({ senderId, receiverId, content, subjectId }) {
  const response = await fetch(`${API_BASE_URL}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      senderId,
      receiverId,
      content,
      subjectId: subjectId || null
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || `Error ${response.status}: Falló el envío del mensaje`);
  }
  return data;
}
