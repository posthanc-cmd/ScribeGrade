import React from 'react';
import { HistoryItem } from '../types';
import { FileText, Calendar, ChevronRight, Trash2 } from 'lucide-react';

interface HistoryListProps {
  history: HistoryItem[];
  onSelect: (item: HistoryItem) => void;
  onDelete: (id: string) => void;
}

export const HistoryList: React.FC<HistoryListProps> = ({ history, onSelect, onDelete }) => {
  if (history.length === 0) {
    return (
      <div className="w-full bg-white rounded-2xl shadow-sm p-12 border border-stone-200 text-center">
        <div className="mx-auto w-16 h-16 bg-stone-50 rounded-full flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-stone-300" />
        </div>
        <h2 className="text-xl font-bold text-stone-900 tracking-tight">No Grading History</h2>
        <p className="text-stone-500 mt-2 text-sm max-w-md mx-auto">
          You haven't graded any workbooks yet. Head over to the scanner to grade your first student document.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto">
      <h2 className="text-2xl font-bold text-stone-900 tracking-tight mb-6">Graded Workbooks</h2>
      <div className="grid gap-4">
        {history.map((item) => {
          const date = new Date(item.date);
          const formattedDate = date.toLocaleDateString(undefined, { 
            year: 'numeric', month: 'short', day: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          });

          return (
            <div 
              key={item.id} 
              className="bg-white rounded-xl shadow-sm border border-stone-200 p-5 flex items-center justify-between group hover:border-indigo-200 transition-colors cursor-pointer"
              onClick={() => onSelect(item)}
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-indigo-600 font-bold text-lg border border-indigo-100">
                  {item.result.overallScore.toFixed(1)}
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900">{item.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {formattedDate} • {item.result.sections.length} sections
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(item.id);
                  }}
                  className="p-2 text-stone-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  title="Delete record"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <div className="w-8 h-8 flex items-center justify-center text-stone-300 group-hover:text-indigo-500 transition-colors">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
