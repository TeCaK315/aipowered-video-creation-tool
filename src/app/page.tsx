'use client';

import { useState } from 'react';
import { Send, Loader2, Sparkles, Link as LinkIcon, FileText, Download, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface AnalysisResult {
  id: string;
  input: string;
  inputType: 'text' | 'url';
  result: string;
  timestamp: Date;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [inputType, setInputType] = useState<'text' | 'url'>('form');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: input.trim(), inputType }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Ошибка анализа');
      }

      setResult(data.result);

      // Добавляем в историю
      const newResult: AnalysisResult = {
        id: Date.now().toString(),
        input: input.trim(),
        inputType,
        result: data.result,
        timestamp: new Date(),
      };
      setHistory(prev => [newResult, ...prev].slice(0, 10));

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Произошла ошибка');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    if (!result) return;
    const blob = new Blob([result], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analysis-result.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-lg">AI-Powered Video Creation Tool Analyzer</h1>
              <p className="text-xs text-gray-400">Пользователи получают возможность быстро создавать видео высокого качества, соответствующие их требованиям и ожиданиям.</p>
            </div>
          </div>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className={`p-2 rounded-lg transition-colors ${showHistory ? 'bg-indigo-600' : 'hover:bg-gray-800'}`}
            title="История"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Input Section */}
        <div className="mb-8">
          {/* Input Type Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setInputType('text')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                inputType === 'text'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-4 h-4" />
              Текст
            </button>
            <button
              onClick={() => setInputType('url')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                inputType === 'url'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <LinkIcon className="w-4 h-4" />
              URL
            </button>
          </div>

          {/* Input Form */}
          <form onSubmit={handleSubmit}>
            <div className="relative">
              {inputType === 'text' ? (
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Создайте видео о преимуществах нашего нового продукта."
                  rows={6}
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              ) : (
                <input
                  type="url"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="https://www.reddit.com/r/... или другой URL"
                  className="w-full bg-gray-800/50 border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              )}
            </div>

            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-500">
                {inputType === 'url'
                  ? 'Поддерживаются: Reddit, Product Hunt, Hacker News, и другие'
                  : 'Вставьте текст для анализа'}
              </p>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-xl font-medium transition-colors"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Анализирую...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Анализировать
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-6 p-4 bg-red-900/20 border border-red-800 rounded-xl text-red-400 animate-fadeIn">
            {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="animate-fadeIn">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                Результаты анализа
              </h2>
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors"
              >
                <Download className="w-4 h-4" />
                Экспорт
              </button>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 prose prose-invert max-w-none">
              <ReactMarkdown>{result}</ReactMarkdown>
            </div>
          </div>
        )}

        {/* History Sidebar */}
        {showHistory && history.length > 0 && (
          <div className="fixed right-0 top-0 h-full w-80 bg-gray-900 border-l border-gray-800 p-4 overflow-y-auto z-40 animate-fadeIn">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
              <History className="w-4 h-4" />
              История запросов
            </h3>
            <div className="space-y-3">
              {history.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setInput(item.input);
                    setInputType(item.inputType);
                    setResult(item.result);
                    setShowHistory(false);
                  }}
                  className="w-full text-left p-3 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <p className="text-sm truncate text-gray-300">{item.input}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleString('ru-RU')}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {!result && !isLoading && !error && (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-600/20 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-indigo-400" />
            </div>
            <h3 className="text-xl font-semibold mb-2">Готов к анализу</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              {inputType === 'url'
                ? 'Вставьте ссылку на Reddit, Product Hunt или другой источник для извлечения и анализа контента'
                : 'Введите текст для интеллектуального анализа'}
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6 mt-auto">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-gray-500">
          <p>Создано с помощью TrendHunter AI</p>
        </div>
      </footer>
    </main>
  );
}
