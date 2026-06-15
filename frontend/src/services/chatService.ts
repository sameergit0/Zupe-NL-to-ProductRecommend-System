export interface ChatMessageRequest {
  message: string;
  session_id: string | null;
}

export interface StreamHandlers {
  onStart?: (sessionId: string) => void;
  onStatus?: (status: string) => void;
  onNode?: (nodeName: string) => void;
  onToken?: (token: string) => void;
  onDone?: () => void;
  onError?: (error: string) => void;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Sends a message to the backend chat workflow and streams the response.
 * Maps 'session_id' in localStorage to 'thread_id' in the backend,
 * and 'message' to 'query'.
 */
export async function streamChat(
  req: ChatMessageRequest,
  handlers: StreamHandlers,
  signal?: AbortSignal
): Promise<void> {
  const { message, session_id } = req;

  while (true) {
    if (signal?.aborted) {
      console.log('Stream request aborted before fetch');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: message,
          thread_id: session_id,
        }),
        signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('Response body is not readable.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Split by double newline or single newline to isolate data packets
        const lines = buffer.split('\n');
        // Keep the last partial line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith('data:')) {
            const jsonStr = trimmed.slice(5).trim();
            if (!jsonStr) continue;

            try {
              const data = JSON.parse(jsonStr);

              switch (data.type) {
                case 'start':
                  if (data.thread_id && handlers.onStart) {
                    handlers.onStart(data.thread_id);
                  }
                  break;
                case 'status':
                  if (data.status && handlers.onStatus) {
                    handlers.onStatus(data.status);
                  }
                  break;
                case 'node':
                  if (data.node && handlers.onNode) {
                    handlers.onNode(data.node);
                  }
                  break;
                case 'answer':
                  if (data.content && handlers.onToken) {
                    handlers.onToken(data.content);
                  }
                  break;
                case 'done':
                  if (handlers.onDone) {
                    handlers.onDone();
                  }
                  return; // Normal exit
                case 'error':
                  if (handlers.onError) {
                    handlers.onError(data.content || 'Workflow execution error');
                  }
                  return;
                default:
                  break;
              }
            } catch (err) {
              console.error('Failed to parse SSE event JSON:', trimmed, err);
            }
          }
        }
      }

      // Flush any remaining content in the buffer
      if (buffer.trim()) {
        const trimmed = buffer.trim();
        if (trimmed.startsWith('data:')) {
          const jsonStr = trimmed.slice(5).trim();
          try {
            const data = JSON.parse(jsonStr);
            if (data.type === 'answer' && data.content && handlers.onToken) {
              handlers.onToken(data.content);
            }
          } catch {
            // Ignore partial or malformed final lines
          }
        }
      }

      if (handlers.onDone) {
        handlers.onDone();
      }
      return; // Success, exit retry loop
    } catch (error: any) {
      if (error.name === 'AbortError' || signal?.aborted) {
        console.log('Stream request aborted by user');
        return;
      }
      console.warn('Connection to chatbot backend failed. Retrying in 2 seconds...', error.message);
      // Wait for 2 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
}
