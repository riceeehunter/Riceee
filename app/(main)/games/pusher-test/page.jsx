"use client";

import { useState, useEffect } from "react";
import Pusher from "pusher-js";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function PusherTest() {
  const [messages, setMessages] = useState([]);
  const [pusher, setPusher] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const pusherClient = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY, {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
    });

    pusherClient.connection.bind('connected', () => {
      setConnected(true);
      addMessage('✅ Connected to Pusher!');
    });

    pusherClient.connection.bind('error', (err) => {
      addMessage('❌ Pusher error: ' + JSON.stringify(err));
    });

    const channel = pusherClient.subscribe('test-channel');
    
    channel.bind('pusher:subscription_succeeded', () => {
      addMessage('✅ Subscribed to test-channel');
    });

    channel.bind('test-event', (data) => {
      addMessage('📨 Received: ' + JSON.stringify(data));
    });

    setPusher(pusherClient);

    return () => {
      pusherClient.disconnect();
    };
  }, []);

  const addMessage = (msg) => {
    setMessages(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const sendMessage = async () => {
    addMessage('📤 Sending message...');
    try {
      const res = await fetch('/api/pusher/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          channel: 'test-channel',
          event: 'test-event',
          data: { message: 'Hello from ' + Math.random().toString(36).substr(2, 5) }
        })
      });
      const result = await res.json();
      addMessage('✅ Server response: ' + JSON.stringify(result));
    } catch (err) {
      addMessage('❌ Send failed: ' + err.message);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <Card className="p-6 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold mb-4">Pusher Test</h1>
        
        <div className="mb-4">
          <div className={`inline-block px-3 py-1 rounded ${connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {connected ? '🟢 Connected' : '🔴 Disconnected'}
          </div>
        </div>

        <Button onClick={sendMessage} className="mb-4">
          Send Test Message
        </Button>

        <div className="bg-gray-100 p-4 rounded h-96 overflow-y-auto">
          <h3 className="font-bold mb-2">Console:</h3>
          {messages.map((msg, i) => (
            <div key={i} className="text-sm font-mono mb-1">{msg}</div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          Open this page in 2 tabs. Click "Send Test Message" in one tab. 
          You should see the message appear in both tabs.
        </p>
      </Card>
    </div>
  );
}
