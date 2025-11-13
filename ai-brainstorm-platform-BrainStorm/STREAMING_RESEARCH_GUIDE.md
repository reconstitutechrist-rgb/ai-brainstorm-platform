# Streaming Research Guide

## Overview

The Research Hub now supports **real-time streaming responses** using Server-Sent Events (SSE). This provides live progress updates during research operations, improving UX for long-running tasks.

---

## 🎯 Features

### 1. **Real-Time Progress Updates**
- Search progress (25%)
- Crawling progress (50%)
- Analysis progress (75%)
- Synthesis streaming (75-100%)

### 2. **Streaming Synthesis**
- Results streamed chunk-by-chunk
- No waiting for complete generation
- See content as it's generated

### 3. **Event-Driven Architecture**
- Multiple event types
- Clear progress indicators
- Error handling

---

## 📡 API Endpoints

### POST /api/research-stream/live

Stream live research with real-time progress updates.

**Request:**
```typescript
POST /api/research-stream/live
Content-Type: application/json

{
  "query": "machine learning optimization techniques",
  "projectId": "uuid",
  "userId": "uuid",
  "maxSources": 5
}
```

**Response:** Server-Sent Events (SSE)

---

## 🔄 Event Types

### 1. `start`
Initial event when research begins
```json
{
  "message": "Starting research...",
  "query": "machine learning",
  "maxSources": 5
}
```

### 2. `search_complete`
Search phase completed
```json
{
  "message": "Found 5 sources",
  "count": 5,
  "progress": 25
}
```

### 3. `crawl_complete`
Content extraction completed
```json
{
  "message": "Crawled 5 sources successfully",
  "count": 5,
  "progress": 50
}
```

### 4. `analysis_complete`
Analysis phase completed
```json
{
  "message": "Analyzed 5 sources",
  "count": 5,
  "progress": 75
}
```

### 5. `synthesis_chunk`
Synthesis content streamed in chunks
```json
{
  "chunk": "Based on the research...",
  "progress": 85
}
```

### 6. `complete`
Research fully completed
```json
{
  "message": "Research complete",
  "result": {
    "query": "...",
    "sources": [...],
    "synthesis": "...",
    "savedReferences": [...],
    "metadata": {...}
  },
  "progress": 100
}
```

### 7. `error`
Error occurred during research
```json
{
  "message": "Research failed",
  "error": "Network error: Cannot reach URL"
}
```

---

## 💻 Frontend Implementation

### JavaScript/TypeScript Example

```typescript
// Create EventSource connection
const eventSource = new EventSource('http://localhost:3001/api/research-stream/live', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    query: 'machine learning',
    projectId: 'project-uuid',
    userId: 'user-uuid',
    maxSources: 5,
  }),
});

// Handle events
eventSource.addEventListener('start', (event) => {
  const data = JSON.parse(event.data);
  console.log('Starting:', data.message);
  updateProgress(0, data.message);
});

eventSource.addEventListener('search_complete', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Search: Found ${data.count} sources`);
  updateProgress(data.progress, data.message);
});

eventSource.addEventListener('crawl_complete', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Crawl: ${data.count} sources`);
  updateProgress(data.progress, data.message);
});

eventSource.addEventListener('analysis_complete', (event) => {
  const data = JSON.parse(event.data);
  console.log(`Analysis: ${data.count} sources`);
  updateProgress(data.progress, data.message);
});

eventSource.addEventListener('synthesis_chunk', (event) => {
  const data = JSON.parse(event.data);
  appendSynthesis(data.chunk);
  updateProgress(data.progress, 'Generating synthesis...');
});

eventSource.addEventListener('complete', (event) => {
  const data = JSON.parse(event.data);
  console.log('Complete!', data.result);
  updateProgress(100, 'Research complete');
  eventSource.close();
});

eventSource.addEventListener('error', (event) => {
  const data = JSON.parse(event.data);
  console.error('Error:', data.error);
  showError(data.error);
  eventSource.close();
});

// Clean up on component unmount
onUnmount(() => {
  eventSource.close();
});
```

### React Hook Example

```typescript
import { useEffect, useState } from 'react';

interface ResearchProgress {
  progress: number;
  message: string;
  synthesis: string;
  result?: any;
  error?: string;
}

function useStreamingResearch(query: string, projectId: string, userId: string) {
  const [state, setState] = useState<ResearchProgress>({
    progress: 0,
    message: '',
    synthesis: '',
  });

  useEffect(() => {
    const eventSource = new EventSource(
      `http://localhost:3001/api/research-stream/live?` +
      new URLSearchParams({
        query,
        projectId,
        userId,
      })
    );

    eventSource.addEventListener('start', (event) => {
      const data = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        progress: 0,
        message: data.message,
      }));
    });

    eventSource.addEventListener('search_complete', (event) => {
      const data = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        progress: data.progress,
        message: data.message,
      }));
    });

    eventSource.addEventListener('crawl_complete', (event) => {
      const data = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        progress: data.progress,
        message: data.message,
      }));
    });

    eventSource.addEventListener('analysis_complete', (event) => {
      const data = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        progress: data.progress,
        message: data.message,
      }));
    });

    eventSource.addEventListener('synthesis_chunk', (event) => {
      const data = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        progress: data.progress,
        synthesis: prev.synthesis + data.chunk,
        message: 'Generating synthesis...',
      }));
    });

    eventSource.addEventListener('complete', (event) => {
      const data = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        progress: 100,
        message: data.message,
        result: data.result,
      }));
      eventSource.close();
    });

    eventSource.addEventListener('error', (event) => {
      const data = JSON.parse(event.data);
      setState(prev => ({
        ...prev,
        error: data.error,
        message: data.message,
      }));
      eventSource.close();
    });

    return () => {
      eventSource.close();
    };
  }, [query, projectId, userId]);

  return state;
}

// Usage in component
function ResearchComponent() {
  const research = useStreamingResearch(
    'machine learning',
    'project-uuid',
    'user-uuid'
  );

  return (
    <div>
      <h2>Research Progress</h2>
      <ProgressBar value={research.progress} />
      <p>{research.message}</p>
      
      {research.synthesis && (
        <div>
          <h3>Synthesis</h3>
          <p>{research.synthesis}</p>
        </div>
      )}
      
      {research.error && (
        <div className="error">
          Error: {research.error}
        </div>
      )}
      
      {research.result && (
        <div>
          <h3>Results</h3>
          <pre>{JSON.stringify(research.result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
```

---

## 🧪 Testing

### Test SSE Connection

```bash
# Simple test endpoint
curl -N http://localhost:3001/api/research-stream/test
```

Expected output:
```
event: message
data: {"count":0,"time":"2025-11-05T21:30:00.000Z"}

event: message
data: {"count":1,"time":"2025-11-05T21:30:01.000Z"}

...

event: complete
data: {"message":"Test complete"}
```

### Test Research Stream

```bash
# Start streaming research
curl -X POST http://localhost:3001/api/research-stream/live \
  -H "Content-Type: application/json" \
  -N \
  -d '{
    "query": "machine learning",
    "projectId": "test-project",
    "userId": "test-user",
    "maxSources": 3
  }'
```

---

## 🎨 UI Components

### Progress Bar Example

```typescript
interface ProgressBarProps {
  value: number; // 0-100
  message?: string;
}

function ProgressBar({ value, message }: ProgressBarProps) {
  return (
    <div className="progress-container">
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${value}%` }}
        />
      </div>
      {message && (
        <p className="progress-message">{message}</p>
      )}
      <span className="progress-percentage">{value}%</span>
    </div>
  );
}
```

### Streaming Text Display

```typescript
interface StreamingTextProps {
  text: string;
  isStreaming: boolean;
}

function StreamingText({ text, isStreaming }: StreamingTextProps) {
  return (
    <div className="streaming-text">
      <div className="content">
        {text}
        {isStreaming && <span className="cursor">▊</span>}
      </div>
    </div>
  );
}
```

---

## 📊 Benefits

### Before Streaming:
```
User clicks "Research"
  ↓
[WAITING... 30-60 seconds]
  ↓
Complete results appear
```

**Problems:**
- No feedback during operation
- Feels unresponsive
- Can't tell if it's working
- User anxiety increases

### After Streaming:
```
User clicks "Research"
  ↓
"Starting research..." (0%)
  ↓
"Found 5 sources" (25%)
  ↓
"Crawled 5 sources" (50%)
  ↓
"Analyzed 5 sources" (75%)
  ↓
"Based on the research..." (streaming text)
  ↓
Complete! (100%)
```

**Benefits:**
- Immediate feedback
- Feels responsive
- Progress is visible
- Better user experience
- Can see partial results
- Reduced perceived wait time

---

## 🔧 Technical Details

### Server-Sent Events (SSE)

**Why SSE over WebSockets?**
- Simpler (HTTP-based)
- Automatic reconnection
- Server-to-client only (what we need)
- Works with existing infrastructure
- No need for bidirectional communication

**SSE Format:**
```
event: event_name
data: {"json": "data"}

event: another_event
data: {"more": "data"}

```

### Performance Considerations

**Chunk Size:**
- 100 characters per chunk
- 50ms delay between chunks
- Total: ~2 seconds for 4000 char synthesis

**Memory:**
- Streaming reduces memory usage
- No need to buffer entire response
- Results sent as they're generated

**Scalability:**
- Each connection is one HTTP request
- Server can handle thousands of concurrent SSE connections
- Automatic cleanup on disconnect

---

## 🚀 Future Enhancements

### Planned Improvements:

1. **Real-time Claude Streaming**
   - Stream Claude responses directly
   - No chunking simulation
   - True token-by-token streaming

2. **Progress Checkpoints**
   - Resume interrupted research
   - Save partial results
   - Restart from checkpoint

3. **Cancellation Support**
   - Allow users to stop research mid-operation
   - Clean up resources
   - Partial result saving

4. **Multiple Concurrent Streams**
   - Research multiple queries simultaneously
   - Parallel processing
   - Merged progress display

---

## 📝 Troubleshooting

### Connection Issues

**Problem:** EventSource fails to connect

**Solution:**
- Check CORS settings
- Verify endpoint URL
- Ensure server is running
- Check network connectivity

### Buffering Issues

**Problem:** Events arrive in batches instead of streaming

**Solution:**
- Add `X-Accel-Buffering: no` header
- Disable nginx buffering
- Use `res.flush()` after each event

### Memory Leaks

**Problem:** EventSource not closing properly

**Solution:**
```typescript
useEffect(() => {
  const eventSource = new EventSource(url);
  
  // ... event handlers ...
  
  return () => {
    eventSource.close(); // IMPORTANT: Clean up!
  };
}, [deps]);
```

---

## 🎓 Best Practices

1. **Always close connections**
   - Close on completion
   - Close on error
   - Close on component unmount

2. **Handle reconnection**
   - EventSource reconnects automatically
   - Implement retry logic
   - Show reconnection status

3. **Progress feedback**
   - Update UI frequently
   - Show meaningful messages
   - Indicate what's happening

4. **Error handling**
   - Catch and display errors
   - Provide recovery options
   - Log for debugging

5. **Testing**
   - Test with slow networks
   - Test reconnection scenarios
   - Test error cases

---

## 📚 Additional Resources

- [MDN: Server-Sent Events](https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events)
- [EventSource API](https://developer.mozilla.org/en-US/docs/Web/API/EventSource)
- [SSE Specification](https://html.spec.whatwg.org/multipage/server-sent-events.html)

---

*Streaming responses make the Research Hub feel faster and more responsive!*
