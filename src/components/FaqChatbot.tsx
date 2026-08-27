"use client";

import React, { useState, useEffect, useRef } from "react";
import { FAQItem } from "@/types/content";
import { Bot, User, MessageSquare, Sparkles } from "lucide-react";

interface FaqChatbotProps {
  faqList: FAQItem[];
  topicTitle: string;
}

interface ChatMessage {
  sender: "user" | "bot";
  text: string;
}

export function FaqChatbot({ faqList, topicTitle }: FaqChatbotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      sender: "bot",
      text: `안녕하세요! '${topicTitle}' 학습 중에 궁금한 점이 있으신가요? 아래 질문 칩을 누르시면 바로 답변해 드릴게요. 🤖`,
    },
  ]);
  const [typingIndex, setTypingIndex] = useState<number | null>(null);
  const [displayedTypingText, setDisplayedTypingText] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, displayedTypingText]);

  // Typing effect simulation
  useEffect(() => {
    if (typingIndex === null) return;
    const targetMsg = messages[typingIndex]?.text || "";
    let currentIndex = 0;
    setDisplayedTypingText("");

    const interval = setInterval(() => {
      if (currentIndex < targetMsg.length) {
        setDisplayedTypingText((prev) => prev + targetMsg.charAt(currentIndex));
        currentIndex++;
      } else {
        clearInterval(interval);
        setTypingIndex(null);
      }
    }, 20);

    return () => clearInterval(interval);
  }, [typingIndex, messages]);

  const handleSelectFaq = (faq: FAQItem) => {
    if (typingIndex !== null) return; // Wait until current response finishes typing

    const newMsgs: ChatMessage[] = [
      ...messages,
      { sender: "user", text: faq.q },
      { sender: "bot", text: faq.a },
    ];

    setMessages(newMsgs);
    setTypingIndex(newMsgs.length - 1);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden flex flex-col h-[540px]">
      {/* Chatbot Header */}
      <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-sm">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
              PyData 학습 FAQ 봇
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              {topicTitle} 관련 자주 묻는 질문 챗봇
            </p>
          </div>
        </div>
        <div className="px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold flex items-center gap-1">
          <Sparkles className="w-3 h-3" />
          상시 응답
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg, idx) => {
          const isBot = msg.sender === "bot";
          const isCurrentlyTyping = typingIndex === idx;
          const textToShow = isCurrentlyTyping ? displayedTypingText : msg.text;

          return (
            <div
              key={idx}
              className={`flex items-start gap-2.5 w-full ${
                isBot ? "justify-start" : "justify-end"
              }`}
            >
              {isBot && (
                <div className="w-7 h-7 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] p-4 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                  isBot
                    ? "bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-tl-none border border-slate-200/80 dark:border-slate-700/80 shadow-xs"
                    : "bg-emerald-600 text-white rounded-tr-none shadow-sm font-medium"
                }`}
              >
                <div className="whitespace-pre-line">{textToShow}</div>
                {isCurrentlyTyping && (
                  <span className="inline-block w-1.5 h-4 ml-1 bg-emerald-500 animate-pulse align-middle" />
                )}
              </div>

              {!isBot && (
                <div className="w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Question Chips Panel */}
      <div className="p-4 bg-white/90 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 w-full">
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 mb-2.5 flex items-center gap-1">
          <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
          질문을 클릭하면 즉시 답변을 확인하실 수 있습니다:
        </div>
        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
          {faqList.map((faq, idx) => (
            <button
              key={idx}
              type="button"
              disabled={typingIndex !== null}
              onClick={() => handleSelectFaq(faq)}
              className="px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 hover:bg-emerald-50 hover:border-emerald-300 dark:hover:bg-emerald-950/40 dark:hover:border-emerald-700 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-xs text-left transition-all shadow-xs disabled:opacity-50 cursor-pointer"
            >
              💬 {faq.q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
