/**
 * Web Navigator / Browser Simulator App
 * Test cursor clicking on web links, articles, and scrolling
 */

import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCw, Globe, Bookmark, ExternalLink } from 'lucide-react';

interface Article {
  id: string;
  url: string;
  title: string;
  category: string;
  readTime: string;
  content: string[];
}

const ARTICLES: Record<string, Article> = {
  head_tracking: {
    id: 'head_tracking',
    url: 'https://en.wikipedia.org/wiki/Head_tracking',
    title: 'Head Tracking in Human-Computer Interfaces',
    category: 'Computer Vision',
    readTime: '3 min read',
    content: [
      'Head tracking is an optical or sensor-based technique used to determine the spatial orientation and position of a user’s head in real-time. In assistive computing and accessibility, head-coupled cursor navigation allows individuals with motor impairments or conditions like ALS to control computers completely hands-free.',
      'Modern systems utilize lightweight neural networks to detect key facial landmarks—such as the tip of the nose, eye corners, and lip margins. By calculating the relative angular displacement of the nose vector with respect to a calibrated neutral resting point, continuous 2D coordinates are mapped onto screen space with sub-pixel precision.',
      'To eliminate micro-tremors and natural physiological head sway, mathematical smoothing algorithms such as Exponential Moving Averages (EMA) or Kalman filters are applied. Gesture triggers like eye blinks and intentional mouth opening replace mechanical mouse button clicks.',
    ],
  },
  assistive_tech: {
    id: 'assistive_tech',
    url: 'https://techdigest.org/articles/assistive-interfaces',
    title: 'Assistive Computing: The Evolution of Hands-Free Navigation',
    category: 'Assistive Tech',
    readTime: '4 min read',
    content: [
      'For decades, adaptive access for quadriplegia and severe mobility limitations required expensive proprietary eye-gaze bars or sip-and-puff tubes costing thousands of dollars.',
      'Today, commodity webcams coupled with WebAssembly (WASM) computer vision models running directly in standard web browsers have democratized digital autonomy. Users can compose emails, browse the web, create digital art, and operate complex software suites with zero specialized hardware.',
      'Key design principles for hands-free interfaces include generous hit targets (minimum 48px), visual dwell confirmation rings, and multi-modal redundancy that allows users to alternate between dwell timers and subtle facial twitches.',
    ],
  },
  ai_landmarks: {
    id: 'ai_landmarks',
    url: 'https://sciencedaily.org/vision/facial-mesh-topology',
    title: 'Facial Landmark Topology & Real-Time Pose Estimation',
    category: 'Applied AI',
    readTime: '2 min read',
    content: [
      '3D face mesh models estimate up to 468 distinct topological surface vertices from a single 2D RGB video stream. By leveraging geometric depth heuristics, the model infers pitch (vertical nod), yaw (horizontal turn), and roll (lateral ear-to-shoulder tilt).',
      'The eye aspect ratio (EAR) measures the Euclidean distance between upper and lower eyelids divided by the palpebral fissure width. A sudden dip in EAR below 0.20 reliably identifies intentional wink gestures while ignoring involuntary micro-blinks.',
    ],
  },
};

export const BrowserApp: React.FC = () => {
  const [currentId, setCurrentId] = useState<string>('head_tracking');
  const [history, setHistory] = useState<string[]>(['head_tracking']);
  const [historyIdx, setHistoryIdx] = useState<number>(0);

  const navigateTo = (id: string) => {
    if (ARTICLES[id]) {
      const nextHistory = history.slice(0, historyIdx + 1);
      nextHistory.push(id);
      setHistory(nextHistory);
      setHistoryIdx(nextHistory.length - 1);
      setCurrentId(id);
    }
  };

  const goBack = () => {
    if (historyIdx > 0) {
      const newIdx = historyIdx - 1;
      setHistoryIdx(newIdx);
      setCurrentId(history[newIdx]);
    }
  };

  const goForward = () => {
    if (historyIdx < history.length - 1) {
      const newIdx = historyIdx + 1;
      setHistoryIdx(newIdx);
      setCurrentId(history[newIdx]);
    }
  };

  const article = ARTICLES[currentId] || ARTICLES.head_tracking;

  return (
    <div className="flex flex-col h-full bg-neutral-950 text-neutral-100 select-none">
      {/* Navigation Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-neutral-900 border-b border-neutral-800 text-xs">
        <div className="flex items-center gap-1">
          <button
            onClick={goBack}
            disabled={historyIdx <= 0}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors"
            title="Back"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={goForward}
            disabled={historyIdx >= history.length - 1}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 disabled:opacity-30 transition-colors"
            title="Forward"
          >
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => {}}
            className="p-1 rounded text-neutral-400 hover:text-white hover:bg-neutral-800 transition-colors"
            title="Refresh"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Address Bar */}
        <div className="flex-1 flex items-center gap-2 bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-neutral-300">
          <Globe className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="font-mono text-xs truncate select-text">{article.url}</span>
        </div>

        {/* Bookmarks */}
        <div className="hidden sm:flex items-center gap-1.5 text-neutral-400">
          <button
            onClick={() => navigateTo('head_tracking')}
            className={`px-2 py-0.5 rounded text-[11px] hover:text-white transition-colors ${
              currentId === 'head_tracking' ? 'bg-neutral-800 text-cyan-400' : ''
            }`}
          >
            Wikipedia
          </button>
          <button
            onClick={() => navigateTo('assistive_tech')}
            className={`px-2 py-0.5 rounded text-[11px] hover:text-white transition-colors ${
              currentId === 'assistive_tech' ? 'bg-neutral-800 text-cyan-400' : ''
            }`}
          >
            AssistiveTech
          </button>
          <button
            onClick={() => navigateTo('ai_landmarks')}
            className={`px-2 py-0.5 rounded text-[11px] hover:text-white transition-colors ${
              currentId === 'ai_landmarks' ? 'bg-neutral-800 text-cyan-400' : ''
            }`}
          >
            ScienceDaily
          </button>
        </div>
      </div>

      {/* Main Content Viewport */}
      <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
        {/* Article Header */}
        <div className="border-b border-neutral-800 pb-4 mb-6">
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
            <span className="text-cyan-400 font-medium">{article.category}</span>
            <span>·</span>
            <span>{article.readTime}</span>
            <span>·</span>
            <span>Published Today</span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight leading-snug">
            {article.title}
          </h1>
        </div>

        {/* Article Body */}
        <div className="space-y-4 text-sm text-neutral-300 leading-relaxed font-sans select-text">
          {article.content.map((paragraph, idx) => (
            <p key={idx}>{paragraph}</p>
          ))}
        </div>

        {/* Interactive Related Hyperlinks to test clicking */}
        <div className="mt-8 pt-6 border-t border-neutral-800">
          <h3 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-3">
            Clickable Reference Links
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Object.values(ARTICLES)
              .filter((a) => a.id !== currentId)
              .map((rel) => (
                <button
                  key={rel.id}
                  onClick={() => navigateTo(rel.id)}
                  className="flex items-center justify-between p-3 rounded-lg bg-neutral-900 hover:bg-neutral-800/80 border border-neutral-800 hover:border-cyan-500/40 text-left transition-all group"
                >
                  <div>
                    <div className="text-xs font-medium text-white group-hover:text-cyan-400 transition-colors">
                      {rel.title}
                    </div>
                    <div className="text-[11px] text-neutral-500">{rel.category} · {rel.readTime}</div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-neutral-500 group-hover:text-cyan-400 shrink-0" />
                </button>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};
