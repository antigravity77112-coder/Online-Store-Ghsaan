import React, { useState, useRef, useEffect, Suspense } from 'react';
import { MessageCircle, X, Send, Bot, User, Loader2 } from 'lucide-react';
import { chatService } from '../../services/chatService';

/**
 * EN: Lazy-load ReactMarkdown + remarkGfm — these are ~45KB gzip combined.
 *     They're only needed when the chat window is open AND an assistant message
 *     needs rendering. By lazy-loading, we defer this cost entirely from the
 *     initial page load.
 * AR: تحميل كسول لـ ReactMarkdown + remarkGfm — حجمهما ~45KB gzip مجتمعاً.
 *     مطلوبان فقط عند فتح نافذة الدردشة وعرض رسالة المساعد.
 *     بالتحميل الكسول، نؤجل هذه التكلفة بالكامل عن التحميل الأولي.
 */
const ReactMarkdown = React.lazy(() => import('react-markdown'));

// EN: remarkGfm must be loaded as a module and passed as plugin.
//     We import it eagerly since it's tiny, but it's in the vendor-chat chunk
//     which is only loaded when ReactMarkdown is loaded.
let remarkGfmPlugin = null;
const loadRemarkGfm = import('remark-gfm').then(mod => {
  remarkGfmPlugin = mod.default;
});

/**
 * EN: Lightweight markdown fallback — shown while ReactMarkdown loads.
 *     Just renders the raw text so the user sees content immediately.
 * AR: بديل خفيف للماركداون — يُعرض أثناء تحميل ReactMarkdown.
 *     يعرض النص الخام فقط ليرى المستخدم المحتوى فوراً.
 */
const MarkdownFallback = ({ content }) => (
  <span className="whitespace-pre-wrap">{content}</span>
);

/**
 * EN: Wrapper that renders markdown with Suspense.
 * AR: غلاف يعرض الماركداون مع Suspense.
 */
const LazyMarkdown = ({ content }) => (
  <Suspense fallback={<MarkdownFallback content={content} />}>
    <ReactMarkdown remarkPlugins={remarkGfmPlugin ? [remarkGfmPlugin] : []}>
      {content}
    </ReactMarkdown>
  </Suspense>
);

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'مرحباً بك 👋\nأنا مساعد قصة. اكتب لي ما تبحث عنه وسأقترح لك من المنتجات المتوفرة في المتجر فقط.' }
  ]);
  const [inputVal, setInputVal] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRateLimited, setIsRateLimited] = useState(false);
  const messagesEndRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const scrollToBottom = () => {
    // 1. Force the scroll immediately without smooth behavior which often glitches on desktop
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView(false);
    }
    // 2. Fallback brute-force scroll on the container
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    // Fire it immediately and also after a short delay for ReactMarkdown images/rendering
    scrollToBottom();
    const timeout = setTimeout(scrollToBottom, 300);
    return () => clearTimeout(timeout);
  }, [messages, isOpen]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputVal.trim() || isLoading || isRateLimited) return;

    const userMsg = { role: 'user', content: inputVal.trim() };
    const newMessages = [...messages, userMsg];
    
    setMessages(newMessages);
    setInputVal('');
    setIsLoading(true);
    setIsRateLimited(true);

    try {
      const response = await chatService.sendMessage(newMessages);
      if (response && response.success) {
        setMessages((prev) => [...prev, { role: 'assistant', content: response.reply }]);
      } else {
        setMessages((prev) => [...prev, { role: 'assistant', content: 'حدث خطأ من جهتنا حالياً. حاول مرة أخرى بعد قليل.' }]);
      }
    } catch (error) {
      setMessages((prev) => [...prev, { role: 'assistant', content: 'مشكلة في الاتصال بالشبكة. حاول مرة أخرى.' }]);
    } finally {
      setIsLoading(false);
      setTimeout(() => setIsRateLimited(false), 1500);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {/* Chat Window */}
      {isOpen && (
        <div className="mb-4 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] max-h-[80vh] bg-white dark:bg-[#1A1510] border border-slate-200 dark:border-gold-900 rounded-2xl shadow-2xl flex flex-col overflow-hidden transition-all duration-300 transform origin-bottom-right">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-gold-600 to-gold-500 p-4 flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Bot className="w-6 h-6" />
              <div>
                <h3 className="font-semibold text-sm">مساعد GISAAH</h3>
                <p className="text-xs text-gold-200">متصل الآن وجاهز للمساعدة</p>
              </div>
            </div>
            <button 
              onClick={() => setIsOpen(false)}
              className="p-1 hover:bg-gold-700/60 rounded-full transition-colors"
              aria-label="Close chat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div 
            ref={scrollContainerRef}
            className="flex-1 p-4 overflow-y-auto bg-gold-50 dark:bg-gold-950 flex flex-col gap-3 overscroll-contain"
          >
            {messages.map((msg, idx) => {
              const isAssistant = msg.role === 'assistant';
              return (
                <div 
                  key={idx} 
                  className={`flex gap-2 max-w-[85%] ${isAssistant ? 'self-start' : 'self-end flex-row-reverse'}`}
                >
                  {/* Avatar */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isAssistant
                      ? 'bg-gold-100 text-gold-600 dark:bg-gold-900/60 dark:text-gold-300'
                      : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}>
                    {isAssistant ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  {/* Bubble */}
                  <div 
                    className={`p-3 rounded-2xl text-sm leading-relaxed ${
                      isAssistant 
                        ? 'bg-white dark:bg-[#231D14] border border-gold-100 dark:border-gold-900 text-slate-700 dark:text-gold-100 rounded-tl-none shadow-sm prose prose-sm dark:prose-invert max-w-none prose-p:leading-snug prose-ul:my-1 prose-li:my-0' 
                        : 'bg-gradient-to-br from-gold-500 to-gold-600 text-white rounded-tr-none shadow-md'
                    }`}
                  >
                    {isAssistant ? (
                      <LazyMarkdown content={msg.content} />
                    ) : (
                      <>{msg.content}</>
                    )}
                  </div>
                </div>
              );
            })}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2 max-w-[85%] self-start">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-gold-100 text-gold-600 dark:bg-gold-900/60 dark:text-gold-300">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl text-sm bg-white dark:bg-[#231D14] border border-gold-100 dark:border-gold-900 text-slate-700 dark:text-gold-100 rounded-tl-none shadow-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-gold-500" />
                    <span className="text-slate-500 dark:text-gold-400">جاري التفكير...</span>
                  </div>
              </div>
            )}
            {/* The absolute ultimate bottom anchor */}
            <div ref={messagesEndRef} className="h-[1px] w-full flex-shrink-0" />
          </div>

          {/* Input Area */}
          <div className="p-3 bg-white dark:bg-[#1A1510] border-t border-slate-100 dark:border-gold-900">
            <form onSubmit={handleSend} className="relative flex items-center">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                placeholder={isRateLimited ? "يرجى الانتظار قليلاً..." : "اكتب رسالتك..."}
                className="w-full bg-gold-50 dark:bg-gold-950/80 border border-gold-100 dark:border-gold-900 rounded-full py-3 pl-4 pr-12 text-sm text-slate-900 dark:text-gold-100 focus:ring-2 focus:ring-gold-500/50 focus:outline-none placeholder-slate-400 dark:placeholder-gold-600"
                disabled={isLoading || isRateLimited}
              />
              <button
                type="submit"
                disabled={!inputVal.trim() || isLoading || isRateLimited}
                className="absolute right-2 p-2 bg-gold-500 hover:bg-gold-400 text-white rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                aria-label="Send message"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
          
        </div>
      )}

      {/* FAB Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-xl shadow-gold-600/30 transition-transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-gold-500/30 ${
          isOpen
            ? 'bg-[#231D14] text-gold-300 dark:bg-gold-950 border border-gold-800'
            : 'bg-gradient-to-br from-gold-400 to-gold-600 text-white hover:from-gold-300 hover:to-gold-500'
        }`}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>
    </div>
  );
};

export default ChatWidget;
