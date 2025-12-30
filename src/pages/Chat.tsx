/** @format */

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { io, Socket } from "socket.io-client";
import {
  Send,
  LogOut,
  Users,
  Menu,
  X,
  MessageSquare,
  Lock,
} from "lucide-react";
import clsx from "clsx";
interface Message {
  type: "message" | "notification";
  user?: string;
  to?: string;
  text: string;
  timestamp?: string;
}
const Chat: React.FC = () => {
  const navigate = useNavigate();
  const [username] = useState<string | null>(() =>
    localStorage.getItem("username")
  );
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load from Session Storage on init to persist across reloads
    const saved = sessionStorage.getItem("chat_messages");
    return saved ? JSON.parse(saved) : [];
  });
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null); // null = Global Chat
  const [unreadUsers, setUnreadUsers] = useState<Set<string>>(new Set());
  const [unreadGlobal, setUnreadGlobal] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Save to Session Storage whenever messages change
    sessionStorage.setItem("chat_messages", JSON.stringify(messages));
  }, [messages]);
  useEffect(() => {
    if (!username) {
      navigate("/");
      return;
    }
    // Initialize Socket
    socketRef.current = io(
      import.meta.env.VITE_API_URL || "http://localhost:3001"
    );
    // Join
    socketRef.current.emit("join", username);
    // Listeners
    // socketRef.current.on('history', (history: Message[]) => { ... }); // History disabled on server
    socketRef.current.on("message", (message: Message) => {
      setMessages((prev) => [...prev, message]);
      // Handle Unread Logic
      if (message.user && message.user !== username) {
        // Message is NOT from me
        if (message.to === username) {
          // Private message TO me
          setSelectedUser((prevSelected) => {
            if (prevSelected !== message.user) {
              setUnreadUsers((prev) => new Set(prev).add(message.user!));
            }
            return prevSelected;
          });
        } else if (!message.to) {
          // Global message
          setSelectedUser((prevSelected) => {
            if (prevSelected !== null) {
              // If I am NOT in global chat
              setUnreadGlobal(true);
            }
            return prevSelected;
          });
        }
      }
    });
    socketRef.current.on("users", (users: string[]) => {
      // Remove duplicates if any (simple set)
      setOnlineUsers([...new Set(users)]);
    });
    return () => {
      socketRef.current?.disconnect();
    };
  }, [navigate, username]); // Added username to dependency to be safe
  useEffect(() => {
    // Auto-scroll on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, selectedUser]); // Also scroll when switching chats
  const handleUserSelect = (user: string | null) => {
    setSelectedUser(user);
    if (user) {
      // Clear unread Status for specific User
      setUnreadUsers((prev) => {
        const newSet = new Set(prev);
        newSet.delete(user);
        return newSet;
      });
    } else {
      // Clear unread Status for Global
      setUnreadGlobal(false);
    }
  };
  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && socketRef.current) {
      socketRef.current.emit("sendMessage", {
        text: inputValue,
        to: selectedUser, // If null, it's global
      });
      setInputValue("");
    }
  };
  // ... (previous imports and state)
  const handleLogoutClick = () => {
    setIsSidebarOpen(false); // Close sidebar if open on mobile
    setIsLogoutModalOpen(true);
  };
  const confirmLogout = () => {
    localStorage.removeItem("username");
    sessionStorage.removeItem("chat_messages");
    socketRef.current?.disconnect();
    navigate("/");
  };
  // Filter messages based on active channel
  const filteredMessages = messages.filter((msg) => {
    if (msg.type === "notification") {
      return false; // HIDE ALL NOTIFICATIONS per user request
    }

    if (selectedUser === null) {
      // Global Chat: Show messages with NO 'to' field
      return !msg.to;
    } else {
      // Private Chat: Show messages between me and selectedUser
      const isFromUserToMe = msg.user === selectedUser && msg.to === username;
      const isFromMeToUser = msg.user === username && msg.to === selectedUser;
      return isFromUserToMe || isFromMeToUser;
    }
  });
  if (!username) return null;
  return (
    <div className="flex h-dvh bg-gray-50 overflow-hidden font-sans relative">
      {/* Logout Modal Overlay */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm transition-opacity"
            onClick={() => setIsLogoutModalOpen(false)}
          ></div>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 relative z-10 animate-fade-in-up transform transition-all scale-100">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-6 h-6 text-red-600 pl-0.5" />
            </div>
            <h3 className="text-xl font-bold text-center text-gray-900 mb-2">
              Thoát
            </h3>
            <p className="text-center text-gray-500 mb-6">
              Bạn có chắc chắn muốn rời đi không? Lịch sử tin nhắn của bạn trong
              phiên này sẽ bị xóa.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 cursor-pointer px-4 py-2.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-colors"
              >
                Hủy
              </button>
              <button
                onClick={confirmLogout}
                className="flex-1 cursor-pointer px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all hover:-translate-y-0.5"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 shadow-sm z-20">
        <div className="p-4 border-b border-gray-100 flex items-center space-x-2">
          <div className="bg-indigo-600 p-1.5 rounded-lg shadow-indigo-100 shadow-md">
            <MessageSquare className="w-5 h-5 text-white" />
          </div>
          <h1 className="font-bold text-lg text-gray-800 tracking-tight">
            Kết Nối Ẩn Danh
          </h1>
        </div>

        <div className="p-3 flex-1 overflow-y-auto">
          <div className="mb-4">
            <button
              onClick={() => handleUserSelect(null)}
              className={clsx(
                "w-full flex items-center space-x-3 p-3 cursor-pointer rounded-xl transition-all duration-200",
                selectedUser === null
                  ? "bg-indigo-50 text-indigo-700 shadow-sm"
                  : "text-gray-600 hover:bg-gray-50"
              )}
            >
              <div
                className={clsx(
                  "p-2 rounded-full",
                  selectedUser === null ? "bg-indigo-200" : "bg-gray-200"
                )}
              >
                <Users className="w-4 h-4" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <span className="font-medium block">Trò chuyện chung</span>
              </div>
              {unreadGlobal && (
                <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-200"></span>
              )}
            </button>
          </div>
          <h2 className="px-3 text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">
            Tin nhắn trực tiếp — {onlineUsers.length - 1}
          </h2>
          <ul className="space-y-1">
            {onlineUsers
              .filter((u) => u !== username)
              .map((u, i) => (
                <li key={i}>
                  <button
                    onClick={() => handleUserSelect(u)}
                    className={clsx(
                      "k w-full flex items-center space-x-3 p-2 rounded-xl transition-all cursor-pointer",
                      selectedUser === u
                        ? "bg-indigo-50 text-indigo-700 shadow-sm"
                        : "text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    <div className="relative">
                      <div className="w-8 h-8 rounded-full bg-linear-to-tr from-purple-400 to-indigo-400 flex items-center justify-center text-white font-bold text-xs">
                        {u.charAt(0).toUpperCase()}
                      </div>
                      <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white"></span>
                    </div>
                    <div className="flex-1 text-left min-w-0">
                      <span className="truncate text-sm font-medium block">
                        {u}
                      </span>
                    </div>

                    {/* Unread Badge */}
                    {unreadUsers.has(u) && (
                      <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-200"></span>
                    )}
                  </button>
                </li>
              ))}
          </ul>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center space-x-3 mb-3 px-2">
            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-xs">
              {username?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">
                {username}
              </p>
              <p className="text-xs text-green-600 flex items-center">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1"></span>{" "}
                Online
              </p>
            </div>
          </div>
          <button
            onClick={handleLogoutClick}
            className="cursor-pointer flex items-center justify-center space-x-2 text-gray-500 hover:text-red-500 hover:bg-red-50 w-full p-2 rounded-lg transition-colors text-sm font-medium border border-gray-200 hover:border-red-100 bg-white"
          >
            <LogOut className="w-4 h-4" />
            <span>Log out</span>
          </button>
        </div>
      </aside>
      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-white/50 relative">
        {/* Mobile Header */}
        <header className="md:hidden bg-white/80 backdrop-blur-md px-4 py-3 flex justify-between items-center z-20 sticky top-0 border-b border-gray-200/50 shadow-sm">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="cursor-pointer p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-lg active:scale-95 transition-transform"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-bold text-gray-800 flex items-center space-x-2">
              {selectedUser ? (
                <>
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  <span>{selectedUser}</span>
                </>
              ) : (
                <>
                  <span>Trò chuyện chung</span>
                </>
              )}
            </h1>
          </div>
        </header>
        {/* Mobile Sidebar Overlay */}
        {isSidebarOpen && (
          <div className="fixed inset-0 z-50 md:hidden">
            <div
              className="absolute inset-0 bg-black/30 backdrop-blur-sm"
              onClick={() => setIsSidebarOpen(false)}
            ></div>
            <div className="absolute inset-y-0 left-0 w-72 bg-white shadow-2xl flex flex-col animate-slide-in">
              <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h2 className="font-bold text-lg text-gray-800">Menu</h2>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="cursor-pointer p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <button
                  onClick={() => {
                    handleUserSelect(null);
                    setIsSidebarOpen(false);
                  }}
                  className={clsx(
                    "cursor-pointer w-full flex items-center space-x-3 p-3 rounded-xl border transition-all",
                    selectedUser === null
                      ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                      : "border-gray-100 text-gray-600"
                  )}
                >
                  <Users className="w-5 h-5" />
                  <div className="flex-1 text-left min-w-0">
                    <span className="font-bold block">Trò chuyện chung</span>
                  </div>
                  {unreadGlobal && (
                    <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-200"></span>
                  )}
                </button>
                <div>
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 ml-1">
                    Tin nhắn trực tiếp
                  </h3>
                  <ul className="space-y-2">
                    {onlineUsers
                      .filter((u) => u !== username)
                      .map((u, i) => (
                        <li key={i}>
                          <button
                            onClick={() => {
                              handleUserSelect(u);
                              setIsSidebarOpen(false);
                            }}
                            className={clsx(
                              "cursor-pointer w-full flex items-center space-x-3 p-2.5 rounded-xl transition-all",
                              selectedUser === u
                                ? "bg-indigo-50 text-indigo-700"
                                : "hover:bg-gray-50 text-gray-700"
                            )}
                          >
                            <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-bold text-sm">
                              {u.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <span className="font-medium">{u}</span>
                            </div>
                            {/* Unread Badge Mobile */}
                            {unreadUsers.has(u) && (
                              <span className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-sm shadow-red-200"></span>
                            )}
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              </div>
              <div className="p-4 border-t">
                <button
                  onClick={handleLogoutClick}
                  className="cursor-pointer w-full py-3 bg-red-50 text-red-600 rounded-xl font-bold text-sm"
                >
                  Log Out
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Chat Header (Desktop) */}
        <div className="hidden md:flex bg-white px-6 py-4 border-b border-gray-200 justify-between items-center shadow-sm">
          <div className="flex items-center space-x-3">
            {selectedUser ? (
              <>
                <div className="w-10 h-10 rounded-full bg-linear-to-tr from-purple-500 to-indigo-500 flex items-center justify-center text-white font-bold shadow-md">
                  {selectedUser.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    {selectedUser}
                  </h2>
                  <p className="text-xs text-green-600 flex items-center font-medium">
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full mr-1.5"></span>
                    Online
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="p-2 bg-indigo-100 rounded-full text-indigo-600">
                  <Users className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-800">
                    Trò chuyện chung
                  </h2>
                  <p className="text-xs text-gray-500">
                    {onlineUsers.length} người đang trực tuyến
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Messages */}
        <div
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 bg-gray-50/30"
          ref={chatContainerRef}
        >
          {filteredMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 space-y-3 opacity-60 animate-fade-in-up">
              {selectedUser ? (
                <Lock className="w-12 h-12 text-indigo-200" />
              ) : (
                <MessageSquare className="w-12 h-12" />
              )}
              <p className="font-medium text-gray-400">
                {selectedUser
                  ? `Bắt đầu trò chuyện riêng tư với ${selectedUser}`
                  : "Chào mừng bạn đến với phòng trò chuyện chung"}
              </p>
            </div>
          )}
          {filteredMessages.map((msg, idx) => {
            if (msg.type === "notification") {
              return (
                <div key={idx} className="flex justify-center my-6">
                  <span className="bg-gray-100/80 backdrop-blur-sm border border-gray-200 text-gray-500 text-[10px] uppercase tracking-wider font-bold py-1.5 px-4 rounded-full shadow-sm">
                    {msg.text}
                  </span>
                </div>
              );
            }
            const isMe = msg.user === username;

            return (
              <div
                key={idx}
                className={clsx(
                  "flex w-full animate-fade-in-up",
                  isMe ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={clsx(
                    "flex flex-col max-w-[85%] sm:max-w-[70%]",
                    isMe ? "items-end" : "items-start"
                  )}
                >
                  {!isMe && (
                    <span className="text-xs text-gray-400 mb-1 ml-1 font-medium">
                      {msg.user}
                    </span>
                  )}

                  <div
                    className={clsx(
                      "px-5 py-3 text-sm sm:text-base leading-relaxed wrap-break-word relative shadow-sm transition-all duration-200",
                      isMe
                        ? clsx(
                            "text-white rounded-2xl rounded-tr-sm",
                            msg.to
                              ? "bg-linear-to-br from-purple-600 to-indigo-600"
                              : "bg-linear-to-br from-indigo-500 to-blue-600"
                          )
                        : "bg-white text-gray-800 rounded-2xl rounded-tl-sm border border-gray-200"
                    )}
                  >
                    {msg.text}
                    {msg.to && isMe && (
                      <Lock className="w-3 h-3 absolute -left-5 top-1/2 -translate-y-1/2 text-gray-300 opacity-50" />
                    )}
                  </div>

                  <div
                    className={clsx(
                      "flex items-center mt-1 space-x-1",
                      isMe ? "mr-1" : "ml-1"
                    )}
                  >
                    <span className="text-[10px] text-gray-400">
                      {msg.timestamp
                        ? new Date(msg.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : ""}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} className="h-px" />
        </div>
        {/* Input Area */}
        <div className="bg-white p-3 sm:p-5 border-t border-gray-100 z-10 w-full shadow-[0_-5px_20px_-5px_rgba(0,0,0,0.03)]">
          <form
            onSubmit={handleSend}
            className="max-w-4xl mx-auto flex items-end space-x-2 bg-gray-50 p-2 rounded-[28px] border border-gray-200 focus-within:border-indigo-300 focus-within:ring-4 focus-within:ring-indigo-50/50 transition-all shadow-inner"
          >
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              className="flex-1 bg-transparent border-none focus:outline-none focus:ring-0 px-4 py-2 min-h-11 max-h-32 text-gray-800 placeholder-gray-400"
              placeholder={
                selectedUser
                  ? `Message ${selectedUser}...`
                  : "Message everyone..."
              }
            />
            <button
              type="submit"
              disabled={!inputValue.trim()}
              className={clsx(
                "cursor-pointer shrink-0 text-white rounded-full w-10 h-10 flex items-center justify-center transition-all shadow-md hover:-translate-y-0.5 disabled:opacity-50 disabled:translate-y-0 disabled:shadow-none",
                selectedUser
                  ? "bg-linear-to-r from-purple-600 to-indigo-600 hover:shadow-purple-200"
                  : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-200"
              )}
            >
              <Send className="w-5 h-5 ml-0.5" />
            </button>
          </form>
        </div>
      </main>
    </div>
  );
};
export default Chat;
