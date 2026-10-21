/**
 * Quick Notes App
 * Text editor for practicing text selection, dwell typing, and clipboard actions
 */

import React, { useState } from 'react';
import { Save, Plus, FileText, Check } from 'lucide-react';

interface Note {
  id: string;
  title: string;
  body: string;
  updatedAt: string;
}

const INITIAL_NOTES: Note[] = [
  {
    id: '1',
    title: 'Face Cursor Navigation Tips',
    body: '1. Keep head relaxed in a neutral posture.\n2. Tilt or turn slightly to steer the cursor.\n3. Press Spacebar or click "Recenter" anytime to reset center position.\n4. Hold your gaze to trigger automatic dwell click.',
    updatedAt: 'Just now',
  },
  {
    id: '2',
    title: 'Daily Checklist',
    body: '- Test target practice drill\n- Calibrate dwell duration to 900ms\n- Connect native desktop bridge for OS mouse control\n- Sketch head-drawing in Paint App',
    updatedAt: '10m ago',
  },
];

export const NotesApp: React.FC = () => {
  const [notes, setNotes] = useState<Note[]>(INITIAL_NOTES);
  const [activeId, setActiveId] = useState<string>('1');
  const [saved, setSaved] = useState<boolean>(false);

  const activeNote = notes.find((n) => n.id === activeId) || notes[0];

  const handleUpdateBody = (text: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === activeId ? { ...n, body: text, updatedAt: 'Just now' } : n))
    );
  };

  const handleUpdateTitle = (title: string) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === activeId ? { ...n, title, updatedAt: 'Just now' } : n))
    );
  };

  const handleNewNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: 'New Note',
      body: '',
      updatedAt: 'Just now',
    };
    setNotes([newNote, ...notes]);
    setActiveId(newNote.id);
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <div className="flex h-full bg-neutral-950 text-neutral-100 select-none">
      {/* Sidebar Note List */}
      <div className="w-48 bg-neutral-900 border-r border-neutral-800 flex flex-col">
        <div className="p-2 border-b border-neutral-800 flex items-center justify-between">
          <span className="text-xs font-semibold text-neutral-400">Notes ({notes.length})</span>
          <button
            onClick={handleNewNote}
            className="p-1 rounded bg-neutral-800 hover:bg-neutral-700 text-cyan-400 hover:text-white transition-colors"
            title="Create note"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-1.5 space-y-1">
          {notes.map((n) => (
            <button
              key={n.id}
              onClick={() => setActiveId(n.id)}
              className={`w-full text-left p-2 rounded-lg text-xs transition-colors block ${
                activeId === n.id
                  ? 'bg-neutral-800 text-white font-medium border border-neutral-700'
                  : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-neutral-200'
              }`}
            >
              <div className="truncate font-medium flex items-center gap-1.5">
                <FileText className="w-3 h-3 text-cyan-400 shrink-0" />
                <span className="truncate">{n.title || 'Untitled'}</span>
              </div>
              <div className="text-[10px] text-neutral-500 mt-0.5">{n.updatedAt}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Note Editor */}
      <div className="flex-1 flex flex-col p-4 bg-neutral-950">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-800 mb-3">
          <input
            type="text"
            value={activeNote.title}
            onChange={(e) => handleUpdateTitle(e.target.value)}
            className="bg-transparent font-bold text-base text-white focus:outline-none w-full"
            placeholder="Note title..."
          />
          <button
            onClick={handleSave}
            className="flex items-center gap-1 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs rounded transition-colors shrink-0 ml-2"
          >
            {saved ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Save className="w-3.5 h-3.5" />}
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        <textarea
          value={activeNote.body}
          onChange={(e) => handleUpdateBody(e.target.value)}
          placeholder="Start typing your note here..."
          className="flex-1 w-full bg-transparent resize-none text-sm text-neutral-300 focus:outline-none leading-relaxed font-sans"
        />
      </div>
    </div>
  );
};
