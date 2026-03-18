"use client";

import { useState, useRef, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Send, 
  Sparkles, 
  Loader2,
  MessageCircle,
  User,
  Bot
} from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { APP_BRAND } from "@/lib/constants/branding";

export default function RiceeeChat() {
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: `Hey there! 👋 I'm ${APP_BRAND.aiAssistantName}, your relationship mediator.\n\nI'm here to help you work through relationship conflicts. To give you the best advice, I need to understand the full picture.\n\n**Tell me about your conflict:**\n• What happened?\n• How do you feel about it?\n• What do you think your partner's perspective is?\n\nShare as much detail as you can! 💜`
    }
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Auto-focus textarea
    textareaRef.current?.focus();
  }, [isLoading]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      role: "user",
      content: inputMessage.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsLoading(true);

    try {
      // Call the Next.js API route which proxies to Python AI
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minute timeout
      
      const response = await fetch('/api/riceee-ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content  // Send as conversational message
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI response');
      }

      const data = await response.json();
      
      const aiResponse = {
        role: "assistant",
        content: data.advice
      };
      
      setMessages(prev => [...prev, aiResponse]);
    } catch (error) {
      console.error("Error getting AI response:", error);
      
      let errorMessage = "Oops! Something went wrong. 🤔\n\n";
      
      if (error.name === 'AbortError') {
        errorMessage += "The request took too long. The AI might be processing on CPU (slow). Please try again or check if the Python server is running properly.";
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage += "Can't connect to the AI server. Make sure:\n• Python server is running: `python riceee_api.py`\n• Server is on http://localhost:8000";
      } else {
        errorMessage += error.message;
      }
      
      setMessages(prev => [...prev, {
        role: "assistant",
        content: errorMessage
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                <ArrowLeft className="h-5 w-5" />
              </Button>
            </Link>
            <div className="flex items-center gap-3 flex-1">
              <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-md">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 bg-clip-text text-transparent">
                  Chat with {APP_BRAND.aiName}
                </h1>
                <p className="text-sm text-muted-foreground">{APP_BRAND.aiRoleDescription}</p>
              </div>
              <Sparkles className="h-5 w-5 text-purple-500 animate-pulse" />
            </div>
          </div>
        </div>
      </div>

      {/* Chat Container */}
      <div className="container mx-auto px-4 py-6 max-w-5xl">
        <div className="h-[calc(100vh-9rem)] flex flex-col rounded-3xl border-2 border-orange-200 bg-orange-50/50 dark:bg-orange-950/10 shadow-xl p-6">
          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === "user" ? "justify-end" : "justify-start"
                } animate-in fade-in slide-in-from-bottom-2 duration-300`}
              >
                {message.role === "assistant" && (
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                    <Bot className="h-5 w-5 text-white" />
                  </div>
                )}
                
                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md"
                      : "bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800"
                  }`}
                >
                  <div className="whitespace-pre-wrap text-sm leading-relaxed prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-strong:text-orange-600 dark:prose-strong:text-orange-400">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                </div>

                {message.role === "user" && (
                  <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-orange-400 to-amber-400 flex items-center justify-center shadow-md">
                    <User className="h-5 w-5 text-white" />
                  </div>
                )}
              </div>
            ))}
            
            {isLoading && (
              <div className="flex gap-3 justify-start animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex-shrink-0 w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-md">
                  <Bot className="h-5 w-5 text-white" />
                </div>
                <div className="bg-white dark:bg-gray-800 border-2 border-orange-200 dark:border-orange-800 rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-purple-500" />
                    <span className="text-sm text-muted-foreground">{APP_BRAND.aiAssistantName} is thinking...</span>
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <div className="border-t-2 border-orange-200 pt-4">
            <form onSubmit={handleSubmit} className="flex items-center gap-3">
              <Textarea
                ref={textareaRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="resize-none border-2 border-orange-300 focus:border-orange-500 focus:ring-orange-500 rounded-2xl bg-white dark:bg-gray-800 text-sm"
                rows={1}
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 rounded-2xl px-6 h-12 shadow-md hover:shadow-lg transition-all flex-shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <Send className="h-5 w-5" />
                )}
              </Button>
            </form>
            <p className="text-xs text-center text-muted-foreground mt-3 flex items-center justify-center gap-1">
              <span>{APP_BRAND.aiAssistantName} is here to help. Be open and honest!</span>
              <span className="text-purple-500">💜</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
