import { createContext, useContext, useState, useCallback, useRef, useEffect, type ReactNode } from "react";
import { supabase } from "@/lib/supabase/client";

interface Attachment {
  file: File;
  preview?: string;
}

interface Message {
  id?: string;
  role: "user" | "assistant";
  content: string;
  attachments?: { name: string; type: string }[];
  created_at?: string;
}

interface ChatContextType {
  messages: Message[];
  input: string;
  setInput: (value: string) => void;
  attachments: Attachment[];
  addAttachments: (files: FileList | File[]) => void;
  removeAttachment: (index: number) => void;
  loading: boolean;
  sendMessage: (message?: string) => Promise<void>;
  isExpanded: boolean;
  setIsExpanded: (value: boolean) => void;
  clearChat: () => void;
  searchHistory: (query: string) => Promise<Message[]>;
  // Data refresh mechanism
  onDataChange: (callback: () => void) => () => void;
}

const ChatContext = createContext<ChatContextType | null>(null);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [sessionId] = useState(() => crypto.randomUUID());

  // Store callbacks for data change notifications
  const dataChangeCallbacks = useRef<Set<() => void>>(new Set());

  // Load recent chat history on mount
  useEffect(() => {
    async function loadChatHistory() {
      try {
        const { data, error } = await supabase
          .from("chat_messages")
          .select("id, role, content, attachments, created_at")
          .order("created_at", { ascending: true })
          .limit(50); // Load last 50 messages

        if (error) {
          console.error("Failed to load chat history:", error);
          return;
        }

        if (data && data.length > 0) {
          setMessages(data.map(msg => ({
            id: msg.id,
            role: msg.role as "user" | "assistant",
            content: msg.content,
            attachments: msg.attachments as { name: string; type: string }[] | undefined,
            created_at: msg.created_at,
          })));
        }
      } catch (err) {
        console.error("Error loading chat history:", err);
      }
    }

    loadChatHistory();
  }, []);

  // Save message to database
  const saveMessage = async (message: Message) => {
    try {
      const { data: user } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("chat_messages")
        .insert({
          role: message.role,
          content: message.content,
          attachments: message.attachments || null,
          session_id: sessionId,
          user_id: user?.user?.id || null,
        })
        .select("id")
        .single();

      if (error) {
        console.error("Failed to save message:", error);
        return null;
      }

      return data?.id;
    } catch (err) {
      console.error("Error saving message:", err);
      return null;
    }
  };

  const notifyDataChange = useCallback(() => {
    dataChangeCallbacks.current.forEach((callback) => callback());
  }, []);

  const onDataChange = useCallback((callback: () => void) => {
    dataChangeCallbacks.current.add(callback);
    return () => {
      dataChangeCallbacks.current.delete(callback);
    };
  }, []);

  const addAttachments = useCallback((files: FileList | File[]) => {
    const newAttachments: Attachment[] = Array.from(files).map((file) => ({
      file,
      preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...newAttachments]);
    setIsExpanded(true);
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      if (updated[index].preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  }, []);

  const uploadAttachments = async (): Promise<{ path: string; name: string; type: string; base64: string }[]> => {
    const uploaded: { path: string; name: string; type: string; base64: string }[] = [];

    for (const attachment of attachments) {
      try {
        const fileExt = attachment.file.name.split(".").pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `chat-attachments/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("documents")
          .upload(filePath, attachment.file);

        if (uploadError) throw uploadError;

        const arrayBuffer = await attachment.file.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

        uploaded.push({
          path: filePath,
          name: attachment.file.name,
          type: attachment.file.type,
          base64,
        });
      } catch (err) {
        console.error("Upload error:", err);
      }
    }

    return uploaded;
  };

  const sendMessage = useCallback(async (overrideMessage?: string) => {
    const messageText = overrideMessage ?? input;
    if ((!messageText.trim() && attachments.length === 0) || loading) return;

    setInput("");
    setLoading(true);

    const uploadedFiles = await uploadAttachments();
    const attachmentInfo = uploadedFiles.map((f) => ({ name: f.name, type: f.type }));

    const userMessage: Message = {
      role: "user",
      content: messageText || `[Attached ${attachments.length} file(s)]`,
      attachments: attachmentInfo.length > 0 ? attachmentInfo : undefined,
    };

    // Save user message and update state
    const userMsgId = await saveMessage(userMessage);
    userMessage.id = userMsgId || undefined;
    setMessages((prev) => [...prev, userMessage]);

    // Clear attachments
    attachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setAttachments([]);

    try {
      // Get recent conversation for context (last 20 messages)
      const recentMessages = messages.slice(-20);

      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          message: messageText,
          conversationHistory: recentMessages.map(m => ({ role: m.role, content: m.content })),
          attachments: uploadedFiles,
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.success ? data.message : `Error: ${data.error}`,
      };

      // Save assistant message and update state
      const assistantMsgId = await saveMessage(assistantMessage);
      assistantMessage.id = assistantMsgId || undefined;
      setMessages((prev) => [...prev, assistantMessage]);

      // Check if the response indicates data was modified
      const modificationKeywords = [
        "recorded", "updated", "created", "added", "deleted", "removed",
        "saved", "modified", "changed", "successfully"
      ];
      const wasDataModified = modificationKeywords.some(
        (keyword) => data.message?.toLowerCase().includes(keyword)
      );

      if (wasDataModified) {
        notifyDataChange();
      }
    } catch (err) {
      const errorMessage: Message = {
        role: "assistant",
        content: `Error: ${err instanceof Error ? err.message : "Failed to send message"}`,
      };
      await saveMessage(errorMessage);
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  }, [input, attachments, loading, messages, notifyDataChange]);

  const clearChat = useCallback(() => {
    setMessages([]);
    attachments.forEach((a) => {
      if (a.preview) URL.revokeObjectURL(a.preview);
    });
    setAttachments([]);
    // Note: We don't delete from database - just start fresh in UI
    // Old messages remain for historical context
  }, [attachments]);

  // Search chat history
  const searchHistory = useCallback(async (query: string): Promise<Message[]> => {
    try {
      const { data, error } = await supabase
        .rpc("search_chat_history", {
          search_query: query,
          limit_count: 20,
        });

      if (error) throw error;

      return (data || []).map((msg: { id: string; role: string; content: string; created_at: string }) => ({
        id: msg.id,
        role: msg.role as "user" | "assistant",
        content: msg.content,
        created_at: msg.created_at,
      }));
    } catch (err) {
      console.error("Search error:", err);
      return [];
    }
  }, []);

  return (
    <ChatContext.Provider
      value={{
        messages,
        input,
        setInput,
        attachments,
        addAttachments,
        removeAttachment,
        loading,
        sendMessage,
        isExpanded,
        setIsExpanded,
        clearChat,
        searchHistory,
        onDataChange,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}

// Hook for pages to subscribe to data changes
export function useDataRefresh(refetchFn: () => void) {
  const { onDataChange } = useChat();

  useEffect(() => {
    const unsubscribe = onDataChange(refetchFn);
    return unsubscribe;
  }, [onDataChange, refetchFn]);
}
