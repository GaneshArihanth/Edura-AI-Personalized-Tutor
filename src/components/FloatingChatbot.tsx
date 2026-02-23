import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, X, Send, Bot, User } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
}

export function FloatingChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 'welcome',
    role: 'model',
    content: "Hi! I'm the Edura AI. Ask me about courses, assignments, or platform features and I can guide you there!"
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('chat-agent-rag', {
        body: {
          message: userMessage.content,
          history: messages.slice(1).map(m => ({ role: m.role, content: m.content })),
        },
      });

      if (error) throw error;

      const aiResponse = data;

      const botMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: aiResponse.reply || "I'm sorry, I couldn't process that.",
      };

      setMessages((prev) => [...prev, botMessage]);

      // AGENTIC BEHAVIOR: Check for navigation payload
      if (aiResponse.action && aiResponse.action.type === 'navigate' && aiResponse.action.path) {
        setTimeout(() => {
          setIsOpen(false);
          navigate(aiResponse.action.path);
        }, 1500); // give them a second to read the reply before swooshing them away
      }

    } catch (error) {
      console.error('Error calling chat-agent-rag:', error);
      setMessages((prev) => [
        ...prev,
        { id: Date.now().toString(), role: 'model', content: "I'm having trouble connecting right now. Please try again later." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {isOpen && (
          <Card className="mb-4 w-80 sm:w-96 shadow-xl border-primary/20 backdrop-blur-md bg-background/95 h-[500px] flex flex-col animate-in slide-in-from-bottom-5">
            <CardHeader className="flex flex-row items-center justify-between py-3 px-4 border-b bg-muted/50">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <CardTitle className="text-md">Edura AI Assistant</CardTitle>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-hidden p-0 relative">
              <ScrollArea className="h-full px-4 py-4">
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className={`mt-1 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-primary' : 'bg-muted'}`}>
                        {msg.role === 'user' ? <User className="h-4 w-4 text-primary-foreground" /> : <Bot className="h-4 w-4" />}
                      </div>
                      <div
                        className={`rounded-lg px-3 py-2 text-sm max-w-[80%] ${
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted border border-border/50'
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  ))}
                  {isLoading && (
                    <div className="flex gap-2 flex-row">
                      <div className="mt-1 h-6 w-6 rounded-full flex items-center justify-center shrink-0 bg-muted">
                        <Bot className="h-4 w-4" />
                      </div>
                      <div className="rounded-lg px-3 py-2 text-sm bg-muted border border-border/50 flex space-x-1 items-center h-9">
                        <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-1.5 h-1.5 bg-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  )}
                  <div ref={scrollRef} className="pb-2" />
                </div>
              </ScrollArea>
            </CardContent>
            <CardFooter className="p-3 border-t bg-muted/20">
              <div className="flex w-full items-center space-x-2">
                <Input
                  type="text"
                  placeholder="Ask me anything..."
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                  disabled={isLoading}
                  className="flex-1 bg-background"
                />
                <Button size="icon" onClick={handleSend} disabled={isLoading || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        <Button
          size="icon"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </Button>
      </div>
    </>
  );
}
