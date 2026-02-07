import { useRef, useEffect, useCallback } from "react";
import {
  Send,
  Loader2,
  Bot,
  User,
  Paperclip,
  X,
  FileText,
  Image,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useChat } from "@/context/ChatContext";

const CLAUDE_MODEL = "Claude Sonnet 4.5";

export function ChatPanel() {
  const {
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
  } = useChat();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isExpanded) {
      scrollToBottom();
      inputRef.current?.focus();
    }
  }, [messages, isExpanded]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendMessage();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      addAttachments(files);
    },
    [addAttachments]
  );

  // Global drag and drop handler
  useEffect(() => {
    const handleDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    };

    // Add listeners to the whole document for global drag & drop
    document.addEventListener("dragover", handleDragOver);
    document.addEventListener("drop", handleDrop);

    return () => {
      document.removeEventListener("dragover", handleDragOver);
      document.removeEventListener("drop", handleDrop);
    };
  }, [handleFiles]);

  return (
    <div
      ref={panelRef}
      className={`fixed bottom-0 left-56 right-0 bg-white border-t border-tp-light-grey shadow-lg transition-all duration-300 z-40 ${
        isExpanded ? "h-[400px]" : "h-14"
      }`}
    >
      {/* Header bar - always visible */}
      <div
        className="h-14 px-4 flex items-center justify-between cursor-pointer hover:bg-tp-light/50 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-tp-blue/10 flex items-center justify-center">
            <MessageSquare className="h-4 w-4 text-tp-blue" />
          </div>
          <div>
            <span className="text-sm font-medium text-tp-dark">AI Assistant</span>
            {!isExpanded && messages.length > 0 && (
              <span className="text-xs text-tp-dark-grey ml-2">
                {messages.length} message{messages.length !== 1 ? "s" : ""}
              </span>
            )}
            {!isExpanded && attachments.length > 0 && (
              <span className="text-xs text-tp-blue ml-2">
                {attachments.length} file{attachments.length !== 1 ? "s" : ""} attached
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-tp-dark-grey">{CLAUDE_MODEL}</span>
          {messages.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                clearChat();
              }}
              className="h-8 text-tp-dark-grey hover:text-error"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
          <Button variant="ghost" size="sm" className="h-8">
            {isExpanded ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronUp className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      {/* Expanded content */}
      {isExpanded && (
        <div className="h-[calc(100%-3.5rem)] flex flex-col">
          {/* Messages area */}
          <div className="flex-1 overflow-auto px-4 py-2">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center">
                <Bot className="h-10 w-10 text-tp-blue/30 mb-2" />
                <p className="text-sm text-tp-dark-grey">
                  Drop files anywhere or type a message
                </p>
                <p className="text-xs text-tp-dark-grey mt-1">
                  I can query data, process invoices, and update records
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-2 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="h-6 w-6 rounded-full bg-tp-blue/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-3 w-3 text-tp-blue" />
                      </div>
                    )}
                    <div
                      className={`max-w-[70%] rounded-lg px-3 py-2 ${
                        message.role === "user"
                          ? "bg-tp-blue text-white"
                          : "bg-tp-light border border-tp-light-grey"
                      }`}
                    >
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-1">
                          {message.attachments.map((att, i) => (
                            <div
                              key={i}
                              className={`flex items-center gap-1 text-xs px-1.5 py-0.5 rounded ${
                                message.role === "user"
                                  ? "bg-white/20"
                                  : "bg-white"
                              }`}
                            >
                              {att.type.startsWith("image/") ? (
                                <Image className="h-2.5 w-2.5" />
                              ) : (
                                <FileText className="h-2.5 w-2.5" />
                              )}
                              <span className="truncate max-w-[100px]">{att.name}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      <div className="text-sm whitespace-pre-wrap">
                        {message.content}
                      </div>
                    </div>
                    {message.role === "user" && (
                      <div className="h-6 w-6 rounded-full bg-tp-dark flex items-center justify-center flex-shrink-0">
                        <User className="h-3 w-3 text-white" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-2">
                    <div className="h-6 w-6 rounded-full bg-tp-blue/10 flex items-center justify-center">
                      <Bot className="h-3 w-3 text-tp-blue" />
                    </div>
                    <div className="bg-tp-light border border-tp-light-grey rounded-lg px-3 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-tp-blue" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Attachments preview */}
          {attachments.length > 0 && (
            <div className="border-t border-tp-light-grey bg-tp-light px-4 py-2">
              <div className="flex flex-wrap gap-2">
                {attachments.map((attachment, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 bg-white rounded border border-tp-light-grey px-2 py-1"
                  >
                    {attachment.preview ? (
                      <img
                        src={attachment.preview}
                        alt={attachment.file.name}
                        className="h-6 w-6 object-cover rounded"
                      />
                    ) : (
                      <FileText className="h-4 w-4 text-tp-dark-grey" />
                    )}
                    <span className="text-xs text-tp-dark max-w-[120px] truncate">
                      {attachment.file.name}
                    </span>
                    <button
                      onClick={() => removeAttachment(index)}
                      className="p-0.5 hover:bg-tp-light rounded"
                    >
                      <X className="h-3 w-3 text-tp-dark-grey" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Input area */}
          <div className="border-t border-tp-light-grey px-4 py-2">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx,.csv"
                onChange={(e) => {
                  if (e.target.files) handleFiles(e.target.files);
                  e.target.value = "";
                }}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex-shrink-0 h-9 w-9"
              >
                <Paperclip className="h-4 w-4" />
              </Button>
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about data, drop files to process..."
                className="flex-1 min-h-[36px] max-h-20 rounded-lg border border-tp-light-grey bg-white px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-tp-blue"
                rows={1}
              />
              <Button
                type="submit"
                disabled={loading || (!input.trim() && attachments.length === 0)}
                className="flex-shrink-0 h-9"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
