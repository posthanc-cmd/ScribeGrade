import React from 'react';
import { Download, CheckCircle2, AlertTriangle, XCircle, Printer } from 'lucide-react';

import { GradeResult, Section } from '../types';

interface ReportProps {
  result: GradeResult;
  onReset: () => void;
}

export const Report: React.FC<ReportProps> = ({ result, onReset }) => {
  const downloadPdf = () => {
    // In an iframe context, window.print() doesn't always work perfectly.
    // Opening the report content in a new temporary window to print.
    const content = document.getElementById('report-content');
    if (!content) return;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <html>
          <head>
            <title>Grading Report</title>
            <style>
              body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; color: #1c1917; }
              .print\\:hidden { display: none !important; }
              .print\\:block { display: block !important; }
              .hidden { display: none; }
              .text-3xl { font-size: 1.875rem; line-height: 2.25rem; font-weight: 700; }
              .text-xs { font-size: 0.75rem; line-height: 1rem; text-transform: uppercase; letter-spacing: 0.05em; color: #a8a29e; font-weight: 700; margin-bottom: 8px; }
              .text-sm { font-size: 0.875rem; line-height: 1.25rem; }
              .text-lg { font-size: 1.125rem; line-height: 1.75rem; font-weight: 600; }
              .text-xl { font-size: 1.25rem; line-height: 1.75rem; font-weight: 700; margin-bottom: 1.5rem; }
              .mt-8 { margin-top: 2rem; }
              .mb-2 { margin-bottom: 0.5rem; }
              .mb-4 { margin-bottom: 1rem; }
              .mb-6 { margin-bottom: 1.5rem; }
              .pb-4 { padding-bottom: 1rem; }
              .p-6 { padding: 1.5rem; }
              .pt-4 { padding-top: 1rem; }
              .border { border: 1px solid #f5f5f4; }
              .border-b { border-bottom: 1px solid #f5f5f4; }
              .rounded-xl { border-radius: 0.75rem; }
              .rounded-lg { border-radius: 0.5rem; }
              .bg-stone-50 { background-color: #fafaf9; }
              .bg-indigo-50 { background-color: #eef2ff; }
              .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
              .flex { display: flex; justify-content: space-between; align-items: flex-start; }
              .space-y-6 > * + * { margin-top: 1.5rem; }
              .text-indigo-600 { color: #4f46e5; }
              .text-4xl { font-size: 2.25rem; line-height: 2.5rem; font-weight: 800; }
              .italic { font-style: italic; }
              .min-h-\\[100px\\] { min-height: 100px; }
              @media print {
                body { padding: 0; }
                .print\\:hidden { display: none !important; }
                .print\\:block { display: block !important; }
                .hidden { display: none; }
              }
            </style>
          </head>
          <body>
            ${content.innerHTML}
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      // Small timeout to allow styles to apply before printing
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } else {
      // Fallback if popup blocker is active
      window.print();
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 9) return 'text-green-600 bg-green-50';
    if (score >= 7.5) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 9) return <CheckCircle2 className="w-5 h-5 text-green-600" />;
    if (score >= 7.5) return <AlertTriangle className="w-5 h-5 text-amber-600" />;
    return <XCircle className="w-5 h-5 text-red-600" />;
  };

  return (
    <div className="w-full max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-8 print:hidden">
        <button
          onClick={onReset}
          className="text-stone-500 hover:text-stone-900 font-medium text-sm transition-colors flex items-center gap-1"
        >
          &larr; Grade Another Document
        </button>
      </div>

      <div id="report-content" className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
        {/* Header Section */}
        <div className="bg-stone-50/50 p-10 border-b border-stone-100">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold text-stone-900 tracking-tight">Grading Report</h1>
              <p className="text-stone-500 mt-2">ScribeGrade Assessment</p>
            </div>
            <div className="text-center bg-white px-6 py-4 rounded-2xl shadow-sm border border-stone-100">
              <div className="text-4xl font-extrabold text-indigo-600 tracking-tight">{result.overallScore.toFixed(1)}</div>
              <div className="text-xs font-bold text-stone-400 uppercase tracking-wider mt-1">Overall Score</div>
            </div>
          </div>
          
          <div className="mt-8 bg-white p-6 rounded-xl border border-stone-100 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Summary Feedback</h3>
            <p className="text-stone-800 leading-relaxed text-sm">{result.feedbackSummary}</p>
          </div>
        </div>

        {/* Sections (Print Only) */}
        <div className="p-10 print:hidden text-center border-t border-stone-100 bg-stone-50/30">
          <Printer className="w-8 h-8 text-stone-300 mx-auto mb-3" />
          <h3 className="text-lg font-semibold text-stone-800 mb-1">Full Report Available</h3>
          <p className="text-stone-500 text-sm max-w-md mx-auto mb-6">
            The detailed breakdown—including original answers, suggested rewrites, and specific feedback for each section—is available in the printable PDF report.
          </p>
          <button
            onClick={downloadPdf}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-6 py-2.5 rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print / Save Full PDF
          </button>
        </div>

        <div className="hidden print:block p-10 pt-4">
          <h2 className="text-xl font-bold text-stone-900 mb-6 tracking-tight">Detailed Breakdown</h2>
          
          <div className="space-y-6">
            {result.sections.map((section, index) => (
              <div key={index} className="border border-stone-100 rounded-xl p-6 bg-white shadow-sm">
                <div className="flex justify-between items-center border-b border-stone-50 pb-4 mb-4">
                  <h3 className="text-lg font-semibold text-stone-800">{section.sectionName}</h3>
                  <div className={"flex items-center gap-2 px-3 py-1 rounded-full text-sm " + getScoreColor(section.score)}>
                    {getScoreIcon(section.score)}
                    <span className="font-bold">{section.score.toFixed(1)} / 10</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Original Answer</h4>
                    <div className="bg-stone-50 rounded-lg p-4 text-stone-700 italic border border-stone-100 min-h-[100px] text-sm">
                      "{section.originalAnswer}"
                    </div>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">6th Grade Rewrite / Model</h4>
                    <div className="bg-indigo-50/50 rounded-lg p-4 text-stone-800 border border-indigo-100 min-h-[100px] text-sm">
                      {section.rewrittenAnswer || "No rewrite needed."}
                    </div>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="text-xs font-bold text-stone-400 uppercase tracking-wider mb-2">Teacher Feedback</h4>
                  <p className="text-stone-700 text-sm leading-relaxed">{section.feedback}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
