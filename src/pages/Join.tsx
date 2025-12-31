import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, ArrowRight } from 'lucide-react';

const Join: React.FC = () => {
  const [username, setUsername] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim().length >= 2) {
      localStorage.setItem('username', username);
      navigate('/chat');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-linear-to-br from-indigo-50 to-blue-100 p-4">
      <div className="w-full max-w-md bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl p-8 transform transition-all hover:scale-[1.01] duration-300 border border-white/50">
        <div className="flex flex-col items-center mb-10 space-y-4">
          <div className="bg-indigo-600 p-4 rounded-2xl shadow-lg shadow-indigo-300">
             <MessageSquare className="w-8 h-8 text-white" />
          </div>
          <div className="text-center">
             <h1 className="text-3xl font-bold text-gray-800 tracking-tight">Kết Nối Ẩn Danh</h1>
             <p className="text-gray-500 mt-2 text-sm">Tham gia cuộc trò chuyện với tư cách ẩn danh</p>
          </div>
        </div>

        <form onSubmit={handleJoin} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="username" className="text-sm font-semibold text-gray-700 ml-1">Nhập tên hiển thị</label>
            <input
              type="text"
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full px-5 py-4 bg-gray-50 border border-gray-200 rounded-2xl focus:outline-none focus:ring-4 focus:ring-indigo-100 focus:border-indigo-400 transition-all font-medium text-gray-800 placeholder-gray-400 focus:bg-white"
              placeholder="Nhập tên hiển thị"
              required
              minLength={2}
              maxLength={20}
              autoFocus
            />
          </div>
          
          <button
            type="submit"
            className="cursor-pointer group w-full flex items-center justify-center py-4 px-6 border border-transparent rounded-2xl shadow-lg shadow-indigo-200 text-base font-bold text-white bg-indigo-600 hover:bg-indigo-700 hover:shadow-indigo-300 focus:outline-none focus:ring-4 focus:ring-indigo-200 transition-all duration-200 transform hover:-translate-y-0.5 active:scale-95"
          >
            <span>Bắt đầu trò chuyện</span>
            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </form>

        <div className="mt-8 text-center">
            <p className="text-base text-gray-400">Xây dựng nền tảng trò chuyện văn minh.</p>
        </div>
      </div>
    </div>
  );
};

export default Join;
