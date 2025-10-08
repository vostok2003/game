import React, { useState, useEffect, useRef } from "react";
import { postComment, voteComment } from "../services/dailyService";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import getSocket from "../socket";

dayjs.extend(relativeTime);

const socket = getSocket();

export default function Discussion({ date, sectionKey, comments = [], onPosted }) {
  const [text, setText] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [localComments, setLocalComments] = useState(comments);
  const textareaRef = useRef(null);
  
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      return null;
    }
  })();

  // Set up socket listeners for real-time updates
  useEffect(() => {
    if (!date || !sectionKey) return;
    
    const roomId = `comments:${date}:${sectionKey}`;
    
    // Join the room for this specific discussion
    socket.emit('joinDiscussion', roomId);
    
    // Listen for new comments
    const handleNewComment = (newComment) => {
      setLocalComments(prev => [newComment, ...prev]);
    };
    
    // Listen for comment votes
    const handleCommentVote = ({ commentId, votes }) => {
      setLocalComments(prev => 
        prev.map(comment => 
          comment._id === commentId 
            ? { ...comment, votes: { ...(comment.votes || {}), ...votes } } 
            : comment
        )
      );
    };
    
    socket.on('newComment', handleNewComment);
    socket.on('commentVoted', handleCommentVote);
    
    // Update local comments when prop changes
    setLocalComments(comments);
    
    return () => {
      socket.emit('leaveDiscussion', roomId);
      socket.off('newComment', handleNewComment);
      socket.off('commentVoted', handleCommentVote);
    };
  }, [date, sectionKey, comments]);

  const handleVote = async (commentId, voteType) => {
    if (!user) {
      toast.error("Please login to vote");
      return;
    }
    
    try {
      // Optimistic UI update
      const updatedVotes = { ...(localComments.find(c => c._id === commentId)?.votes || {}) };
      const userVote = updatedVotes[user._id];
      
      // Toggle vote logic
      if (userVote === voteType) {
        delete updatedVotes[user._id]; // Remove vote if same type clicked
      } else {
        updatedVotes[user._id] = voteType; // Add/update vote
      }
      
      // Update UI immediately
      setLocalComments(prev => 
        prev.map(comment => 
          comment._id === commentId 
            ? { ...comment, votes: { ...updatedVotes } } 
            : comment
        )
      );
      
      // Send vote to server
      await voteComment(commentId, voteType);
      
      // Emit socket event for real-time update
      const roomId = `comments:${date}:${sectionKey}`;
      socket.emit('commentVoted', { 
        commentId, 
        votes: updatedVotes,
        room: roomId
      });
    } catch (err) {
      console.error("Vote failed", err);
      toast.error(err.response?.data?.error || "Failed to process vote");
    }
  };

  const countVotes = (votes = {}) => {
    return Object.values(votes).reduce(
      (acc, vote) => ({
        up: acc.up + (vote === 'up' ? 1 : 0),
        down: acc.down + (vote === 'down' ? 1 : 0)
      }), 
      { up: 0, down: 0 }
    );
  };

  const submit = async (e) => {
    e?.preventDefault();
    if (!user) {
      toast.error("Please login to post comments.");
      return;
    }
    if (!text.trim()) {
      toast.error("Comment can't be empty.");
      return;
    }
    try {
      const newComment = {
        text,
        user: { _id: user._id, name: user.name },
        createdAt: new Date().toISOString(),
        votes: {},
        date,
        sectionKey
      };
      
      // Optimistic UI update
      setLocalComments(prev => [newComment, ...prev]);
      setText("");
      
      // Submit to server
      const response = await postComment({ date, sectionKey, text });
      
      // Update the optimistic comment with the server response
      setLocalComments(prev => 
        prev.map(comment => 
          !comment._id && comment.text === newComment.text 
            ? { ...response, user: newComment.user } 
            : comment
        )
      );
      
      // Emit socket event for real-time update
      const roomId = `comments:${date}:${sectionKey}`;
      socket.emit('newComment', { 
        ...response, 
        user: { _id: user._id, name: user.name },
        room: roomId
      });
      
      toast.success("✓ Comment posted");
      if (onPosted) onPosted();
    } catch (err) {
      console.error("postComment failed", err);
      const msg = err.response?.data?.error || err.message || "Failed to post comment";
      toast.error(msg);
      // Revert optimistic update on error
      setLocalComments(comments);
    }
  };

  const getUserVote = (comment) => {
    if (!user || !comment.votes) return null;
    return comment.votes[user._id];
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      submit(e);
    }
  };

  return (
    <div className="relative group">
      {/* Animated gradient background */}
      <div className="absolute inset-0 -z-10 overflow-hidden rounded-2xl">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-900/5 via-indigo-900/10 to-purple-900/5 opacity-50 group-hover:opacity-70 transition-opacity duration-500"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-blue-500/5 via-transparent to-transparent opacity-30 group-hover:opacity-50 transition-opacity duration-700"></div>
        {/* Subtle grid overlay */}
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGcgZmlsbD0ibm9uZSIgZmlsbC1ydWxlPSJldmVub2RkIj48cGF0aCBkPSJNMjAgMGgtMjB2MjBoMjB6Ii8+PHBhdGggZD0iTTEgMHYyMCIgc3Ryb2tlPSJyZ2JhKDE0NSwgMTU4LCAyNTUsIDAuMDMpIiBzdHJva2Utd2lkdGg9IjEiLz48cGF0aCBkPSJNMCAxaDIwIiBzdHJva2U9InJnYmEoMTQ1LCAxNTgsIDI1NSwgMC4wMykiIHN0cm9rZS13aWR0aD0iMSIvPjwvZz48L3N2Zz4=')] opacity-30"></div>
      </div>
      
      <div className="relative bg-gradient-to-br from-gray-900/80 via-gray-900/90 to-gray-900/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5 shadow-2xl shadow-blue-900/10 hover:shadow-blue-900/20 transition-all duration-300 hover:border-blue-500/20">
        <div className="flex items-center justify-between mb-6">
          <div className="relative">
            <h3 className="text-xl font-bold text-white font-mono relative z-10">
              <span className="relative">
                <span className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg blur opacity-20 group-hover:opacity-30 transition duration-300"></span>
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-300 to-indigo-300 relative">
                  Discussion Forum
                </span>
              </span>
              <span className="ml-3 text-blue-300/70 text-sm font-normal bg-blue-900/30 px-2 py-1 rounded-md">
                ∀x ∈ Community, share your thoughts
              </span>
            </h3>
            <div className="absolute -left-2 -top-2 w-3 h-3 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            <div className="absolute -right-2 -top-2 w-3 h-3 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100"></div>
            <div className="absolute -left-2 -bottom-2 w-3 h-3 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-200"></div>
            <div className="absolute -right-2 -bottom-2 w-3 h-3 bg-blue-400 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-300"></div>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-blue-400 hover:text-blue-300 transition-colors text-sm font-mono"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <form onSubmit={submit} className="mb-6">
                <div className="relative">
                  <div className="absolute -left-1 -top-1 w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="absolute -right-1 -top-1 w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="absolute -left-1 -bottom-1 w-2 h-2 bg-blue-400 rounded-full"></div>
                  <div className="absolute -right-1 -bottom-1 w-2 h-2 bg-blue-400 rounded-full"></div>
                  
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-gray-900/50 border border-blue-500/30 rounded-lg p-4 text-white font-mono text-sm focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all duration-300 resize-none"
                    rows={4}
                    placeholder="Share your thoughts, proofs, or solutions..."
                  />
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="text-xs text-gray-400 font-mono">
                      {text.length}/500 {text.length > 450 && (
                        <span className="text-yellow-400">
                          (Approaching limit: {500 - text.length} left)
                        </span>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setText(prev => prev + '∑')}
                        className="px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/70 text-gray-300 rounded transition-colors"
                        title="Insert summation symbol"
                      >
                        ∑
                      </button>
                      <button
                        type="button"
                        onClick={() => setText(prev => prev + '∈')}
                        className="px-2 py-1 text-xs bg-gray-800/50 hover:bg-gray-700/70 text-gray-300 rounded transition-colors"
                        title="Insert element of symbol"
                      >
                        ∈
                      </button>
                      <button
                        type="submit"
                        disabled={!text.trim()}
                        className="px-4 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-md font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        Post Comment
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className={`space-y-4 ${isExpanded ? 'max-h-[500px]' : 'max-h-80'} overflow-y-auto pr-2 custom-scrollbar transition-all duration-500 ease-in-out`}>
          <AnimatePresence>
            {localComments.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-8 text-gray-400"
              >
                <div className="text-4xl mb-2">∅</div>
                <p>No comments yet. Be the first to share your thoughts!</p>
                <p className="text-sm mt-1 text-gray-500">Prove your point with logical reasoning</p>
              </motion.div>
            ) : (
              localComments.map((comment) => {
                const votes = countVotes(comment.votes);
                const userVote = getUserVote(comment);
                const isOwnComment = user && comment.user?._id === user._id;
                
                return (
                  <motion.div
                    key={comment._id || comment.createdAt}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className={`relative group bg-gray-900/50 backdrop-blur-sm rounded-xl p-4 border ${
                      isOwnComment 
                        ? 'border-blue-500/30' 
                        : 'border-gray-700/50 hover:border-blue-500/30'
                    } transition-colors`}
                  >
                    <div className="flex gap-3">
                      {/* Vote buttons */}
                      <div className="flex flex-col items-center">
                        <button
                          onClick={() => handleVote(comment._id, 'up')}
                          className={`p-1 rounded-md hover:bg-gray-700/50 transition-colors ${
                            userVote === 'up' ? 'text-blue-400' : 'text-gray-400 hover:text-blue-400'
                          }`}
                          disabled={!user}
                          title="Upvote"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                        
                        <span className={`text-sm font-mono my-1 ${
                          votes.up - votes.down > 0 ? 'text-green-400' : 
                          votes.up - votes.down < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {votes.up - votes.down}
                        </span>
                        
                        <button
                          onClick={() => handleVote(comment._id, 'down')}
                          className={`p-1 rounded-md hover:bg-gray-700/50 transition-colors ${
                            userVote === 'down' ? 'text-red-400' : 'text-gray-400 hover:text-red-400'
                          }`}
                          disabled={!user}
                          title="Downvote"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </button>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="font-medium text-blue-300">
                              {comment.user?.name || comment["user.name"]}
                            </div>
                            {isOwnComment && (
                              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                You
                              </span>
                            )}
                            <span className="text-xs text-gray-500">
                              • {dayjs(comment.createdAt).fromNow()}
                            </span>
                          </div>
                          
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span className="text-green-400">+{votes.up}</span>
                            <span>/</span>
                            <span className="text-red-400">{votes.down}</span>
                          </div>
                        </div>
                        
                        <div className="mt-1 text-gray-200 whitespace-pre-wrap break-words">
                          {comment.text}
                        </div>
                        
                        <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                          <button className="hover:text-blue-300 transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            Reply
                          </button>
                          <button className="hover:text-blue-300 transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share
                          </button>
                          <button className="hover:text-blue-300 transition-colors flex items-center gap-1">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Decorative elements */}
                    <div className="absolute -left-1 top-4 w-1 h-6 bg-gradient-to-b from-blue-400 to-transparent rounded-r-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-blue-400/30 rounded-bl-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                    <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-blue-400/30 rounded-tr-lg opacity-0 group-hover:opacity-100 transition-opacity"></div>
                  </motion.div>
                );
              })
            )}
          </AnimatePresence>
        </div>
        
        {!isExpanded && localComments.length > 0 && (
          <div className="mt-4 text-center">
            <button 
              onClick={() => setIsExpanded(true)}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors font-mono flex items-center justify-center w-full py-2 bg-gray-900/30 rounded-lg border border-dashed border-gray-700/50 hover:border-blue-500/30"
            >
              <span>Show all comments (n = {localComments.length})</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        )}
      </div>
      
      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.5);
          border-radius: 10px;
          transition: all 0.3s ease;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.7);
        }
        
        /* Hover effect */
        .glow-hover {
          position: relative;
          transition: all 0.3s ease;
        }
        .glow-hover:hover {
          box-shadow: 0 0 0 1px rgba(99, 102, 241, 0.3);
        }
        
        /* Smooth fade-in for comments */
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .comment-enter {
          animation: fadeIn 0.3s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
