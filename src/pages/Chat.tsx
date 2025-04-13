import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Match, Message as MessageType, MatchWithOtherUser } from '@/types/supabase';

type ChatMessage = MessageType & {
  sender: {
    username: string;
    avatar_url: string | null;
  }
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (date >= today) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ' ' + 
           date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
};

const Chat = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const matchId = queryParams.get('matchId');
  
  const [loading, setLoading] = useState(true);
  const [matches, setMatches] = useState<MatchWithOtherUser[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<string | null>(matchId);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('matches')
          .select('id, user1_id, user2_id, status, created_at, updated_at')
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .eq('status', 'accepted');
        
        if (error) throw error;
        
        // Process matches to include other user information
        const processedMatches = await Promise.all(
          data.map(async (match) => {
            const otherUserId = match.user1_id === user.id ? match.user2_id : match.user1_id;
            
            const { data: otherUserData, error: otherUserError } = await supabase
              .from('profiles')
              .select('id, username, full_name, avatar_url')
              .eq('id', otherUserId)
              .single();
            
            if (otherUserError) throw otherUserError;
            
            return {
              ...match,
              otherUser: otherUserData,
            } as MatchWithOtherUser;
          })
        );
        
        setMatches(processedMatches);
        
        // If matchId is provided via URL and is valid, use it
        if (matchId && processedMatches.some(m => m.id === matchId)) {
          setSelectedMatch(matchId);
        } 
        // Otherwise, select the first match if available
        else if (processedMatches.length > 0 && !selectedMatch) {
          setSelectedMatch(processedMatches[0].id);
        }
      } catch (error) {
        console.error('Error fetching matches:', error);
        toast({
          title: "Error",
          description: "Failed to load your matches. Please try again.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [user, toast, matchId]);

  useEffect(() => {
    const fetchMessages = async () => {
      if (!selectedMatch) return;
      
      try {
        const { data, error } = await supabase
          .from('messages')
          .select('*')
          .eq('match_id', selectedMatch)
          .order('created_at', { ascending: true });
        
        if (error) throw error;
        
        // Get sender information for each message
        const messagesWithSenders = await Promise.all(
          data.map(async (message) => {
            const { data: senderData, error: senderError } = await supabase
              .from('profiles')
              .select('username, avatar_url')
              .eq('id', message.sender_id)
              .single();
            
            if (senderError) throw senderError;
            
            return {
              ...message,
              sender: senderData,
            };
          })
        );
        
        setMessages(messagesWithSenders);
      } catch (error) {
        console.error('Error fetching messages:', error);
        toast({
          title: "Error",
          description: "Failed to load messages. Please try again.",
          variant: "destructive",
        });
      }
    };

    if (selectedMatch) {
      fetchMessages();
    }
  }, [selectedMatch, toast]);

  useEffect(() => {
    // Set up real-time subscription for new messages
    if (!selectedMatch) return;
    
    const subscription = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'messages',
          filter: `match_id=eq.${selectedMatch}` 
        },
        async (payload) => {
          const message = payload.new as MessageType;
          
          const { data: senderData, error: senderError } = await supabase
            .from('profiles')
            .select('username, avatar_url')
            .eq('id', message.sender_id)
            .single();
          
          if (senderError) {
            console.error('Error fetching sender data:', senderError);
            return;
          }
          
          const newMessage: ChatMessage = {
            ...message,
            sender: senderData,
          };
          
          setMessages(prev => [...prev, newMessage]);
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [selectedMatch]);

  useEffect(() => {
    // Scroll to bottom when messages change
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !selectedMatch || !newMessage.trim()) return;
    
    setSendingMessage(true);
    
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          match_id: selectedMatch,
          sender_id: user.id,
          message: newMessage.trim(),
        });
      
      if (error) throw error;
      
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4">
      <h1 className="text-3xl font-bold mb-6 text-purple-700">Messages</h1>
      
      {matches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Conversations</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {matches.map(match => (
                    <button
                      key={match.id}
                      className={`w-full flex items-center p-4 hover:bg-gray-50 transition-colors ${
                        selectedMatch === match.id ? 'bg-purple-50' : ''
                      }`}
                      onClick={() => setSelectedMatch(match.id)}
                    >
                      <Avatar className="h-10 w-10 mr-3">
                        <AvatarImage src={match.otherUser.avatar_url || undefined} />
                        <AvatarFallback className="bg-purple-700 text-white">
                          {match.otherUser.username.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="text-left">
                        <div className="font-medium">{match.otherUser.full_name || match.otherUser.username}</div>
                        <div className="text-sm text-gray-500">@{match.otherUser.username}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-3">
            {selectedMatch ? (
              <Card className="h-[70vh] flex flex-col">
                <CardHeader className="px-6 py-4 border-b">
                  <div className="flex items-center">
                    <Avatar className="h-8 w-8 mr-3">
                      <AvatarImage src={matches.find(m => m.id === selectedMatch)?.otherUser.avatar_url || undefined} />
                      <AvatarFallback className="bg-purple-700 text-white">
                        {matches.find(m => m.id === selectedMatch)?.otherUser.username.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <CardTitle className="text-lg">
                      {matches.find(m => m.id === selectedMatch)?.otherUser.full_name || 
                       matches.find(m => m.id === selectedMatch)?.otherUser.username}
                    </CardTitle>
                  </div>
                </CardHeader>
                
                <CardContent className="flex-1 overflow-y-auto p-6">
                  {messages.length > 0 ? (
                    <div className="space-y-4">
                      {messages.map(message => (
                        <div
                          key={message.id}
                          className={`flex ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
                        >
                          {message.sender_id !== user?.id && (
                            <Avatar className="h-8 w-8 mr-2 mt-1">
                              <AvatarImage src={message.sender.avatar_url || undefined} />
                              <AvatarFallback className="bg-purple-700 text-white">
                                {message.sender.username.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          
                          <div className={`max-w-[70%] ${message.sender_id === user?.id ? 'bg-purple-600 text-white' : 'bg-gray-100 text-gray-800'} rounded-lg px-4 py-2`}>
                            <div className="text-sm">{message.message}</div>
                            <div className={`text-xs mt-1 ${message.sender_id === user?.id ? 'text-purple-200' : 'text-gray-500'}`}>
                              {formatDate(message.created_at)}
                            </div>
                          </div>
                        </div>
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
                      <MessageSquare className="h-12 w-12 mb-4 text-gray-300" />
                      <h3 className="text-xl font-medium mb-2">No messages yet</h3>
                      <p>Start the conversation with your gym buddy!</p>
                    </div>
                  )}
                </CardContent>
                
                <div className="p-4 border-t">
                  <form onSubmit={handleSendMessage} className="flex items-center gap-2">
                    <Input
                      placeholder="Type your message..."
                      value={newMessage}
                      onChange={e => setNewMessage(e.target.value)}
                      disabled={sendingMessage}
                      className="flex-1"
                    />
                    <Button 
                      type="submit" 
                      disabled={!newMessage.trim() || sendingMessage}
                      className="bg-purple-600 hover:bg-purple-700"
                    >
                      {sendingMessage ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </form>
                </div>
              </Card>
            ) : (
              <Card className="h-[70vh] flex items-center justify-center p-8 text-center">
                <div>
                  <MessageSquare className="h-16 w-16 mx-auto mb-6 text-gray-300" />
                  <h3 className="text-2xl font-medium mb-2">No conversation selected</h3>
                  <p className="text-gray-500 mb-6">
                    Select a conversation from the sidebar or connect with a gym buddy to start chatting.
                  </p>
                  <Button 
                    onClick={() => window.location.href = '/matches'}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    Find Gym Buddies
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <MessageSquare className="h-16 w-16 mx-auto mb-6 text-gray-300" />
          <h3 className="text-2xl font-medium mb-2">No messages yet</h3>
          <p className="text-gray-500 mb-6">
            Connect with gym buddies to start messaging and plan workouts together.
          </p>
          <Button 
            onClick={() => window.location.href = '/matches'}
            className="bg-purple-600 hover:bg-purple-700"
          >
            Find Gym Buddies
          </Button>
        </div>
      )}
    </div>
  );
};

export default Chat;
