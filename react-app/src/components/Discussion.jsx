// client/src/components/Discussion.jsx
import React, { useState } from "react";
import { postComment } from "../services/dailyService";
import { toast } from "react-toastify";

export default function Discussion({ date, sectionKey, comments = [], onPosted }) {
  const [text, setText] = useState("");
  const user = (() => {
    try {
      return JSON.parse(localStorage.getItem("user"));
    } catch (e) {
      return null;
    }
  })();

  const submit = async () => {
    if (!user) {
      toast.error("Please login to post comments.");
      return;
    }
    if (!text.trim()) {
      toast.error("Comment can't be empty.");
      return;
    }
    try {
      const res = await postComment({ date, sectionKey, text });
      setText("");
      toast.success("Comment posted");
      if (onPosted) onPosted();
    } catch (err) {
      console.error("postComment failed", err);
      const msg = err.response?.data?.error || err.message || "Failed to post comment";
      toast.error(msg);
    }
  };

  return (
    <div>
      <div className="space-y-2 max-h-40 overflow-auto">
        {comments.length === 0 && <div className="text-gray-500">No comments yet</div>}
        {comments.map((c) => (
          <div key={c._id || c.createdAt} className="border rounded p-2">
            <div className="text-sm font-semibold">{c.user?.name || c["user.name"]}</div>
            <div className="text-sm text-gray-700">{c.text}</div>
            <div className="text-xs text-gray-400">{new Date(c.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>

      <div className="mt-3">
        <textarea value={text} onChange={(e) => setText(e.target.value)} className="w-full border rounded p-2" rows={3} placeholder="Share tips, ask how someone solved it faster..." />
        <div className="flex justify-end mt-2">
          <button onClick={submit} className="px-3 py-1 rounded bg-blue-600 text-white">Post</button>
        </div>
      </div>
    </div>
  );
}
