import { useState, useRef, useEffect, useCallback } from 'react';
import { TEAMS, USER_TEAM_ID } from '../../data/teams';
import { useTheme } from '../../context/ThemeContext';

const REACT_EMOJIS  = ['🔥', '💀', '😂'];
const SPORTS_EMOJIS = ['🏈', '🏆', '📈', '💪', '🗑️'];

const TEAM_COLORS = [
  '#8B5CF6','#3B82F6','#10B981','#F59E0B','#EF4444','#06B6D4',
  '#F97316','#EC4899','#14B8A6','#A855F7','#84CC16','#6366F1',
];
const getTeamColor = (teamId) => {
  const idx = TEAMS.findIndex(t => t.id === teamId);
  return TEAM_COLORS[idx >= 0 ? idx : 0];
};
const getTeam = (teamId) => TEAMS.find(t => t.id === teamId) || TEAMS[0];

const AUTO_REPLIES = [
  "Lol you're dreaming if you think that's a fair deal",
  "My squad is about to go off this week, watch",
  "That waiver pickup was highway robbery and everyone knows it",
  "You really starting him? Bold strategy, let's see if it pays off",
  "I've been saying this all season... regression to the mean is real",
  "Trade deadline is coming, who's panicking?",
  "Check the projections before you talk trash",
  "Enjoy the win while it lasts, playoffs are a different beast",
];

const HEX = 'M7 1.27L12.6 4.5v6.5L7 14.23 1.4 11V4.5z';

function getDateLabel(ts) {
  const d = new Date(ts);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today - msgDay) / 86400000;
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

const now = Date.now();
const h = 3600000;
const DEMO_MESSAGES = [
  { id: 'm1', type: 'system', text: 'Week 12 is underway! Good luck to all managers.', ts: now - 47*h },
  { id: 'm2', type: 'user', teamId: 't2', text: "Connor, your squad looked shaky last week. Sure that 5-game streak isn't about to snap?", ts: now - 46*h, reactions: { '🔥': ['t5','t7'] } },
  { id: 'm3', type: 'user', teamId: 't1', text: "Shaky? I put up 140. Your whole season is shaky.", ts: now - 45.5*h, reactions: { '😂': ['t3','t6'] } },
  { id: 'm4', type: 'system', text: `TRADE COMPLETED: ${TEAMS[2].abbr} sends WR1 to ${TEAMS[6].abbr} for RB2 + 2025 3rd`, ts: now - 40*h },
  { id: 'm5', type: 'user', teamId: 't7', text: "I just fleeced the Ledger Legends and I'm not even sorry about it", ts: now - 39*h, reactions: { '💀': ['t2','t9'] } },
  { id: 'm6', type: 'user', teamId: 't3', text: "Fleeced?? That WR1 was a luxury piece for me, I needed RB depth. We'll see who laughs in the playoffs.", ts: now - 38.5*h },
  { id: 'm7', type: 'user', teamId: 't4', text: "Both of you are overthinking it. Start your studs.", ts: now - 36*h },
  { id: 'm8', type: 'system', text: `WAIVER CLAIM: ${TEAMS[4].abbr} picks up D. Robinson (WR) — $12 FAAB`, ts: now - 30*h },
  { id: 'm9', type: 'user', teamId: 't5', text: "Twelve dollars for Robinson?! That's a steal, nobody else bid?", ts: now - 29*h },
  { id: 'm10', type: 'user', teamId: 't8', text: "I bid 11 and I'm salty about it", ts: now - 28*h, reactions: { '💀': ['t1','t5','t10'] } },
  { id: 'm11', type: 'user', teamId: 't6', text: "Should I start Murray or Fields this week? My gut says Murray but the matchup says Fields.", ts: now - 20*h },
  { id: 'm12', type: 'user', teamId: 't9', text: "Fields. Murray has been trending down. Trust the matchup.", ts: now - 19*h },
  { id: 'm13', type: 'user', teamId: 't11', text: "Anyone else's team just completely falling apart or is it just me", ts: now - 12*h, reactions: { '😂': ['t2','t4','t12'] } },
  { id: 'm14', type: 'user', teamId: 't12', text: "First time?", ts: now - 11.5*h, reactions: { '🔥': ['t3','t7','t11'], '😂': ['t1','t5','t8'] } },
  { id: 'm15', type: 'system', text: `PLAYOFF CLINCH: ${TEAMS[0].abbr} has clinched a first-round bye!`, ts: now - 6*h },
  { id: 'm16', type: 'user', teamId: 't2', text: "Of course Connor clinches early. Must be nice being lucky.", ts: now - 5*h },
  { id: 'm17', type: 'user', teamId: 't1', text: "Luck is what happens when preparation meets a stacked roster 😤", ts: now - 4.5*h, reactions: { '🔥': ['t3'] } },
  { id: 'm18', type: 'user', teamId: 't10', text: "I'm just here so I don't get fined at this point", ts: now - 1*h, reactions: { '💀': ['t1','t2','t7','t11'] } },
];

function tintColor(hex, base, mix) {
  if (!hex) return base;
  const h = hex.replace('#', '');
  const b = base.replace('#', '');
  const blend = (i) => {
    const c = parseInt(h.slice(i, i + 2), 16);
    const bg = parseInt(b.slice(i, i + 2), 16);
    return Math.round(bg + (c - bg) * mix);
  };
  return `rgb(${blend(0)}, ${blend(2)}, ${blend(4)})`;
}

export default function LeagueChat({ league, leagueId }) {
  const { team: nflTeam, theme } = useTheme();
  const [messages, setMessages] = useState(DEMO_MESSAGES);
  const [inputText, setInputText] = useState('');
  const [typingTeam, setTypingTeam] = useState(null);
  const [hoveredMsgId, setHoveredMsgId] = useState(null);
  const [tappedMsgId, setTappedMsgId] = useState(null);
  const [sendPulse, setSendPulse] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatSettings, setChatSettings] = useState({
    bubbleStyle: 'gradient', compact: false, showTimestamps: true, showTeamColors: true,
  });
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const hasMounted = useRef(false);
  const initialMsgCount = useRef(DEMO_MESSAGES.length);

  const isNearBottom = useCallback(() => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  }, []);

  const scrollToBottom = useCallback((force) => {
    if (force || isNearBottom()) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [isNearBottom]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    requestAnimationFrame(() => { hasMounted.current = true; });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // Dismiss emoji picker on click-outside or Escape
  useEffect(() => {
    if (!tappedMsgId) return;
    const handleClickOutside = (e) => {
      const picker = e.target.closest('.ff-chat-react-picker');
      const msg = e.target.closest('.ff-chat-msg');
      if (!picker && !msg) setTappedMsgId(null);
    };
    const handleEscape = (e) => { if (e.key === 'Escape') setTappedMsgId(null); };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [tappedMsgId]);

  const sendMessage = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    const newMsg = {
      id: `m${Date.now()}`,
      type: 'user',
      teamId: USER_TEAM_ID,
      text,
      ts: Date.now(),
      reactions: {},
    };
    setMessages(prev => [...prev, newMsg]);
    setInputText('');
    setSendPulse(true);
    setTimeout(() => setSendPulse(false), 250);
    requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));

    // Simulate auto-reply — 30% no reply, 15% two replies, 55% one reply
    const roll = Math.random();
    if (roll < 0.3) return; // silence — nobody responds
    const replyCount = roll > 0.85 ? 2 : 1;
    const otherTeams = TEAMS.filter(t => t.id !== USER_TEAM_ID);
    const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const usedReplies = new Set();

    const scheduleReply = (idx) => {
      const delay = (2000 + Math.random() * 2000) + idx * 3000;
      const replyTeam = pickRandom(otherTeams);
      setTimeout(() => {
        setTypingTeam(replyTeam.id);
        requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
        const typeDelay = 1500 + Math.random() * 1500;
        setTimeout(() => {
          setTypingTeam(null);
          let replyText;
          do { replyText = pickRandom(AUTO_REPLIES); } while (usedReplies.has(replyText) && usedReplies.size < AUTO_REPLIES.length);
          usedReplies.add(replyText);
          const reply = {
            id: `m${Date.now()}-${idx}`,
            type: 'user',
            teamId: replyTeam.id,
            text: replyText,
            ts: Date.now(),
            reactions: {},
          };
          setMessages(prev => [...prev, reply]);
          requestAnimationFrame(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }));
        }, typeDelay);
      }, delay);
    };
    for (let i = 0; i < replyCount; i++) scheduleReply(i);
  }, [inputText]);

  const toggleReaction = useCallback((msgId, emoji) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id !== msgId) return msg;
      const reactions = { ...msg.reactions };
      const arr = reactions[emoji] ? [...reactions[emoji]] : [];
      const idx = arr.indexOf(USER_TEAM_ID);
      if (idx >= 0) arr.splice(idx, 1); else arr.push(USER_TEAM_ID);
      if (arr.length === 0) delete reactions[emoji]; else reactions[emoji] = arr;
      return { ...msg, reactions };
    }));
  }, []);

  const toggleSetting = useCallback((key) => {
    setChatSettings(prev => ({ ...prev, [key]: !prev[key] }));
  }, []);
  const toggleBubbleStyle = useCallback(() => {
    setChatSettings(prev => ({ ...prev, bubbleStyle: prev.bubbleStyle === 'gradient' ? 'flat' : 'gradient' }));
  }, []);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Group messages by date for dividers
  let lastDateLabel = null;

  const onlineTeams = TEAMS.slice(0, 8);

  return (
    <div className={`ff-chat-container${chatSettings.compact ? ' ff-chat-compact' : ''}${chatSettings.bubbleStyle === 'flat' ? ' ff-chat-flat' : ''}`}
      style={{ background: tintColor(nflTeam?.primary, theme === 'dark' ? '#171717' : '#FAFAFA', theme === 'dark' ? 0.12 : 0.08) }}>
      <div className="ff-card-top-accent" style={{ background: 'var(--accent)' }} />
      {/* Header */}
      <div className="ff-chat-header">
        <div className="ff-chat-header-title">
          <svg className="ff-chat-header-icon" viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d={HEX} /><path d="M5 6h4M5 8.5h2.5"/>
          </svg>
          <h2>War Room</h2>
          <span className="ff-chat-channel-tag"># general</span>
        </div>
        <button className={`ff-chat-settings-btn${showSettings ? ' active' : ''}`} onClick={() => setShowSettings(s => !s)} title="Chat Settings">
          <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14"><path d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.062 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z"/></svg>
          Settings
        </button>
        <div className="ff-chat-online-bar">
          {onlineTeams.map(t => (
            <div key={t.id} className="ff-chat-online-hex" style={{ '--hex-accent': getTeamColor(t.id) }}>
              <div className="ff-chat-hex-avatar-sm">{t.abbr}</div>
              <span className="ff-chat-online-dot" />
            </div>
          ))}
          <span className="ff-chat-online-count">{onlineTeams.length} online</span>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="ff-chat-settings-panel">
          <div className="ff-chat-settings-row">
            <span className="ff-chat-settings-label">Bubble Style</span>
            <button className={`ff-toggle${chatSettings.bubbleStyle === 'flat' ? ' on' : ''}`} onClick={toggleBubbleStyle} />
            <span className="ff-chat-settings-value">{chatSettings.bubbleStyle === 'gradient' ? 'Gradient' : 'Flat'}</span>
          </div>
          <div className="ff-chat-settings-row">
            <span className="ff-chat-settings-label">Compact</span>
            <button className={`ff-toggle${chatSettings.compact ? ' on' : ''}`} onClick={() => toggleSetting('compact')} />
          </div>
          <div className="ff-chat-settings-row">
            <span className="ff-chat-settings-label">Timestamps</span>
            <button className={`ff-toggle${chatSettings.showTimestamps ? ' on' : ''}`} onClick={() => toggleSetting('showTimestamps')} />
          </div>
          <div className="ff-chat-settings-row">
            <span className="ff-chat-settings-label">Team Colors</span>
            <button className={`ff-toggle${chatSettings.showTeamColors ? ' on' : ''}`} onClick={() => toggleSetting('showTeamColors')} />
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="ff-chat-messages" ref={messagesContainerRef}>
        {nflTeam?.logo && (
          <div className="ff-chat-watermark">
            <img src={nflTeam.logo} alt="" draggable={false} />
          </div>
        )}
        {messages.map((msg, idx) => {
          const dateLabel = getDateLabel(msg.ts);
          let showDivider = false;
          if (dateLabel !== lastDateLabel) { showDivider = true; lastDateLabel = dateLabel; }
          const isSelf = msg.teamId === USER_TEAM_ID;
          const team = msg.teamId ? getTeam(msg.teamId) : null;
          const color = msg.teamId ? getTeamColor(msg.teamId) : null;

          // Variable spacing — item 1
          const prev = idx > 0 ? messages[idx - 1] : null;
          const isCluster = prev && prev.type === 'user' && msg.type === 'user' && prev.teamId === msg.teamId && !showDivider;
          const isEventAdj = msg.type === 'system' || (prev && prev.type === 'system');
          let spacingClass = 'ff-chat-gap-normal';
          if (isCluster) spacingClass = 'ff-chat-gap-cluster';
          else if (isEventAdj) spacingClass = 'ff-chat-gap-event';

          // Skip mount animation — item 4
          const shouldAnimate = hasMounted.current || idx >= initialMsgCount.current;

          return (
            <div key={msg.id} className={spacingClass}>
              {showDivider && (
                <div className="ff-chat-date-divider"><span>{dateLabel}</span></div>
              )}
              {msg.type === 'system' ? (
                <div className={`ff-chat-msg ff-chat-msg-system${shouldAnimate ? ' ff-chat-animate' : ''}`}>
                  <svg className="ff-chat-sys-icon" viewBox="0 0 14 15.5" fill="none" stroke="currentColor" strokeWidth="1.4"><path d={HEX}/></svg>
                  <span>{msg.text}</span>
                </div>
              ) : (
                <div
                  className={`ff-chat-msg ${isSelf ? 'ff-chat-msg-self' : 'ff-chat-msg-other'}${shouldAnimate ? ' ff-chat-animate' : ''}`}
                  onMouseEnter={() => setHoveredMsgId(msg.id)}
                  onMouseLeave={() => setHoveredMsgId(null)}
                  onClick={() => setTappedMsgId(prev => prev === msg.id ? null : msg.id)}
                >
                  {!isSelf && !isCluster && (
                    <div className="ff-chat-hex-avatar" style={{ '--hex-accent': color }}>{team.abbr}</div>
                  )}
                  {!isSelf && isCluster && <div className="ff-chat-avatar-spacer" />}
                  <div className="ff-chat-bubble-wrap">
                    {!isSelf && !isCluster && <div className="ff-chat-sender" style={chatSettings.showTeamColors ? { color } : undefined}>{team.name}</div>}
                    <div className={`ff-chat-bubble ${isSelf ? 'ff-chat-bubble-self' : 'ff-chat-bubble-other'}`} style={!isSelf ? { '--bubble-accent': chatSettings.showTeamColors ? color : undefined } : undefined}>
                      {msg.text}
                    </div>
                    {chatSettings.showTimestamps && <div className="ff-chat-timestamp">{formatTime(msg.ts)}</div>}
                    {/* Reactions */}
                    {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                      <div className="ff-chat-reactions">
                        {Object.entries(msg.reactions).map(([emoji, teams]) => (
                          <button key={emoji} className={`ff-chat-reaction${teams.includes(USER_TEAM_ID) ? ' active' : ''}`} onClick={() => toggleReaction(msg.id, emoji)}>
                            {emoji} {teams.length}
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Reaction picker — hover (desktop) or tap (mobile) */}
                    {(hoveredMsgId === msg.id || tappedMsgId === msg.id) && (
                      <div className={`ff-chat-react-picker${isSelf ? ' ff-chat-react-picker-self' : ''}`}>
                        <div className="ff-chat-react-row">
                          {REACT_EMOJIS.map(emoji => (
                            <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); setTappedMsgId(null); }}>{emoji}</button>
                          ))}
                        </div>
                        <div className="ff-chat-react-row">
                          {SPORTS_EMOJIS.map(emoji => (
                            <button key={emoji} onClick={(e) => { e.stopPropagation(); toggleReaction(msg.id, emoji); setTappedMsgId(null); }}>{emoji}</button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {isSelf && !isCluster && (
                    <div className="ff-chat-hex-avatar" style={{ '--hex-accent': color }}>{team.abbr}</div>
                  )}
                  {isSelf && isCluster && <div className="ff-chat-avatar-spacer" />}
                </div>
              )}
            </div>
          );
        })}
        {/* Typing indicator */}
        {typingTeam && (() => {
          const tt = getTeam(typingTeam);
          const tc = getTeamColor(typingTeam);
          return (
            <div className="ff-chat-msg ff-chat-msg-other">
              <div className="ff-chat-hex-avatar" style={{ '--hex-accent': tc }}>{tt.abbr}</div>
              <div className="ff-chat-bubble-wrap">
                <div className="ff-chat-sender" style={{ color: tc }}>{tt.name}</div>
                <div className="ff-chat-bubble ff-chat-bubble-other ff-chat-typing" style={{ '--bubble-accent': tc, '--dot-color': tc }}>
                  <span className="ff-chat-dot" /><span className="ff-chat-dot" /><span className="ff-chat-dot" />
                </div>
              </div>
            </div>
          );
        })()}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="ff-chat-input-bar">
        <input
          className="ff-chat-input"
          type="text"
          placeholder="Talk trash, discuss trades..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className={`ff-chat-send-btn${sendPulse ? ' ff-chat-send-pulse' : ''}`} onClick={sendMessage} disabled={!inputText.trim()}>
          <svg viewBox="0 0 16 16" fill="currentColor" width="16" height="16"><path d="M1.5 1.3l13 6.7-13 6.7 1.8-6.7-1.8-6.7zm2.4 5.7l-0.9 3.5 8.5-4.5-8.5-4.5 0.9 3.5h5.6v2h-5.6z"/></svg>
        </button>
      </div>
    </div>
  );
}
