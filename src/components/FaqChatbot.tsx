"use client";

import React, { useState, useEffect, useRef } from "react";
import { FAQItem } from "@/types/content";
import { Bot, User, MessageSquare, Sparkles } from "lucide-react";

interface FaqChatbotProps {
  faqList?: FAQItem[];
  faqItems?: FAQItem[];
  topicTitle: string;
}

interface ChatMessage {
  sender: "user" | "bot";
  text: string;
}

export function FaqChatbot({ faqList, faqItems, topicTitle }: FaqChatbotProps) {
  const items = faqList || faqItems || [];
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

    const timer = setInterval(() => {
      if (currentIndex < targetMsg.length) {
        setDisplayedTypingText((prev) => prev + targetMsg.charAt(currentIndex));
        currentIndex++;
      } else {
        clearInterval(timer);
        setTypingIndex(null);
      }
    }, 15);

    return () => clearInterval(timer);
  }, [typingIndex, messages]);

  const handleSelectQuestion = (item: FAQItem) => {
    if (typingIndex !== null) return; // Prevent clicking while typing

    const userMsg: ChatMessage = { sender: "user", text: item.q };
    const botMsg: ChatMessage = { sender: "bot", text: item.a };

    setMessages((prev) => {
      const next = [...prev, userMsg, botMsg];
      setTypingIndex(next.length - 1);
      return next;
    });
  };

  return (
    <div className="space-y-6 w-full">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            FAQ 봇과 질의응답
          </h3>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
          실시간 자동 응답
        </span>
      </div>

      {/* Chat Messages Box */}
      <div className="p-4 sm:p-6 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 min-h-[320px] max-h-[480px] overflow-y-auto space-y-4 font-sans text-xs sm:text-sm">
        {messages.map((msg, idx) => {
          const isBot = msg.sender === "bot";
          const isCurrentlyTyping = idx === typingIndex;
          const textToRender = isCurrentlyTyping ? displayedTypingText : msg.text;

          return (
            <div
              key={idx}
              className={`flex items-start gap-3 ${
                isBot ? "justify-start" : "justify-end"
              }`}
            >
              {isBot && (
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center flex-shrink-0 shadow-xs mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`p-4 rounded-2xl max-w-[85%] sm:max-w-[75%] leading-relaxed whitespace-pre-wrap ${
                  isBot
                    ? "bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 shadow-xs"
                    : "bg-emerald-600 text-white shadow-xs font-medium rounded-br-xs"
                }`}
              >
                {textToRender}
                {isCurrentlyTyping && (
                  <span className="inline-block w-1.5 h-3.5 bg-emerald-500 ml-1 animate-pulse align-middle" />
                )}
              </div>

              {!isBot && (
                <div className="w-8 h-8 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions Chips */}
      <div className="space-y-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400">
          <MessageSquare className="w-3.5 h-3.5" />
          <span>자주 묻는 질문 칩 (클릭 시 봇이 답변합니다)</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {items.map((item, idx) => (
            <button
              key={idx}
              type="button"
              disabled={typingIndex !== null}
              onClick={() => handleSelectQuestion(item)}
              className="p-3 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-200 dark:border-slate-800 hover:border-emerald-300 dark:hover:border-emerald-700 text-slate-800 dark:text-slate-200 text-xs font-medium transition-all text-left flex items-center gap-2 shadow-2xs hover:shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <span className="w-4 h-4 rounded-full bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                Q
              </span>
              <span>{item.q}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
